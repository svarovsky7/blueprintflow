import { useState } from 'react'
import { Form, Input, Button, Alert, Row, Col, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { createUser } from '@/entities/users'
import type { CreateUserDto } from '@/entities/users'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    setLoading(true)
    setError(null)

    try {
      const dto: CreateUserDto = {
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        middle_name: values.middle_name,
        position: values.position,
        department: values.department,
        phone: values.phone,
      }

      await createUser(dto)
      form.resetFields()

      message.success(
        'Регистрация успешна! Ваш аккаунт ожидает подтверждения администратором. Вы сможете войти после активации.',
        8
      )

      // Снимаем фокус с кнопки перед переключением вкладки
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical" size="middle">
      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
        </Form.Item>
      )}

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input placeholder="Иванов" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input placeholder="Иван" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="middle_name" label="Отчество">
        <Input placeholder="Иванович" />
      </Form.Item>

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

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 6, message: 'Минимум 6 символов' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="confirm_password"
            label="Подтверждение"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Пароли не совпадают'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Подтверждение" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="position" label="Должность">
            <Input prefix={<UserOutlined />} placeholder="Инженер" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="department" label="Отдел">
            <Input placeholder="ПТО" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="phone" label="Телефон">
        <Input prefix={<PhoneOutlined />} placeholder="+7 (___) ___-__-__" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Зарегистрироваться
        </Button>
      </Form.Item>
    </Form>
  )
}
