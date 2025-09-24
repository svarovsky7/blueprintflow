import { supabase } from '@/lib/supabase'

export interface SupplierOption {
  id: string
  name: string
}

export interface NomenclatureOption {
  id: string
  name: string
}

/**
 * API для работы с каскадными зависимостями номенклатуры и поставщиков в Шахматке
 */
export const chessboardCascadeApi = {
  /**
   * Получить всех поставщиков, связанных с выбранной номенклатурой
   */
  async getSuppliersByNomenclature(nomenclatureId: string): Promise<SupplierOption[]> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!nomenclatureId) return []

    console.log('🔗 Cascade API: Получаем поставщиков для номенклатуры:', nomenclatureId) // LOG: получение поставщиков по номенклатуре

    const { data, error } = await supabase
      .from('nomenclature_supplier_mapping')
      .select(`
        supplier_names!inner(
          id,
          name
        )
      `)
      .eq('nomenclature_id', nomenclatureId)

    if (error) {
      console.error('Ошибка получения поставщиков по номенклатуре:', error)
      throw error
    }

    // Преобразуем данные и убираем дубликаты
    const suppliers = data
      ?.map(item => item.supplier_names)
      .filter(Boolean)
      .reduce((acc, supplier) => {
        // Убираем дубликаты по ID
        if (!acc.find(s => s.id === supplier.id)) {
          acc.push(supplier)
        }
        return acc
      }, [] as SupplierOption[])
      .sort((a, b) => a.name.localeCompare(b.name)) || []

    console.log('🔗 Cascade API: Найдено поставщиков:', suppliers.length) // LOG: количество найденных поставщиков

    return suppliers
  },

  /**
   * Получить номенклатуру по выбранному поставщику
   */
  async getNomenclatureBySupplier(supplierId: string): Promise<NomenclatureOption | null> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!supplierId) return null

    console.log('🔗 Cascade API: Получаем номенклатуру для поставщика:', supplierId) // LOG: получение номенклатуры по поставщику

    const { data, error } = await supabase
      .from('nomenclature_supplier_mapping')
      .select(`
        nomenclature!inner(
          id,
          name
        )
      `)
      .eq('supplier_id', supplierId)
      .limit(1)

    if (error) {
      console.error('Ошибка получения номенклатуры по поставщику:', error)
      throw error
    }

    const nomenclature = data?.[0]?.nomenclature || null

    console.log('🔗 Cascade API: Найдена номенклатура:', nomenclature?.name || 'не найдена') // LOG: найденная номенклатура

    return nomenclature
  },

  /**
   * Получить все доступные номенклатуры
   * Оптимизированная загрузка через пагинацию для обработки больших объемов данных
   */
  async getAllNomenclature(): Promise<NomenclatureOption[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    console.log('🔍 Cascade API: Загрузка всех номенклатур...') // LOG: начало загрузки номенклатур

    // Сначала получаем общее количество записей
    const { count, error: countError } = await supabase
      .from('nomenclature')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Ошибка подсчета номенклатур:', countError)
      throw countError
    }

    console.log(`🔍 Cascade API: Найдено ${count} номенклатур, загружаем через пагинацию...`) // LOG: количество записей

    // Загружаем все данные через пагинацию
    const allData = []
    const pageSize = 1000
    const totalPages = Math.ceil((count || 0) / pageSize)

    for (let page = 0; page < totalPages; page++) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabase
        .from('nomenclature')
        .select('id, name')
        .order('name')
        .range(from, to)

      if (error) {
        console.error(`Ошибка загрузки страницы ${page + 1}:`, error)
        throw error
      }

      if (data && data.length > 0) {
        allData.push(...data)
      }

      // Небольшая задержка для предотвращения rate limiting
      if (page < totalPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    console.log(`✅ Cascade API: Загружено ${allData.length} номенклатур`) // LOG: результат загрузки

    return allData
  },

  /**
   * Получить всех поставщиков
   * Оптимизированная загрузка через пагинацию для обработки больших объемов данных
   */
  async getAllSuppliers(): Promise<SupplierOption[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    console.log('🔍 Cascade API: Загрузка всех поставщиков...') // LOG: начало загрузки поставщиков

    // Сначала получаем общее количество записей
    const { count, error: countError } = await supabase
      .from('supplier_names')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Ошибка подсчета поставщиков:', countError)
      throw countError
    }

    console.log(`🔍 Cascade API: Найдено ${count} поставщиков, загружаем через пагинацию...`) // LOG: количество записей

    // Загружаем все данные через пагинацию
    const allData = []
    const pageSize = 1000
    const totalPages = Math.ceil((count || 0) / pageSize)

    for (let page = 0; page < totalPages; page++) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabase
        .from('supplier_names')
        .select('id, name')
        .order('name')
        .range(from, to)

      if (error) {
        console.error(`Ошибка загрузки страницы ${page + 1}:`, error)
        throw error
      }

      if (data && data.length > 0) {
        allData.push(...data)
      }

      // Небольшая задержка для предотвращения rate limiting
      if (page < totalPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    console.log(`✅ Cascade API: Загружено ${allData.length} поставщиков`) // LOG: результат загрузки

    return allData
  },

  /**
   * Проверить, связаны ли номенклатура и поставщик
   */
  async isNomenclatureSupplierLinked(nomenclatureId: string, supplierId: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!nomenclatureId || !supplierId) return false

    const { data, error } = await supabase
      .from('nomenclature_supplier_mapping')
      .select('nomenclature_id')
      .eq('nomenclature_id', nomenclatureId)
      .eq('supplier_id', supplierId)
      .limit(1)

    if (error) {
      console.error('Ошибка проверки связи номенклатуры и поставщика:', error)
      return false
    }

    return data && data.length > 0
  },

  /**
   * Создать связь между номенклатурой и поставщиком
   */
  async createNomenclatureSupplierMapping(nomenclatureId: string, supplierId: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!nomenclatureId || !supplierId) {
      console.error('🔗 Cascade API: Некорректные параметры для создания связи:', { nomenclatureId, supplierId })
      return false
    }

    console.log('🔗 Cascade API: Создаем связь номенклатура-поставщик:', { nomenclatureId, supplierId }) // LOG: создание связи номенклатура-поставщик

    // Сначала проверим, не существует ли уже такая связь
    const existingLink = await this.isNomenclatureSupplierLinked(nomenclatureId, supplierId)
    if (existingLink) {
      console.log('🔗 Cascade API: Связь уже существует, пропускаем создание') // LOG: связь уже существует
      return true
    }

    try {
      const { error } = await supabase
        .from('nomenclature_supplier_mapping')
        .insert([{
          nomenclature_id: nomenclatureId,
          supplier_id: supplierId
        }])

      if (error) {
        console.error('🔗 Cascade API: Ошибка создания связи номенклатуры и поставщика:', error)
        return false
      }

      console.log('✅ Cascade API: Связь номенклатура-поставщик успешно создана') // LOG: связь создана
      return true

    } catch (error) {
      console.error('🔗 Cascade API: Исключение при создании связи:', error)
      return false
    }
  }
}