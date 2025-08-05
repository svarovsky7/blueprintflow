import { Form, Input, Button, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

interface RegisterForm {
  email: string
  password: string
  name: string
}

function RegisterPage() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (values: RegisterForm) => {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password
      })
      if (error) throw error
      const user = data.user
      if (user) {
        const { error: insertError } = await supabase.from('users').insert({
          user_id: user.id,
          name: values.name,
          mail: values.email,
          role_id: 1
        })
        if (insertError) throw insertError
      }
    },
    onSuccess: () => navigate('/')
  })

  return (
    <Form<RegisterForm>
      onFinish={(values) => mutate(values)}
      style={{ maxWidth: 400, margin: '100px auto' }}
    >
      <Typography.Title level={2}>Новый пользователь</Typography.Title>
      <Form.Item name="name" rules={[{ required: true, message: 'Введите имя' }]}
      >
        <Input placeholder="Имя" />
      </Form.Item>
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
          Создать
        </Button>
      </Form.Item>
    </Form>
  )
}

export default RegisterPage
