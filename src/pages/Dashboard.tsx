import { Card, Col, Row, Table, Statistic } from 'antd'
import { Column } from '@ant-design/charts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface WorkVolumeData {
  month_total: number
  total: number
}

// Вспомогательная функция для расчета суммы ВОР
async function calculateVorAmount(vorId: string): Promise<number> {
  if (!supabase) return 0
  
  try {
    // Получаем основные данные ВОР 
    const { data: vorData, error: vorError } = await supabase
      .from('vor')
      .select('rate_coefficient')
      .eq('id', vorId)
      .single()
    
    if (vorError || !vorData) return 0
    
    const rateCoefficient = vorData.rate_coefficient || 1
    
    // Получаем связанные комплекты
    const { data: mappingData, error: mappingError } = await supabase
      .from('vor_chessboard_sets_mapping')
      .select('set_id')
      .eq('vor_id', vorId)
    
    if (mappingError || !mappingData?.length) return 0
    
    const setIds = mappingData.map(m => m.set_id)
    
    // Получаем данные комплектов
    const { data: setsData, error: setsError } = await supabase
      .from('chessboard_sets')
      .select('id, project_id, block_ids, cost_category_ids, cost_type_ids')
      .in('id', setIds)
    
    if (setsError || !setsData?.length) return 0
    
    // Получаем данные chessboard для расчета
    const projectIds = [...new Set(setsData.map(set => set.project_id))]
    const { data: chessboardData, error: chessboardError } = await supabase
      .from('chessboard')
      .select(`
        id, project_id,
        chessboard_rates_mapping!inner(
          rates!inner(base_rate)
        ),
        chessboard_floor_mapping(quantityRd)
      `)
      .in('project_id', projectIds)
    
    if (chessboardError || !chessboardData?.length) return 0
    
    // Упрощенный расчет: берем средние значения
    let totalSum = 0
    
    chessboardData.forEach(item => {
      const rates = item.chessboard_rates_mapping || []
      const floorData = item.chessboard_floor_mapping || []
      
      // Сумма за работы
      rates.forEach((rateMapping: any) => {
        const baseRate = rateMapping.rates?.base_rate || 0
        totalSum += baseRate * rateCoefficient
      })
      
      // Сумма за материалы (упрощенно)
      floorData.forEach((floor: any) => {
        const quantity = floor.quantityRd || 0
        const nomenclaturePrice = 1000 // Как в Vor.tsx
        totalSum += nomenclaturePrice * quantity * rateCoefficient
      })
    })
    
    return totalSum
  } catch (error) {
    console.warn('Ошибка расчета суммы ВОР:', error)
    return 0
  }
}

interface ComplectStatusData {
  status: string
  status_name: string
  month_count: number
  total_count: number
  status_color?: string
}

const Dashboard = () => {
  // Запрос данных для виджета Ведомость объемов работ
  const { data: workVolumeData } = useQuery({
    queryKey: ['workVolumeStats'],
    queryFn: async (): Promise<WorkVolumeData> => {
      if (!supabase) return { month_total: 0, total: 0 }
      
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      
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
      
      // Вычисляем реальные суммы ВОР
      for (const vor of vorData || []) {
        const vorCreatedAt = new Date(vor.created_at)
        
        // Только ВОР, созданные в этом году
        if (vorCreatedAt >= firstDayOfYear) {
          const vorAmount = await calculateVorAmount(vor.id)
          total += vorAmount
          
          // Если ВОР создан в этом месяце
          if (vorCreatedAt >= firstDayOfMonth) {
            monthTotal += vorAmount
          }
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
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      
      // Получаем статистику по комплектам с их статусами
      const { data, error } = await supabase
        .from('chessboard_sets_with_status')
        .select(`
          id,
          created_at,
          status_name,
          status_color
        `)
        
      if (error) throw error
      
      // Группируем данные по статусам
      const statusGroups: Record<string, { 
        month_count: number, 
        total_count: number,
        status_color?: string
      }> = {}
      
      data?.forEach(item => {
        const itemCreatedAt = new Date(item.created_at)
        
        // Только комплекты, созданные в этом году
        if (itemCreatedAt >= firstDayOfYear) {
          const statusName = item.status_name || 'Без статуса'
          if (!statusGroups[statusName]) {
            statusGroups[statusName] = { 
              month_count: 0, 
              total_count: 0,
              status_color: item.status_color 
            }
          }
          
          statusGroups[statusName].total_count += 1
          
          if (itemCreatedAt >= firstDayOfMonth) {
            statusGroups[statusName].month_count += 1
          }
        }
      })
      
      // Преобразуем в массив для таблицы
      return Object.entries(statusGroups).map(([statusName, stats]) => ({
        status: statusName.toLowerCase().replace(/\s+/g, '_'),
        status_name: statusName,
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
      type: 'За год',
      value: workVolumeData?.total || 0,
    },
  ]

  // Колонки для таблицы комплектов
  const complectColumns = [
    {
      title: 'Статус',
      dataIndex: 'status_name',
      key: 'status_name',
      render: (text: string, record: ComplectStatusData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.status_color && (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: record.status_color,
                flexShrink: 0
              }}
            />
          )}
          {text}
        </div>
      ),
    },
    {
      title: 'За месяц',
      dataIndex: 'month_count',
      key: 'month_count',
    },
    {
      title: 'За год',
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
                  title="За год"
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