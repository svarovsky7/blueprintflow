import { Form, Input, Button, message } from 'antd';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      message.error(error.message);
      return;
    }

    navigate('/');
  };

  return (
    <Form onFinish={onFinish} style={{ maxWidth: 360, margin: '0 auto' }}>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
        <Input placeholder="Email" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
        <Input.Password placeholder="Пароль" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block>
          Войти
        </Button>
      </Form.Item>
      <Form.Item>
        <Link to="/register">Создать нового пользователя</Link>
      </Form.Item>
    </Form>
  );
};

export default Login;
