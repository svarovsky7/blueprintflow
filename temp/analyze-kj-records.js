// Углубленный анализ записей КЖ для понимания расхождения
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

const projectId = 'f9227acf-9446-42c8-a533-bfeb30fa07a4' // Примевара 14

async function analyzeKJRecords() {
  console.log('🔍 Углубленный анализ записей КЖ...')

  try {
    // 1. Найти tag_id для раздела КЖ
    const { data: kjTags } = await supabase
      .from('documentation_tags')
      .select('id, name')
      .ilike('name', '%КЖ%')

    const kjTagId = kjTags[0].id
    console.log(`✅ Раздел КЖ: ID=${kjTagId}`)

    // 2. Проверяем старый подход (который показывал 13 записей)
    console.log('\n📊 АНАЛИЗ 1: Прямой запрос chessboard с JOIN (старый подход)')
    const { data: directRecords } = await supabase
      .from('chessboard')
      .select(`
        id,
        material,
        chessboard_documentation_mapping!inner(
          documentation_versions!inner(
            documentations!inner(
              tag_id,
              documentation_tags!inner(name)
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('chessboard_documentation_mapping.documentation_versions.documentations.tag_id', kjTagId)

    console.log(`📋 Прямой запрос нашел: ${directRecords?.length || 0} записей`)

    // 3. Новый подход через chessboard_documentation_mapping
    console.log('\n📊 АНАЛИЗ 2: Через chessboard_documentation_mapping (новый подход)')
    const { data: mappingRecords } = await supabase
      .from('chessboard_documentation_mapping')
      .select(`
        chessboard_id,
        chessboard!inner(project_id, material),
        documentation_versions!inner(
          documentation_id,
          documentations!inner(
            tag_id,
            code,
            documentation_tags!inner(name)
          )
        )
      `)
      .eq('chessboard.project_id', projectId)
      .eq('documentation_versions.documentations.tag_id', kjTagId)

    console.log(`📋 Mapping запрос нашел: ${mappingRecords?.length || 0} записей`)

    // 4. Анализируем различия
    if (directRecords && mappingRecords) {
      const directIds = new Set(directRecords.map(r => r.id))
      const mappingIds = new Set(mappingRecords.map(r => r.chessboard_id))

      console.log('\n🔍 СРАВНЕНИЕ ПОДХОДОВ:')
      console.log(`Прямой запрос: ${directIds.size} уникальных ID`)
      console.log(`Mapping запрос: ${mappingIds.size} уникальных ID`)

      // Находим записи, которые есть в mapping, но нет в direct
      const onlyInMapping = [...mappingIds].filter(id => !directIds.has(id))
      const onlyInDirect = [...directIds].filter(id => !mappingIds.has(id))

      console.log(`Только в mapping: ${onlyInMapping.length} записей`)
      console.log(`Только в direct: ${onlyInDirect.length} записей`)

      if (onlyInMapping.length > 0) {
        console.log('\n🔍 Записи, которые есть только в mapping подходе:')
        for (const id of onlyInMapping.slice(0, 5)) {
          const record = mappingRecords.find(r => r.chessboard_id === id)
          console.log(`- ID: ${id}, материал: ${record?.chessboard?.material || 'N/A'}`)
        }
      }
    }

    // 5. Проверяем версии документов
    console.log('\n📊 АНАЛИЗ 3: Проверка версий документов')
    const { data: docVersions } = await supabase
      .from('chessboard_documentation_mapping')
      .select(`
        chessboard_id,
        documentation_versions!inner(
          id,
          version_number,
          documentation_id,
          documentations!inner(code, tag_id)
        )
      `)
      .eq('documentation_versions.documentations.tag_id', kjTagId)

    if (docVersions) {
      // Группируем по chessboard_id для анализа версий
      const versionsByChess = new Map()
      docVersions.forEach(item => {
        const id = item.chessboard_id
        if (!versionsByChess.has(id)) {
          versionsByChess.set(id, [])
        }
        versionsByChess.get(id).push(item.documentation_versions)
      })

      console.log(`📋 Всего mapping записей с версиями: ${docVersions.length}`)
      console.log(`📋 Уникальных chessboard_id: ${versionsByChess.size}`)

      // Показать примеры множественных версий
      let multiVersionCount = 0
      for (const [chessId, versions] of versionsByChess.entries()) {
        if (versions.length > 1) {
          multiVersionCount++
          if (multiVersionCount <= 3) {
            console.log(`🔄 Chessboard ${chessId}: ${versions.length} версий документов`)
            versions.forEach((v, i) => {
              console.log(`   ${i+1}. Версия ${v.version_number}, doc_id: ${v.documentation_id}`)
            })
          }
        }
      }
      console.log(`📊 Записей с множественными версиями: ${multiVersionCount}`)
    }

  } catch (error) {
    console.error('💥 Ошибка анализа:', error)
  }
}

analyzeKJRecords()