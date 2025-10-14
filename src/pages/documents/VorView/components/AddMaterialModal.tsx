import React, { useState } from 'react'
import { Modal, Form, Select, InputNumber, Button, message, Space } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  getSupplierNamesOptions,
  createVorMaterial,
  getUnitsOptions,
  type CreateVorMaterialDto,
  type SupplierNameOption,
  type UnitOption
} from '@/entities/vor'
import { parseNumberWithSeparators } from '@/shared/lib'

interface AddMaterialModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  vorWorkId: string
  workName: string
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  vorWorkId,
  workName
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [messageApi, contextHolder] = message.useMessage()

  // Загружаем единицы измерения
  const { data: units = [] } = useQuery({
    queryKey: ['units-options'],
    queryFn: getUnitsOptions,
    enabled: visible,
  })

  // Загружаем поставщиков с поиском
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['supplier-names-options', supplierSearchTerm],
    queryFn: () => getSupplierNamesOptions(supplierSearchTerm),
    enabled: visible,
  })

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const materialData: CreateVorMaterialDto = {
        vor_work_id: vorWorkId,
        supplier_material_name: values.supplier_material_name,
        unit_id: values.unit_id,
        quantity: values.quantity || 1,
        price: values.price || 0,
      }

      await createVorMaterial(materialData)
      messageApi.success('Материал успешно добавлен')
      form.resetFields()
      onSuccess()
    } catch (error) {
      console.error('Ошибка добавления материала:', error)
      messageApi.error('Ошибка при добавлении материала')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSupplierSearchTerm('')
    onCancel()
  }

  const handleSupplierSearch = (value: string) => {
    setSupplierSearchTerm(value)
  }

  const supplierOptions = suppliers.map(supplier => ({
    value: supplier.name,
    label: supplier.name,
  }))

  const unitOptions = units.map(unit => ({
    value: unit.id,
    label: unit.name,
  }))

  return (
    <>
      {contextHolder}
      <Modal
        title={`Добавление материала к работе: ${workName}`}
        open={visible}
        onCancel={handleCancel}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
          >
            Добавить материал
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            quantity: 1,
            price: 0,
          }}
        >
          <Form.Item
            label="Наименование материала"
            name="supplier_material_name"
            rules={[
              { required: true, message: 'Пожалуйста, введите или выберите наименование материала' }
            ]}
          >
            <Select
              showSearch
              placeholder="Введите или выберите материал"
              loading={suppliersLoading}
              onSearch={handleSupplierSearch}
              filterOption={false}
              options={supplierOptions}
              style={{ width: '100%' }}
              allowClear
              notFoundContent={suppliersLoading ? 'Загрузка...' : 'Материал не найден'}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              label="Единица измерения"
              name="unit_id"
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Выберите единицу"
                options={unitOptions}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              label="Количество"
              name="quantity"
              style={{ width: 120 }}
              rules={[
                { required: true, message: 'Введите количество' },
                { type: 'number', min: 0.0001, message: 'Количество должно быть больше 0' }
              ]}
            >
              <InputNumber
                min={0.0001}
                step={0.1}
                precision={4}
                style={{ width: '100%' }}
                placeholder="1"
                parser={parseNumberWithSeparators}
              />
            </Form.Item>

            <Form.Item
              label="Цена за единицу"
              name="price"
              style={{ width: 150 }}
              rules={[
                { type: 'number', min: 0, message: 'Цена не может быть отрицательной' }
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={parseNumberWithSeparators}
              />
            </Form.Item>
          </Space>

          <div style={{
            background: '#f6f6f6',
            padding: 12,
            borderRadius: 4,
            border: '1px solid #d9d9d9',
            marginTop: 16
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div><strong>Работа:</strong> {workName}</div>
              <div style={{ marginTop: 4 }}>
                Материал будет добавлен к этой работе. Вы можете ввести новое название материала
                или выбрать из существующих в справочнике.
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </>
  )
}

export default AddMaterialModal