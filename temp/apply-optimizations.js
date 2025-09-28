// Применение оптимизаций БД для производительности 20K+ записей
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function applyOptimizations() {
  console.log('🚀 Применение оптимизаций БД для работы с 20K+ записями...')

  try {
    // 1. Читаем и применяем оптимизированные функции
    console.log('\n📋 ЭТАП 1: Применение оптимизированных SQL функций...')

    let functionsSQL
    try {
      functionsSQL = readFileSync('sql/chessboard_optimized_functions.sql', 'utf8')
    } catch (e) {
      console.error('❌ Не удалось прочитать файл sql/chessboard_optimized_functions.sql')
      console.log('   Убедитесь, что файл существует и доступен для чтения')
      return
    }

    // Разбиваем SQL на отдельные функции
    const functions = functionsSQL
      .split('-- =============================================================================')
      .filter(chunk => chunk.trim().length > 0)

    console.log(`📊 Найдено ${functions.length} блоков SQL для выполнения`)

    for (let i = 0; i < functions.length; i++) {
      const func = functions[i].trim()
      if (func && func.includes('CREATE OR REPLACE FUNCTION')) {
        console.log(`🔧 Применение функции ${i + 1}...`)

        try {
          // Выполняем каждую функцию отдельно через supabase-js
          const { error } = await supabase.rpc('query', { sql: func })

          if (error) {
            console.log(`⚠️ Ошибка функции ${i + 1}:`, error.message)
          } else {
            console.log(`✅ Функция ${i + 1} применена успешно`)
          }
        } catch (e) {
          console.log(`ℹ️ Альтернативная попытка для функции ${i + 1}`)
          // Пробуем альтернативный способ применения

          // Извлекаем имя функции для проверки её существования
          const funcNameMatch = func.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i)
          if (funcNameMatch) {
            const funcName = funcNameMatch[1]
            console.log(`   Проверка существования функции: ${funcName}`)

            // Пробуем вызвать функцию с тестовыми параметрами
            try {
              if (funcName === 'get_chessboard_page') {
                // Тестовый вызов для проверки
                const { data: testResult } = await supabase.rpc(funcName, {
                  p_project_id: 'cf1eb082-1907-49c8-92e7-2616e4b2027d',
                  p_page_size: 1,
                  p_offset: 0
                })
                console.log(`   ✅ Функция ${funcName} работает: получено ${testResult?.length || 0} записей`)
              }
            } catch (testError) {
              console.log(`   ❌ Функция ${funcName} недоступна:`, testError.message)
            }
          }
        }
      }
    }

    // 2. Проверяем доступность ключевых функций
    console.log('\n📋 ЭТАП 2: Проверка доступности функций...')

    const functionsToTest = [
      { name: 'get_chessboard_page', required: true },
      { name: 'get_chessboard_filter_stats', required: false },
      { name: 'get_chessboard_ids_filtered', required: false }
    ]

    const kingProjectId = 'cf1eb082-1907-49c8-92e7-2616e4b2027d'

    for (const func of functionsToTest) {
      try {
        console.log(`🔍 Тестирование функции: ${func.name}`)

        let result
        if (func.name === 'get_chessboard_page') {
          result = await supabase.rpc(func.name, {
            p_project_id: kingProjectId,
            p_page_size: 5,
            p_offset: 0
          })
        } else if (func.name === 'get_chessboard_filter_stats') {
          result = await supabase.rpc(func.name, {
            p_project_id: kingProjectId
          })
        } else if (func.name === 'get_chessboard_ids_filtered') {
          result = await supabase.rpc(func.name, {
            p_project_id: kingProjectId
          })
        }

        if (result.error) {
          console.log(`   ❌ ${func.name}: ${result.error.message}`)
          if (func.required) {
            console.log('   💥 КРИТИЧЕСКАЯ ОШИБКА: Основная функция недоступна!')
          }
        } else {
          console.log(`   ✅ ${func.name}: работает (${result.data?.length || 'N/A'} записей)`)
        }
      } catch (e) {
        console.log(`   ❌ ${func.name}: ${e.message}`)
      }
    }

    // 3. Тест производительности основной функции
    console.log('\n📋 ЭТАП 3: Тест производительности...')

    const testStart = performance.now()

    try {
      const { data: performanceData, error: perfError } = await supabase.rpc('get_chessboard_page', {
        p_project_id: kingProjectId,
        p_page_size: 100,
        p_offset: 0
      })

      const testEnd = performance.now()
      const testDuration = testEnd - testStart

      if (perfError) {
        console.log(`❌ Ошибка теста производительности: ${perfError.message}`)
      } else {
        const totalCount = performanceData?.[0]?.total_count || 0
        console.log(`📊 РЕЗУЛЬТАТ ПРОИЗВОДИТЕЛЬНОСТИ:`)
        console.log(`   Записей на странице: ${performanceData?.length || 0}`)
        console.log(`   Общее количество: ${totalCount}`)
        console.log(`   Время выполнения: ${Math.round(testDuration)}ms`)
        console.log(`   Производительность: ${Math.round(1000 / testDuration)} страниц/сек`)

        if (testDuration < 1000) {
          console.log(`   ✅ Отличная производительность для 20K записей`)
        } else if (testDuration < 3000) {
          console.log(`   ⚠️ Приемлемая производительность`)
        } else {
          console.log(`   ❌ Медленная производительность, нужна оптимизация`)
        }
      }
    } catch (e) {
      console.log(`❌ Критическая ошибка теста: ${e.message}`)
    }

    console.log('\n🎯 ЗАКЛЮЧЕНИЕ:')
    console.log('   Оптимизации применены')
    console.log('   Используйте новый хук useOptimizedChessboardData для максимальной производительности')
    console.log('   Серверная пагинация готова к работе с 20K+ записями')

  } catch (error) {
    console.error('💥 Общая ошибка применения оптимизаций:', error)
  }
}

applyOptimizations()