import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Col,
  Row,
  Typography,
  Tag,
  Spin,
  Empty,
  Badge,
  Select,
  Space,
  Tooltip,
  Segmented,
  Button,
  Modal,
  Checkbox,
  Input,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { statusesApi, kanbanStatusOrderApi } from '@/entities/statuses'

const { Title, Text } = Typography

interface DocumentInfo {
  documentation_id: string
  code: string
  project_name?: string
  version_id?: string
  version_number?: string
  issue_date?: string
}

interface SetWithDocuments {
  id: string
  set_number: string
  name?: string
  project_id: string
  tag_id?: string | null
  block_ids?: string[] | null
  cost_category_ids?: string[] | null
  cost_type_ids?: string[] | null
  documents: DocumentInfo[] // JSONB массив документов из view
  status?: {
    id: string
    name: string
    color?: string
  } | null
  created_at: string
  updated_at: string
}

const KANBAN_PAGE_ID = 'project-analysis'

export default function ProjectAnalysis() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [columns, setColumns] = useState<Record<string, DocumentInfo[]>>({})
  const [viewMode, setViewMode] = useState<'projects' | 'sets'>('projects')
  const [isCreateVorModalOpen, setIsCreateVorModalOpen] = useState(false)
  const [selectedSets, setSelectedSets] = useState<string[]>([])
  const [vorName, setVorName] = useState('')

  // Загружаем список проектов
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-kanban'],
    queryFn: async () => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading projects:', error)
        return []
      }

      return data || []
    },
  })

  // Загружаем статусы для страницы Шахматка
  const { data: statuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['statuses', 'chessboard'],
    queryFn: async () => {
      const allStatuses = await statusesApi.getStatuses()
      // Фильтруем статусы для Шахматки - проверяем оба возможных ключа
      const filtered = allStatuses.filter(
        (s) =>
          s.is_active &&
          s.applicable_pages &&
          (s.applicable_pages.includes('documents/chessboard') ||
            s.applicable_pages.includes('chessboard')),
      )
      return filtered
    },
  })

  // Загружаем порядок статусов для канбан-доски
  const { data: statusOrder } = useQuery({
    queryKey: ['kanban-status-order', KANBAN_PAGE_ID],
    queryFn: async () => {
      return await kanbanStatusOrderApi.getStatusOrder(KANBAN_PAGE_ID)
    },
  })

  // Загружаем все документы проекта из справочника Документация
  const { data: allProjectDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['project-documents', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      if (!supabase || !selectedProjectId) return []

      // Загружаем документы через таблицу маппинга
      const { data, error } = await supabase
        .from('documentations_projects_mapping')
        .select(
          `
          documentation:documentations(
            id,
            code,
            project_name
          )
        `,
        )
        .eq('project_id', selectedProjectId)

      if (error) {
        console.error('Error loading project documents:', error)
        return []
      }

      const mappedDocs = (data || [])
        .filter((item: any) => item.documentation) // Фильтруем записи без документации
        .map(
          (item: any) =>
            ({
              documentation_id: item.documentation.id,
              code: item.documentation.code,
              project_name: item.documentation.project_name,
            }) as DocumentInfo,
        )
        .sort((a, b) => a.code.localeCompare(b.code)) // Сортируем по коду

      return mappedDocs
    },
  })

  // Загружаем комплекты шахматки с документами для выбранного проекта
  const { data: setsWithDocuments, isLoading: setsLoading } = useQuery({
    queryKey: ['chessboard-sets-with-docs', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      if (!supabase || !selectedProjectId) return []

      // Получаем комплекты для выбранного проекта
      const { data: sets, error: setsError } = await supabase
        .from('chessboard_sets_with_documents')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })

      if (setsError) {
        console.error('Error loading sets:', setsError)
        return []
      }

      if (!sets || sets.length === 0) {
        return []
      }

      // Для каждого комплекта загружаем документы и статус
      const setsWithFullData = await Promise.all(
        sets.map(async (set) => {
          // Загружаем статус комплекта
          const { data: statusMapping, error: statusError } = await supabase!
            .from('statuses_mapping')
            .select('status:statuses(id, name, color)')
            .eq('entity_type', 'chessboard_set')
            .eq('entity_id', set.id)
            .eq('is_current', true)
            .single()

          if (statusError && statusError.code !== 'PGRST116') {
            console.error('Error loading status for set:', set.id, statusError)
          }

          // Извлекаем документы из JSONB поля
          // documents уже содержит всю нужную информацию (code, project_name и т.д.)
          const documents: DocumentInfo[] = []

          if (set.documents && Array.isArray(set.documents)) {
            // Добавляем документы из JSONB напрямую
            documents.push(
              ...(set.documents as DocumentInfo[]).map((d) => ({
                documentation_id: d.documentation_id,
                code: d.code,
                project_name: d.project_name,
                version_id: d.version_id,
                version_number: d.version_number,
                issue_date: d.issue_date,
              })),
            )
          }

          return {
            ...set,
            documents,
            status: statusMapping?.status || null,
          } as SetWithDocuments
        }),
      )

      return setsWithFullData
    },
  })

  // Сортируем статусы согласно порядку
  const sortedStatuses = useMemo(() => {
    if (!statuses || !statusOrder) return statuses

    // Создаем мапу порядка
    const orderMap = new Map(statusOrder.map((item) => [item.status_id, item.order_position]))

    // Сортируем статусы согласно порядку
    return [...statuses].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Number.MAX_VALUE
      const orderB = orderMap.get(b.id) ?? Number.MAX_VALUE
      return orderA - orderB
    })
  }, [statuses, statusOrder])

  // Мемоизированный список статусов в правильном порядке
  const orderedStatuses = useMemo(() => {
    return sortedStatuses || statuses
  }, [sortedStatuses, statuses])

  // Группируем документы по статусам комплектов
  useEffect(() => {
    // Проверяем, что данные загружены
    if (!statuses || statuses.length === 0) {
      return
    }

    if (!allProjectDocuments || allProjectDocuments.length === 0) {
      return
    }

    // Для комплектов допускаем пустой массив
    if (!setsWithDocuments) {
      return
    }

    const newColumns: Record<string, DocumentInfo[]> = {
      'no-status': [], // Колонка для документов, не включенных в комплекты
    }

    // Создаем колонки для каждого статуса
    orderedStatuses.forEach((status) => {
      newColumns[status.id] = []
    })

    // Создаем Map для уникальных документов по статусам
    const documentsByStatus = new Map<string, Map<string, DocumentInfo>>()

    // Инициализируем Map для каждого статуса
    orderedStatuses.forEach((status) => {
      documentsByStatus.set(status.id, new Map())
    })

    // Собираем все документы, которые используются в комплектах
    const usedDocumentIds = new Set<string>()

    // Распределяем документы по статусам комплектов
    setsWithDocuments.forEach((set) => {
      const statusId = set.status?.id

      if (statusId && set.documents) {
        const statusDocs = documentsByStatus.get(statusId)
        if (statusDocs) {
          // Добавляем документы из комплекта в соответствующий статус
          set.documents.forEach((doc) => {
            // Используем documentation_id как ключ для уникальности
            if (!statusDocs.has(doc.documentation_id)) {
              statusDocs.set(doc.documentation_id, doc)
            }
            // Отмечаем документ как использованный
            usedDocumentIds.add(doc.documentation_id)
          })
        }
      } else if (!statusId && set.documents) {
        // Если у комплекта нет статуса, добавляем его документы в использованные
        set.documents.forEach((doc) => {
          usedDocumentIds.add(doc.documentation_id)
        })
      }
    })

    // Преобразуем Map обратно в массивы для колонок со статусами
    documentsByStatus.forEach((docsMap, statusId) => {
      newColumns[statusId] = Array.from(docsMap.values())
    })

    // Добавляем в столбец "Без статуса" все документы проекта, не включенные в комплекты
    newColumns['no-status'] = allProjectDocuments.filter(
      (doc) => !usedDocumentIds.has(doc.documentation_id),
    )

    setColumns(newColumns)
  }, [setsWithDocuments, orderedStatuses, allProjectDocuments])

  // Обработка клика на документ для перехода на страницу Шахматка
  const handleDocumentClick = (doc: DocumentInfo, statusId?: string) => {
    // Если документ в столбце со статусом, ищем комплект с этим документом и статусом
    if (statusId && statusId !== 'no-status' && setsWithDocuments) {
      const set = setsWithDocuments.find(
        (s) =>
          s.status?.id === statusId &&
          s.documents.some((d) => d.documentation_id === doc.documentation_id),
      )

      if (set) {
        // Формируем URL с фильтрами комплекта
        const params = new URLSearchParams()

        // Обязательный параметр - проект
        if (set.project_id) {
          params.append('project_id', set.project_id)
        }

        // Добавляем фильтры из комплекта
        if (set.tag_id) {
          params.append('tag_id', set.tag_id)
        }

        if (set.block_ids && set.block_ids.length > 0) {
          set.block_ids.forEach((id) => params.append('block_ids', id))
        }

        if (set.cost_category_ids && set.cost_category_ids.length > 0) {
          set.cost_category_ids.forEach((id) => params.append('cost_category_ids', id))
        }

        if (set.cost_type_ids && set.cost_type_ids.length > 0) {
          set.cost_type_ids.forEach((id) => params.append('cost_type_ids', id))
        }

        // Добавляем документ
        params.append('documentation_id', doc.documentation_id)

        // Переходим на страницу Шахматка с фильтрами
        navigate(`/documents/chessboard?${params.toString()}`)
      }
    }
  }

  const isLoading = statusesLoading || setsLoading || docsLoading

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2}>Анализ документации</Title>
              <Space size="middle">
                <Segmented
                  options={[
                    { label: 'Проекты', value: 'projects' },
                    { label: 'Комплекты', value: 'sets' },
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                />
                {viewMode === 'sets' && selectedProjectId && (
                  <Button
                    type="primary"
                    onClick={() => setIsCreateVorModalOpen(true)}
                    disabled={!setsWithDocuments || setsWithDocuments.length === 0}
                  >
                    Создать ВОР
                  </Button>
                )}
              </Space>
            </Space>
          </Col>
          <Col>
            <Select
              placeholder="Выберите проект"
              style={{ width: 400 }}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              allowClear
              showSearch
              loading={projectsLoading}
              notFoundContent={projectsLoading ? 'Загрузка...' : 'Нет доступных проектов'}
              filterOption={(input, option) => {
                const text = option?.label?.toString() || ''
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              options={projects?.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </Col>
        </Row>

        {!selectedProjectId ? (
          <Empty description="Выберите проект для отображения канбан-доски" />
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : !setsWithDocuments || setsWithDocuments.length === 0 ? (
          <Empty description="Для выбранного проекта нет комплектов шахматки" />
        ) : viewMode === 'projects' ? (
          <Row gutter={16} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {/* Колонка для документов без статуса */}
            <Col style={{ minWidth: 300, marginBottom: 16 }}>
              <Card
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Не анализировались</span>
                    <Badge count={columns['no-status']?.length || 0} showZero />
                  </div>
                }
                style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}
                styles={{ body: { height: 'calc(100% - 57px)', overflowY: 'auto' } }}
              >
                <div style={{ minHeight: 100 }}>
                  {columns['no-status']?.length === 0 ? (
                    <Empty description="Нет документов" />
                  ) : (
                    columns['no-status']?.map((doc) => (
                      <div key={`no-status-${doc.documentation_id}`} style={{ marginBottom: 8 }}>
                        <Card
                          size="small"
                          style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                          onClick={() => handleDocumentClick(doc, 'no-status')}
                        >
                          <div>
                            <Text strong>{doc.code}</Text>
                            {doc.project_name && (
                              <Tooltip title={doc.project_name}>
                                <Text
                                  style={{
                                    display: 'block',
                                    fontSize: 11,
                                    color: '#666',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {doc.project_name}
                                </Text>
                              </Tooltip>
                            )}
                          </div>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </Col>

            {/* Колонки для каждого статуса */}
            {(sortedStatuses || statuses)?.map((status) => (
              <Col key={status.id} style={{ minWidth: 300, marginBottom: 16 }}>
                <Card
                  title={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Tag color={status.color || '#888'}>{status.name}</Tag>
                      <Badge count={columns[status.id]?.length || 0} showZero />
                    </div>
                  }
                  style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}
                  styles={{ body: { height: 'calc(100% - 57px)', overflowY: 'auto' } }}
                >
                  <div style={{ minHeight: 100 }}>
                    {columns[status.id]?.length === 0 ? (
                      <Empty description="Нет документов" />
                    ) : (
                      columns[status.id]?.map((doc) => (
                        <div
                          key={`${status.id}-${doc.documentation_id}`}
                          style={{ marginBottom: 8 }}
                        >
                          <Card
                            size="small"
                            style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                            onClick={() => handleDocumentClick(doc, status.id)}
                          >
                            <div>
                              <Text strong>{doc.code}</Text>
                              {doc.project_name && (
                                <Tooltip title={doc.project_name}>
                                  <Text
                                    style={{
                                      display: 'block',
                                      fontSize: 11,
                                      color: '#666',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {doc.project_name}
                                  </Text>
                                </Tooltip>
                              )}
                            </div>
                          </Card>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          // Канбан для комплектов - только статусы, без колонки "Не анализировались"
          <Row gutter={16} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {(orderedStatuses || [])?.map((status) => (
              <Col key={status.id} style={{ minWidth: 300, marginBottom: 16 }}>
                <Card
                  title={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{status.name}</span>
                      <Badge
                        count={
                          setsWithDocuments?.filter((set) => set.status?.id === status.id).length ||
                          0
                        }
                        showZero
                      />
                    </div>
                  }
                  style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}
                  styles={{ body: { height: 'calc(100% - 57px)', overflowY: 'auto' } }}
                >
                  <div style={{ minHeight: 100 }}>
                    {!setsWithDocuments?.filter((set) => set.status?.id === status.id).length ? (
                      <Empty description="Нет комплектов" />
                    ) : (
                      setsWithDocuments
                        ?.filter((set) => set.status?.id === status.id)
                        .map((set) => (
                          <div key={set.id} style={{ marginBottom: 8 }}>
                            <Card
                              size="small"
                              style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                              onClick={() => {
                                // Переход на страницу Шахматка с фильтрами комплекта
                                const params = new URLSearchParams()
                                params.append('project_id', set.project_id)
                                if (set.tag_id) params.append('tag_id', set.tag_id)
                                if (set.block_ids?.length) {
                                  set.block_ids.forEach((id) => params.append('block_ids', id))
                                }
                                if (set.cost_category_ids?.length) {
                                  set.cost_category_ids.forEach((id) =>
                                    params.append('cost_category_ids', id),
                                  )
                                }
                                if (set.cost_type_ids?.length) {
                                  set.cost_type_ids.forEach((id) =>
                                    params.append('cost_type_ids', id),
                                  )
                                }

                                // Добавляем документы (Шифр проекта)
                                if (set.documents?.length) {
                                  set.documents.forEach((doc) =>
                                    params.append('documentation_id', doc.documentation_id),
                                  )
                                }

                                navigate(`/documents/chessboard?${params.toString()}`)
                              }}
                            >
                              <div>
                                <Text strong>{set.set_number}</Text>
                                {set.name && (
                                  <Tooltip title={set.name}>
                                    <Text
                                      style={{
                                        display: 'block',
                                        fontSize: 11,
                                        color: '#666',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginTop: 4,
                                      }}
                                    >
                                      {set.name}
                                    </Text>
                                  </Tooltip>
                                )}
                                <Text
                                  style={{
                                    display: 'block',
                                    fontSize: 10,
                                    color: '#999',
                                    marginTop: 4,
                                  }}
                                >
                                  Документов: {set.documents?.length || 0}
                                </Text>
                              </div>
                            </Card>
                          </div>
                        ))
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Space>

      {/* Модальное окно создания ВОР */}
      <Modal
        title="Создать ВОР"
        open={isCreateVorModalOpen}
        onCancel={() => {
          setIsCreateVorModalOpen(false)
          setSelectedSets([])
          setVorName('')
        }}
        onOk={async () => {
          if (selectedSets.length > 0 && vorName.trim() && selectedProjectId) {
            try {
              // 1. Создаем ВОР в БД
              const { data: vorData, error: vorError } = await supabase
                .from('vor')
                .insert({
                  name: vorName,
                  project_id: selectedProjectId,
                  rate_coefficient: 1.0,
                })
                .select('id')
                .single()

              if (vorError) throw vorError

              // 2. Создаем связи с комплектами
              const mappings = selectedSets.map((setId) => ({
                vor_id: vorData.id,
                set_id: setId,
              }))

              const { error: mappingError } = await supabase
                .from('vor_chessboard_sets_mapping')
                .insert(mappings)

              if (mappingError) throw mappingError

              // 3. Переход на страницу просмотра ВОР
              navigate(`/documents/vor-view?vor_id=${vorData.id}`)

              // Закрыть модальное окно
              setIsCreateVorModalOpen(false)
              setSelectedSets([])
              setVorName('')
            } catch (error) {
              console.error('Ошибка при создании ВОР:', error)
              // TODO: Добавить уведомление об ошибке
            }
          }
        }}
        okButtonProps={{
          disabled: selectedSets.length === 0 || !vorName.trim(),
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Выбор комплектов */}
          <div>
            <Typography.Title level={5}>Выберите комплекты:</Typography.Title>
            <div
              style={{
                maxHeight: 300,
                overflowY: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                padding: 12,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Checkbox
                  checked={
                    selectedSets.length === (setsWithDocuments?.length || 0) &&
                    (setsWithDocuments?.length || 0) > 0
                  }
                  indeterminate={
                    selectedSets.length > 0 &&
                    selectedSets.length < (setsWithDocuments?.length || 0)
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSets(setsWithDocuments?.map((set) => set.id) || [])
                    } else {
                      setSelectedSets([])
                    }
                  }}
                >
                  Выбрать все
                </Checkbox>
                {setsWithDocuments?.map((set) => (
                  <Checkbox
                    key={set.id}
                    checked={selectedSets.includes(set.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSets((prev) => [...prev, set.id])
                      } else {
                        setSelectedSets((prev) => prev.filter((id) => id !== set.id))
                      }
                    }}
                  >
                    <div>
                      <Text strong>{set.set_number}</Text>
                      {set.name && <Text style={{ marginLeft: 8 }}>{set.name}</Text>}
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        ({set.documents.length} документов)
                      </Text>
                    </div>
                  </Checkbox>
                ))}
              </Space>
            </div>
          </div>

          {/* Название ВОР */}
          <div>
            <Typography.Title level={5}>Название ВОР:</Typography.Title>
            <Select
              style={{ width: '100%' }}
              placeholder="Введите название или выберите из комплектов"
              value={vorName}
              onChange={setVorName}
              showSearch
              allowClear
              mode="combobox"
              filterOption={false}
            >
              {/* Предложения из названий выбранных комплектов */}
              {selectedSets.map((setId) => {
                const set = setsWithDocuments?.find((s) => s.id === setId)
                if (set?.name) {
                  return (
                    <Select.Option key={setId} value={set.name}>
                      {set.name}
                    </Select.Option>
                  )
                }
                return null
              })}
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
