import { useState } from 'react'
import { App, Button, Input, List, Modal, Space } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { roomsApi, type Room } from '@/entities/rooms'

interface AddRoomModalProps {
  visible: boolean
  onClose: () => void
  rooms: Room[]
  onRoomAdded: () => void
}

export default function AddRoomModal({ visible, onClose, rooms, onRoomAdded }: AddRoomModalProps) {
  const { message } = App.useApp()
  const [newRoomName, setNewRoomName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleSave = async () => {
    if (!newRoomName.trim()) {
      message.warning('Введите название помещения')
      return
    }

    setIsSaving(true)
    try {
      await roomsApi.create(newRoomName)
      message.success('Помещение добавлено')
      setNewRoomName('')
      onRoomAdded()
    } catch (error) {
      message.error('Не удалось добавить помещение')
      console.error('Failed to add room:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (roomId: number) => {
    setIsDeleting(roomId)
    try {
      await roomsApi.delete(roomId)
      message.success('Помещение удалено')
      onRoomAdded()
    } catch (error) {
      message.error('Не удалось удалить помещение')
      console.error('Failed to delete room:', error)
    } finally {
      setIsDeleting(null)
    }
  }

  const confirmDelete = (room: Room) => {
    Modal.confirm({
      title: 'Удалить помещение?',
      content: `Вы действительно хотите удалить "${room.name}"?`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () => handleDelete(room.id),
    })
  }

  return (
    <Modal
      title="Добавить помещение"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Форма добавления нового помещения */}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Название помещения"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onPressEnter={handleSave}
            disabled={isSaving}
          />
          <Button type="primary" onClick={handleSave} loading={isSaving}>
            Сохранить
          </Button>
        </Space.Compact>

        {/* Список всех помещений */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            Все помещения ({rooms.length})
          </div>
          <List
            bordered
            dataSource={rooms}
            locale={{ emptyText: 'Нет помещений' }}
            style={{ maxHeight: 400, overflowY: 'auto' }}
            renderItem={(room) => (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => confirmDelete(room)}
                    loading={isDeleting === room.id}
                    aria-label="Удалить"
                  />,
                ]}
              >
                {room.name}
              </List.Item>
            )}
          />
        </div>
      </Space>
    </Modal>
  )
}