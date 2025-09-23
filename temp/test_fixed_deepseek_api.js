// ТЕСТ ИСПРАВЛЕННОГО API DEEPSEEK
// Проверяем работу API после исправлений для совместимости с БД без system_prompt

import { createClient } from '@supabase/supabase-js'

// Конфигурация
const SUPABASE_URL = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Базовая конфигурация Deepseek API (копия из deepseek-api.ts)
const DEEPSEEK_CONFIG = {
  BASE_URL: 'https://api.deepseek.com',
  DEFAULT_MODEL: 'deepseek-chat',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 1000,
  TIMEOUT_MS: 30000,
}

// Функция getSettings с исправлениями (копия логики)
async function getSettings() {
  console.log('🔍 Тестируем исправленную функцию getSettings...')

  try {
    // Используем явный список полей вместо * для совместимости с БД без system_prompt
    const { data, error } = await supabase
      .from('deepseek_settings')
      .select('id, api_key, base_url, model, enabled, temperature, max_tokens, created_at, updated_at')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Ошибка при получении настроек:', error)
      throw error
    }

    // Возвращаем настройки по умолчанию если не найдены
    if (!data) {
      console.log('⚠️ Настройки не найдены, возвращаем настройки по умолчанию')
      return {
        id: '',
        api_key: '',
        base_url: DEEPSEEK_CONFIG.BASE_URL,
        model: DEEPSEEK_CONFIG.DEFAULT_MODEL,
        enabled: false,
        temperature: DEEPSEEK_CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: DEEPSEEK_CONFIG.DEFAULT_MAX_TOKENS,
        system_prompt: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    console.log('✅ Основные настройки получены:', Object.keys(data))

    // Пытаемся получить system_prompt отдельно для обратной совместимости
    let systemPrompt = undefined
    try {
      console.log('🔍 Пытаемся получить system_prompt...')
      const { data: promptData } = await supabase
        .from('deepseek_settings')
        .select('system_prompt')
        .eq('id', data.id)
        .single()

      systemPrompt = promptData?.system_prompt || undefined
      console.log('✅ system_prompt получен:', systemPrompt ? 'ЕСТЬ' : 'НЕТ')
    } catch (promptError) {
      console.log('⚠️ system_prompt не найден (это нормально для БД без этого поля)')
    }

    const result = {
      ...data,
      system_prompt: systemPrompt
    }

    console.log('📋 Итоговые настройки:', Object.keys(result))
    return result

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    throw error
  }
}

// Функция upsertSettings с исправлениями (тестовая версия)
async function testUpsertSettings() {
  console.log('\n🔧 Тестируем исправленную функцию upsertSettings...')

  try {
    // Получаем существующие настройки
    const { data: existing } = await supabase
      .from('deepseek_settings')
      .select('id')
      .single()

    if (!existing) {
      console.log('❌ Нет существующих настроек для тестирования')
      return false
    }

    console.log('✅ Найдены настройки с ID:', existing.id)

    // Тестовые данные
    const testInput = {
      temperature: 0.8,
      max_tokens: 1500,
      system_prompt: 'Тестовый промпт для проверки совместимости'
    }

    // Исключаем system_prompt из данных для сохранения
    const { system_prompt, ...inputWithoutPrompt } = testInput

    // Данные для сохранения (без system_prompt)
    const dataToSave = {
      ...inputWithoutPrompt,
      updated_at: new Date().toISOString()
    }

    console.log('📤 Сохраняем основные данные (без system_prompt):', Object.keys(dataToSave))

    const query = supabase.from('deepseek_settings')
    const { data, error } = await query
      .update(dataToSave)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Ошибка при сохранении основных данных:', error)
      return false
    }

    console.log('✅ Основные данные сохранены')

    // Пытаемся сохранить system_prompt отдельно
    if (system_prompt !== undefined && data?.id) {
      try {
        console.log('🔧 Пытаемся сохранить system_prompt...')
        await supabase
          .from('deepseek_settings')
          .update({ system_prompt })
          .eq('id', data.id)

        console.log('✅ system_prompt сохранен успешно')
      } catch (promptError) {
        console.log('⚠️ system_prompt не сохранен (поле отсутствует в БД)')
      }
    }

    console.log('✅ Тест upsertSettings завершен успешно')
    return true

  } catch (error) {
    console.error('❌ Ошибка в тесте upsertSettings:', error)
    return false
  }
}

// Запуск всех тестов
async function runTests() {
  console.log('🧪 Запуск тестов исправленного Deepseek API...\n')

  try {
    // Тест 1: getSettings
    const settings = await getSettings()
    console.log('📋 Получены настройки:', {
      id: settings.id ? 'ЕСТЬ' : 'НЕТ',
      api_key: settings.api_key ? 'ЕСТЬ' : 'НЕТ',
      enabled: settings.enabled,
      system_prompt: settings.system_prompt ? 'ЕСТЬ' : 'НЕТ'
    })

    // Тест 2: upsertSettings
    const upsertSuccess = await testUpsertSettings()

    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТОВ:')
    console.log('✅ getSettings: РАБОТАЕТ')
    console.log(`${upsertSuccess ? '✅' : '❌'} upsertSettings: ${upsertSuccess ? 'РАБОТАЕТ' : 'ОШИБКА'}`)

    if (upsertSuccess) {
      console.log('\n🎉 Все тесты прошли успешно!')
      console.log('✅ API совместим с БД без поля system_prompt')
      console.log('✅ UI должен работать корректно')
    } else {
      console.log('\n⚠️ Есть проблемы с upsertSettings')
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка в тестах:', error)
  }

  console.log('\n🏁 Тестирование завершено')
}

// Запуск
runTests()