import { Card, Col, Row, Table, Statistic } from 'antd'
import { Column } from '@ant-design/charts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface WorkVolumeData {
  month_total: number
  total: number
}

interface ComplectStatusData {
  status: string
  status_name: string
  month_count: number
  total_count: number
}

const Dashboard = () => {
  // Запрос данных для виджета Ведомость объемов работ
  const { data: workVolumeData } = useQuery({
    queryKey: ['workVolumeStats'],
    queryFn: async (): Promise<WorkVolumeData> => {
      if (!supabase) return { month_total: 0, total: 0 }
      
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Получаем данные ВОР
      const { data: vorData, error: vorError } = await supabase
        .from('vor')
        .select(`
          id,
          created_at
        `)
        
      if (vorError) throw vorError
      
      let monthTotal = 0
      let total = 0
      
      // Используем ту же логику заглушек, что и в Vor.tsx
      for (const vor of vorData || []) {
        const vorAmount = 2500000 // Заглушка: каждый ВОР = 2,500,000 руб
        total += vorAmount
        
        // Если ВОР создан в этом месяце
        if (new Date(vor.created_at) >= firstDayOfMonth) {
          monthTotal += vorAmount
        }
      }
      
      return {
        month_total: monthTotal,
        total: total
      }
    },
    enabled: !!supabase,
  })

  // Запрос данных для виджета Комплекты расчетов
  const { data: complectStatusData = [] } = useQuery({
    queryKey: ['complectStatusStats'],
    queryFn: async (): Promise<ComplectStatusData[]> => {
      if (!supabase) return []
      
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Получаем статистику по комплектам
      const { data, error } = await supabase
        .from('chessboard_sets')
        .select(`
          status,
          created_at
        `)
        
      if (error) throw error
      
      // Группируем данные по статусам
      const statusGroups: Record<string, { 
        month_count: number, 
        total_count: number
      }> = {}
      
      data?.forEach(item => {
        const status = item.status || 'Не указан'
        if (!statusGroups[status]) {
          statusGroups[status] = { month_count: 0, total_count: 0 }
        }
        
        statusGroups[status].total_count += 1
        
        if (new Date(item.created_at) >= firstDayOfMonth) {
          statusGroups[status].month_count += 1
        }
      })
      
      // Преобразуем в массив для таблицы
      return Object.entries(statusGroups).map(([status, stats]) => ({
        status,
        status_name: status,
        ...stats
      }))
    },
    enabled: !!supabase,
  })

  // Данные для графика ВОР
  const chartData = [
    {
      type: 'За месяц',
      value: workVolumeData?.month_total || 0,
    },
    {
      type: 'Всего',
      value: workVolumeData?.total || 0,
    },
  ]

  // Колонки для таблицы комплектов
  const complectColumns = [
    {
      title: 'Статус',
      dataIndex: 'status_name',
      key: 'status_name',
    },
    {
      title: 'За месяц',
      dataIndex: 'month_count',
      key: 'month_count',
    },
    {
      title: 'Всего',
      dataIndex: 'total_count',
      key: 'total_count',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        {/* Виджет Ведомость объемов работ */}
        <Col xs={24} lg={12}>
          <Card title="Ведомость объемов работ" style={{ height: '100%' }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic
                  title="За последний месяц"
                  value={workVolumeData?.month_total || 0}
                  precision={2}
                  suffix="₽"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Всего"
                  value={workVolumeData?.total || 0}
                  precision={2}
                  suffix="₽"
                />
              </Col>
            </Row>
            <div style={{ height: 300 }}>
              <Column
                data={chartData}
                xField="type"
                yField="value"
                meta={{
                  value: {
                    alias: 'Сумма (₽)',
                    formatter: (v) => `${Number(v).toLocaleString('ru-RU')} ₽`
                  }
                }}
                color={['#1890ff', '#52c41a']}
                columnStyle={{
                  radius: [4, 4, 0, 0]
                }}
              />
            </div>
          </Card>
        </Col>

        {/* Виджет Комплекты расчетов */}
        <Col xs={24} lg={12}>
          <Card title="Комплекты расчетов" style={{ height: '100%' }}>
            <Table
              columns={complectColumns}
              dataSource={complectStatusData}
              pagination={false}
              size="small"
              rowKey="status"
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard