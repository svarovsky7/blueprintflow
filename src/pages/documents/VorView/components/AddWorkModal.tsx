import React, { useState, useEffect } from 'react'
import { Modal, Table, Button, Input, Space, message, InputNumber, Tabs, Form, Select } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRatesOptions, createVorWork, getUnitsOptions, getWorkSetsOptions, getWorkSetsByFilters, type RateOption, type CreateVorWorkDto } from '@/entities/vor'
import { ratesApi, type RateFormData, type Rate } from '@/entities/rates'

interface AddWorkModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  vorId: string
  setFilters?: {
    costTypeIds?: number[]
    costCategoryIds?: number[]
  }
}

const { Search } = Input

const AddWorkModal: React.FC<AddWorkModalProps> = ({ visible, onCancel, onSuccess, vorId, setFilters }) => {
  const [selectedRates, setSelectedRates] = useState<RateOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('select')
  const [createForm] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const queryClient = useQueryClient()

  // Новые состояния для каскадного выбора
  const [selectedWorkSet, setSelectedWorkSet] = useState<string>('')
  const [workSets, setWorkSets] = useState<Array<{id: string, work_set: string}>>([])
  const [filteredRatesByWorkSet, setFilteredRatesByWorkSet] = useState<RateOption[]>([])

  // Загружаем расценки
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rates-options'],
    queryFn: getRatesOptions,
    enabled: visible,
  })

  // Загружаем единицы измерения
  const { data: units = [], isLoading: isUnitsLoading } = useQuery({
    queryKey: ['units-options'],
    queryFn: getUnitsOptions,
    enabled: visible && activeTab === 'create',
  })

  // Загружаем рабочие наборы с учетом фильтров комплекта
  const { data: workSetsData = [], isLoading: isWorkSetsLoading } = useQuery({
    queryKey: ['work-sets-filtered', setFilters?.costTypeIds, setFilters?.costCategoryIds],
    queryFn: () => getWorkSetsByFilters(setFilters?.costTypeIds, setFilters?.costCategoryIds),
    enabled: visible,
  })

  // Мутация для создания новой расценки
  const createRateMutation = useMutation({
    mutationFn: (data: RateFormData) => ratesApi.create(data),
    onSuccess: async (newRate: Rate) => {
      messageApi.success('Расценка успешно создана')

      // Обновляем кеш расценок
      await queryClient.invalidateQueries({ queryKey: ['rates-options'] })

      // Автоматически добавляем созданную расценку в ВОР
      const workData: CreateVorWorkDto = {
        vor_id: vorId,
        rate_id: newRate.id,
        work_set_rate_id: selectedWorkSet || newRate.id, // Используем выбранный рабочий набор или созданную расценку
        quantity: 1,
        coefficient: 1.0,
        base_rate: newRate.base_rate,
      }

      try {
        await createVorWork(workData)
        messageApi.success('Работа добавлена в ВОР')
        createForm.resetFields()
        setActiveTab('select')
        onSuccess()
      } catch (error) {
        console.error('Ошибка добавления работы в ВОР:', error)
        messageApi.error('Ошибка при добавлении работы в ВОР')
      }
    },
    onError: (error: unknown) => {
      console.error('Ошибка создания расценки:', error)
      messageApi.error('Ошибка при создании расценки')
    },
  })

  // Обновляем список рабочих наборов при загрузке данных
  useEffect(() => {
    if (workSetsData.length > 0) {
      setWorkSets(workSetsData)
    }
  }, [workSetsData])

  // Фильтруем работы по выбранному рабочему набору
  useEffect(() => {
    if (selectedWorkSet && rates.length > 0) {
      const selectedWorkSetName = workSets.find(ws => ws.id === selectedWorkSet)?.work_set
      const filtered = rates.filter(rate => rate.work_set === selectedWorkSetName)
      setFilteredRatesByWorkSet(filtered)
    } else {
      setFilteredRatesByWorkSet([])
    }
  }, [selectedWorkSet, rates, workSets])

  // Фильтруем расценки по поисковому запросу
  const finalFilteredRates = (filteredRatesByWorkSet.length > 0 ? filteredRatesByWorkSet : rates).filter(rate =>
    rate.work_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rate.unit_name && rate.unit_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddWorks = async () => {
    if (selectedRates.length === 0) {
      messageApi.warning('Выберите хотя бы одну работу для добавления')
      return
    }

    setLoading(true)
    try {
      // Добавляем все выбранные работы
      for (const rate of selectedRates) {
        const workData: CreateVorWorkDto = {
          vor_id: vorId,
          rate_id: rate.id,
          work_set_rate_id: selectedWorkSet || rate.id, // Используем выбранный рабочий набор или саму расценку
          quantity: 1, // По умолчанию 1
          coefficient: 1.0, // По умолчанию 1.0
          base_rate: rate.base_rate,
        }

        await createVorWork(workData)
      }

      messageApi.success(`Добавлено ${selectedRates.length} работ`)
      setSelectedRates([])
      setSearchTerm('')
      onSuccess()
    } catch (error) {
      console.error('Ошибка добавления работ:', error)
      messageApi.error('Ошибка при добавлении работ')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedRates([])
    setSearchTerm('')
    setActiveTab('select')
    setSelectedWorkSet('')
    setFilteredRatesByWorkSet([])
    createForm.resetFields()
    onCancel()
  }

  // Обработчик создания новой расценки
  const handleCreateRate = async () => {
    try {
      const values = await createForm.validateFields()
      const rateData: RateFormData = {
        work_name: values.work_name,
        base_rate: values.base_rate,
        unit_id: values.unit_id,
        active: true,
      }

      createRateMutation.mutate(rateData)
    } catch (error) {
      console.error('Ошибка валидации формы:', error)
    }
  }

  const columns = [
    {
      title: 'Рабочий набор',
      dataIndex: 'work_set',
      key: 'work_set',
      width: '20%',
      render: (text: string | null) => text || 'не указан',
    },
    {
      title: 'Наименование работы',
      dataIndex: 'work_name',
      key: 'work_name',
      width: '40%',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Базовая расценка',
      dataIndex: 'base_rate',
      key: 'base_rate',
      width: '20%',
      align: 'right' as const,
      render: (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit_name',
      key: 'unit_name',
      width: '20%',
      render: (text: string | undefined) => text || 'не указана',
    },
  ]

  const rowSelection = {
    selectedRowKeys: selectedRates.map(rate => rate.id),
    onChange: (selectedRowKeys: React.Key[], selectedRows: RateOption[]) => {
      setSelectedRates(selectedRows)
    },
    type: 'checkbox' as const,
  }

  const getModalFooter = () => {
    if (activeTab === 'create') {
      return [
        <Button key="cancel" onClick={handleCancel}>
          Отмена
        </Button>,
        <Button
          key="create"
          type="primary"
          onClick={handleCreateRate}
          loading={createRateMutation.isPending}
          icon={<PlusOutlined />}
        >
          Создать и добавить
        </Button>,
      ]
    }

    return [
      <Button key="cancel" onClick={handleCancel}>
        Отмена
      </Button>,
      <Button
        key="add"
        type="primary"
        onClick={handleAddWorks}
        loading={loading}
        disabled={selectedRates.length === 0}
      >
        Добавить ({selectedRates.length})
      </Button>,
    ]
  }

  return (
    <>
      {contextHolder}
      <Modal
        title="Добавление работ"
        open={visible}
        onCancel={handleCancel}
        width={1000}
        footer={getModalFooter()}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'select',
              label: 'Выбрать существующую',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Space direction="horizontal" style={{ width: '100%' }} size="middle">
                    <div style={{ width: '400px' }}>
                      <Select
                        placeholder="Рабочий набор"
                        value={selectedWorkSet}
                        onChange={setSelectedWorkSet}
                        style={{ width: '100%' }}
                        allowClear
                        showSearch
                        loading={isWorkSetsLoading}
                        filterOption={(input, option) => {
                          const text = option?.children?.toString() || ''
                          return text.toLowerCase().includes(input.toLowerCase())
                        }}
                      >
                        {workSets.map((workSet) => (
                          <Select.Option key={workSet.id} value={workSet.id}>
                            {workSet.work_set}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div style={{ width: '400px' }}>
                      <Search
                        placeholder="Наименование работ - поиск по наименованию работы или единице измерения"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
                        prefix={<SearchOutlined />}
                        allowClear
                      />
                    </div>
                  </Space>

                  <Table
                    columns={columns}
                    dataSource={finalFilteredRates}
                    rowKey="id"
                    rowSelection={rowSelection}
                    loading={isLoading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} из ${total} расценок`,
                    }}
                    scroll={{ y: 400 }}
                    size="small"
                  />

                  {selectedRates.length > 0 && (
                    <div style={{
                      background: '#f6f6f6',
                      padding: 12,
                      borderRadius: 4,
                      border: '1px solid #d9d9d9'
                    }}>
                      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                        Выбрано работ: {selectedRates.length}
                      </div>
                      <div style={{ maxHeight: 100, overflow: 'auto' }}>
                        {selectedRates.map((rate, index) => (
                          <div key={rate.id} style={{ fontSize: '12px', marginBottom: 4 }}>
                            {index + 1}. {rate.work_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Space>
              ),
            },
            {
              key: 'create',
              label: (
                <span>
                  <PlusOutlined /> Создать новую
                </span>
              ),
              children: (
                <Form
                  form={createForm}
                  layout="vertical"
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    name="work_name"
                    label="Наименование работы"
                    rules={[
                      { required: true, message: 'Введите наименование работы' },
                      { min: 3, message: 'Минимум 3 символа' },
                      { max: 500, message: 'Максимум 500 символов' },
                    ]}
                  >
                    <Input.TextArea
                      placeholder="Введите наименование работы"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      showCount
                      maxLength={500}
                    />
                  </Form.Item>

                  <Form.Item
                    name="base_rate"
                    label="Базовая расценка"
                    rules={[
                      { required: true, message: 'Введите базовую расценку' },
                      { type: 'number', min: 0, message: 'Расценка должна быть больше 0' },
                    ]}
                  >
                    <InputNumber
                      placeholder="0.00"
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={(value) => value!.replace(/\s?/g, '')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="unit_id"
                    label="Единица измерения"
                    rules={[
                      { required: true, message: 'Выберите единицу измерения' },
                    ]}
                  >
                    <Select
                      placeholder="Выберите единицу измерения"
                      loading={isUnitsLoading}
                      allowClear
                      showSearch
                      filterOption={(input, option) => {
                        const text = option?.children?.toString() || ''
                        return text.toLowerCase().includes(input.toLowerCase())
                      }}
                    >
                      {units.map((unit) => (
                        <Select.Option key={unit.id} value={unit.id}>
                          {unit.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: '#e6f7ff',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#666',
                  }}>
                    💡 <strong>Что произойдет при создании:</strong>
                    <br />
                    • Будет создана новая расценка в справочнике
                    <br />
                    • Расценка автоматически добавится в текущую ВОР
                    <br />
                    • Количество и коэффициент будут установлены в 1.0
                  </div>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </>
  )
}

export default AddWorkModal