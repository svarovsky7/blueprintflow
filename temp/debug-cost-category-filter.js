// Диагностика проблемы с фильтрацией по категориям затрат
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

const projectId = 'f9227acf-9446-42c8-a533-bfeb30fa07a4' // Примевара 14

async function debugCostCategoryFilter() {
  console.log('🔍 Диагностика фильтрации по категориям затрат...')

  try {
    // 1. Получаем некоторые записи АР и ПОС (как в логах)
    const { data: arTags } = await supabase
      .from('documentation_tags')
      .select('id, name')
      .in('name', ['АР', 'ПОС / Котлован / ГИ'])

    if (!arTags || arTags.length === 0) {
      console.log('❌ Разделы АР/ПОС не найдены')
      return
    }

    const sectionIds = arTags.map(t => t.id)
    console.log(`✅ Разделы найдены: ${arTags.map(t => t.name).join(', ')}`)

    // 2. Воспроизводим получение chessboard_ids через документацию (как в логах)
    console.log('\n🔧 Шаг 1: Получение chessboard_ids через документацию...')
    const { data: docIds } = await supabase
      .from('chessboard_documentation_mapping')
      .select(`
        chessboard_id,
        chessboard!inner(project_id),
        documentation_versions!inner(
          documentation_id,
          documentations!inner(
            id, code, tag_id,
            documentation_tags!inner(id, name)
          )
        )
      `)
      .eq('chessboard.project_id', projectId)
      .in('documentation_versions.documentations.tag_id', sectionIds)

    const chessboardIds = [...new Set(docIds?.map((d) => d.chessboard_id))]
    console.log(`📋 Найдено ${chessboardIds.length} уникальных chessboard_id через документацию`)

    // 3. Проверяем, у скольких из этих записей ЕСТЬ chessboard_mapping
    console.log('\n🔧 Шаг 2: Проверка наличия chessboard_mapping для найденных ID...')
    const { data: mappingExists } = await supabase
      .from('chessboard_mapping')
      .select('chessboard_id, cost_category_id, cost_categories!inner(name)')
      .in('chessboard_id', chessboardIds.slice(0, 20)) // Первые 20 для анализа

    console.log(`📊 Из ${Math.min(chessboardIds.length, 20)} проверенных chessboard_id:`)
    console.log(`   ${mappingExists?.length || 0} имеют chessboard_mapping`)

    if (mappingExists && mappingExists.length > 0) {
      // Группируем по категориям
      const categoryGroups = new Map()
      mappingExists.forEach(m => {
        const catName = m.cost_categories?.name || 'Без категории'
        if (!categoryGroups.has(catName)) {
          categoryGroups.set(catName, [])
        }
        categoryGroups.get(catName).push(m.chessboard_id)
      })

      console.log('\n📋 Распределение по категориям затрат:')
      for (const [category, ids] of categoryGroups.entries()) {
        console.log(`   ${category}: ${ids.length} записей`)
      }
    } else {
      console.log('❌ ПРОБЛЕМА: Ни одна из записей не имеет chessboard_mapping!')
    }

    // 4. Тестируем реальную фильтрацию, как в коде портала
    console.log('\n🔧 Шаг 3: Тестирование фильтрации как в портале...')

    // Берем первую доступную категорию
    const { data: categories } = await supabase
      .from('cost_categories')
      .select('id, name')
      .limit(3)

    if (categories && categories.length > 0) {
      const testCategoryId = categories[0].id
      console.log(`🧪 Тестируем с категорией: "${categories[0].name}" (ID: ${testCategoryId})`)

      // Запрос как в портале - с INNER JOIN на chessboard_mapping
      const { data: filteredResults } = await supabase
        .from('chessboard')
        .select(`
          id,
          material,
          chessboard_mapping!inner(
            cost_category_id,
            cost_categories!inner(name)
          )
        `)
        .eq('project_id', projectId)
        .in('id', chessboardIds)
        .eq('chessboard_mapping.cost_category_id', testCategoryId)

      console.log(`📊 Результат фильтрации: ${filteredResults?.length || 0} записей`)

      if ((filteredResults?.length || 0) === 0) {
        console.log('⚠️ ПРИЧИНА: У записей из документации нет chessboard_mapping с выбранной категорией')

        // Проверим, вообще есть ли записи с этой категорией в проекте
        const { data: allWithCategory } = await supabase
          .from('chessboard')
          .select(`
            id,
            material,
            chessboard_mapping!inner(cost_category_id)
          `)
          .eq('project_id', projectId)
          .eq('chessboard_mapping.cost_category_id', testCategoryId)

        console.log(`📋 Всего записей с категорией "${categories[0].name}" в проекте: ${allWithCategory?.length || 0}`)
      } else {
        console.log('✅ Фильтрация работает корректно!')
      }
    }

  } catch (error) {
    console.error('💥 Ошибка диагностики:', error)
  }
}

debugCostCategoryFilter()