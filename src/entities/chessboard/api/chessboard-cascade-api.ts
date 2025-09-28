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
      .select(
        `
        supplier_names!inner(
          id,
          name
        )
      `,
      )
      .eq('nomenclature_id', nomenclatureId)

    if (error) {
      console.error('Ошибка получения поставщиков по номенклатуре:', error)
      throw error
    }

    // Преобразуем данные и убираем дубликаты
    const suppliers =
      data
        ?.map((item) => item.supplier_names)
        .filter(Boolean)
        .reduce((acc, supplier) => {
          // Убираем дубликаты по ID
          if (!acc.find((s) => s.id === supplier.id)) {
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
      .select(
        `
        nomenclature!inner(
          id,
          name
        )
      `,
      )
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


    // Сначала получаем общее количество записей
    const { count, error: countError } = await supabase
      .from('nomenclature')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Ошибка подсчета номенклатур:', countError)
      throw countError
    }


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
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }


    return allData
  },

  /**
   * Получить всех поставщиков
   * Оптимизированная загрузка через пагинацию для обработки больших объемов данных
   */
  async getAllSuppliers(): Promise<SupplierOption[]> {
    if (!supabase) throw new Error('Supabase is not configured')


    // Сначала получаем общее количество записей
    const { count, error: countError } = await supabase
      .from('supplier_names')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Ошибка подсчета поставщиков:', countError)
      throw countError
    }


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
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }


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
  async createNomenclatureSupplierMapping(
    nomenclatureId: string,
    supplierId: string,
  ): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!nomenclatureId || !supplierId) {
      console.error('🔗 Cascade API: Некорректные параметры для создания связи:', {
        nomenclatureId,
        supplierId,
      })
      return false
    }

    console.log('🔗 Cascade API: Создаем связь номенклатура-поставщик:', {
      nomenclatureId,
      supplierId,
    }) // LOG: создание связи номенклатура-поставщик

    // Сначала проверим, не существует ли уже такая связь
    const existingLink = await this.isNomenclatureSupplierLinked(nomenclatureId, supplierId)
    if (existingLink) {
      console.log('🔗 Cascade API: Связь уже существует, пропускаем создание') // LOG: связь уже существует
      return true
    }

    try {
      const { error } = await supabase.from('nomenclature_supplier_mapping').insert([
        {
          nomenclature_id: nomenclatureId,
          supplier_id: supplierId,
        },
      ])

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
  },

  /**
   * Найти номенклатуру по названию поставщика (для ML автозаполнения)
   */
  async getNomenclatureBySupplierName(supplierName: string): Promise<NomenclatureOption | null> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!supplierName) {
      console.error('🔗 Cascade API: Пустое название поставщика для поиска номенклатуры')
      return null
    }

    console.log('🔗 Cascade API: Поиск номенклатуры по названию поставщика:', supplierName) // LOG: поиск номенклатуры по названию поставщика

    try {
      // Шаг 1: Найти supplier_id по названию в таблице supplier_names
      const { data: supplierData, error: supplierError } = await supabase
        .from('supplier_names')
        .select('id')
        .eq('name', supplierName)
        .limit(1)
        .single()

      if (supplierError || !supplierData) {
        console.log('🔗 Cascade API: Поставщик не найден в supplier_names:', supplierName) // LOG: поставщик не найден
        return null
      }

      console.log('🔗 Cascade API: Найден supplier_id:', supplierData.id) // LOG: найден supplier_id

      // Шаг 2: Найти номенклатуру через mapping таблицу
      const { data: mappingData, error: mappingError } = await supabase
        .from('nomenclature_supplier_mapping')
        .select(`
          nomenclature_id,
          nomenclature!inner(
            id,
            name
          )
        `)
        .eq('supplier_id', supplierData.id)
        .limit(1)
        .single()

      if (mappingError || !mappingData) {
        console.log('🔗 Cascade API: Номенклатура не найдена для поставщика:', supplierName) // LOG: номенклатура не найдена
        return null
      }

      const nomenclature = mappingData.nomenclature as { id: string; name: string }
      console.log('✅ Cascade API: Найдена номенклатура по названию поставщика:', {
        nomenclatureId: nomenclature.id,
        nomenclatureName: nomenclature.name,
        supplierName
      }) // LOG: найдена номенклатура

      return {
        value: nomenclature.id,
        label: nomenclature.name
      }

    } catch (error) {
      console.error('🔗 Cascade API: Ошибка поиска номенклатуры по названию поставщика:', error)
      return null
    }
  },
}
