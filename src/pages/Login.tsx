import { useState } from 'react'
import { Card, Tabs } from 'antd'
import { useNavigate } from 'react-router-dom'
import { LoginForm, RegisterForm } from '@/features/auth'

export default function Login() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('login')

  const handleLoginSuccess = () => {
    navigate('/')
  }

  const handleRegisterSuccess = () => {
    setActiveTab('login')
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card
        style={{ width: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        title={
          <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 600 }}>BlueprintFlow</div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: <LoginForm onSuccess={handleLoginSuccess} />,
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: <RegisterForm onSuccess={handleRegisterSuccess} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
