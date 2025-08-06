import { Button, Space } from 'antd';
import { Link } from 'react-router-dom';

export default function Admin() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Link to="/admin/users">
            <Button>Пользователи</Button>
          </Link>
          <Button>Роли</Button>
          <Link to="/admin/departments">
            <Button>Подразделения</Button>
          </Link>
          <Button>Привилегии</Button>
          <Button>Настройки</Button>
        </Space>
        <Space>
          <Button type="primary">Добавить</Button>
          <Button>Редактировать</Button>
        </Space>
      </div>
      <div>Настройки и управление пользователями.</div>
    </>
  );
}
