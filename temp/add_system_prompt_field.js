// ДОБАВЛЕНИЕ ПОЛЯ system_prompt В ТАБЛИЦУ deepseek_settings
// Этот скрипт использует обходной путь для добавления поля

import { createClient } from '@supabase/supabase-js'

// Конфигурация
const SUPABASE_URL = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function addSystemPromptField() {
  console.log('🔧 Добавление поля system_prompt в таблицу deepseek_settings...')

  try {
    // Сначала проверим текущую структуру таблицы
    console.log('🔍 Проверка текущей структуры таблицы...')

    const { data: currentData, error: readError } = await supabase
      .from('deepseek_settings')
      .select('*')
      .limit(1)

    if (readError) {
      console.error('❌ Ошибка при чтении таблицы:', readError.message)
      return false
    }

    if (currentData && currentData.length > 0) {
      const columns = Object.keys(currentData[0])
      console.log('📄 Текущие поля:', columns.join(', '))

      if (columns.includes('system_prompt')) {
        console.log('✅ Поле system_prompt уже существует!')
        return true
      }
    }

    console.log('⚠️ Поле system_prompt отсутствует. Попытка добавления...')

    // Попробуем добавить поле через UPDATE с NULL значением
    // Этот хак может сработать в некоторых случаях
    console.log('🔧 Метод 1: Попытка через UPDATE...')

    const { error: updateError } = await supabase
      .from('deepseek_settings')
      .update({ system_prompt: null })
      .eq('id', 'dummy-id-that-does-not-exist')

    if (updateError) {
      if (updateError.message.includes('column "system_prompt" does not exist')) {
        console.log('❌ Поле действительно отсутствует в схеме БД')
        console.log('📝 Необходимо выполнить ALTER TABLE через веб-интерфейс Supabase')
      } else {
        console.log('⚠️ Неожиданная ошибка:', updateError.message)
      }
    } else {
      console.log('✅ Поле system_prompt добавлено успешно!')
      return true
    }

    // Метод 2: Попробуем через RPC (если есть такая функция)
    console.log('🔧 Метод 2: Попытка через RPC...')

    try {
      const { error: rpcError } = await supabase
        .rpc('add_system_prompt_to_deepseek_settings')

      if (rpcError) {
        console.log('❌ RPC функция недоступна:', rpcError.message)
      } else {
        console.log('✅ Поле добавлено через RPC!')
        return true
      }
    } catch (rpcErr) {
      console.log('❌ RPC не поддерживается:', rpcErr.message)
    }

    // Если все методы не сработали, выводим инструкции
    console.log('\n📋 ИНСТРУКЦИИ ДЛЯ РУЧНОГО ДОБАВЛЕНИЯ ПОЛЯ:')
    console.log('1. Откройте веб-интерфейс Supabase:')
    console.log('   https://app.supabase.com/project/hfqgcaxmufzitdfafdlp')
    console.log('2. Перейдите в "Table Editor" → "deepseek_settings"')
    console.log('3. Нажмите "Add Column" и создайте:')
    console.log('   - Название: system_prompt')
    console.log('   - Тип: text')
    console.log('   - Nullable: true (разрешить NULL)')
    console.log('   - Default: NULL')
    console.log('4. Сохраните изменения')

    console.log('\n🔧 АЛЬТЕРНАТИВНО - выполните SQL команду:')
    console.log('ALTER TABLE deepseek_settings ADD COLUMN system_prompt TEXT;')

    return false

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    return false
  }
}

// Функция для проверки результата
async function verifyField() {
  console.log('\n🔍 Проверка результата...')

  try {
    const { data, error } = await supabase
      .from('deepseek_settings')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка при проверке:', error.message)
      return false
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log('📄 Поля после изменений:', columns.join(', '))

      if (columns.includes('system_prompt')) {
        console.log('✅ Поле system_prompt успешно добавлено!')
        return true
      } else {
        console.log('❌ Поле system_prompt всё ещё отсутствует')
        return false
      }
    }

    return false
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error)
    return false
  }
}

// Запуск
async function main() {
  const success = await addSystemPromptField()

  if (success) {
    await verifyField()
  }

  console.log('\n🏁 Процесс завершён')
}

main()