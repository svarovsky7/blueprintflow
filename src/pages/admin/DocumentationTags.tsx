import { useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import {
  documentationTagsApi,
  type DocumentationTag,
  type DocumentationTagCreateInput,
  type DocumentationTagUpdateInput,
} from '@/entities/documentation-tags'

const { Title } = Typography

export default function DocumentationTags() {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<DocumentationTag | null>(null)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['documentation-tags'],
    queryFn: documentationTagsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: documentationTagsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-tags'] })
      message.success('Тэг успешно добавлен')
      handleCloseModal()
    },
    onError: (error) => {
      console.error('Error creating tag:', error)
      message.error('Ошибка при добавлении тэга')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: DocumentationTagUpdateInput
    }) => documentationTagsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-tags'] })
      message.success('Тэг успешно обновлен')
      handleCloseModal()
    },
    onError: (error) => {
      console.error('Error updating tag:', error)
      message.error('Ошибка при обновлении тэга')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: documentationTagsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentation-tags'] })
      message.success('Тэг успешно удален')
    },
    onError: (error) => {
      console.error('Error deleting tag:', error)
      message.error('Ошибка при удалении тэга')
    },
  })

  const handleOpenModal = (tag?: DocumentationTag) => {
    if (tag) {
      setEditingTag(tag)
      form.setFieldsValue({
        tag_number: tag.tag_number,
        name: tag.name,
      })
    } else {
      setEditingTag(null)
      form.resetFields()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTag(null)
    form.resetFields()
  }

  const handleSubmit = async (values: DocumentationTagCreateInput) => {
    try {
      if (editingTag) {
        await updateMutation.mutateAsync({
          id: editingTag.id,
          data: values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const columns: ColumnsType<DocumentationTag> = [
    {
      title: 'Номер тэга',
      dataIndex: 'tag_number',
      key: 'tag_number',
      width: 150,
      sorter: (a, b) => a.tag_number - b.tag_number,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Удалить тэг?"
            description="Вы уверены, что хотите удалить этот тэг?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Отмена"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Тэги документации
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Добавить
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={isLoading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      </Card>

      <Modal
        title={editingTag ? 'Редактировать тэг' : 'Добавить тэг'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Номер тэга"
            name="tag_number"
            rules={[
              { required: true, message: 'Пожалуйста, введите номер тэга' },
              { type: 'number', min: 1, message: 'Номер должен быть больше 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Введите номер тэга"
              min={1}
            />
          </Form.Item>

          <Form.Item
            label="Название"
            name="name"
            rules={[
              { required: true, message: 'Пожалуйста, введите название тэга' },
              { max: 255, message: 'Название не должно превышать 255 символов' },
            ]}
          >
            <Input placeholder="Введите название тэга" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Отмена</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTag ? 'Сохранить' : 'Добавить'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}