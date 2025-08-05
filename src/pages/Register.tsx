import { Form, Input, Button, message } from 'antd';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

interface RegisterForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

const Register = () => {
  const navigate = useNavigate();

  const onFinish = async (values: RegisterForm) => {
    const { error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (authError) {
      message.error(authError.message);
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      name: values.name,
      mail: values.email,
      phone: values.phone,
      role_id: 1,
    });

    if (insertError) {
      message.error(insertError.message);
      return;
    }

    message.success('Пользователь создан, войдите в систему');
    navigate('/login');
  };

  return (
    <Form onFinish={onFinish} style={{ maxWidth: 360, margin: '0 auto' }}>
      <Form.Item name="name" rules={[{ required: true, message: 'Введите имя' }]}> 
        <Input placeholder="Имя" />
      </Form.Item>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}> 
        <Input placeholder="Email" />
      </Form.Item>
      <Form.Item name="phone"> 
        <Input placeholder="Телефон" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}> 
        <Input.Password placeholder="Пароль" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block>
          Создать пользователя
        </Button>
      </Form.Item>
      <Form.Item>
        <Link to="/login">Назад к авторизации</Link>
      </Form.Item>
    </Form>
  );
};

export default Register;
