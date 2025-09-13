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
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
  const [editingVor, setEditingVor] = useState<VorRecord | null>(null)
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
            // Получаем основные данные ВОР для коэффициента пересчета
            const currentVor = vorData.find((v) => v.id === vorId)
            const rateCoefficient = currentVor?.rate_coefficient || 1

            // Получаем комплекты для этого ВОР
            const vorSetIds = vorSetMap.get(vorId) || []

            if (vorSetIds.length === 0) {
              calculationMap.set(vorId, 0)
              continue
            }

            // Получаем подробные данные комплектов
            const { data: detailedSetsData } = await supabase
              .from('chessboard_sets')
              .select(
                `
                id, project_id, documentation_id, block_ids, 
                cost_category_ids, cost_type_ids
              `,
              )
              .in('id', vorSetIds)

            if (!detailedSetsData || detailedSetsData.length === 0) {
              calculationMap.set(vorId, 0)
              continue
            }

            // Получаем данные chessboard по проектам комплектов
            const projectIds = [...new Set(detailedSetsData.map((set) => set.project_id))]
            const { data: chessboardData } = await supabase
              .from('chessboard')
              .select('id, project_id, material, unit_id')
              .in('project_id', projectIds)

            if (!chessboardData || chessboardData.length === 0) {
              calculationMap.set(vorId, 0)
              continue
            }

            const chessboardIds = chessboardData.map((c) => c.id)

            // Получаем все необходимые связанные данные параллельно
            const [
              ,
              { data: unitsData },
              { data: ratesData },
              { data: mappingData },
              { data: floorMappingData },
              { data: nomenclatureMappingData },
            ] = await Promise.all([
              supabase
                .from('materials')
                .select('uuid, name')
                .in('uuid', chessboardData.map((c) => c.material).filter(Boolean)),
              supabase
                .from('units')
                .select('id, name')
                .in('id', chessboardData.map((c) => c.unit_id).filter(Boolean)),
              supabase
                .from('chessboard_rates_mapping')
                .select(
                  `
                chessboard_id, rate_id, rates:rate_id(work_name, base_rate, unit_id, units:unit_id(id, name))
              `,
                )
                .in('chessboard_id', chessboardIds),
              supabase
                .from('chessboard_mapping')
                .select('chessboard_id, block_id, cost_category_id, cost_type_id')
                .in('chessboard_id', chessboardIds),
              supabase
                .from('chessboard_floor_mapping')
                .select('chessboard_id, "quantityRd"')
                .in('chessboard_id', chessboardIds),
              supabase
                .from('chessboard_nomenclature_mapping')
                .select(
                  `
                chessboard_id,
                nomenclature_id,
                supplier_name,
                nomenclature:nomenclature_id(id, name, material_prices(price, purchase_date))
              `,
                )
                .in('chessboard_id', chessboardIds),
            ])

            // Создаем индексы для быстрого поиска
            const ratesMap = new Map()
            ratesData?.forEach((r) => {
              if (!ratesMap.has(r.chessboard_id)) {
                ratesMap.set(r.chessboard_id, [])
              }
              ratesMap.get(r.chessboard_id)?.push(r)
            })

            const mappingMap = new Map(mappingData?.map((m) => [m.chessboard_id, m]) || [])
            const floorQuantitiesMap = new Map()
            floorMappingData?.forEach((f) => {
              const currentSum = floorQuantitiesMap.get(f.chessboard_id) || 0
              const quantityRd = f.quantityRd || 0
              floorQuantitiesMap.set(f.chessboard_id, currentSum + quantityRd)
            })

            // Создаем индексы для единиц измерения и номенклатуры
            const unitsMap = new Map(unitsData?.map((u) => [u.id, u]) || [])
            const nomenclatureMap = new Map()
            nomenclatureMappingData?.forEach((n) => {
              if (!nomenclatureMap.has(n.chessboard_id)) {
                nomenclatureMap.set(n.chessboard_id, [])
              }
              nomenclatureMap.get(n.chessboard_id)?.push(n)
            })

            // Фильтруем данные chessboard по настройкам комплектов
            const filteredChessboardData = chessboardData.filter((item) => {
              return detailedSetsData.some((set) => {
                if (set.project_id !== item.project_id) return false

                const mapping = mappingMap.get(item.id)

                if (set.block_ids?.length > 0) {
                  if (!mapping?.block_id || !set.block_ids.includes(mapping.block_id)) {
                    return false
                  }
                }

                if (set.cost_category_ids?.length > 0) {
                  if (
                    !mapping?.cost_category_id ||
                    !set.cost_category_ids.includes(mapping.cost_category_id)
                  ) {
                    return false
                  }
                }

                if (set.cost_type_ids?.length > 0) {
                  if (!mapping?.cost_type_id || !set.cost_type_ids.includes(mapping.cost_type_id)) {
                    return false
                  }
                }

                return true
              })
            })

            // Группируем по работам и вычисляем суммы
            const workGroups = new Map()
            filteredChessboardData.forEach((item) => {
              const rates = ratesMap.get(item.id) || []
              const workName = rates[0]?.rates?.work_name || 'Работа не указана'

              if (!workGroups.has(workName)) {
                workGroups.set(workName, [])
              }
              workGroups.get(workName)?.push({
                ...item,
                rates: rates[0]?.rates,
                units: unitsMap.get(item.unit_id),
                nomenclatureItems: nomenclatureMap.get(item.id) || [],
                quantityRd: floorQuantitiesMap.get(item.id) || 0,
              })
            })

            // Вычисляем итоговую сумму в соответствии с новой логикой VorView
            let totalSum = 0

            workGroups.forEach((materials) => {
              // Для работ: базовая ставка * количество * коэффициент
              const firstMaterial = materials[0]
              const rateInfo = firstMaterial?.rates
              const baseRate = rateInfo?.base_rate || 0
              const rateUnitName = rateInfo?.units?.name || ''

              // Рассчитываем количество для работы
              let workQuantity = 0
              if (rateUnitName) {
                workQuantity = materials
                  .filter((material) => material.units?.name === rateUnitName)
                  .reduce((sum: any, material: any) => sum + (material.quantityRd || 0), 0)
              }
              if (workQuantity === 0) {
                workQuantity = materials.reduce(
                  (sum: any, material: any) => sum + (material.quantityRd || 0),
                  0,
                )
              }

              const workTotal = baseRate * workQuantity * rateCoefficient
              totalSum += workTotal

              // Для материалов: номенклатурная цена * количество (без коэффициента для цены)
              materials.forEach((material: any) => {
                const nomenclatureItems = material.nomenclatureItems || []
                nomenclatureItems.forEach((nomenclatureItem: any) => {
                  // Получаем последнюю цену из справочника
                  const prices = nomenclatureItem.nomenclature?.material_prices || []
                  const latestPrice =
                    prices.length > 0
                      ? prices.sort(
                          (a: any, b: any) =>
                            new Date(b.purchase_date).getTime() -
                            new Date(a.purchase_date).getTime(),
                        )[0].price
                      : 0

                  const quantity = material.quantityRd || 0
                  const materialTotal = latestPrice * quantity
                  totalSum += materialTotal
                })
              })
            })

            calculationMap.set(vorId, totalSum)
          } catch (error) {
            console.warn(`Ошибка расчета суммы для ВОР ${vorId}:`, error)
            calculationMap.set(vorId, 0)
          }
        }

        // Шаг 6: Собираем финальные данные
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

  const handleDeleteVor = async (vor: VorRecord) => {
    try {
      if (!supabase) return

      // Сначала удаляем связи с комплектами
      const { error: mappingError } = await supabase
        .from('vor_chessboard_sets_mapping')
        .delete()
        .eq('vor_id', vor.id)

      if (mappingError) throw mappingError

      // Затем удаляем сам ВОР
      const { error: vorError } = await supabase.from('vor').delete().eq('id', vor.id)

      if (vorError) throw vorError

      message.success('ВОР успешно удален')
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
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a: VorRecord, b: VorRecord) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
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
          <Popconfirm
            title="Удалить ВОР"
            description="Вы уверены, что хотите удалить этот ВОР?"
            onConfirm={() => handleDeleteVor(record)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" icon={<DeleteOutlined />} danger title="Удалить" />
          </Popconfirm>
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
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Vor
