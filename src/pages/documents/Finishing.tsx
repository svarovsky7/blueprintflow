import { useState, useEffect, useCallback } from 'react'
import { Typography, Select, Button, Space, Table, App } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  FilterOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'
import { StatusSelector } from './Finishing/components/StatusSelector'
import { CreateFinishingPieModal } from './Finishing/components/CreateFinishingPieModal'
import { VersionsModal } from './Finishing/components/VersionsModal'
import { useVersionsState } from './Finishing/hooks/useVersionsState'
import { createFinishingPie } from '@/entities/finishing/api/finishing-pie-api'
import type { FinishingPie, CreateFinishingPieDto } from '@/entities/finishing/model/types'

const { Title } = Typography

interface ProjectOption {
  value: string
  label: string
}

interface NumberOption {
  value: number
  label: string
}

interface DocumentationInfo {
  id: string
  code: string
}

interface DocumentVersion {
  id: string
  documentation_id: string
  version_number: number
}

export default function Finishing() {
  const { scale } = useScale()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([])
  const [selectedCostCategories, setSelectedCostCategories] = useState<number[]>([])
  const [selectedDocumentationTags, setSelectedDocumentationTags] = useState<number[]>([])
  const [selectedDocumentations, setSelectedDocumentations] = useState<string[]>([])

  // Примененные фильтры
  const [appliedFilters, setAppliedFilters] = useState({
    project: undefined as string | undefined,
    blocks: [] as string[],
    costCategories: [] as number[],
    documentationTags: [] as number[],
    documentations: [] as string[],
    versions: {} as Record<string, string>,
  })

  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [createModalVisible, setCreateModalVisible] = useState(false)

  // Хук для управления версиями документов
  const {
    versionsModalOpen,
    selectedVersions,
    openVersionsModal,
    closeVersionsModal,
    handleVersionSelect,
    applyVersions,
  } = useVersionsState()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const projectParam = params.get('project')
    if (projectParam) {
      setSelectedProject(projectParam)
      setAppliedFilters((prev) => ({ ...prev, project: projectParam }))
    }
  }, [location.search])

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['projects-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((p) => ({ value: p.id, label: p.name })) || []
    },
  })

  const { data: blocks = [] } = useQuery<ProjectOption[]>({
    queryKey: ['blocks-for-finishing', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return []

      const { data, error } = await supabase
        .from('projects_blocks')
        .select('block_id, blocks(id, name)')
        .eq('project_id', selectedProject)

      if (error) throw error
      return (
        data?.map((pb: any) => ({
          value: pb.blocks.id,
          label: pb.blocks.name,
        })) || []
      )
    },
    enabled: !!selectedProject,
  })

  const { data: costCategories = [] } = useQuery<NumberOption[]>({
    queryKey: ['cost-categories-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((c) => ({ value: c.id, label: c.name })) || []
    },
  })

  const { data: documentationTags = [] } = useQuery<NumberOption[]>({
    queryKey: ['documentation-tags-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentation_tags')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((t) => ({ value: t.id, label: t.name })) || []
    },
  })

  // Шифры проектов (зависят от раздела)
  const { data: documentations = [] } = useQuery<ProjectOption[]>({
    queryKey: ['documentations-for-finishing', selectedProject, selectedDocumentationTags],
    queryFn: async () => {
      if (!selectedProject) return []

      // Получить документацию, связанную с проектом
      const { data: projectDocs, error: docsError } = await supabase
        .from('documentations_projects_mapping')
        .select('documentation_id')
        .eq('project_id', selectedProject)

      if (docsError) throw docsError

      const docIds = projectDocs?.map((pd) => pd.documentation_id) || []
      if (docIds.length === 0) return []

      // Получить документы
      let query = supabase
        .from('documentations')
        .select('id, code, tag_id')
        .in('id', docIds)

      // Фильтрация по разделам
      if (selectedDocumentationTags.length > 0) {
        query = query.in('tag_id', selectedDocumentationTags)
      }

      const { data, error } = await query.order('code')

      if (error) throw error

      return (
        data?.map((d) => ({
          value: d.id,
          label: d.code || 'Без кода',
        })) || []
      )
    },
    enabled: !!selectedProject,
  })

  // Получить полную информацию о выбранных документах (для модального окна версий)
  const { data: documentationInfo = [] } = useQuery<DocumentationInfo[]>({
    queryKey: ['documentation-info-for-finishing', selectedDocumentations],
    queryFn: async () => {
      if (selectedDocumentations.length === 0) return []

      const { data, error } = await supabase
        .from('documentations')
        .select('id, code')
        .in('id', selectedDocumentations)
        .order('code')

      if (error) throw error
      return data || []
    },
    enabled: selectedDocumentations.length > 0,
  })

  // Получить версии для выбранных документов
  const { data: documentVersions = [] } = useQuery<DocumentVersion[]>({
    queryKey: ['documentation-versions-full-for-finishing', selectedDocumentations],
    queryFn: async () => {
      if (selectedDocumentations.length === 0) return []

      const { data, error } = await supabase
        .from('documentation_versions')
        .select('id, documentation_id, version_number')
        .in('documentation_id', selectedDocumentations)
        .order('documentation_id')
        .order('version_number', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: selectedDocumentations.length > 0,
  })

  const { data: finishingData = [] } = useQuery<FinishingPie[]>({
    queryKey: [
      'finishing-pie-documents',
      appliedFilters.project,
      appliedFilters.blocks,
      appliedFilters.costCategories,
      appliedFilters.documentationTags,
      appliedFilters.documentations,
      appliedFilters.versions,
    ],
    queryFn: async () => {
      if (!appliedFilters.project) return []

      let query = supabase
        .from('finishing_pie')
        .select('*, blocks(name), documentation_versions(documentation_id)')
        .eq('project_id', appliedFilters.project)

      if (appliedFilters.blocks.length > 0) {
        query = query.in('block_id', appliedFilters.blocks)
      }
      if (appliedFilters.costCategories.length > 0) {
        query = query.in('cost_category_id', appliedFilters.costCategories)
      }
      if (appliedFilters.documentationTags.length > 0) {
        query = query.in('documentation_tag_id', appliedFilters.documentationTags)
      }

      const { data: allData, error } = await query.order('name')

      if (error) throw error

      // Фильтрация по шифрам проектов и версиям на клиенте
      let filtered = allData || []

      // Фильтр по шифрам проектов
      if (appliedFilters.documentations.length > 0) {
        filtered = filtered.filter((doc: any) =>
          appliedFilters.documentations.includes(doc.documentation_versions?.documentation_id)
        )
      }

      // Фильтр по версиям документов
      if (Object.keys(appliedFilters.versions).length > 0) {
        filtered = filtered.filter((doc: any) => {
          const docId = doc.documentation_versions?.documentation_id
          if (!docId) return false
          const requiredVersionId = appliedFilters.versions[docId]
          return !requiredVersionId || doc.version_id === requiredVersionId
        })
      }

      return filtered.map((doc: any) => ({
        ...doc,
        block_name: doc.blocks?.name || null,
      }))
    },
    enabled: !!appliedFilters.project,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      statusId,
    }: {
      id: string
      field: 'status_finishing_pie' | 'status_type_calculation'
      statusId: string
    }) => {
      const { error } = await supabase
        .from('finishing_pie')
        .update({ [field]: statusId, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-documents'] })
      message.success('Статус обновлен')
    },
    onError: () => {
      message.error('Ошибка при обновлении статуса')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finishing_pie').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-documents'] })
      message.success('Документ удален')
    },
    onError: () => {
      message.error('Ошибка при удалении документа')
    },
  })

  const handleAddDocument = () => {
    if (!selectedProject) {
      message.error('Выберите проект')
      return
    }
    setCreateModalVisible(true)
  }

  const handleCreateDocument = async (dto: CreateFinishingPieDto) => {
    try {
      const newDoc = await createFinishingPie(dto)
      message.success('Документ успешно создан')
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-documents'] })
      setCreateModalVisible(false)
      // Переход на страницу редактирования
      navigate(`/documents/finishing-pie-type/${newDoc.id}?projectId=${selectedProject}`)
    } catch (error: any) {
      message.error(`Ошибка создания документа: ${error.message}`)
      throw error
    }
  }

  const handleOpenPieType = (id: string) => {
    const blockParam =
      selectedBlocks.length === 1 ? `&blockId=${selectedBlocks[0]}` : ''
    navigate(`/documents/finishing-pie-type/${id}?projectId=${selectedProject}${blockParam}`)
  }

  const handleOpenCalculation = (record: FinishingPie) => {
    const blockParam =
      selectedBlocks.length === 1 ? `&blockId=${selectedBlocks[0]}` : ''
    navigate(
      `/documents/finishing-calculation/${record.id}?projectId=${selectedProject}${blockParam}`
    )
  }

  const handleCreateCalculation = (record: FinishingPie) => {
    const blockParam =
      selectedBlocks.length === 1 ? `&blockId=${selectedBlocks[0]}` : ''
    navigate(
      `/documents/finishing-calculation/${record.id}?projectId=${selectedProject}${blockParam}`
    )
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleApplyFilters = () => {
    setAppliedFilters({
      project: selectedProject,
      blocks: selectedBlocks,
      costCategories: selectedCostCategories,
      documentationTags: selectedDocumentationTags,
      documentations: selectedDocumentations,
      versions: selectedVersions,
    })
  }

  const handleResetFilters = () => {
    setSelectedBlocks([])
    setSelectedCostCategories([])
    setSelectedDocumentationTags([])
    setSelectedDocumentations([])
    setAppliedFilters({
      project: selectedProject,
      blocks: [],
      costCategories: [],
      documentationTags: [],
      documentations: [],
      versions: {},
    })
  }

  // Обработчики версий документов
  const handleOpenVersionsModal = useCallback(() => {
    if (selectedDocumentations.length > 0) {
      if (documentationInfo.length > 0 && documentVersions.length > 0) {
        openVersionsModal(documentationInfo, documentVersions)
      }
    }
  }, [selectedDocumentations, documentationInfo, documentVersions, openVersionsModal])

  const handleApplyVersions = useCallback(() => {
    const requiredDocIds = documentationInfo.map((doc) => doc.id)
    applyVersions(requiredDocIds, (versions) => {
      setAppliedFilters((prev) => ({
        ...prev,
        versions,
      }))
    })
  }, [documentationInfo, applyVersions])

  const columns = [
    {
      title: 'Наименование документа',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text: string, record: FinishingPie) => (
        <Button type="link" onClick={() => handleOpenPieType(record.id)} style={{ padding: 0 }}>
          {text || 'Без названия'}
        </Button>
      ),
    },
    {
      title: 'Корпус',
      dataIndex: 'block_name',
      key: 'block_name',
      width: '15%',
      render: (text: string) => text || '—',
    },
    {
      title: 'Типы пирогов',
      key: 'pie_types',
      width: '20%',
      render: (_: any, record: FinishingPie) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => handleOpenPieType(record.id)}
          >
            Открыть
          </Button>
          <StatusSelector
            statusId={record.status_finishing_pie}
            onChange={(statusId) =>
              updateStatusMutation.mutate({
                id: record.id,
                field: 'status_finishing_pie',
                statusId,
              })
            }
          />
        </Space>
      ),
    },
    {
      title: 'Расчет по типам',
      key: 'calculation',
      width: '25%',
      render: (_: any, record: FinishingPie) => {
        const hasCalculation = !!record.status_type_calculation
        return (
          <Space size="small">
            <Button
              type="default"
              size="small"
              icon={hasCalculation ? <FolderOpenOutlined /> : <FileAddOutlined />}
              onClick={() =>
                hasCalculation
                  ? handleOpenCalculation(record)
                  : handleCreateCalculation(record)
              }
            >
              {hasCalculation ? 'Открыть расчет' : 'Создать расчет'}
            </Button>
            {hasCalculation && (
              <StatusSelector
                statusId={record.status_type_calculation}
                onChange={(statusId) =>
                  updateStatusMutation.mutate({
                    id: record.id,
                    field: 'status_type_calculation',
                    statusId,
                  })
                }
              />
            )}
          </Space>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: '60px',
      align: 'center' as const,
      render: (_: any, record: FinishingPie) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        />
      ),
    },
  ]

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Отделка
        </Title>
      </div>

      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Статичный блок фильтров */}
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="middle" wrap>
              <span>Проект:</span>
              <Select
                style={{ width: 250 }}
                placeholder="Выберите проект"
                value={selectedProject}
                onChange={(value) => {
                  setSelectedProject(value)
                  setSelectedBlocks([])
                  setSelectedDocumentationTags([])
                  setSelectedDocumentations([])
                  setAppliedFilters({
                    project: value,
                    blocks: [],
                    costCategories: [],
                    documentationTags: [],
                    documentations: [],
                    versions: {},
                  })
                }}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={projects}
              />
              {selectedProject && (
                <>
                  <span>Раздел:</span>
                  <Select
                    mode="multiple"
                    style={{ minWidth: 150, maxWidth: 350 }}
                    placeholder="Выберите разделы"
                    value={selectedDocumentationTags}
                    onChange={(value) => {
                      setSelectedDocumentationTags(value)
                      // Сброс зависимых фильтров
                      setSelectedDocumentations([])
                    }}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={documentationTags}
                  />

                  <span>Шифры проектов:</span>
                  <Select
                    mode="multiple"
                    style={{ minWidth: 200, maxWidth: 400 }}
                    placeholder="Выберите шифры"
                    value={selectedDocumentations}
                    onChange={setSelectedDocumentations}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label?.toString() || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={documentations}
                  />

                  {/* Кнопка выбора версий документов */}
                  {selectedDocumentations.length > 0 && (
                    <Button onClick={handleOpenVersionsModal}>Версии</Button>
                  )}

                  {/* Кнопки управления фильтрами */}
                  <Button
                    type="primary"
                    icon={<FilterOutlined />}
                    onClick={handleApplyFilters}
                  >
                    Применить
                  </Button>

                  <Button onClick={handleResetFilters}>Сбросить</Button>

                  <Button
                    icon={filtersExpanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                  >
                    {filtersExpanded ? 'Свернуть' : 'Развернуть'}
                  </Button>
                </>
              )}
            </Space>

            {/* Кнопка добавления */}
            {selectedProject && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDocument}>
                Добавить
              </Button>
            )}
          </Space>

          {/* Скрываемый блок фильтров */}
          {selectedProject && filtersExpanded && (
            <Space size="middle" wrap>
              <span>Корпус:</span>
              <Select
                mode="multiple"
                style={{ minWidth: 180, maxWidth: 350 }}
                placeholder="Выберите корпуса"
                value={selectedBlocks}
                onChange={setSelectedBlocks}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={blocks}
              />
              <span>Категория затрат:</span>
              <Select
                mode="multiple"
                style={{ minWidth: 200, maxWidth: 400 }}
                placeholder="Выберите категории"
                value={selectedCostCategories}
                onChange={setSelectedCostCategories}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={costCategories}
              />
            </Space>
          )}
        </Space>
      </div>

      {selectedProject ? (
        <div style={{ flex: 1, padding: '0 24px 24px 24px', overflow: 'hidden', minHeight: 0 }}>
          <Table
            columns={columns}
            dataSource={finishingData}
            rowKey="id"
            pagination={false}
            size="small"
            sticky
            scroll={{ y: 'calc(100vh - 300px)' }}
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
          }}
        >
          Выберите проект для отображения данных
        </div>
      )}

      <CreateFinishingPieModal
        visible={createModalVisible}
        projectId={selectedProject || ''}
        onCancel={() => setCreateModalVisible(false)}
        onCreate={handleCreateDocument}
      />

      <VersionsModal
        open={versionsModalOpen}
        onCancel={closeVersionsModal}
        onOk={handleApplyVersions}
        selectedDocumentations={documentationInfo}
        documentVersions={documentVersions}
        selectedVersions={selectedVersions}
        onVersionSelect={handleVersionSelect}
      />
    </div>
  )
}
