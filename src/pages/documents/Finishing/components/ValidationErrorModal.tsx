import { Modal, Table, Alert } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import type { ValidationError } from '@/entities/finishing'

interface ValidationErrorModalProps {
  open: boolean
  onClose: () => void
  errors: ValidationError[]
}

export function ValidationErrorModal({ open, onClose, errors }: ValidationErrorModalProps) {
  const columns = [
    {
      title: '№ строки',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
    },
    {
      title: 'Тип',
      dataIndex: 'pieTypeName',
      key: 'pieTypeName',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 200,
    },
    {
      title: 'Ед.Изм.',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 80,
    },
    {
      title: 'Вид затрат',
      dataIndex: 'detailCostCategoryName',
      key: 'detailCostCategoryName',
      width: 150,
    },
    {
      title: 'Проблема',
      dataIndex: 'missingFields',
      key: 'missingFields',
      render: (fields: string[]) => (
        <span style={{ color: '#ff4d4f' }}>
          {fields.length === 1
            ? `Не указан: ${fields[0]}`
            : `Не указаны: ${fields.join(', ')}`}
        </span>
      ),
    },
  ]

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Невозможно выполнить импорт
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <button
          key="close"
          onClick={onClose}
          className="ant-btn ant-btn-primary"
        >
          Понятно
        </button>,
      ]}
      width={1000}
    >
      <Alert
        message="Обнаружены незаполненные обязательные поля"
        description={
          <div>
            <p>
              Обнаружено <strong>{errors.length}</strong> строк с незаполненными обязательными полями в
              документе <strong>"Типы пирога отделки"</strong>.
            </p>
            <p style={{ marginBottom: 0 }}>
              Исправьте ошибки и повторите попытку импорта.
            </p>
          </div>
        }
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={errors}
        rowKey="rowNumber"
        pagination={false}
        scroll={{ y: 400 }}
        size="small"
      />
    </Modal>
  )
}
