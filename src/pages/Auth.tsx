import { Form, Input, Button, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

interface AuthForm {
  email: string
  password: string
}

function AuthPage() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (values: AuthForm) => {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) throw error
    },
    onSuccess: () => navigate('/')
  })

  return (
    <Form<AuthForm>
      onFinish={(values) => mutate(values)}
      style={{ maxWidth: 400, margin: '100px auto' }}
    >
      <Typography.Title level={2}>Вход</Typography.Title>
      <Form.Item name="email" rules={[{ required: true, message: 'Введите email' }]}
      >
        <Input placeholder="Email" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password placeholder="Пароль" />
      </Form.Item>
      {error && (
        <Typography.Text type="danger">{error.message}</Typography.Text>
      )}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending} block>
          Войти
        </Button>
      </Form.Item>
      <Form.Item>
        <Link to="/register">Создать пользователя</Link>
      </Form.Item>
    </Form>
  )
}

export default AuthPage
