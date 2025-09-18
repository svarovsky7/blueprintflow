import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testNomenclature() {
  try {
    console.log('🔍 Testing nomenclature table...')

    // Тест 1: Общее количество записей
    const { count, error: countError } = await supabase
      .from('nomenclature')
      .select('*', { count: 'exact', head: true })

    console.log('📊 Total records:', count)
    if (countError) {
      console.error('❌ Count error:', countError.message)
      return
    }

    // Тест 2: Первые 5 записей для анализа структуры
    const { data: samples, error: sampleError } = await supabase
      .from('nomenclature')
      .select('*')
      .limit(5)

    console.log('📝 Sample records count:', samples?.length || 0)
    if (sampleError) {
      console.error('❌ Sample error:', sampleError.message)
    } else if (samples && samples.length > 0) {
      console.log('📋 Sample data:')
      samples.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id.substring(0, 8)}... | Name: "${record.name.substring(0, 50)}${record.name.length > 50 ? '...' : ''}"`)
      })
    }

    // Тест 3: Поиск по "пенополистирол"
    const searchTerms = [
      'пенополистирол',
      'пенопласт',
      'полистирол',
      'утепли',
      'изол'
    ]

    for (const term of searchTerms) {
      const { data: results, error: searchError } = await supabase
        .from('nomenclature')
        .select('*')
        .ilike('name', `%${term}%`)
        .limit(10)

      console.log(`🔍 Search "${term}": ${results?.length || 0} matches`)
      if (searchError) {
        console.error(`❌ Search error for "${term}":`, searchError.message)
      } else if (results && results.length > 0) {
        console.log(`   Top matches for "${term}":`)
        results.slice(0, 3).forEach((record, index) => {
          console.log(`     ${index + 1}. "${record.name.substring(0, 60)}${record.name.length > 60 ? '...' : ''}"`)
        })
      }
    }

    // Тест 4: Поиск всех записей, содержащих кириллические символы
    const { data: cyrillicResults, error: cyrillicError } = await supabase
      .from('nomenclature')
      .select('*')
      .like('name', '%а%') // Ищем записи с кириллической "а"
      .limit(10)

    console.log(`🔍 Records with Cyrillic "а": ${cyrillicResults?.length || 0} matches`)
    if (cyrillicError) {
      console.error('❌ Cyrillic search error:', cyrillicError.message)
    } else if (cyrillicResults && cyrillicResults.length > 0) {
      console.log('   Sample Cyrillic records:')
      cyrillicResults.slice(0, 3).forEach((record, index) => {
        console.log(`     ${index + 1}. "${record.name.substring(0, 60)}${record.name.length > 60 ? '...' : ''}"`)
      })
    }

    console.log('✅ Test completed')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testNomenclature()