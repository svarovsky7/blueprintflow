// Проверка структуры базы данных Supabase для диагностики таблицы deepseek_settings
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTables() {
  console.log('=== ПРОВЕРКА ДОСТУПНОСТИ ТАБЛИЦ В SUPABASE ===')

  const tables = [
    'deepseek_settings',
    'deepseek_usage_stats',
    'projects',
    'chessboard'
  ]

  for (const table of tables) {
    try {
      console.log(`\n📊 Проверяем таблицу: ${table}`)

      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1)

      if (error) {
        console.log(`❌ Ошибка доступа к таблице ${table}:`, error.message)
        if (error.code) console.log(`   Код ошибки: ${error.code}`)
      } else {
        console.log(`✅ Таблица ${table} существует`)
        console.log(`   Количество записей: ${count}`)
        if (data && data.length > 0) {
          console.log(`   Поля:`, Object.keys(data[0]).join(', '))
        }
      }
    } catch (e) {
      console.log(`❌ Неожиданная ошибка для ${table}:`, e.message)
    }
  }
}

// Проверка deepseek_settings в деталях
async function checkDeepseekSettings() {
  console.log('\n\n=== ДЕТАЛЬНАЯ ПРОВЕРКА DEEPSEEK_SETTINGS ===')

  try {
    const { data, error } = await supabase
      .from('deepseek_settings')
      .select('*')
      .single()

    if (error) {
      console.log('❌ Ошибка:', error.message)
      console.log('   Код:', error.code)
      console.log('   Подробности:', error.details)

      if (error.code === 'PGRST116') {
        console.log('   Это значит: таблица существует, но записей нет')
      } else if (error.code === '42P01') {
        console.log('   Это значит: таблица не существует')
      }
    } else {
      console.log('✅ Запись найдена:')
      console.log('   ID:', data?.id || 'отсутствует')
      console.log('   API Key:', data?.api_key ? `${data.api_key.substring(0, 10)}...` : 'пустой')
      console.log('   Base URL:', data?.base_url || 'пустой')
      console.log('   Model:', data?.model || 'пустой')
      console.log('   Enabled:', data?.enabled || false)
      console.log('   Created:', data?.created_at || 'неизвестно')
      console.log('   Updated:', data?.updated_at || 'неизвестно')
    }
  } catch (e) {
    console.log('❌ Неожиданная ошибка:', e.message)
  }
}

// Проверка deepseek_usage_stats
async function checkDeepseekUsageStats() {
  console.log('\n\n=== ДЕТАЛЬНАЯ ПРОВЕРКА DEEPSEEK_USAGE_STATS ===')

  try {
    const { data, error } = await supabase
      .from('deepseek_usage_stats')
      .select('*')
      .single()

    if (error) {
      console.log('❌ Ошибка:', error.message)
      console.log('   Код:', error.code)

      if (error.code === 'PGRST116') {
        console.log('   Это значит: таблица существует, но записей нет')
      } else if (error.code === '42P01') {
        console.log('   Это значит: таблица не существует')
      }
    } else {
      console.log('✅ Статистика найдена:')
      console.log('   Запросов всего:', data?.requests_count || 0)
      console.log('   Успешных:', data?.successful_requests || 0)
      console.log('   Неуспешных:', data?.failed_requests || 0)
      console.log('   Токенов входящих:', data?.tokens_input || 0)
      console.log('   Токенов исходящих:', data?.tokens_output || 0)
      console.log('   Общая стоимость:', data?.total_cost || 0)
      console.log('   Последний запрос:', data?.last_request_at || 'никогда')
    }
  } catch (e) {
    console.log('❌ Неожиданная ошибка:', e.message)
  }
}

async function main() {
  await checkTables()
  await checkDeepseekSettings()
  await checkDeepseekUsageStats()

  console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===')
}

main().catch(console.error)