import { useState } from 'react'
import { Form, Input, Button, Modal } from 'antd'
import { UserOutlined, LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useAuthStore } from '../model/auth-store'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((state) => state.signIn)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)

    try {
      await signIn(values.email, values.password)
      onSuccess?.()
    } catch (err: any) {
      console.error('Login error:', err)
      let errorMessage = 'Ошибка входа. Проверьте email и пароль.'
      let errorTitle = 'Ошибка входа'

      if (err?.message) {
        // Переводим частые ошибки на русский
        if (err.message.includes('Invalid login credentials')) {
          errorTitle = 'Неверные учётные данные'
          errorMessage = 'Проверьте правильность введённого email и пароля.'
        } else if (err.message.includes('Email not confirmed')) {
          errorTitle = 'Email не подтверждён'
          errorMessage = 'Проверьте почту и подтвердите регистрацию.'
        } else if (err.message.includes('User not found')) {
          errorTitle = 'Пользователь не найден'
          errorMessage = 'Учётная запись с указанным email не существует.'
        } else if (err.message.includes('отключена')) {
          errorTitle = 'Доступ запрещён'
          errorMessage = err.message
        } else if (err.message.includes('нет назначенных ролей')) {
          errorTitle = 'Доступ запрещён'
          errorMessage = err.message
        } else if (err.message.includes('Профиль пользователя не найден')) {
          errorTitle = 'Ошибка профиля'
          errorMessage = err.message
        } else {
          errorMessage = err.message
        }
      }

      Modal.error({
        title: errorTitle,
        content: errorMessage,
        icon: <ExclamationCircleOutlined />,
        okText: 'Понятно',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form onFinish={handleSubmit} layout="vertical" size="large">
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Введите email' },
          { type: 'email', message: 'Некорректный email' },
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder="your@email.com" />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Войти
        </Button>
      </Form.Item>
    </Form>
  )
}
