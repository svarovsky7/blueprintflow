import { useState, useEffect } from 'react'
import {
  Table,
  Typography,
  Space,
  Select,
  Button,
  Card,
  Row,
  Col,
  Modal,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Form,
  Tooltip,
} from 'antd'
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getVorTableData, calculateVorTotals, calculateVorTotalFromChessboard, VOR_TYPE_LABELS, type VorType } from '@/entities/vor'
import { checkSetChanges, type SetChangeStatus } from '@/entities/chessboard'
import { parseNumberWithSeparators } from '@/shared/lib'

const { Text } = Typography

interface VorRecord {
  id: string
  name: string
  sections: string[]
  created_at: string
  updated_at: string
  project_codes: string[]
  total_amount: number
  project_id: string
  rate_coefficient: number
  vor_type?: VorType
  // Новые поля для отслеживания изменений
  set_version?: number
  has_changes?: boolean
  changes_count?: number
}

const Vor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  // Инициализируем фильтры из URL параметров
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    searchParams.get('project_id') || undefined,
  )
  const [selectedSection, setSelectedSection] = useState<string | undefined>(
    searchParams.get('section') || undefined,
  )
  const [selectedCostCategory, setSelectedCostCategory] = useState<string | undefined>(
    searchParams.get('cost_category') || undefined,
  )
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingVor, setEditingVor] = useState<VorRecord | null>(null)
  const [deletingVor, setDeletingVor] = useState<VorRecord | null>(null)
  const [editingCoefficient, setEditingCoefficient] = useState<number>(1)
  const [form] = Form.useForm()

  // Загружаем проекты
  const { data: projects } = useQuery({
    queryKey: ['projects-for-vor'],
    queryFn: async () => {
      if (!supabase) return []

      const { data, error } = await supabase.from('projects').select('id, name').order('name')

      if (error) throw error
      return data
    },
  })

  // Загружаем разделы
  const { data: sections } = useQuery({
    queryKey: ['documentation-tags'],
    queryFn: async () => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('documentation_tags')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data
    },
  })

  // Загружаем категории затрат
  const { data: costCategories } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: async () => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data
    },
  })

  // Загружаем ВОР из БД с реальными данными
  const {
    data: vorRecords,
    isLoading: vorLoading,
    refetch: refetchVorRecords,
  } = useQuery({
    queryKey: ['vor-records', selectedProjectId, selectedSection, selectedCostCategory],
    queryFn: async () => {
      if (!supabase || !selectedProjectId) return []

      try {
        // Шаг 1: Получаем основные данные ВОР
        const { data: vorData, error: vorError } = await supabase
          .from('vor')
          .select(
            `
            id,
            name,
            project_id,
            rate_coefficient,
            vor_type,
            created_at,
            updated_at
          `,
          )
          .eq('project_id', selectedProjectId)

        if (vorError) throw vorError
        if (!vorData || vorData.length === 0) return []

        const vorIds = vorData.map((vor) => vor.id)

        // Шаг 2: Получаем связи ВОР с комплектами
        const { data: mappingData, error: mappingError } = await supabase
          .from('vor_chessboard_sets_mapping')
          .select('vor_id, set_id')
          .in('vor_id', vorIds)

        if (mappingError) console.warn('Ошибка получения связей ВОР:', mappingError)

        const setIds = [...new Set(mappingData?.map((m) => m.set_id) || [])]

        // Шаг 3: Получаем данные комплектов с тегами
        const { data: setsData, error: setsError } = await supabase
          .from('chessboard_sets')
          .select(
            `
            id,
            tag_id,
            documentation_tags (
              name
            )
          `,
          )
          .in('id', setIds)

        if (setsError) console.warn('Ошибка получения комплектов:', setsError)

        // Шаг 4: Получаем документы из комплектов
        const { data: documentsData, error: docsError } = await supabase
          .from('chessboard_sets_documents_mapping')
          .select(
            `
            set_id,
            documentation_id,
            documentations (
              code
            )
          `,
          )
          .in('set_id', setIds)

        if (docsError) console.warn('Ошибка получения документов:', docsError)

        // Создаем карты для быстрого поиска ПЕРЕД расчетом сумм
        const setTagsMap = new Map()
        setsData?.forEach((set: any) => {
          setTagsMap.set(set.id, set.documentation_tags?.name)
        })

        const setDocsMap = new Map()
        documentsData?.forEach((doc: any) => {
          if (!setDocsMap.has(doc.set_id)) {
            setDocsMap.set(doc.set_id, [])
          }
          if (doc.documentations?.code) {
            setDocsMap.get(doc.set_id).push(doc.documentations.code)
          }
        })

        const vorSetMap = new Map()
        mappingData?.forEach((mapping) => {
          if (!vorSetMap.has(mapping.vor_id)) {
            vorSetMap.set(mapping.vor_id, [])
          }
          vorSetMap.get(mapping.vor_id).push(mapping.set_id)
        })

        // Шаг 5: Вычисляем реальные суммы для каждого ВОР
        const calculationMap = new Map()

        for (const vorId of vorIds) {
          try {
            // Используем ту же логику приоритетов, что и VorView:
            // 1. Пробуем получить данные из БД (vor_works + vor_materials)
            const vorTableData = await getVorTableData(vorId)

            let totalAmount = 0

            if (vorTableData && vorTableData.length > 0) {
              // Если есть сохранённые данные в БД - используем их (ВОР был отредактирован)
              const totals = calculateVorTotals(vorTableData)
              totalAmount = totals.grandTotal
            } else {
              // Если данных в БД нет - строим из комплектов шахматки (новый ВОР)
              totalAmount = await calculateVorTotalFromChessboard(vorId)
            }

            calculationMap.set(vorId, totalAmount)
          } catch (error) {
            console.warn(`Ошибка расчета суммы для ВОР ${vorId}:`, error)
            calculationMap.set(vorId, 0)
          }
        }

        // Шаг 6: Получаем информацию о версиях и изменениях для каждого ВОР
        const changeStatusMap = new Map<string, SetChangeStatus>()

        for (const vorId of vorIds) {
          try {
            const changeStatus = await checkSetChanges(vorId)
            changeStatusMap.set(vorId, changeStatus)
          } catch (error) {
            console.warn(`Ошибка проверки изменений для ВОР ${vorId}:`, error)
          }
        }

        // Шаг 7: Собираем финальные данные
        return vorData.map((vor) => {
          const relatedSetIds = vorSetMap.get(vor.id) || []

          // Получаем разделы из связанных комплектов
          const sections = [
            ...new Set(relatedSetIds.map((setId: any) => setTagsMap.get(setId)).filter(Boolean)),
          ]

          // Получаем шифры проектов из документации
          const projectCodes = [
            ...new Set(relatedSetIds.flatMap((setId: any) => setDocsMap.get(setId) || [])),
          ]

          // Получаем сумму из таблицы расчетов
          const totalAmount = calculationMap.get(vor.id) || 0

          // Получаем информацию об изменениях
          const changeStatus = changeStatusMap.get(vor.id)

          return {
            id: vor.id,
            name: vor.name,
            sections: sections,
            created_at: vor.created_at,
            updated_at: vor.updated_at,
            project_codes: projectCodes,
            total_amount: totalAmount,
            project_id: vor.project_id,
            rate_coefficient: vor.rate_coefficient,
            vor_type: vor.vor_type,
            set_version: changeStatus?.currentVersion,
            has_changes: changeStatus?.hasChanges,
            changes_count: changeStatus?.changesCount,
          } as VorRecord
        })
      } catch (error) {
        console.error('Ошибка загрузки ВОР:', error)
        throw error
      }
    },
    enabled: !!selectedProjectId,
  })

  // Синхронизируем фильтры с URL параметрами после загрузки данных
  useEffect(() => {
    // Ждем загрузки всех данных для справочников
    if (projects && sections && costCategories) {
      const projectId = searchParams.get('project_id')
      const section = searchParams.get('section')
      const costCategory = searchParams.get('cost_category')

      setSelectedProjectId(projectId || undefined)
      setSelectedSection(section || undefined)
      setSelectedCostCategory(costCategory || undefined)
    }
  }, [projects, sections, costCategories, searchParams]) // Выполняется после загрузки справочников

  // Мутация для обновления коэффициента ВОР
  const updateCoefficientMutation = useMutation({
    mutationFn: async ({ vorId, coefficient }: { vorId: string; coefficient: number }) => {
      if (!supabase) throw new Error('No supabase client')

      const { error } = await supabase
        .from('vor')
        .update({ rate_coefficient: coefficient })
        .eq('id', vorId)

      if (error) throw error
    },
    onSuccess: () => {
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ['vor-records'] })
      message.success('Коэффициент успешно обновлен')
    },
    onError: (error) => {
      console.error('Ошибка обновления коэффициента:', error)
      message.error('Ошибка при обновлении коэффициента')
    },
  })

  // Обработчик изменения коэффициента
  const handleCoefficientChange = (vorId: string, value: number | null) => {
    const newValue = value || 1
    setEditingCoefficient(newValue)
    updateCoefficientMutation.mutate({ vorId, coefficient: newValue })
  }

  const handleResetFilters = () => {
    setSelectedProjectId(undefined)
    setSelectedSection(undefined)
    setSelectedCostCategory(undefined)
  }

  const handleEditVor = (vor: VorRecord) => {
    setEditingVor(vor)
    setEditingCoefficient(vor.rate_coefficient || 1)
    form.setFieldsValue({
      name: vor.name,
      rate_coefficient: vor.rate_coefficient,
    })
    setIsEditModalOpen(true)
  }

  const handleShowDeleteModal = (vor: VorRecord) => {
    setDeletingVor(vor)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteVor = async () => {
    try {
      if (!supabase || !deletingVor) return

      // Сначала удаляем связи с комплектами
      const { error: mappingError } = await supabase
        .from('vor_chessboard_sets_mapping')
        .delete()
        .eq('vor_id', deletingVor.id)

      if (mappingError) throw mappingError

      // Затем удаляем сам ВОР
      const { error: vorError } = await supabase.from('vor').delete().eq('id', deletingVor.id)

      if (vorError) throw vorError

      message.success('ВОР успешно удален')
      setIsDeleteModalOpen(false)
      setDeletingVor(null)
      refetchVorRecords()
    } catch (error) {
      console.error('Ошибка при удалении ВОР:', error)
      message.error('Ошибка при удалении ВОР')
    }
  }

  const handleSaveEdit = async () => {
    try {
      if (!editingVor || !supabase) return

      const values = await form.validateFields()

      const { error } = await supabase
        .from('vor')
        .update({
          name: values.name,
          // rate_coefficient обновляется отдельно при изменении
        })
        .eq('id', editingVor.id)

      if (error) throw error

      message.success('ВОР успешно обновлен')
      setIsEditModalOpen(false)
      setEditingVor(null)
      form.resetFields()
      refetchVorRecords()
    } catch (error) {
      console.error('Ошибка при обновлении ВОР:', error)
      message.error('Ошибка при обновлении ВОР')
    }
  }

  const columns = [
    {
      title: 'Раздел',
      dataIndex: 'sections',
      key: 'sections',
      width: 120,
      render: (sections: string[]) => sections.join(', '),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (text: string, record: VorRecord) => (
        <Button
          type="link"
          onClick={() => navigate(`/documents/vor-view?vor_id=${record.id}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a: VorRecord, b: VorRecord) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Версия',
      dataIndex: 'set_version',
      key: 'set_version',
      width: 100,
      align: 'center' as const,
      render: (version?: number) => version ? `v${version}` : '-',
      sorter: (a: VorRecord, b: VorRecord) => (a.set_version || 0) - (b.set_version || 0),
    },
    {
      title: 'Изменения в шахматке',
      key: 'changes_status',
      width: 180,
      align: 'center' as const,
      render: (_: unknown, record: VorRecord) => {
        if (record.has_changes === undefined) {
          return <Text type="secondary">-</Text>
        }

        if (record.has_changes) {
          return (
            <Tooltip title={`Комплект изменился (${record.changes_count || 0} изменений)`}>
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
                <Text type="danger">Есть изменения</Text>
              </Space>
            </Tooltip>
          )
        }

        return (
          <Tooltip title="Данные актуальны">
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              <Text type="success">Актуально</Text>
            </Space>
          </Tooltip>
        )
      },
      filters: [
        { text: 'Актуально', value: 'no_changes' },
        { text: 'Есть изменения', value: 'has_changes' },
      ],
      onFilter: (value, record) => {
        if (value === 'no_changes') {
          return !record.has_changes
        }
        if (value === 'has_changes') {
          return !!record.has_changes
        }
        return true
      },
    },
    {
      title: 'Тип',
      dataIndex: 'vor_type',
      key: 'vor_type',
      width: 120,
      render: (vorType?: VorType) => vorType ? VOR_TYPE_LABELS[vorType] : '-',
      sorter: (a: VorRecord, b: VorRecord) => {
        const typeA = a.vor_type || ''
        const typeB = b.vor_type || ''
        return typeA.localeCompare(typeB)
      },
    },
    {
      title: 'Шифр проектов',
      dataIndex: 'project_codes',
      key: 'project_codes',
      width: 250,
      render: (codes: string[]) => (
        <div>
          {codes.map((code, index) => (
            <div key={index}>{code}</div>
          ))}
        </div>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      render: (amount: number) => `${Math.round(amount).toLocaleString('ru-RU')} руб.`,
      sorter: (a: VorRecord, b: VorRecord) => a.total_amount - b.total_amount,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: VorRecord) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditVor(record)}
            title="Редактировать"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            title="Удалить"
            onClick={() => handleShowDeleteModal(record)}
          />
        </Space>
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
      {/* Фильтры */}
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
        <Card style={{ margin: 24, marginBottom: 0 }}>
          <Row align="middle" gutter={16}>
            <Col>
              <Text strong>Фильтры:</Text>
            </Col>
            <Col>
              <Tooltip title="Проект">
                <Select
                  style={{ width: 250 }}
                  placeholder="Проект *"
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {projects?.map((project) => (
                    <Select.Option key={project.id} value={project.id}>
                      {project.name}
                    </Select.Option>
                  ))}
                </Select>
              </Tooltip>
            </Col>
            <Col>
              <Tooltip title="Раздел">
                <Select
                  style={{ width: 200 }}
                  placeholder="Раздел"
                  value={selectedSection}
                  onChange={setSelectedSection}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {sections?.map((section) => (
                    <Select.Option key={section.id} value={section.id.toString()}>
                      {section.name}
                    </Select.Option>
                  ))}
                </Select>
              </Tooltip>
            </Col>
            <Col>
              <Tooltip title="Категория затрат">
                <Select
                  style={{ width: 200 }}
                  placeholder="Категория затрат"
                  value={selectedCostCategory}
                  onChange={setSelectedCostCategory}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {costCategories?.map((category) => (
                    <Select.Option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Tooltip>
            </Col>
            <Col>
              <Button onClick={handleResetFilters}>Сбросить</Button>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Таблица ВОР */}
      {selectedProjectId && (
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
            padding: '0 24px 24px 24px',
          }}
        >
          <Table
            columns={columns}
            dataSource={vorRecords || []}
            rowKey="id"
            loading={vorLoading}
            pagination={{
              defaultPageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
            }}
            scroll={{
              x: 'max-content',
              y: 'calc(100vh - 350px)',
            }}
            sticky
            size="middle"
          />
        </div>
      )}

      {/* Модальное окно редактирования ВОР */}
      <Modal
        title="Редактировать ВОР"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false)
          setEditingVor(null)
          form.resetFields()
        }}
        onOk={handleSaveEdit}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            label="Название ВОР"
            name="name"
            rules={[
              { required: true, message: 'Пожалуйста, введите название ВОР' },
              { min: 1, max: 255, message: 'Название должно содержать от 1 до 255 символов' },
            ]}
          >
            <Input placeholder="Введите название ВОР" />
          </Form.Item>

          <Form.Item label="Коэффициент пересчета расценок" name="rate_coefficient">
            <InputNumber
              style={{ width: '100%' }}
              step={0.1}
              min={0.01}
              max={999.99}
              placeholder="1.00"
              precision={2}
              value={editingCoefficient}
              onChange={(value) => {
                if (editingVor && value !== null) {
                  handleCoefficientChange(editingVor.id, value)
                }
              }}
              parser={parseNumberWithSeparators}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        title="Подтверждение удаления"
        open={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false)
          setDeletingVor(null)
        }}
        onOk={handleDeleteVor}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        width={400}
      >
        <p>Вы уверены, что хотите удалить ВОР?</p>
        {deletingVor && (
          <p>
            <strong>Название:</strong> {deletingVor.name}
          </p>
        )}
        <p style={{ color: '#ff4d4f', marginTop: 16 }}>
          <strong>Внимание!</strong> Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  )
}

export default Vor
