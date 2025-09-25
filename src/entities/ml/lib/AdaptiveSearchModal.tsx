import React, { useState, useCallback } from 'react'
import { Modal, Input, Button, Card, message, Space, Table, Tag, Tooltip, Typography } from 'antd'
import {
  RobotOutlined,
  SearchOutlined,
  ThunderboltFilled,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { adaptiveHybridSearchSupplierNames, testSearchSupplierNames } from '../api/ml-api'

const { Text } = Typography

interface AdaptiveSearchModalProps {
  open: boolean
  onClose: () => void
}

interface ComparisonResults {
  adaptive: Array<{
    id: string
    name: string
    confidence: number
    matchDetails: {
      materialTokens: string[]
      sizeTokens: string[]
      brandTokens: string[]
      articleTokens: string[]
      matchType: string
      score: number
      explanation: string
    }
  }>
  other: {
    vectorResults: Array<{ id: string; name: string; confidence: number }>
    keywordResults: Array<{
      id: string
      name: string
      matchedKeywords: string[]
      relevanceScore: number
      matchType: string
    }>
    editingResults: Array<{ id: string; name: string; confidence: number }>
  }
}

export const AdaptiveSearchModal: React.FC<AdaptiveSearchModalProps> = ({ open, onClose }) => {
  const [materialName, setMaterialName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ComparisonResults | null>(null)
  const [testMaterials] = useState<string[]>([
    'пеноплэкс',
    'Кран шаровой резьбовой BVR-R DN32 BVR-R DN32 065B8310R Ридан',
  ])

  // Функция поиска четвертым алгоритмом
  const handleAdaptiveSearch = useCallback(async (material: string) => {
    if (!material.trim()) {
      message.error('Введите название материала')
      return
    }

    setIsLoading(true)
    console.log('🤖 Запуск адаптивного поиска для:', material) // LOG: запуск адаптивного поиска

    try {
      // Выполняем поиск четвертым алгоритмом и сравнение с остальными
      const [adaptiveResults, allResults] = await Promise.all([
        adaptiveHybridSearchSupplierNames(material.trim()),
        testSearchSupplierNames(material.trim()),
      ])

      setResults({
        adaptive: adaptiveResults,
        other: {
          vectorResults: allResults.vectorResults,
          keywordResults: allResults.keywordResults,
          editingResults: allResults.editingResults,
        },
      })

      message.success(`Адаптивный поиск найдел ${adaptiveResults.length} результатов`)
      console.log('🎯 Адаптивный поиск завершен успешно') // LOG: завершение адаптивного поиска
    } catch (error) {
      console.error('Ошибка адаптивного поиска:', error) // LOG: ошибка адаптивного поиска
      message.error('Ошибка при выполнении поиска')
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Функция быстрого тестирования на образцах
  const handleQuickTest = useCallback(
    (testMaterial: string) => {
      setMaterialName(testMaterial)
      handleAdaptiveSearch(testMaterial)
    },
    [handleAdaptiveSearch],
  )

  // Колонки для таблицы результатов адаптивного поиска
  const adaptiveColumns = [
    {
      title: '№',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Название поставщика',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Уверенность',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence: number) => {
        const percent = Math.round(confidence * 100)
        const color = percent >= 70 ? '#52c41a' : percent >= 50 ? '#faad14' : '#ff7875'
        return (
          <Tag color={color} style={{ minWidth: '50px', textAlign: 'center' }}>
            {percent}%
          </Tag>
        )
      },
      sorter: (a: { confidence: number }, b: { confidence: number }) => a.confidence - b.confidence,
    },
    {
      title: 'Тип совпадения',
      dataIndex: ['matchDetails', 'matchType'],
      key: 'matchType',
      width: 120,
      render: (matchType: string) => {
        const colors = {
          EXACT: '#52c41a',
          PARTIAL: '#1890ff',
          SEMANTIC: '#722ed1',
          BRAND: '#fa8c16',
          SIZE: '#eb2f96',
        }
        return <Tag color={colors[matchType as keyof typeof colors] || '#666'}>{matchType}</Tag>
      },
    },
    {
      title: 'Объяснение',
      dataIndex: ['matchDetails', 'explanation'],
      key: 'explanation',
      ellipsis: true,
      render: (explanation: string) => (
        <Tooltip title={explanation}>
          <Text type="secondary">{explanation}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Детали',
      key: 'details',
      width: 80,
      render: (
        _: unknown,
        record: {
          matchDetails?: {
            score: number
            materialTokens: string[]
            sizeTokens: string[]
            brandTokens: string[]
            articleTokens: string[]
          }
        },
      ) => (
        <Tooltip
          title={
            <div>
              <div>
                <strong>Счет:</strong> {record.matchDetails?.score}
              </div>
              <div>
                <strong>Материал:</strong> {record.matchDetails?.materialTokens.join(', ') || 'нет'}
              </div>
              <div>
                <strong>Размер:</strong> {record.matchDetails?.sizeTokens.join(', ') || 'нет'}
              </div>
              <div>
                <strong>Бренд:</strong> {record.matchDetails?.brandTokens.join(', ') || 'нет'}
              </div>
              <div>
                <strong>Артикул:</strong> {record.matchDetails?.articleTokens.join(', ') || 'нет'}
              </div>
            </div>
          }
        >
          <Button type="text" icon={<InfoCircleOutlined />} size="small" />
        </Tooltip>
      ),
    },
  ]

  // Функция сравнения с другими алгоритмами
  const renderComparison = () => {
    if (!results?.other) return null

    const { vectorResults, keywordResults, editingResults } = results.other
    const adaptiveIds = new Set(results.adaptive.map((r) => r.id))

    return (
      <Card title="Сравнение с другими алгоритмами" size="small" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>1. Векторный поиск: </Text>
            <Tag color={vectorResults.length > 0 ? 'blue' : 'red'}>
              {vectorResults.length} результатов
            </Tag>
            {vectorResults.some((r) => adaptiveIds.has(r.id)) && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Есть пересечения
              </Tag>
            )}
          </div>

          <div>
            <Text strong>2. Семантический поиск: </Text>
            <Tag color={keywordResults.length > 0 ? 'purple' : 'red'}>
              {keywordResults.length} результатов
            </Tag>
            {keywordResults.some((r) => adaptiveIds.has(r.id)) && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Есть пересечения
              </Tag>
            )}
          </div>

          <div>
            <Text strong>3. Режим редактирования: </Text>
            <Tag color={editingResults.length > 0 ? 'orange' : 'red'}>
              {editingResults.length} результатов
            </Tag>
            {editingResults.some((r) => adaptiveIds.has(r.id)) && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Есть пересечения
              </Tag>
            )}
          </div>

          <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
            <Text strong style={{ color: '#1890ff' }}>
              <ThunderboltFilled /> Адаптивный алгоритм: {results.adaptive.length} уникальных
              результатов
            </Text>
          </div>
        </Space>
      </Card>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#52c41a' }} />
          <span>Адаптивный гибридный поиск (4-й алгоритм)</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="95%"
      style={{ top: 20 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Поле ввода материала */}
        <Card title="Тестирование адаптивного поиска" size="small">
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input
              placeholder="Введите название материала для тестирования..."
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              onPressEnter={() => handleAdaptiveSearch(materialName)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => handleAdaptiveSearch(materialName)}
              loading={isLoading}
              disabled={!materialName.trim()}
            >
              Поиск
            </Button>
          </Space.Compact>

          {/* Быстрые тесты */}
          <div>
            <Text strong style={{ marginRight: 8 }}>
              Быстрые тесты:
            </Text>
            {testMaterials.map((testMaterial, index) => (
              <Button
                key={index}
                size="small"
                onClick={() => handleQuickTest(testMaterial)}
                style={{ marginRight: 8, marginBottom: 8 }}
                disabled={isLoading}
              >
                {testMaterial.length > 30 ? `${testMaterial.substring(0, 30)}...` : testMaterial}
              </Button>
            ))}
          </div>
        </Card>

        {/* Результаты адаптивного поиска */}
        {results && (
          <Card
            title={
              <Space>
                <ThunderboltFilled style={{ color: '#52c41a' }} />
                <span>Результаты адаптивного поиска ({results.adaptive.length})</span>
              </Space>
            }
            size="small"
          >
            {results.adaptive.length > 0 ? (
              <Table
                dataSource={results.adaptive}
                columns={adaptiveColumns}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
                }}
                scroll={{ y: 300 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                <ExclamationCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>Результатов не найдено</div>
              </div>
            )}
          </Card>
        )}

        {/* Сравнение с другими алгоритмами */}
        {renderComparison()}

        {/* Информация об алгоритме */}
        <Card title="Особенности адаптивного алгоритма" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>🔍 Автоматическая классификация:</Text>
              <Text> SIMPLE / TECHNICAL / MIXED</Text>
            </div>
            <div>
              <Text strong>🔤 Интеллектуальная токенизация:</Text>
              <Text> материал, размер, бренд, артикул</Text>
            </div>
            <div>
              <Text strong>🎯 Адаптивные стратегии:</Text>
              <Text> точный поиск, материал+размер, бренд, семантика</Text>
            </div>
            <div>
              <Text strong>📈 Умное ранжирование:</Text>
              <Text> бонусы за артикул (+20), размер (+10), бренд (+8)</Text>
            </div>
          </Space>
        </Card>
      </div>
    </Modal>
  )
}

export default AdaptiveSearchModal
