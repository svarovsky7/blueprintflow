// Проверка актуальной схемы таблицы chessboard
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Проверка актуальной схемы таблицы chessboard...')

  try {
    // Получаем одну запись для анализа структуры
    const { data, error } = await supabase
      .from('chessboard')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка получения данных:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Структура таблицы chessboard:')
      const record = data[0]

      Object.keys(record).forEach(field => {
        const value = record[field]
        const type = typeof value
        console.log(`   ${field}: ${type} (${value === null ? 'NULL' : String(value).substring(0, 50)})`)
      })

      console.log('\n📋 JSON структура для копирования:')
      console.log(JSON.stringify(Object.keys(record), null, 2))
    } else {
      console.log('⚠️ Таблица пуста, получаем структуру через describe')
    }

    // Также проверим связанные таблицы
    console.log('\n🔍 Проверка связанных таблиц...')

    const tables = ['chessboard_mapping', 'chessboard_documentation_mapping', 'chessboard_floor_mapping', 'chessboard_rates_mapping']

    for (const table of tables) {
      try {
        const { data: tableData } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (tableData && tableData.length > 0) {
          console.log(`\n📊 ${table}:`)
          Object.keys(tableData[0]).forEach(field => {
            console.log(`   ${field}`)
          })
        }
      } catch (e) {
        console.log(`⚠️ Таблица ${table} недоступна`)
      }
    }

  } catch (error) {
    console.error('💥 Ошибка проверки схемы:', error)
  }
}

checkSchema()