import React from 'react'
import { AutoComplete, Badge, Tooltip, Space } from 'antd'
import { RobotOutlined, ThunderboltFilled } from '@ant-design/icons'
import { useMLNomenclatureSuppliers } from './useMLNomenclatureSuppliers'
import type { MLPredictionRequest } from '../model/types'

interface MLNomenclatureSupplierSelectProps {
  value?: string
  onChange?: (value: string, option?: unknown) => void
  onNomenclatureSupplierSelect?: (
    nomenclatureSupplierId: string,
    nomenclatureSupplierName: string,
  ) => void
  placeholder?: string
  materialName: string
  context?: MLPredictionRequest['context']
  style?: React.CSSProperties
  disabled?: boolean
  allowClear?: boolean
  showSearch?: boolean
  filterOption?: (input: string, option?: unknown) => boolean
  options?: Array<{ value: string; label: string }>
  disableML?: boolean // Отключить ML поиск (для каскадного режима)
}

/**
 * ML-enhanced AutoComplete для выбора номенклатуры поставщиков по материалу
 */
export const MLNomenclatureSupplierSelect: React.FC<MLNomenclatureSupplierSelectProps> = React.memo(
  ({
    value,
    onChange,
    onNomenclatureSupplierSelect,
    placeholder = 'Кликните для ML-подбора номенклатуры поставщика...',
    materialName,
    context,
    style,
    disabled,
    allowClear = true,
    showSearch = true,
    filterOption,
    options = [],
    disableML = false,
    ...props
  }) => {
    // const [searchQuery, setSearchQuery] = React.useState('') // Отключено для оптимизации
    const [isOpen, setIsOpen] = React.useState(false)
    const [lastRequestTime, setLastRequestTime] = React.useState(0) // Защита от дублирования запросов

    const {
      suggestions,
      isLoading,
      config,
      // predict, // Отключено для оптимизации
      predictNow,
      // clearSuggestions, // Отключено для оптимизации
      confidence,
      processingTime,
      modelUsed,
    } = useMLNomenclatureSuppliers({
      enabled: !disabled && !disableML, // Отключаем ML если disabled или disableML
      autoPredict: false, // Отключаем автопредсказание
      debounceMs: 300,
      minQueryLength: 2,
    })

    // LOG: Детальная диагностика состояния компонента MLNomenclatureSupplierSelect (только в development)
    React.useEffect(() => {
      if (import.meta.env.DEV) {
        console.log('🔍 MLNomenclatureSupplierSelect Component State:', {
          materialName,
          hasOptions: options.length,
          hasContext: !!context,
          disabled,
          isOpen,
          isLoading,
          suggestionsCount: suggestions.length,
        }) // LOG: диагностика состояния ML компонента номенклатуры поставщиков
      }
    }, [materialName, options.length, context, disabled, isOpen, isLoading, suggestions.length])

    // Функция для выполнения ML предсказания с защитой от дублирования (оптимизировано)
    const triggerPrediction = React.useCallback(
      (source: string) => {
        const now = Date.now()
        const timeSinceLastRequest = now - lastRequestTime

        // Если прошло менее 3 секунд с последнего запроса - игнорируем (уменьшено с 5 до 3 сек)
        if (timeSinceLastRequest < 3000) {
          if (import.meta.env.DEV) {
            console.log(
              `🤖 ML NomenclatureSupplier: ${source} prediction ignored (duplicate within ${timeSinceLastRequest}ms)`,
            ) // LOG: игнорирование дублирующего запроса номенклатуры поставщиков
          }
          return
        }

        if (disableML) {
          if (import.meta.env.DEV) {
            console.log(
              `🤖 ML NomenclatureSupplier: ${source} prediction skipped (ML disabled for cascade mode)`,
            ) // LOG: пропуск ML предсказания - ML отключен для каскадного режима
          }
        } else if (materialName && materialName.length >= 2 && config?.enabled) {
          if (import.meta.env.DEV) {
            console.log(
              `🤖 ML NomenclatureSupplier: ${source} triggered prediction for:`,
              materialName,
            ) // LOG: ML предсказание номенклатуры поставщиков
          }
          setLastRequestTime(now)
          predictNow(materialName, context)
        } else if (import.meta.env.DEV) {
          if (materialName.length < 2) {
            console.log(
              `🤖 ML NomenclatureSupplier: ${source} prediction skipped (material too short):`,
              materialName,
            ) // LOG: пропуск ML предсказания - материал слишком короткий
          } else if (!config?.enabled) {
            console.log(`🤖 ML NomenclatureSupplier: ${source} prediction skipped (ML disabled)`) // LOG: пропуск ML предсказания - ML отключен
          }
        }
      },
      [materialName, context, predictNow, config?.enabled, lastRequestTime, disableML],
    )

    // Обработчик фокуса - запускаем ML предсказание и открываем dropdown
    const handleFocus = React.useCallback(() => {
      setIsOpen(true)
      triggerPrediction('Focus')
    }, [triggerPrediction])

    // Обработчик клика - открываем dropdown без ML запроса (он будет запущен при focus)
    const handleClick = React.useCallback(() => {
      if (!isOpen) {
        setIsOpen(true)
      }
    }, [isOpen])

    // Обработчик изменения поискового запроса (отключен для оптимизации)
    // const handleSearch = React.useCallback((searchValue: string) => {
    //   if (import.meta.env.DEV) {
    //     console.log('🔍 NomenclatureSupplier search query changed:', searchValue) // LOG: изменение поискового запроса номенклатуры поставщиков
    //   }
    //   setSearchQuery(searchValue)
    // }, [])

    // Обработчик закрытия dropdown (отключен для оптимизации)
    // const handleDropdownVisibleChange = React.useCallback((open: boolean) => {
    //   setIsOpen(open)
    //   if (!open) {
    //     setSearchQuery('')
    //   }
    // }, [])

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Стабилизируем массивы БЕЗ .map() для предотвращения бесконечных рендеров
    const stableSuggestionsKey = React.useMemo(() => {
      if (suggestions.length === 0) return 'no-suggestions'
      return `${suggestions.length}-${suggestions[0]?.id || ''}-${suggestions[suggestions.length - 1]?.id || ''}`
    }, [suggestions.length, suggestions[0]?.id, suggestions[suggestions.length - 1]?.id])

    const stableSuggestions = React.useMemo(() => {
      if (suggestions.length === 0) return []
      return suggestions.slice() // shallow copy для стабильности
    }, [stableSuggestionsKey])

    const stableOptionsKey = React.useMemo(() => {
      if (options.length === 0) return 'no-options'
      return `${options.length}-${options[0]?.value || ''}-${options[options.length - 1]?.value || ''}`
    }, [options.length, options[0]?.value, options[options.length - 1]?.value])

    const stableOptions = React.useMemo(() => {
      if (options.length === 0) return []
      return options.slice() // shallow copy для стабильности
    }, [stableOptionsKey])

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная стабилизация allOptions для предотвращения infinite renders
    const allOptionsKey = React.useMemo(() => {
      return `${stableSuggestionsKey}-${stableOptionsKey}`
    }, [stableSuggestionsKey, stableOptionsKey])

    const allOptions = React.useMemo(() => {
      // Ранний выход если нет данных
      if (stableSuggestions.length === 0 && stableOptions.length === 0) {
        return []
      }

      // LOG: пересборка опций номенклатуры поставщиков (только в development при изменениях)
      if (import.meta.env.DEV) {
        console.log('🔄 Rebuilding nomenclature supplier options:', {
          allOptionsKey,
          mlSuggestions: stableSuggestions.length,
          staticOptions: stableOptions.length,
          firstMLSuggestion: stableSuggestions[0] || null,
        }) // LOG: пересборка опций номенклатуры поставщиков
      }

      const mlOptions = stableSuggestions.map((suggestion) => ({
        value: suggestion.name, // Используем название как value для таблицы
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{suggestion.name}</span>
            <Space size="small">
              <Badge
                count={`${Math.round(suggestion.confidence * 100)}%`}
                style={{
                  backgroundColor:
                    suggestion.confidence > 0.7
                      ? '#52c41a'
                      : suggestion.confidence > 0.5
                        ? '#faad14'
                        : '#ff7875',
                  fontSize: '10px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                }}
              />
              <RobotOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
            </Space>
          </div>
        ),
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        isMLSuggestion: true,
        nomenclatureSupplierId: suggestion.id,
        nomenclatureSupplierName: suggestion.name,
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавляем key для корректной работы AutoComplete
        key: `ml-${suggestion.id}`,
      }))

      // Статические опции (из props)
      const staticOptions = stableOptions
        .filter((opt) => !mlOptions.some((mlOpt) => mlOpt.value === opt.value))
        .map((opt) => ({
          ...opt,
          isMLSuggestion: false,
        }))

      // Порядок: ML предложения -> Статические опции
      const result = [...mlOptions, ...staticOptions]

      // ДИАГНОСТИКА: проверяем структуру первых ML опций
      if (import.meta.env.DEV && mlOptions.length > 0) {
        console.log('🔍 ML Options structure check:', {
          firstMLOption: mlOptions[0],
          hasIsMLSuggestion: mlOptions[0]?.isMLSuggestion,
          hasNomenclatureSupplierId: mlOptions[0]?.nomenclatureSupplierId,
          hasNomenclatureSupplierName: mlOptions[0]?.nomenclatureSupplierName,
        }) // LOG: проверка структуры ML опций
      }

      // Ограничиваем количество опций для лучшей производительности
      return result.slice(0, 50) // максимум 50 опций для производительности
    }, [allOptionsKey]) // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем только стабильный ключ

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Поиск ML опции по selectedValue вместо полагания на параметр option
    const handleSelect = React.useCallback(
      (selectedValue: string, option: unknown) => {
        if (import.meta.env.DEV) {
          const debugOption = option as {
            isMLSuggestion?: boolean
            confidence?: number
            nomenclatureSupplierName?: string
            nomenclatureSupplierId?: string
          }
          console.log('🤖 ML NomenclatureSupplier: Option selected FULL DEBUG:', {
            // LOG: выбор опции номенклатуры поставщика в ML AutoComplete
            selectedValue,
            isMLSuggestion: debugOption?.isMLSuggestion,
            confidence: debugOption?.confidence,
            nomenclatureSupplierName: debugOption?.nomenclatureSupplierName,
            nomenclatureSupplierId: debugOption?.nomenclatureSupplierId,
            optionType: typeof option,
            optionKeys: option ? Object.keys(option as object) : [],
            hasCallback: !!onNomenclatureSupplierSelect,
          })
        }

        // РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Улучшенный поиск ML опции с множественными стратегиями поиска
        let mlOption = null

        // Стратегия 1: Поиск по selectedValue в allOptions
        mlOption = allOptions.find(
          (opt) => opt.value === selectedValue && (opt as any).isMLSuggestion
        ) as any

        // Стратегия 2: Если не нашли, попробуем поиск по переданному option параметру
        if (!mlOption && option && typeof option === 'object') {
          const optionObj = option as any
          if (optionObj.isMLSuggestion && optionObj.nomenclatureSupplierId) {
            mlOption = optionObj
          }
        }

        // Стратегия 3: Если всё ещё не нашли, ищем среди suggestions напрямую
        if (!mlOption && selectedValue) {
          const directSuggestion = stableSuggestions.find(s => s.name === selectedValue)
          if (directSuggestion) {
            mlOption = {
              isMLSuggestion: true,
              nomenclatureSupplierId: directSuggestion.id,
              nomenclatureSupplierName: directSuggestion.name,
              value: directSuggestion.name
            }
          }
        }

        if (import.meta.env.DEV) {
          console.log('🔍 РАДИКАЛЬНОЕ: Мультистратегический поиск ML опции:', {
            selectedValue,
            foundMLOption: !!mlOption,
            searchStrategies: {
              strategy1_allOptions: allOptions.some(opt => opt.value === selectedValue && (opt as any).isMLSuggestion),
              strategy2_optionParam: !!(option && typeof option === 'object' && (option as any).isMLSuggestion),
              strategy3_directSuggestions: !!stableSuggestions.find(s => s.name === selectedValue)
            },
            mlOptionData: mlOption ? {
              isMLSuggestion: mlOption.isMLSuggestion,
              nomenclatureSupplierId: mlOption.nomenclatureSupplierId,
              nomenclatureSupplierName: mlOption.nomenclatureSupplierName,
            } : null,
            hasCallback: !!onNomenclatureSupplierSelect,
            willCallCallback: !!(mlOption?.isMLSuggestion && onNomenclatureSupplierSelect),
          }) // LOG: мультистратегический поиск ML опции
        }

        if (mlOption?.isMLSuggestion && onNomenclatureSupplierSelect) {
          console.log('🎯 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: onNomenclatureSupplierSelect БУДЕТ ВЫЗВАН:', {
            nomenclatureSupplierId: mlOption.nomenclatureSupplierId,
            nomenclatureSupplierName: mlOption.nomenclatureSupplierName,
          }) // LOG: успешный вызов callback

          // КРИТИЧЕСКИ ВАЖНО: Выносим вызов callback в следующий тик для предотвращения race conditions
          setTimeout(() => {
            onNomenclatureSupplierSelect(
              mlOption.nomenclatureSupplierId,
              mlOption.nomenclatureSupplierName,
            )
            console.log('✅ РАДИКАЛЬНОЕ: Callback onNomenclatureSupplierSelect ВЫПОЛНЕН УСПЕШНО') // LOG: подтверждение выполнения
          }, 0)

        } else if (import.meta.env.DEV) {
          console.log('🚫 РАДИКАЛЬНОЕ: Callback НЕ вызван, диагностика:', {
            reason: !mlOption
              ? 'ML опция НЕ найдена ни одной стратегией'
              : !mlOption.isMLSuggestion
              ? 'НЕ ML предложение'
              : 'НЕТ callback функции',
            foundMLOption: !!mlOption,
            isMLSuggestion: mlOption?.isMLSuggestion,
            hasCallback: !!onNomenclatureSupplierSelect,
            allOptionsCount: allOptions.length,
            mlOptionsInAllOptions: allOptions.filter(opt => (opt as any).isMLSuggestion).length,
            suggestionsCount: stableSuggestions.length,
            optionParam: option,
          }) // LOG: подробная диагностика провала
        }

        // Передаем название поставщика в onChange
        onChange?.(selectedValue, option)
      },
      [onChange, onNomenclatureSupplierSelect, allOptions, stableSuggestions], // РАДИКАЛЬНОЕ: Добавляем stableSuggestions в зависимости
    )

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '32px',
        }}
      >
        <AutoComplete
          value={value}
          onChange={onChange}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onClick={handleClick}
          placeholder={placeholder}
          style={{
            width: '100%',
            ...style,
          }}
          disabled={disabled}
          allowClear={allowClear}
          showSearch={showSearch}
          filterOption={filterOption}
          // onSearch={handleSearch} // Отключено для оптимизации
          options={allOptions}
        onDropdownVisibleChange={(open) => {
          if (import.meta.env.DEV && open && allOptions.length > 0) {
            console.log('🔍 ML NomenclatureSupplier: Dropdown opened, options available:', {
              totalOptions: allOptions.length,
              mlOptionsCount: allOptions.filter(opt => (opt as any).isMLSuggestion).length,
              firstMLOption: allOptions.find(opt => (opt as any).isMLSuggestion),
            }) // LOG: dropdown открыт, опции доступны
          }
        }}
          dropdownStyle={{
            zIndex: 9999,
          }}
          getPopupContainer={(triggerNode) => {
            const scrollContainer =
              triggerNode.closest('.ant-table-body') ||
              triggerNode.closest('.ant-table-container') ||
              triggerNode.closest('[data-testid="table-scroll-container"]') ||
              document.body
            return scrollContainer as HTMLElement
          }}
          popupMatchSelectWidth={false}
          loading={isLoading}
          notFoundContent={
            isLoading ? (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: '#666',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RobotOutlined spin style={{ marginRight: '8px' }} />
                ML анализирует материал для поиска номенклатуры поставщиков...
              </div>
            ) : materialName.length >= 2 ? (
              suggestions.length === 0 && config?.enabled ? (
                <div
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    color: '#666',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                  Кликните для ML-анализа номенклатуры поставщиков для "
                  {materialName.substring(0, 20)}
                  {materialName.length > 20 ? '...' : ''}"
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    color: '#666',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Нет подходящей номенклатуры поставщиков
                </div>
              )
            ) : (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: '#666',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {materialName.length < 2
                  ? 'Сначала введите материал (мин. 2 символа)'
                  : 'Кликните для ML-подбора номенклатуры поставщиков'}
              </div>
            )
          }
          {...props}
        />

        {/* ML статус индикатор для номенклатуры поставщиков */}
        {!disableML && config?.enabled && materialName.length >= 2 && (
          <div
            style={{
              position: 'absolute',
              top: '-26px',
              right: '0px',
              fontSize: '11px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '20px',
              minWidth: '160px',
              justifyContent: 'flex-end',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RobotOutlined spin style={{ color: '#1890ff' }} />
                <span>ML анализ номенклатуры поставщиков...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <Tooltip
                title={`ML модель: ${modelUsed}, Время: ${processingTime}мс, Средняя уверенность: ${Math.round(confidence * 100)}%`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'auto',
                  }}
                >
                  <ThunderboltFilled style={{ color: '#52c41a' }} />
                  <span style={{ color: '#52c41a' }}>{suggestions.length} ML номенклатур</span>
                </div>
              </Tooltip>
            ) : (
              <Tooltip title="Кликните на поле для ML-анализа номенклатуры поставщиков">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'auto',
                  }}
                >
                  <RobotOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#1890ff' }}>Готов к ML-анализу</span>
                </div>
              </Tooltip>
            )}
          </div>
        )}

        {/* Дебаг информация (только в development) */}
        {!disableML && import.meta.env.DEV && suggestions.length > 0 && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              color: '#999',
              fontFamily: 'monospace',
            }}
          >
            🤖 ML NomenclatureSuppliers: {suggestions.length} suggestions, {processingTime}ms,
            model: {modelUsed}
          </div>
        )}
      </div>
    )
  },
)

// Добавляем displayName для отладки
MLNomenclatureSupplierSelect.displayName = 'MLNomenclatureSupplierSelect'

export default MLNomenclatureSupplierSelect
