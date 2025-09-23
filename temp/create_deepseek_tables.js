// СОЗДАНИЕ ТАБЛИЦ DEEPSEEK В SUPABASE
// Этот скрипт создает необходимые таблицы через Supabase JavaScript клиент

import { createClient } from '@supabase/supabase-js'

// Конфигурация Supabase
const SUPABASE_URL = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// SQL команды для создания таблиц
const createTablesSQL = `
-- Создание таблицы настроек Deepseek
CREATE TABLE IF NOT EXISTS deepseek_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  enabled BOOLEAN NOT NULL DEFAULT false,
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  system_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создание таблицы статистики использования
CREATE TABLE IF NOT EXISTS deepseek_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requests_count INTEGER NOT NULL DEFAULT 0,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

// Функция для создания таблиц
async function createDeepseekTables() {
  console.log('🔧 Создание таблиц Deepseek...')

  try {
    // Выполняем SQL команды
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createTablesSQL
    })

    if (error) {
      console.error('❌ Ошибка при создании таблиц:', error)
      return false
    }

    console.log('✅ Таблицы Deepseek созданы успешно')

    // Проверяем создание таблиц
    await checkTables()

    // Создаем начальные записи
    await createInitialRecords()

    return true
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error)
    return false
  }
}

// Функция для проверки созданных таблиц
async function checkTables() {
  console.log('🔍 Проверка созданных таблиц...')

  try {
    // Проверяем таблицу настроек
    const { data: settingsData, error: settingsError } = await supabase
      .from('deepseek_settings')
      .select('count')
      .limit(1)

    if (settingsError) {
      console.log('⚠️ Таблица deepseek_settings не найдена:', settingsError.message)
    } else {
      console.log('✅ Таблица deepseek_settings доступна')
    }

    // Проверяем таблицу статистики
    const { data: statsData, error: statsError } = await supabase
      .from('deepseek_usage_stats')
      .select('count')
      .limit(1)

    if (statsError) {
      console.log('⚠️ Таблица deepseek_usage_stats не найдена:', statsError.message)
    } else {
      console.log('✅ Таблица deepseek_usage_stats доступна')
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке таблиц:', error)
  }
}

// Функция для создания начальных записей
async function createInitialRecords() {
  console.log('📝 Создание начальных записей...')

  try {
    // Проверяем, есть ли уже записи в таблице настроек
    const { data: existing } = await supabase
      .from('deepseek_settings')
      .select('id')
      .limit(1)

    if (!existing || existing.length === 0) {
      // Создаем запись с настройками по умолчанию
      const { error: settingsError } = await supabase
        .from('deepseek_settings')
        .insert({
          api_key: '',
          base_url: 'https://api.deepseek.com',
          model: 'deepseek-chat',
          enabled: false,
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: null
        })

      if (settingsError) {
        console.error('❌ Ошибка при создании настроек:', settingsError)
      } else {
        console.log('✅ Начальные настройки созданы')
      }
    } else {
      console.log('ℹ️ Настройки уже существуют')
    }

    // Проверяем, есть ли уже записи в таблице статистики
    const { data: existingStats } = await supabase
      .from('deepseek_usage_stats')
      .select('id')
      .limit(1)

    if (!existingStats || existingStats.length === 0) {
      // Создаем запись статистики
      const { error: statsError } = await supabase
        .from('deepseek_usage_stats')
        .insert({
          requests_count: 0,
          tokens_input: 0,
          tokens_output: 0,
          total_cost: 0,
          successful_requests: 0,
          failed_requests: 0
        })

      if (statsError) {
        console.error('❌ Ошибка при создании статистики:', statsError)
      } else {
        console.log('✅ Начальная статистика создана')
      }
    } else {
      console.log('ℹ️ Статистика уже существует')
    }
  } catch (error) {
    console.error('❌ Ошибка при создании начальных записей:', error)
  }
}

// Запуск скрипта
createDeepseekTables()
  .then((success) => {
    if (success) {
      console.log('🎉 Все готово! Таблицы Deepseek созданы и настроены.')
      console.log('📋 Включает в себя:')
      console.log('   - deepseek_settings (с полем system_prompt)')
      console.log('   - deepseek_usage_stats')
      console.log('   - Начальные записи с настройками по умолчанию')
    } else {
      console.log('❌ Не удалось создать таблицы')
    }
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error)
  })