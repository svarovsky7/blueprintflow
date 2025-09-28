// Проверка структуры таблицы materials
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMaterialsSchema() {
  console.log('🔍 Проверка структуры таблицы materials...')

  try {
    // Получаем одну запись для анализа структуры
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка получения данных из materials:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Структура таблицы materials:')
      const record = data[0]

      Object.keys(record).forEach(field => {
        const value = record[field]
        const type = typeof value
        console.log(`   ${field}: ${type} (${value === null ? 'NULL' : String(value).substring(0, 50)})`)
      })

      console.log('\n📋 Поля таблицы materials:')
      console.log(JSON.stringify(Object.keys(record), null, 2))
    } else {
      console.log('⚠️ Таблица materials пуста')
    }

    // Также проверим units
    console.log('\n🔍 Проверка структуры таблицы units...')

    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .limit(1)

    if (unitsError) {
      console.error('❌ Ошибка получения данных из units:', unitsError)
    } else if (unitsData && unitsData.length > 0) {
      console.log('✅ Структура таблицы units:')
      const unitsRecord = unitsData[0]

      Object.keys(unitsRecord).forEach(field => {
        const value = unitsRecord[field]
        const type = typeof value
        console.log(`   ${field}: ${type} (${value === null ? 'NULL' : String(value).substring(0, 50)})`)
      })

      console.log('\n📋 Поля таблицы units:')
      console.log(JSON.stringify(Object.keys(unitsRecord), null, 2))
    }

    // Проверим связь chessboard -> materials
    console.log('\n🔗 Проверка связи chessboard -> materials...')

    const { data: chessData, error: chessError } = await supabase
      .from('chessboard')
      .select('id, material')
      .limit(5)

    if (chessError) {
      console.error('❌ Ошибка получения chessboard данных:', chessError)
    } else if (chessData && chessData.length > 0) {
      console.log('📊 Примеры значений поля material в chessboard:')
      chessData.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.material} (тип: ${typeof row.material})`)
      })

      // Попробуем найти соответствующие записи в materials
      const materialIds = chessData.map(row => row.material)

      // Пробуем разные варианты JOIN
      const joinVariants = [
        { field: 'id', name: 'по id' },
        { field: 'uuid', name: 'по uuid' },
        { field: 'material_id', name: 'по material_id' },
        { field: 'guid', name: 'по guid' }
      ]

      for (const variant of joinVariants) {
        try {
          const { data: joinTest, error: joinError } = await supabase
            .from('materials')
            .select(`${variant.field}, name`)
            .in(variant.field, materialIds)
            .limit(3)

          if (!joinError && joinTest && joinTest.length > 0) {
            console.log(`✅ Успешный JOIN ${variant.name}: найдено ${joinTest.length} совпадений`)
            joinTest.forEach((row, i) => {
              console.log(`   ${i + 1}. ${row[variant.field]} -> ${row.name}`)
            })
          } else if (joinError) {
            console.log(`❌ JOIN ${variant.name} не работает: ${joinError.message}`)
          } else {
            console.log(`⚠️ JOIN ${variant.name}: 0 совпадений`)
          }
        } catch (e) {
          console.log(`❌ JOIN ${variant.name} ошибка: ${e.message}`)
        }
      }
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
  }
}

checkMaterialsSchema()