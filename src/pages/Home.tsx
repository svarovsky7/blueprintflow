import { Layout, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const { Header, Content } = Layout;

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Layout>
      <Header style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleLogout}>Выйти</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <h1>Главная страница портала</h1>
      </Content>
    </Layout>
  );
};

export default Home;
