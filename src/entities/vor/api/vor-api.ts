import { supabase } from '@/lib/supabase'
import type { VorTableItem, UnitOption } from '../model/types'
import { getVorWorks } from './vor-works-api'
import { getVorMaterials } from './vor-materials-api'

// Получение полных данных ВОР для отображения в таблице
export const getVorTableData = async (vor_id: string): Promise<VorTableItem[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // Загружаем работы и материалы параллельно
  const [works, materials] = await Promise.all([
    getVorWorks({ vor_id }),
    getVorMaterials({ vor_id })
  ])

  const result: VorTableItem[] = []

  // Преобразуем работы в элементы таблицы
  works.forEach((work, workIndex) => {
    const workPrice = (work.base_rate || 0) * work.coefficient
    const workTotal = workPrice * work.quantity

    const workItem: VorTableItem = {
      id: work.id,
      type: 'work',
      name: work.rates?.work_name || '',
      unit: work.rates?.units?.name || '',
      quantity: work.quantity,
      coefficient: work.coefficient,
      work_price: workPrice,
      work_total: workTotal,
      base_rate: work.base_rate || 0,
      rate_id: work.rate_id,
      level: 1,
      sort_order: work.sort_order
    }

    result.push(workItem)

    // Добавляем материалы для этой работы
    const workMaterials = materials.filter(m => m.vor_work_id === work.id)
    workMaterials.forEach((material, materialIndex) => {
      const materialTotal = material.price * material.quantity

      const materialItem: VorTableItem = {
        id: material.id,
        type: 'material',
        name: material.supplier_material_name,
        unit: material.units?.name || '',
        quantity: material.quantity,
        material_price: material.price,
        material_total: materialTotal,
        vor_work_id: material.vor_work_id,
        level: 2,
        sort_order: material.sort_order,
        parent_id: work.id
      }

      result.push(materialItem)
    })
  })

  return result
}

// Получение единиц измерения для селектов
export const getUnitsOptions = async (): Promise<UnitOption[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('units')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки единиц измерения:', error)
    throw error
  }

  return data || []
}

// Вспомогательная функция для расчета итогов ВОР
export const calculateVorTotals = (items: VorTableItem[]) => {
  return items.reduce(
    (totals, item) => {
      if (item.type === 'work') {
        totals.workTotal += item.work_total || 0
      } else {
        totals.materialTotal += item.material_total || 0
      }
      totals.grandTotal += (item.work_total || 0) + (item.material_total || 0)
      return totals
    },
    { workTotal: 0, materialTotal: 0, grandTotal: 0 }
  )
}