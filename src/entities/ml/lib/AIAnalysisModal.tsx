import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Input, Button, Card, Spin, message, Space, Alert } from 'antd'
import {
  RobotOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useMLSuppliers } from './useMLSuppliers'
import { deepseekApi } from '@/entities/api-settings'
import type { DeepseekMaterialRequest } from '@/entities/api-settings'
import { editingModeSearchSupplierNames, testSearchSupplierNames } from '../api/ml-api'

const { TextArea } = Input

interface AIAnalysisModalProps {
  open: boolean
  onClose: () => void
}

// Базовый промт для Deepseek анализа
const DEFAULT_PROMPT = `Ты - эксперт по строительным материалам. Проанализируй материал "{material_name}" и предоставь рекомендации по подбору названия из номенклатуры поставщиков.

ВХОДНЫЕ ДАННЫЕ:
- Название материала: {material_name}
- Результаты поиска по 4 алгоритмам из базы данных (будут предоставлены ниже)

ФОРМАТ ОТВЕТА:

1. СПИСОК РЕКОМЕНДАЦИЙ (30 позиций):
Номенклатура. 95% соответствия
Другая Номенклатура. 88% соответствия
Третья Номенклатура. 82% соответствия
[продолжи список до 30 позиций, отсортированных по убыванию соответствия]

2. РЕКОМЕНДАЦИИ:
- Анализ найденной номенклатуры поставщиков из результатов поиска
- Основные характеристики материала
- Критерии качества для данного типа материала
- Рекомендации по выбору лучших поставщиков из найденных
- Ценовые ориентиры и соотношение цена-качество
- Особенности применения и монтажа

ТРЕБОВАНИЯ:
- ОБЯЗАТЕЛЬНО используй номенклатуру поставщиков из предоставленных результатов поиска
- Предоставь ровно 30 позиций в списке (дополни общими рекомендациями если найдено меньше)
- Указывай процент соответствия от 60% до 98%
- Сортируй по убыванию процента соответствия
- В рекомендациях анализируй качество найденных результатов поиска`

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ open, onClose }) => {
  const [materialName, setMaterialName] = useState('')
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT)
  const [mlResults, setMLResults] = useState<string>('')
  const [aiResponse, setAIResponse] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [waitingForML, setWaitingForML] = useState(false)
  const [mlOnlyMode, setMLOnlyMode] = useState(false) // Режим только ML поиска

  // Используем хук для ML поиска поставщиков
  const {
    suggestions: supplierSuggestions,
    isLoading: isMLLoading,
    predictNow: predictSuppliers,
    clearSuggestions,
  } = useMLSuppliers({
    enabled: true,
    autoPredict: false,
  })

  // AI анализ с использованием кастомного промта
  const handleAIAnalysis = useCallback(
    async (searchResultsText?: string) => {
      try {
        console.log('🤖 Начинаем AI анализ материала с кастомным промтом:', materialName) // LOG: запуск AI анализа

        // Получаем настройки Deepseek
        const settings = await deepseekApi.getSettings()

        if (!settings.enabled) {
          throw new Error('Deepseek не включен в настройках')
        }

        if (!settings.api_key) {
          throw new Error('API ключ Deepseek не настроен')
        }

        // Подготавливаем кастомный промт с подстановкой названия материала
        let finalPrompt = customPrompt.replace('{material_name}', materialName.trim())

        // Добавляем результаты поиска от 4 алгоритмов к промту
        const resultsToUse = searchResultsText || mlResults
        if (resultsToUse && resultsToUse.length > 0) {
          finalPrompt += '\n\n=== РЕЗУЛЬТАТЫ ПОИСКА ИЗ БАЗЫ ДАННЫХ ===\n'
          finalPrompt += resultsToUse
          finalPrompt += '\n=== КОНЕЦ РЕЗУЛЬТАТОВ ПОИСКА ===\n\n'
          finalPrompt +=
            'ВАЖНО: Используй эти результаты поиска для создания рекомендаций. Анализируй найденных поставщиков и их соответствие запрашиваемому материалу.'

          console.log('🔍 Добавили результаты поиска в промт для AI анализа') // LOG: добавление результатов поиска
        } else {
          console.log('⚠️ Результаты поиска отсутствуют, отправляем только базовый промт') // LOG: отсутствие результатов поиска
        }

        console.log('🤖 Отправляем кастомный промт + результаты поиска к Deepseek API') // LOG: отправка кастомного промта

        // Прямой запрос к Deepseek API с кастомным промтом
        const response = await fetch(`${settings.base_url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.api_key}`,
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: 'user',
                content: finalPrompt,
              },
            ],
            temperature: settings.temperature,
            max_tokens: settings.max_tokens,
          }),
        })

        if (!response.ok) {
          throw new Error(`Deepseek API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const aiResponse = data.choices?.[0]?.message?.content || 'Пустой ответ от AI'

        setAIResponse(aiResponse)

        console.log('🤖 AI анализ завершен успешно') // LOG: AI анализ завершен
        message.success('AI анализ завершен!')
      } catch (error) {
        console.error('Ошибка AI анализа:', error) // LOG: ошибка AI
        setAIResponse(
          `Ошибка AI анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        )
        message.error('Не удалось выполнить AI анализ')
      } finally {
        setIsProcessing(false)
      }
    },
    [materialName, customPrompt, mlResults],
  )

  // Отслеживаем изменения в результатах ML (только для старого "Отправить запрос", НЕ для "Подбор ML")
  useEffect(() => {
    // Игнорируем useEffect если это режим только ML (новый прямой поиск)
    if (mlOnlyMode) return

    if (waitingForML && !isMLLoading && supplierSuggestions.length > 0) {
      console.log('🔍 ML результаты получены:', supplierSuggestions.length) // LOG: результаты ML получены

      // Формируем подробный текст с результатами ML из supplier_names
      const mlResultsText = supplierSuggestions
        .map((suggestion, index) => {
          const details = [
            `${index + 1}. ${suggestion.name}`,
            `   • Уверенность: ${Math.round(suggestion.confidence * 100)}%`,
            `   • ID поставщика: ${suggestion.id}`,
            suggestion.price ? `   • Цена: ${suggestion.price}` : '',
            suggestion.supplier ? `   • Поставщик: ${suggestion.supplier}` : '',
            suggestion.characteristics ? `   • Характеристики: ${suggestion.characteristics}` : '',
          ]
            .filter(Boolean)
            .join('\n')

          return details
        })
        .join('\n\n')

      setMLResults(
        `🎯 ML поиск завершен! Найдено ${supplierSuggestions.length} релевантных записей из таблицы supplier_names:\n\n${mlResultsText}`,
      )
      setWaitingForML(false)

      // Запускаем AI анализ только если это НЕ режим только ML
      if (!mlOnlyMode) {
        handleAIAnalysis()
      } else {
        message.success(`ML поиск завершен! Найдено ${supplierSuggestions.length} записей`)
        setMLOnlyMode(false) // Сбрасываем режим
      }
    } else if (waitingForML && !isMLLoading && supplierSuggestions.length === 0) {
      console.log('🔍 ML поиск завершен без результатов') // LOG: ML поиск без результатов
      setMLResults(
        '❌ ML поиск не дал результатов\n\nВозможные причины:\n• Материал не найден в базе поставщиков\n• Слишком специфичное название\n• Требуется уточнение запроса',
      )
      setWaitingForML(false)

      if (!mlOnlyMode) {
        message.warning('ML поиск не дал результатов, пробуем AI анализ')
        handleAIAnalysis('')
      } else {
        message.warning('ML поиск не дал результатов')
        setMLOnlyMode(false) // Сбрасываем режим
      }
    }
  }, [supplierSuggestions, isMLLoading, waitingForML, handleAIAnalysis, mlOnlyMode])

  // Очистка всех полей
  const handleReset = useCallback(() => {
    setMaterialName('')
    setMLResults('')
    setAIResponse('')
    setWaitingForML(false)
    setIsProcessing(false)
    setMLOnlyMode(false)
    clearSuggestions()
  }, [clearSuggestions])

  // Возврат к базовому промту
  const handleResetPrompt = useCallback(() => {
    setCustomPrompt(DEFAULT_PROMPT)
    message.success('Промт сброшен к значению по умолчанию')
  }, [])

  // Выполнение ML поиска и AI анализа
  const handleAnalyze = useCallback(async () => {
    if (!materialName.trim()) {
      message.error('Введите название материала')
      return
    }

    setIsProcessing(true)
    setWaitingForML(true)
    setMLOnlyMode(true) // Отключаем старый useEffect для предотвращения конфликта
    setMLResults('')
    setAIResponse('')

    try {
      console.log('🔍 Выполняем комбинированный поиск + AI анализ для материала:', materialName) // LOG: запуск комбинированного поиска + AI
      message.info('Запущен поиск по всем алгоритмам + AI анализ')

      // Шаг 1: Выполняем поиск по всем 4 алгоритмам
      const searchResults = await testSearchSupplierNames(materialName.trim())

      // Шаг 2: Устанавливаем результаты поиска
      setMLResults(searchResults.formattedText)

      const totalResults =
        (searchResults.vectorResults?.length || 0) +
        (searchResults.keywordResults?.length || 0) +
        (searchResults.editingResults?.length || 0) +
        (searchResults.adaptiveResults?.length || 0)

      console.log(
        `🎯 Комбинированный поиск завершен: найдено ${totalResults} результатов (векторный=${searchResults.vectorResults?.length || 0}, семантический=${searchResults.keywordResults?.length || 0}, редактирование=${searchResults.editingResults?.length || 0}, гибридный=${searchResults.adaptiveResults?.length || 0}), запускаем AI анализ`,
      ) // LOG: комбинированный поиск завершен

      // Шаг 3: Запускаем AI анализ с найденными результатами
      setWaitingForML(false)
      setMLOnlyMode(false) // Восстанавливаем режим для корректной работы useEffect
      await handleAIAnalysis(searchResults.formattedText)

      if (totalResults > 0) {
        message.success(`Анализ завершен! Найдено поставщиков: ${totalResults}`)
      } else {
        message.warning('Поставщики не найдены, но AI анализ выполнен')
      }
    } catch (error) {
      console.error('Ошибка комбинированного анализа:', error) // LOG: ошибка комбинированного анализа
      message.error('Произошла ошибка при выполнении анализа')
      setIsProcessing(false)
      setWaitingForML(false)
      setMLOnlyMode(false) // Восстанавливаем режим при ошибке
    }
  }, [materialName, handleAIAnalysis])

  // Функция только для ML поиска (без AI анализа)
  const handleMLSearchOnly = useCallback(async () => {
    if (!materialName.trim()) {
      message.error('Введите название материала')
      return
    }

    setMLOnlyMode(true) // Включаем режим только ML
    setWaitingForML(true)
    setMLResults('')

    try {
      console.log('🔍 Выполняем прямой поиск в supplier_names для материала:', materialName) // LOG: запуск прямого поиска
      message.info('Запущен поиск в таблице supplier_names')

      // Используем новую функцию прямого поиска (алгоритмы 1-4)
      const searchResults = await testSearchSupplierNames(materialName.trim())

      // Устанавливаем результаты четырех алгоритмов
      setMLResults(searchResults.formattedText)

      setWaitingForML(false)
      setMLOnlyMode(false)

      const totalResults =
        (searchResults.vectorResults?.length || 0) +
        (searchResults.keywordResults?.length || 0) +
        (searchResults.editingResults?.length || 0) +
        (searchResults.adaptiveResults?.length || 0)
      if (totalResults > 0) {
        message.success(`Поиск завершен! Найдено поставщиков: ${totalResults}`)
      } else {
        message.warning('Поставщики не найдены')
      }

      console.log('🎯 Прямой поиск в supplier_names завершен') // LOG: прямой поиск завершен
    } catch (error) {
      console.error('Ошибка прямого поиска в supplier_names:', error) // LOG: ошибка прямого поиска
      setMLResults(
        `❌ Ошибка поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      )
      message.error('Произошла ошибка при поиске в supplier_names')
      setWaitingForML(false)
      setMLOnlyMode(false)
    }
  }, [materialName])

  // Функция для поиска режимом редактирования
  const handleEditingSearchOnly = useCallback(async () => {
    if (!materialName.trim()) {
      message.error('Введите название материала')
      return
    }

    setMLOnlyMode(true)
    setWaitingForML(true)
    setMLResults('')

    try {
      console.log('⚙️ Выполняем поиск режимом редактирования для материала:', materialName) // LOG: запуск поиска режимом редактирования
      message.info('Запущен поиск режимом редактирования (getSupplierBasedSuggestions)')

      const editingResults = await editingModeSearchSupplierNames(materialName.trim())

      const resultsText =
        editingResults.length > 0
          ? editingResults
              .map((r, index) => `   ${index + 1}. ${r.name} (${Math.round(r.confidence * 100)}%)`)
              .join('\n')
          : 'Результатов не найдено'

      setMLResults(
        `⚙️ РЕЖИМ РЕДАКТИРОВАНИЯ (${editingResults.length} результатов):\n${resultsText}`,
      )
      setWaitingForML(false)
      setMLOnlyMode(false)

      if (editingResults.length > 0) {
        message.success(`Поиск завершен! Найдено поставщиков: ${editingResults.length}`)
      } else {
        message.warning('Поставщики не найдены')
      }

      console.log('🎯 Поиск режимом редактирования завершен успешно') // LOG: завершение поиска режимом редактирования
    } catch (error) {
      console.error('Ошибка поиска режимом редактирования:', error) // LOG: ошибка поиска режимом редактирования
      message.error('Ошибка поиска режимом редактирования')
      setMLResults(
        `❌ Ошибка поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      )
      setWaitingForML(false)
      setMLOnlyMode(false)
    }
  }, [materialName])

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          Тестирование AI - Подбор материалов поставщиков
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="95vw"
      style={{ top: 20 }}
      styles={{
        body: {
          height: 'calc(95vh - 110px)',
          overflow: 'auto',
          padding: '24px',
        },
      }}
      footer={[
        <Button
          key="analyze"
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleAnalyze}
          loading={isProcessing || (isMLLoading && !mlOnlyMode)}
          disabled={!materialName.trim()}
        >
          Отправить запрос
        </Button>,
        <Button
          key="ml-search"
          icon={<SearchOutlined />}
          onClick={handleMLSearchOnly}
          loading={isMLLoading && mlOnlyMode}
          disabled={!materialName.trim()}
          style={{ backgroundColor: '#f0f8ff', borderColor: '#1890ff' }}
        >
          Подбор ML
        </Button>,
        <Button
          key="editing-search"
          icon={<EditOutlined />}
          onClick={handleEditingSearchOnly}
          loading={isMLLoading && mlOnlyMode}
          disabled={!materialName.trim()}
          style={{ backgroundColor: '#f0fff0', borderColor: '#52c41a' }}
        >
          Режим редактирования
        </Button>,
        <Button key="reset-prompt" icon={<ReloadOutlined />} onClick={handleResetPrompt}>
          По умолчанию
        </Button>,
        <Button key="close" onClick={onClose}>
          ОК
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        {/* Поле 1: Ввод наименования материала */}
        <Card title="1. Наименование материала" size="small">
          <Input
            placeholder="Введите название материала из столбца 'Материал'"
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            onPressEnter={handleAnalyze}
            disabled={isProcessing}
          />
        </Card>

        {/* Поле 2: ML результаты */}
        <Card
          title="2. Отобранные ML значения из supplier_names"
          size="small"
          extra={
            <Space>
              {(isMLLoading || waitingForML) && <Spin size="small" />}
              <span style={{ fontSize: '12px', color: '#666' }}>
                {waitingForML
                  ? 'Поиск ML...'
                  : supplierSuggestions.length > 0
                    ? `${supplierSuggestions.length} результатов`
                    : mlResults
                      ? 'Завершено'
                      : 'Ожидание'}
              </span>
            </Space>
          }
        >
          <TextArea
            value={
              mlResults ||
              (waitingForML
                ? '🔍 Выполняется поиск в таблице supplier_names...\n\n📊 Векторный поиск - анализ текстового сходства\n🔍 Семантический поиск - интеллектуальный анализ с синонимами\n⚙️ Режим редактирования - ML алгоритм с 3 стратегиями поиска\n🤖 Гибридный режим - адаптивная классификация с токенизацией'
                : '')
            }
            readOnly
            placeholder="Результаты появятся здесь:\n\n1. ВЕКТОРНЫЙ ПОИСК - текстовое сходство\n2. СЕМАНТИЧЕСКИЙ ПОИСК - синонимы + морфология\n3. РЕЖИМ РЕДАКТИРОВАНИЯ - алгоритм из столбца 'Наименование поставщика'\n4. ГИБРИДНЫЙ РЕЖИМ - адаптивная классификация + токенизация\n\nВарианты тестирования:\n• 'Подбор ML' - все 4 алгоритма сразу\n• 'Режим редактирования' - только 3-й алгоритм"
            style={{
              height: '200px',
              fontSize: '12px',
              backgroundColor: waitingForML ? '#f0f8ff' : '#fafafa',
              fontFamily: 'Consolas, Monaco, monospace',
            }}
          />
        </Card>

        {/* Поле 3: Редактируемый промт */}
        <Card title="3. Промт для Deepseek API" size="small">
          <TextArea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Введите промт для AI анализа"
            style={{ height: '200px', fontSize: '12px', fontFamily: 'monospace' }}
            disabled={isProcessing}
          />
        </Card>

        {/* Поле 4: Ответ от AI */}
        <Card
          title="4. Ответ от AI"
          size="small"
          extra={
            isProcessing && (
              <Space>
                <Spin size="small" />
                <span style={{ fontSize: '12px' }}>Обработка...</span>
              </Space>
            )
          }
        >
          <TextArea
            value={aiResponse}
            readOnly
            placeholder="Ответ от AI появится здесь после анализа"
            style={{
              height: '300px',
              fontSize: '11px',
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
            }}
          />
        </Card>

        {/* Информационные сообщения */}
        {isProcessing && (
          <Alert
            message="Выполняется полный анализ материала"
            description="Сначала выполняется ML поиск поставщиков, затем AI анализ с рекомендациями"
            type="info"
            showIcon
          />
        )}

        {waitingForML && mlOnlyMode && (
          <Alert
            message="Выполняется интеллектуальный поиск в supplier_names"
            description="Векторный анализ + семантический поиск + режим редактирования с ML настройками"
            type="info"
            showIcon
          />
        )}

        {!isProcessing && !waitingForML && (
          <Alert
            message="Инструкция по использованию"
            description={
              <div>
                <p>
                  <strong>• Подбор ML</strong> - все 4 алгоритма поиска в supplier_names:
                </p>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  <li>1. Векторный анализ текстового сходства (60 результатов)</li>
                  <li>2. Семантический поиск с синонимами (60 результатов)</li>
                  <li>3. Режим редактирования с ML настройками (минимум 60 результатов)</li>
                  <li>4. Гибридный режим с адаптивной классификацией (60 результатов)</li>
                </ul>
                <p>
                  <strong>• Режим редактирования</strong> - только 3-й алгоритм (как в столбце
                  поставщиков)
                </p>
                <p>
                  <strong>• Отправить запрос</strong> - поиск по всем 4 алгоритмам + AI анализ
                </p>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        {/* Кнопка очистки */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button onClick={handleReset} disabled={isProcessing}>
            Очистить все поля
          </Button>
        </div>
      </div>
    </Modal>
  )
}
