import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Button } from 'antd'
import { supabase } from '../supabaseClient'

const { Header, Content } = Layout

function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setLoading(false)
      }
    })
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return null

  return (
    <Layout>
      <Header style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" onClick={handleLogout}>
          Выйти
        </Button>
      </Header>
      <Content style={{ padding: 24 }}>
        Добро пожаловать в Blueprintflow
      </Content>
    </Layout>
  )
}

export default HomePage
