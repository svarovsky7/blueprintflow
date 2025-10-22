import React from 'react'
import { Modal, Button, Space, Typography } from 'antd'
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons'

const { Text } = Typography

interface DeleteConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  loading?: boolean
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  onCancel,
  onConfirm,
  title = 'Подтверждение удаления',
  description = 'Это действие нельзя отменить',
  itemName,
  loading = false,
}) => {
  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          {title}
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={onConfirm}
            loading={loading}
          >
            Удалить
          </Button>
        </Space>
      }
      width={400}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <Text>
          {itemName && (
            <>
              Вы действительно хотите удалить <strong>"{itemName}"</strong>?
            </>
          )}
          {!itemName && description}
        </Text>
        {itemName && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{description}</Text>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DeleteConfirmModal
