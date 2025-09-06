import { useState, useEffect, useMemo } from 'react'
import { Card, Col, Row, Typography, Tag, Spin, Empty, Badge, Select, Space, Tooltip } from 'antd'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useQuery } from '@tanstack/react-query'
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [columns, setColumns] = useState<Record<string, DocumentInfo[]>>({})
  
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
      const filtered = allStatuses.filter(s => 
        s.is_active && s.applicable_pages && (
          s.applicable_pages.includes('documents/chessboard') || 
          s.applicable_pages.includes('chessboard')
        )
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
      
      const { data, error } = await supabase
        .from('documentations')
        .select('id, code, project_name')
        .eq('project_id', selectedProjectId)
        .order('code', { ascending: true })
      
      if (error) {
        console.error('Error loading project documents:', error)
        return []
      }
      
      return (data || []).map(doc => ({
        documentation_id: doc.id,
        code: doc.code,
        project_name: doc.project_name
      } as DocumentInfo))
    }
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
            documents.push(...(set.documents as DocumentInfo[]).map((d) => ({
              documentation_id: d.documentation_id,
              code: d.code,
              project_name: d.project_name,
              version_id: d.version_id,
              version_number: d.version_number,
              issue_date: d.issue_date
            })))
          }
          
          return {
            ...set,
            documents,
            status: statusMapping?.status || null
          } as SetWithDocuments
        })
      )

      return setsWithFullData
    },
  })

  // Сортируем статусы согласно порядку
  const sortedStatuses = useMemo(() => {
    if (!statuses || !statusOrder) return statuses

    // Создаем мапу порядка
    const orderMap = new Map(statusOrder.map(item => [item.status_id, item.order_position]))
    
    // Сортируем статусы согласно порядку
    return [...statuses].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Number.MAX_VALUE
      const orderB = orderMap.get(b.id) ?? Number.MAX_VALUE
      return orderA - orderB
    })
  }, [statuses, statusOrder])

  // Группируем документы по статусам комплектов
  useEffect(() => {
    if (!setsWithDocuments || !statuses || !allProjectDocuments) {
      return
    }

    const newColumns: Record<string, DocumentInfo[]> = {
      'no-status': [], // Колонка для документов, не включенных в комплекты
    }

    // Создаем колонки для каждого статуса
    const orderedStatuses = sortedStatuses || statuses
    orderedStatuses.forEach(status => {
      newColumns[status.id] = []
    })

    // Создаем Map для уникальных документов по статусам
    const documentsByStatus = new Map<string, Map<string, DocumentInfo>>()
    
    // Инициализируем Map для каждого статуса
    orderedStatuses.forEach(status => {
      documentsByStatus.set(status.id, new Map())
    })

    // Собираем все документы, которые используются в комплектах
    const usedDocumentIds = new Set<string>()

    // Распределяем документы по статусам комплектов
    setsWithDocuments.forEach(set => {
      const statusId = set.status?.id
      
      if (statusId && set.documents) {
        const statusDocs = documentsByStatus.get(statusId)
        if (statusDocs) {
          // Добавляем документы из комплекта в соответствующий статус
          set.documents.forEach(doc => {
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
        set.documents.forEach(doc => {
          usedDocumentIds.add(doc.documentation_id)
        })
      }
    })

    // Преобразуем Map обратно в массивы для колонок со статусами
    documentsByStatus.forEach((docsMap, statusId) => {
      newColumns[statusId] = Array.from(docsMap.values())
    })

    // Добавляем в столбец "Без статуса" все документы проекта, не включенные в комплекты
    newColumns['no-status'] = allProjectDocuments.filter(doc => 
      !usedDocumentIds.has(doc.documentation_id)
    )

    setColumns(newColumns)
  }, [setsWithDocuments, statuses, sortedStatuses, allProjectDocuments])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const sourceColumn = result.source.droppableId
    const destColumn = result.destination.droppableId

    if (sourceColumn === destColumn) return

    // Получаем документ, который перетаскиваем
    const doc = columns[sourceColumn][result.source.index]
    if (!doc) return

    // Обновляем локальное состояние
    const newColumns = { ...columns }
    newColumns[sourceColumn] = newColumns[sourceColumn].filter((_, i) => i !== result.source.index)
    newColumns[destColumn].splice(result.destination.index, 0, doc)
    setColumns(newColumns)

    // Находим все комплекты, содержащие этот документ
    const affectedSets = setsWithDocuments?.filter(set => 
      set.documents.some(d => d.documentation_id === doc.documentation_id)
    ) || []

    // Обновляем статус всех затронутых комплектов
    if (destColumn !== 'no-status' && supabase && affectedSets.length > 0) {
      for (const set of affectedSets) {
        try {
          // Сначала помечаем старые статусы как не текущие
          await supabase
            .from('statuses_mapping')
            .update({ is_current: false })
            .eq('entity_type', 'chessboard_set')
            .eq('entity_id', set.id)

          // Добавляем новый статус
          await supabase
            .from('statuses_mapping')
            .insert({
              entity_type: 'chessboard_set',
              entity_id: set.id,
              status_id: destColumn,
              is_current: true,
              comment: 'Изменено через канбан-доску'
            })
        } catch (error) {
          console.error('Error updating set status:', error)
        }
      }
    }
  }

  const isLoading = statusesLoading || setsLoading || docsLoading

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2}>Анализ проектов</Title>
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
              options={projects?.map(project => ({
                value: project.id,
                label: project.name
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
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Row gutter={16} style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
              {/* Колонка для документов без статуса */}
              <Col style={{ minWidth: 300, marginBottom: 16 }}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Не в комплектах</span>
                      <Badge count={columns['no-status']?.length || 0} showZero />
                    </div>
                  }
                  style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}
                  bodyStyle={{ height: 'calc(100% - 57px)', overflowY: 'auto' }}
                >
                  <Droppable droppableId="no-status">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ minHeight: 100 }}
                      >
                        {columns['no-status']?.length === 0 ? (
                          <Empty description="Нет документов" />
                        ) : (
                          columns['no-status']?.map((doc, index) => (
                            <Draggable
                              key={`no-status-${doc.documentation_id}`}
                              draggableId={`no-status-${doc.documentation_id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    marginBottom: 8,
                                  }}
                                >
                                  <Card
                                    size="small"
                                    style={{
                                      backgroundColor: snapshot.isDragging ? '#f0f0f0' : '#fff',
                                      cursor: 'move',
                                    }}
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
                                              whiteSpace: 'nowrap'
                                            }}
                                          >
                                            {doc.project_name}
                                          </Text>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Card>
              </Col>

              {/* Колонки для каждого статуса */}
              {(sortedStatuses || statuses)?.map(status => (
                <Col key={status.id} style={{ minWidth: 300, marginBottom: 16 }}>
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Tag color={status.color || '#888'}>{status.name}</Tag>
                        <Badge count={columns[status.id]?.length || 0} showZero />
                      </div>
                    }
                    style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}
                    bodyStyle={{ height: 'calc(100% - 57px)', overflowY: 'auto' }}
                  >
                    <Droppable droppableId={status.id}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{ minHeight: 100 }}
                        >
                          {columns[status.id]?.length === 0 ? (
                            <Empty description="Нет документов" />
                          ) : (
                            columns[status.id]?.map((doc, index) => (
                              <Draggable
                                key={`${status.id}-${doc.documentation_id}`}
                                draggableId={`${status.id}-${doc.documentation_id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      marginBottom: 8,
                                    }}
                                  >
                                    <Card
                                      size="small"
                                      style={{
                                        backgroundColor: snapshot.isDragging ? '#f0f0f0' : '#fff',
                                        cursor: 'move',
                                      }}
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
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {doc.project_name}
                                            </Text>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </Col>
              ))}
            </Row>
          </DragDropContext>
        )}
      </Space>
    </div>
  )
}