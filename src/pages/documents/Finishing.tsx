import { useState, useEffect } from 'react'
import { Typography, Select, Button, Space, Table, App } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined, FileAddOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'
import { StatusSelector } from './Finishing/components/StatusSelector'
import type { FinishingPie } from '@/entities/finishing/model/types'

const { Title } = Typography

interface ProjectOption {
  value: string
  label: string
}

export default function Finishing() {
  const { scale } = useScale()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedBlock, setSelectedBlock] = useState<string>()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const projectParam = params.get('project')
    if (projectParam) {
      setSelectedProject(projectParam)
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

  const { data: finishingData = [] } = useQuery<FinishingPie[]>({
    queryKey: ['finishing-pie-documents', selectedProject, selectedBlock],
    queryFn: async () => {
      if (!selectedProject) return []

      let query = supabase
        .from('finishing_pie')
        .select('*, blocks(name)')
        .eq('project_id', selectedProject)

      if (selectedBlock) {
        query = query.eq('block_id', selectedBlock)
      }

      const { data, error } = await query.order('name')

      if (error) throw error
      return (
        data?.map((doc: any) => ({
          ...doc,
          block_name: doc.blocks?.name || null,
        })) || []
      )
    },
    enabled: !!selectedProject,
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
    const blockParam = selectedBlock ? `&blockId=${selectedBlock}` : ''
    navigate(`/documents/finishing-pie-type/new?projectId=${selectedProject}${blockParam}`)
  }

  const handleOpenPieType = (id: string) => {
    const blockParam = selectedBlock ? `&blockId=${selectedBlock}` : ''
    navigate(`/documents/finishing-pie-type/${id}?projectId=${selectedProject}${blockParam}`)
  }

  const handleOpenCalculation = (record: FinishingPie) => {
    const blockParam = selectedBlock ? `&blockId=${selectedBlock}` : ''
    navigate(
      `/documents/finishing-calculation/${record.id}?projectId=${selectedProject}${blockParam}`
    )
  }

  const handleCreateCalculation = (record: FinishingPie) => {
    const blockParam = selectedBlock ? `&blockId=${selectedBlock}` : ''
    navigate(
      `/documents/finishing-calculation/${record.id}?projectId=${selectedProject}${blockParam}`
    )
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

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
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="middle">
            <span>Проект:</span>
            <Select
              style={{ width: 300 }}
              placeholder="Выберите проект"
              value={selectedProject}
              onChange={(value) => {
                setSelectedProject(value)
                setSelectedBlock(undefined)
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
                <span>Корпус:</span>
                <Select
                  style={{ width: 200 }}
                  placeholder="Выберите корпус"
                  value={selectedBlock}
                  onChange={setSelectedBlock}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={blocks}
                />
              </>
            )}
          </Space>
          {selectedProject && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDocument}>
              Добавить
            </Button>
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
    </div>
  )
}
