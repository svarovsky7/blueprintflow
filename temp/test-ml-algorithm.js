import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Тестовые поисковые запросы
const testQueries = [
  'пенополистирол псб-с-35',
  'пенополистирол пс-25',
  'утеплитель пенопласт псб 35',
  'полистирол экструдированный',
  'минеральная вата',
  'гипсокартон кнауф'
]

async function testMLAlgorithm() {
  console.log('🧪 Testing ML algorithm with improved search...')

  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`)

    // Тест 1: Точный поиск
    const { data: exactMatches } = await supabase
      .from('nomenclature')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .limit(5)

    console.log(`   📊 Exact search: ${exactMatches?.length || 0} matches`)
    if (exactMatches && exactMatches.length > 0) {
      exactMatches.forEach((match, i) => {
        console.log(`     ${i + 1}. "${match.name}"`)
      })
    }

    // Тест 2: Поиск по ключевым словам
    const words = query.split(/[\s\-.,()]+/).filter(word => word.length >= 2)
    if (words.length > 0) {
      const mainWord = words[0]
      console.log(`   🔑 Trying keyword search for: "${mainWord}"`)

      const { data: keywordMatches } = await supabase
        .from('nomenclature')
        .select('id, name')
        .ilike('name', `%${mainWord}%`)
        .limit(5)

      console.log(`   📊 Keyword search: ${keywordMatches?.length || 0} matches`)
      if (keywordMatches && keywordMatches.length > 0) {
        keywordMatches.forEach((match, i) => {
          console.log(`     ${i + 1}. "${match.name}"`)
        })
      }
    }

    // Тест 3: Поиск по синонимам для пенополистирола
    if (query.includes('пенопо') || query.includes('псб') || query.includes('пенопласт')) {
      console.log(`   🔄 Trying synonym search...`)

      const { data: synonymMatches } = await supabase
        .from('nomenclature')
        .select('id, name')
        .or('name.ilike.%пенопласт%,name.ilike.%пенополистирол%,name.ilike.%полистирол%')
        .limit(5)

      console.log(`   📊 Synonym search: ${synonymMatches?.length || 0} matches`)
      if (synonymMatches && synonymMatches.length > 0) {
        synonymMatches.forEach((match, i) => {
          console.log(`     ${i + 1}. "${match.name}"`)
        })
      }
    }

    console.log(`   ✅ Query "${query}" completed`)
  }

  console.log('\n✅ ML algorithm test completed')
}

testMLAlgorithm()