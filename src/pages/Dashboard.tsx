import { Card, Col, Row, Table, Statistic } from 'antd'
import { Column } from '@ant-design/charts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface WorkVolumeData {
  month_total: number
  total: number
}

// Вспомогательная функция для расчета суммы ВОР (синхронизировано с Vor.tsx)
async function calculateVorAmount(vorId: string): Promise<number> {
  if (!supabase) return 0
  
  try {
    // Получаем основные данные ВОР для коэффициента пересчета
    const { data: vorData, error: vorError } = await supabase
      .from('vor')
      .select('rate_coefficient')
      .eq('id', vorId)
      .single()
    
    if (vorError || !vorData) return 0
    const rateCoefficient = vorData.rate_coefficient || 1
    
    // Получаем комплекты для этого ВОР
    const { data: vorMapping, error: vorMappingError } = await supabase
      .from('vor_chessboard_sets_mapping')
      .select('set_id')
      .eq('vor_id', vorId)
    
    if (vorMappingError || !vorMapping?.length) return 0
    const setIds = vorMapping.map(m => m.set_id)

    // Получаем подробные данные комплектов
    const { data: detailedSetsData } = await supabase
      .from('chessboard_sets')
      .select('id, project_id, documentation_id, block_ids, cost_category_ids, cost_type_ids')
      .in('id', setIds)

    if (!detailedSetsData || detailedSetsData.length === 0) return 0

    // Получаем данные chessboard по проектам комплектов
    const projectIds = [...new Set(detailedSetsData.map(set => set.project_id))]
    const { data: chessboardData } = await supabase
      .from('chessboard')
      .select('id, project_id, material, unit_id')
      .in('project_id', projectIds)

    if (!chessboardData || chessboardData.length === 0) return 0
    const chessboardIds = chessboardData.map(c => c.id)

    // Получаем все необходимые связанные данные параллельно
    const [
      { data: unitsData },
      { data: ratesData },
      { data: mappingData },
      { data: floorMappingData },
      { data: nomenclatureMappingData }
    ] = await Promise.all([
      supabase.from('units').select('id, name').in('id',
        chessboardData.map(c => c.unit_id).filter(Boolean)),
      supabase.from('chessboard_rates_mapping').select(`
        chessboard_id, rate_id, rates:rate_id(work_name, base_rate, unit_id, units:unit_id(id, name))
      `).in('chessboard_id', chessboardIds),
      supabase.from('chessboard_mapping').select(
        'chessboard_id, block_id, cost_category_id, cost_type_id'
      ).in('chessboard_id', chessboardIds),
      supabase.from('chessboard_floor_mapping').select(
        'chessboard_id, "quantityRd"'
      ).in('chessboard_id', chessboardIds),
      supabase.from('chessboard_nomenclature_mapping').select(`
        chessboard_id,
        nomenclature_id,
        supplier_name,
        nomenclature:nomenclature_id(id, name, material_prices(price, purchase_date))
      `).in('chessboard_id', chessboardIds)
    ])

    // Создаем индексы для быстрого поиска
    const ratesMap = new Map()
    ratesData?.forEach(r => {
      if (!ratesMap.has(r.chessboard_id)) {
        ratesMap.set(r.chessboard_id, [])
      }
      ratesMap.get(r.chessboard_id)?.push(r)
    })

    const mappingMap = new Map(mappingData?.map(m => [m.chessboard_id, m]) || [])
    const floorQuantitiesMap = new Map()
    floorMappingData?.forEach(f => {
      const currentSum = floorQuantitiesMap.get(f.chessboard_id) || 0
      const quantityRd = f.quantityRd || 0
      floorQuantitiesMap.set(f.chessboard_id, currentSum + quantityRd)
    })

    // Создаем индексы для единиц измерения и номенклатуры
    const unitsMap = new Map(unitsData?.map(u => [u.id, u]) || [])
    const nomenclatureMap = new Map()
    nomenclatureMappingData?.forEach(n => {
      if (!nomenclatureMap.has(n.chessboard_id)) {
        nomenclatureMap.set(n.chessboard_id, [])
      }
      nomenclatureMap.get(n.chessboard_id)?.push(n)
    })

    // Фильтруем данные chessboard по настройкам комплектов
    const filteredChessboardData = chessboardData.filter(item => {
      return detailedSetsData.some(set => {
        if (set.project_id !== item.project_id) return false
        
        const mapping = mappingMap.get(item.id)
        
        if (set.block_ids?.length > 0) {
          if (!mapping?.block_id || !set.block_ids.includes(mapping.block_id)) {
            return false
          }
        }
        
        if (set.cost_category_ids?.length > 0) {
          if (!mapping?.cost_category_id || !set.cost_category_ids.includes(mapping.cost_category_id)) {
            return false
          }
        }
        
        if (set.cost_type_ids?.length > 0) {
          if (!mapping?.cost_type_id || !set.cost_type_ids.includes(mapping.cost_type_id)) {
            return false
          }
        }
        
        return true
      })
    })

    // Группируем по работам и вычисляем суммы
    const workGroups = new Map()
    filteredChessboardData.forEach(item => {
      const rates = ratesMap.get(item.id) || []
      const workName = rates[0]?.rates?.work_name || 'Работа не указана'
      
      if (!workGroups.has(workName)) {
        workGroups.set(workName, [])
      }
      workGroups.get(workName)?.push({
        ...item,
        rates: rates[0]?.rates,
        units: unitsMap.get(item.unit_id),
        nomenclatureItems: nomenclatureMap.get(item.id) || [],
        quantityRd: floorQuantitiesMap.get(item.id) || 0
      })
    })

    // Вычисляем итоговую сумму в соответствии с новой логикой VorView
    let totalSum = 0

    workGroups.forEach((materials, workName) => {
      // Для работ: базовая ставка * количество * коэффициент
      const firstMaterial = materials[0]
      const rateInfo = firstMaterial?.rates
      const baseRate = rateInfo?.base_rate || 0
      const rateUnitName = rateInfo?.units?.name || ''
      
      // Рассчитываем количество для работы
      let workQuantity = 0
      if (rateUnitName) {
        workQuantity = materials
          .filter(material => material.units?.name === rateUnitName)
          .reduce((sum, material) => sum + (material.quantityRd || 0), 0)
      }
      if (workQuantity === 0) {
        workQuantity = materials.reduce((sum, material) => sum + (material.quantityRd || 0), 0)
      }
      
      const workTotal = (baseRate * workQuantity) * rateCoefficient
      totalSum += workTotal

      // Для материалов: номенклатурная цена * количество (без коэффициента для цены)
      materials.forEach(material => {
        const nomenclatureItems = material.nomenclatureItems || []
        nomenclatureItems.forEach(nomenclatureItem => {
          // Получаем последнюю цену из справочника
          const prices = nomenclatureItem.nomenclature?.material_prices || []
          const latestPrice = prices.length > 0 
            ? prices.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())[0].price
            : 0
          
          const quantity = material.quantityRd || 0
          const materialTotal = latestPrice * quantity
          totalSum += materialTotal
        })
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