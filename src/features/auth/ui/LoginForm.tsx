import { useState } from 'react'
import { Form, Input, Button, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../model/auth-store'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = useAuthStore((state) => state.signIn)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      await signIn(values.email, values.password)
      onSuccess?.()
    } catch (err: any) {
      console.error('Login error:', err)
      let errorMessage = 'Ошибка входа. Проверьте email и пароль.'

      if (err?.message) {
        errorMessage = err.message
        // Переводим частые ошибки на русский
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Неверный email или пароль'
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Email не подтвержден. Проверьте почту и подтвердите регистрацию.'
        } else if (err.message.includes('User not found')) {
          errorMessage = 'Пользователь не найден'
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form onFinish={handleSubmit} layout="vertical" size="large">
      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
        </Form.Item>
      )}

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
