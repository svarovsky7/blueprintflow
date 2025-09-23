// Тест поиска поставщиков по конкретному материалу
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupplierSearch() {
  // Тестируем с несколькими типами материалов
  const testMaterials = [
    'Плита ОСБ',
    'пенопласт',
    'Болт',
    'Гайка',
    'Краска',
    'Доска'
  ]

  for (const material of testMaterials) {
    console.log(`\n🔍 Тестируем поиск поставщиков для: "${material}"`)

    const searchTerm = material.toLowerCase().trim()

    // Стратегия 1: Точный поиск по полному термину
    const { data: matches, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${searchTerm}%`)
      .limit(5) // Ограничим для удобства просмотра

    if (error) {
      console.error(`❌ Ошибка поиска для "${material}":`, error)
      continue
    }

    console.log(`📊 Найдено совпадений: ${matches?.length || 0}`)

    if (matches && matches.length > 0) {
      console.log('📋 Примеры найденных поставщиков:')
      matches.forEach((supplier, index) => {
        console.log(`  ${index + 1}. "${supplier.name}"`)
      })
    } else {
      console.log('⚠️ Совпадений не найдено')

      // Попробуем поиск по ключевым словам
      const searchWords = searchTerm.split(/[\s\-.,()]+/).filter(word => word.length >= 2)
      if (searchWords.length > 0) {
        const mainWord = searchWords[0]
        console.log(`🔍 Пробуем поиск по ключевому слову: "${mainWord}"`)

        const { data: keywordMatches, error: keywordError } = await supabase
          .from('supplier_names')
          .select('id, name')
          .ilike('name', `%${mainWord}%`)
          .limit(3)

        if (!keywordError && keywordMatches && keywordMatches.length > 0) {
          console.log(`📊 Найдено по ключевому слову: ${keywordMatches.length}`)
          keywordMatches.forEach((supplier, index) => {
            console.log(`  ${index + 1}. "${supplier.name}"`)
          })
        }
      }
    }
  }
}

testSupplierSearch().catch(console.error)