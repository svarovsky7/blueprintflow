import { useState, useMemo } from 'react'
import { Typography, Select, Button, Space, Table, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'

const { Title } = Typography

interface FinishingDocument {
  id: string
  name: string
  location?: string
}

interface ProjectOption {
  value: string
  label: string
}

export default function Finishing() {
  const { scale } = useScale()
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState<string>()

  // Загрузка проектов
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

  // Временные данные для таблиц (будут заменены реальными данными из БД)
  const pieTypesData: FinishingDocument[] = useMemo(() => [], [])
  const calculationData: FinishingDocument[] = useMemo(() => [], [])

  // Обработчики
  const handleAddPieType = () => {
    if (!selectedProject) {
      message.error('Выберите проект')
      return
    }
    navigate(`/documents/finishing-pie-type/new?projectId=${selectedProject}`)
  }

  const handleAddCalculation = () => {
    message.info('Создание нового документа "Расчет по типам"')
    // TODO: Открыть форму создания документа
  }

  const handleDeletePieType = (id: string) => {
    message.info(`Удаление документа Тип пирога: ${id}`)
    // TODO: Удаление документа
  }

  const handleDeleteCalculation = (id: string) => {
    message.info(`Удаление документа Расчет: ${id}`)
    // TODO: Удаление документа
  }

  const handleOpenDocument = (id: string, type: string) => {
    message.info(`Открытие документа ${type}: ${id}`)
    // TODO: Переход к документу
  }

  // Колонки для таблицы "Типы пирогов отделки"
  const pieTypesColumns = [
    {
      title: 'Документ',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
      render: (text: string, record: FinishingDocument) => (
        <Button
          type="link"
          onClick={() => handleOpenDocument(record.id, 'Тип пирога')}
          style={{ padding: 0 }}
        >
          {text || 'Без названия'}
        </Button>
      ),
    },
    {
      title: 'Локализация',
      dataIndex: 'location',
      key: 'location',
      width: '40%',
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'center' as const,
      render: (_: any, record: FinishingDocument) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeletePieType(record.id)}
        />
      ),
    },
  ]

  // Колонки для таблицы "Расчет по типам"
  const calculationColumns = [
    {
      title: 'Документ',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
      render: (text: string, record: FinishingDocument) => (
        <Button
          type="link"
          onClick={() => handleOpenDocument(record.id, 'Расчет')}
          style={{ padding: 0 }}
        >
          {text || 'Без названия'}
        </Button>
      ),
    },
    {
      title: 'Локализация',
      dataIndex: 'location',
      key: 'location',
      width: '40%',
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'center' as const,
      render: (_: any, record: FinishingDocument) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteCalculation(record.id)}
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
      {/* Заголовок страницы */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Отделка
        </Title>
      </div>

      {/* Фильтр выбора проекта */}
      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        <Space size="middle">
          <span>Проект:</span>
          <Select
            style={{ width: 300 }}
            placeholder="Выберите проект"
            value={selectedProject}
            onChange={setSelectedProject}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={projects}
          />
        </Space>
      </div>

      {/* Контейнер с двумя таблицами */}
      {selectedProject && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 16,
            padding: '0 24px 24px 24px',
            overflow: 'hidden',
          }}
        >
          {/* Таблица 1: Типы пирогов отделки */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              background: 'white',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Title level={4} style={{ margin: 0, fontSize: Math.round(16 * scale) }}>
                Типы пирогов отделки
              </Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPieType}>
                Добавить
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                columns={pieTypesColumns}
                dataSource={pieTypesData}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'Нет данных' }}
              />
            </div>
          </div>

          {/* Таблица 2: Расчет по типам */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              background: 'white',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Title level={4} style={{ margin: 0, fontSize: Math.round(16 * scale) }}>
                Расчет по типам
              </Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCalculation}>
                Добавить
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                columns={calculationColumns}
                dataSource={calculationData}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'Нет данных' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Подсказка, если проект не выбран */}
      {!selectedProject && (
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