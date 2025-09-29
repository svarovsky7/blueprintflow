import React, { useState } from 'react'
import { Modal, Table, Button, Input, Space, message, InputNumber } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { getRatesOptions, createVorWork, type RateOption, type CreateVorWorkDto } from '@/entities/vor'

interface AddWorkModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  vorId: string
}

const { Search } = Input

const AddWorkModal: React.FC<AddWorkModalProps> = ({ visible, onCancel, onSuccess, vorId }) => {
  const [selectedRates, setSelectedRates] = useState<RateOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  // Загружаем расценки
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rates-options'],
    queryFn: getRatesOptions,
    enabled: visible,
  })

  // Фильтруем расценки по поисковому запросу
  const filteredRates = rates.filter(rate =>
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
    onCancel()
  }

  const columns = [
    {
      title: 'Наименование работы',
      dataIndex: 'work_name',
      key: 'work_name',
      width: '60%',
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

  return (
    <>
      {contextHolder}
      <Modal
        title="Добавление работ"
        open={visible}
        onCancel={handleCancel}
        width={1000}
        footer={[
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
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="Поиск по наименованию работы или единице измерения"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
            prefix={<SearchOutlined />}
            allowClear
          />

          <Table
            columns={columns}
            dataSource={filteredRates}
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
      </Modal>
    </>
  )
}

export default AddWorkModal