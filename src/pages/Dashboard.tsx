import { Card, Col, Row, Statistic } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
  const { data: completedWorks = 0 } = useQuery({
    queryKey: ['completedWorksCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('work_progress')
        .select('*', { head: true, count: 'exact' })
      if (error) throw error
      return count ?? 0
    },
  })

  return (
    <Row gutter={16}>
      <Col span={8}>
        <Card>
          <Statistic title="Выполненные работы" value={completedWorks} />
        </Card>
      </Col>
    </Row>
  )
}

export default Dashboard
