import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Spin } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getUserWithEmail, updateUserProfile } from '@/entities/users'
import type { UpdateUserProfileDto } from '@/entities/users'
import { useAuthStore } from '@/features/auth'

export default function UserProfile() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [initialValues, setInitialValues] = useState<any>(null)

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => getUserWithEmail(user!.id),
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (userData) {
      const values = {
        email: userData.email,
        last_name: userData.last_name,
        first_name: userData.first_name,
        middle_name: userData.middle_name,
        position: userData.position,
        department: userData.department,
        phone: userData.phone,
      }
      form.setFieldsValue(values)
      setInitialValues(values)
    }
  }, [userData, form])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserProfileDto) => updateUserProfile(user!.id, data),
    onSuccess: () => {
      message.success('Профиль успешно обновлен')
      navigate(-1)
    },
    onError: (error: Error) => {
      message.error(`Ошибка обновления профиля: ${error.message}`)
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      updateMutation.mutate(values)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
    if (initialValues) {
      form.setFieldsValue(initialValues)
    }
    navigate(-1)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card title="Мой профиль" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="your@email.com" />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Иванов" />
          </Form.Item>

          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Иван" />
          </Form.Item>

          <Form.Item name="middle_name" label="Отчество">
            <Input prefix={<UserOutlined />} placeholder="Иванович" />
          </Form.Item>

          <Form.Item name="position" label="Должность">
            <Input prefix={<UserOutlined />} placeholder="Инженер" />
          </Form.Item>

          <Form.Item name="department" label="Отдел">
            <Input placeholder="ПТО" />
          </Form.Item>

          <Form.Item name="phone" label="Телефон">
            <Input prefix={<PhoneOutlined />} placeholder="+7 (___) ___-__-__" />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={handleCancel} icon={<CloseOutlined />}>
                Отменить
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
                icon={<SaveOutlined />}
              >
                Сохранить
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
