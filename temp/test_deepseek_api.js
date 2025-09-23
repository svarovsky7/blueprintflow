// ТЕСТ API DEEPSEEK
// Простой тест для проверки доступности таблиц через Supabase API

import { createClient } from '@supabase/supabase-js'

// Конфигурация
const SUPABASE_URL = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testTables() {
  console.log('🔍 Тестирование доступности таблиц Deepseek...')
  console.log(`📡 Подключение к: ${SUPABASE_URL}`)

  // Тест 1: deepseek_settings
  console.log('\n--- Тест таблицы deepseek_settings ---')
  try {
    const { data, error } = await supabase
      .from('deepseek_settings')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Ошибка:', error.message)
      console.log('   Код:', error.code)
      console.log('   Детали:', error.details)

      if (error.code === '42P01') {
        console.log('📝 Таблица не существует - нужно создать')
      }
    } else {
      console.log('✅ Таблица доступна')
      console.log('📋 Данные:', data)

      if (data && data.length > 0) {
        const columns = Object.keys(data[0])
        console.log('📄 Поля:', columns.join(', '))
        console.log('🔍 system_prompt:', columns.includes('system_prompt') ? '✅ Присутствует' : '❌ Отсутствует')
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message)
  }

  // Тест 2: deepseek_usage_stats
  console.log('\n--- Тест таблицы deepseek_usage_stats ---')
  try {
    const { data, error } = await supabase
      .from('deepseek_usage_stats')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Ошибка:', error.message)
      console.log('   Код:', error.code)
      console.log('   Детали:', error.details)

      if (error.code === '42P01') {
        console.log('📝 Таблица не существует - нужно создать')
      }
    } else {
      console.log('✅ Таблица доступна')
      console.log('📋 Данные:', data)

      if (data && data.length > 0) {
        const columns = Object.keys(data[0])
        console.log('📄 Поля:', columns.join(', '))
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message)
  }

  // Тест 3: Общая информация о подключении
  console.log('\n--- Информация о подключении ---')
  try {
    const { data, error } = await supabase
      .from('chessboard')
      .select('count')
      .limit(1)

    if (error) {
      console.log('❌ Проблемы с базовым подключением:', error.message)
    } else {
      console.log('✅ Базовое подключение к БД работает')
    }
  } catch (err) {
    console.log('❌ Критическая ошибка подключения:', err.message)
  }

  console.log('\n🏁 Тестирование завершено')
}

// Запуск тестов
testTables()