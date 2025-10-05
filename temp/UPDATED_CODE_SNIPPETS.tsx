// =====================================================================================================================
// ОБНОВЛЁННЫЕ ФРАГМЕНТЫ КОДА для CostCategories.tsx
// =====================================================================================================================
// Применить изменения в файле src/pages/references/CostCategories.tsx
// =====================================================================================================================

// ==============================
// 1. ОБНОВИТЬ ИНТЕРФЕЙСЫ (строки 24-82)
// ==============================

interface DetailCategory {
  id: number
  name: string                // Глобально уникальное имя
  description: string | null
  unitId: string | null
  unitName: string | null
  // БЕЗ costCategoryId - оно теперь в маппинге!
  mappings: Array<{           // ← ИЗМЕНЕНО: вместо locations
    costCategoryId: number
    costCategoryName: string
    locationId: number
    locationName: string
  }>
}

interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  // БЕЗ cost_category_id!
  units: { name: string } | null
  detail_cost_categories_mapping: Array<{  // ← ИЗМЕНЕНО: новое название таблицы
    cost_category_id: number
    location_id: number
    cost_categories: {
      id: number
      name: string
    }
    location: {
      id: number
      name: string
    }
  }>
}

// ==============================
// 2. ОБНОВИТЬ ЗАПРОС detail_cost_categories (строки 127-158)
// ==============================

const {
  data: details,
  isLoading: detailsLoading,
  refetch: refetchDetails,
} = useQuery<DetailCategory[]>({
  queryKey: ['detail_cost_categories'],
  queryFn: async () => {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('detail_cost_categories')
      .select(`
        id,
        name,
        description,
        unit_id,
        units(name),
        detail_cost_categories_mapping(
          cost_category_id,
          location_id,
          cost_categories(id, name),
          location(id, name)
        )
      `)
      .returns<DetailCategoryRowDB[]>()
    if (error) {
      message.error('Не удалось загрузить виды')
      throw error
    }
    return (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      unitId: d.unit_id,
      unitName: d.units?.name ?? null,
      mappings: (d.detail_cost_categories_mapping ?? []).map((m) => ({
        costCategoryId: m.cost_category_id,
        costCategoryName: m.cost_categories?.name ?? '',
        locationId: m.location_id,
        locationName: m.location?.name ?? '',
      })),
    }))
  },
})

// ==============================
// 3. ОБНОВИТЬ ПРЕОБРАЗОВАНИЕ ДАННЫХ ДЛЯ ТАБЛИЦЫ
// ==============================

// Найти код, который создаёт tableData
// Заменить на:

const tableData: TableRow[] = useMemo(() => {
  if (!details) return []

  // Создать одну строку для каждой тройной связи
  return details.flatMap((detail) =>
    detail.mappings.map((mapping) => ({
      key: `${detail.id}-${mapping.costCategoryId}-${mapping.locationId}`,
      number: null, // Если есть, взять из категории
      categoryId: mapping.costCategoryId,
      categoryName: mapping.costCategoryName,
      categoryUnit: detail.unitName, // Или можно взять из категории
      detailId: detail.id,
      detailName: detail.name,
      detailUnit: detail.unitName,
      locations: [mapping.locationName], // Массив с одним элементом
      locationIds: [mapping.locationId],
    }))
  )
}, [details])

// ==============================
// 4. ОБНОВИТЬ ЛОГИКУ СОЗДАНИЯ (handleAdd)
// ==============================

// Найти функцию handleAdd или создание нового вида затрат
// Заменить на:

const handleAdd = async (values: any) => {
  try {
    // ШАГ 1: Создать или найти вид затрат (БЕЗ cost_category_id и location_id)
    let detailCategory

    // Проверить, существует ли уже такое имя
    const { data: existing } = await supabase
      .from('detail_cost_categories')
      .select('id')
      .eq('name', values.detailName)
      .single()

    if (existing) {
      detailCategory = existing
      message.info(`Вид затрат "${values.detailName}" уже существует, добавляем связь`)
    } else {
      // Создать новый вид затрат
      const { data, error: detailError } = await supabase
        .from('detail_cost_categories')
        .insert({
          name: values.detailName,
          description: values.detailDescription,
          unit_id: values.detailUnitId,
        })
        .select()
        .single()

      if (detailError) throw detailError
      detailCategory = data
    }

    // ШАГ 2: Создать тройную связь в маппинге
    const { error: mappingError } = await supabase
      .from('detail_cost_categories_mapping')
      .insert({
        cost_category_id: values.costCategoryId,
        detail_cost_category_id: detailCategory.id,
        location_id: values.locationId,
      })

    if (mappingError) {
      // Проверить, не существует ли уже такая связь
      if (mappingError.code === '23505') {
        message.warning('Такая связь уже существует')
      } else {
        throw mappingError
      }
    } else {
      message.success('Вид затрат добавлен')
    }

    refetchDetails()
    setAddMode(null)
    form.resetFields()
  } catch (error) {
    console.error('Ошибка при добавлении:', error)
    message.error('Не удалось добавить вид затрат')
  }
}

// ==============================
// 5. ОБНОВИТЬ ЛОГИКУ ОБНОВЛЕНИЯ (handleUpdate)
// ==============================

// Найти функцию handleUpdate или обновление вида затрат
// Заменить на:

const handleUpdate = async (detailId: number, values: any) => {
  try {
    // Обновить только базовые поля (БЕЗ cost_category_id и location_id)
    const { error } = await supabase
      .from('detail_cost_categories')
      .update({
        name: values.detailName,
        description: values.detailDescription,
        unit_id: values.detailUnitId,
      })
      .eq('id', detailId)

    if (error) throw error

    message.success('Вид затрат обновлён')
    refetchDetails()
    setEditing(null)
    form.resetFields()
  } catch (error) {
    console.error('Ошибка при обновлении:', error)
    message.error('Не удалось обновить вид затрат')
  }
}

// ==============================
// 6. ОБНОВИТЬ ЛОГИКУ УДАЛЕНИЯ (handleDelete)
// ==============================

// Найти функцию handleDelete
// Обновить на:

const handleDeleteDetail = async (detailId: number) => {
  try {
    // При удалении detail_cost_categories автоматически удалятся связи в маппинге (ON DELETE CASCADE)
    const { error } = await supabase.from('detail_cost_categories').delete().eq('id', detailId)

    if (error) throw error

    message.success('Вид затрат удалён')
    refetchDetails()
  } catch (error) {
    console.error('Ошибка при удалении:', error)
    message.error('Не удалось удалить вид затрат')
  }
}

// ==============================
// 7. ДОПОЛНИТЕЛЬНО: Удаление конкретной связи (опционально)
// ==============================

// Если нужно удалять не весь вид затрат, а только конкретную тройную связь:

const handleDeleteMapping = async (
  detailId: number,
  categoryId: number,
  locationId: number,
) => {
  try {
    const { error } = await supabase
      .from('detail_cost_categories_mapping')
      .delete()
      .eq('detail_cost_category_id', detailId)
      .eq('cost_category_id', categoryId)
      .eq('location_id', locationId)

    if (error) throw error

    message.success('Связь удалена')
    refetchDetails()
  } catch (error) {
    console.error('Ошибка при удалении связи:', error)
    message.error('Не удалось удалить связь')
  }
}

// =====================================================================================================================
// ВАЖНЫЕ ЗАМЕЧАНИЯ:
// =====================================================================================================================
// 1. Файл CostCategories.tsx очень большой (1125 строк)
// 2. Рекомендуется разбить на компоненты перед применением изменений
// 3. Эти фрагменты нужно применить в соответствующих местах существующего кода
// 4. После применения изменений запустить `npm run lint` и `npm run build`
// =====================================================================================================================
