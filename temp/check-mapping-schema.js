// Проверка структуры таблицы chessboard_mapping
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMappingSchema() {
  console.log('🔍 Проверка структуры таблицы chessboard_mapping...')

  try {
    // Получаем одну запись для анализа структуры
    const { data, error } = await supabase
      .from('chessboard_mapping')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка получения данных из chessboard_mapping:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Структура таблицы chessboard_mapping:')
      const record = data[0]

      Object.keys(record).forEach((field, index) => {
        const value = record[field]
        const type = typeof value
        const isNull = value === null
        console.log(`   ${index + 1}. ${field}: ${type} ${isNull ? '(NULL)' : `(${String(value).substring(0, 50)})`}`)
      })

      console.log('\n📋 Поля таблицы chessboard_mapping:')
      console.log(JSON.stringify(Object.keys(record), null, 2))

      // Проверяем типы данных в location_id
      console.log('\n🔍 Анализ поля location_id...')

      const { data: locationSample, error: locationError } = await supabase
        .from('chessboard_mapping')
        .select('location_id')
        .not('location_id', 'is', null)
        .limit(5)

      if (locationError) {
        console.error('❌ Ошибка получения location_id:', locationError)
      } else if (locationSample && locationSample.length > 0) {
        console.log(`📊 Примеры location_id (не NULL):`)
        locationSample.forEach((row, i) => {
          console.log(`   ${i + 1}. ${row.location_id} (тип: ${typeof row.location_id})`)
        })
      } else {
        console.log('⚠️ Все значения location_id равны NULL')
      }

      // Проверяем типы данных в block_id
      console.log('\n🔍 Анализ поля block_id...')

      const { data: blockSample, error: blockError } = await supabase
        .from('chessboard_mapping')
        .select('block_id')
        .not('block_id', 'is', null)
        .limit(5)

      if (blockError) {
        console.error('❌ Ошибка получения block_id:', blockError)
      } else if (blockSample && blockSample.length > 0) {
        console.log(`📊 Примеры block_id (не NULL):`)
        blockSample.forEach((row, i) => {
          console.log(`   ${i + 1}. ${row.block_id} (тип: ${typeof row.block_id})`)
        })
      } else {
        console.log('⚠️ Все значения block_id равны NULL')
      }

    } else {
      console.log('⚠️ Таблица chessboard_mapping пуста')
    }

    // Также проверим cost_category_id и cost_type_id
    console.log('\n🔍 Проверка типов cost_category_id и cost_type_id...')

    const { data: costSample, error: costError } = await supabase
      .from('chessboard_mapping')
      .select('cost_category_id, cost_type_id')
      .not('cost_category_id', 'is', null)
      .limit(3)

    if (costError) {
      console.error('❌ Ошибка получения cost данных:', costError)
    } else if (costSample && costSample.length > 0) {
      console.log(`📊 Примеры cost полей:`)
      costSample.forEach((row, i) => {
        console.log(`   ${i + 1}. cost_category_id: ${row.cost_category_id} (тип: ${typeof row.cost_category_id})`)
        console.log(`      cost_type_id: ${row.cost_type_id} (тип: ${typeof row.cost_type_id})`)
      })
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
  }
}

checkMappingSchema()