// Анализ работы алгоритмов поиска поставщиков на конкретных материалах
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Тестовые материалы
const TEST_MATERIALS = [
  {
    name: 'пеноплэкс',
    type: 'simple',
    description: 'Простой материал, должен работать с алгоритмами 1-2'
  },
  {
    name: 'Кран шаровой резьбовой BVR-R DN32 BVR-R DN32 065B8310R Ридан',
    type: 'complex',
    description: 'Сложный технический материал с артикулами, работает только с алгоритмом 3'
  }
]

// Алгоритм 1: Простой поиск (аналог searchMaterialInSuppliers)
async function algorithm1_SimpleSearch(materialName) {
  console.log(`\n🔍 АЛГОРИТМ 1: Простой поиск для "${materialName}"`)

  const cleanedName = materialName.trim().toLowerCase()
  const results = []

  try {
    // Стратегия 1: Точное совпадение
    const { data: exactMatch, error: exactError } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', cleanedName)
      .limit(1)

    if (!exactError && exactMatch && exactMatch.length > 0) {
      console.log('  ✅ Точное совпадение найдено:', exactMatch.length)
      results.push(...exactMatch.map(item => ({ ...item, strategy: 'exact', confidence: 1.0 })))
    } else {
      console.log('  ❌ Точное совпадение не найдено')
    }

    // Стратегия 2: Поиск по началу
    const { data: startsWith, error: startsError } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `${cleanedName}%`)
      .limit(3)

    if (!startsError && startsWith && startsWith.length > 0) {
      console.log('  ✅ Поиск по началу найден:', startsWith.length)
      results.push(...startsWith.map(item => ({ ...item, strategy: 'starts_with', confidence: 0.8 })))
    } else {
      console.log('  ❌ Поиск по началу не найден')
    }

    // Стратегия 3: Поиск по ключевым словам
    const keywords = cleanedName
      .replace(/[^\w\sа-яё]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !['для', 'при', 'под', 'над', 'без', 'про', 'или'].includes(word))

    console.log('  📝 Ключевые слова:', keywords)

    if (keywords.length > 0) {
      for (const keyword of keywords) {
        const { data: keywordMatch, error: keywordError } = await supabase
          .from('supplier_names')
          .select('id, name')
          .ilike('name', `%${keyword}%`)
          .limit(5)

        if (!keywordError && keywordMatch && keywordMatch.length > 0) {
          console.log(`  ✅ Поиск по ключевому слову "${keyword}":`, keywordMatch.length)

          // Фильтруем по релевантности
          const relevantResults = keywordMatch.filter(item => {
            const itemLower = item.name.toLowerCase()
            const matchingKeywords = keywords.filter(kw => itemLower.includes(kw))
            return matchingKeywords.length >= Math.min(2, keywords.length)
          })

          results.push(...relevantResults.map(item => ({ ...item, strategy: 'keyword', confidence: 0.6 })))
          break // Берем первый успешный результат
        }
      }
    }

    return results.slice(0, 10) // Ограничиваем результат
  } catch (error) {
    console.error('  ❌ Ошибка алгоритма 1:', error.message)
    return []
  }
}

// Алгоритм 2: Векторный поиск (аналог vectorSearchSupplierNames)
async function algorithm2_VectorSearch(materialName) {
  console.log(`\n🔍 АЛГОРИТМ 2: Векторный поиск для "${materialName}"`)

  try {
    // Получаем все записи для анализа
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .limit(1000)

    if (error) {
      console.error('  ❌ Ошибка получения данных:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      console.log('  ❌ Нет данных в таблице')
      return []
    }

    console.log(`  📊 Анализируем ${data.length} записей`)

    const searchTerms = materialName.toLowerCase().split(/\s+/)
    console.log('  📝 Поисковые термины:', searchTerms)

    const results = data
      .map(item => {
        const itemName = item.name.toLowerCase()
        let confidence = 0

        // Рассчитываем confidence
        searchTerms.forEach(term => {
          if (itemName.includes(term)) {
            confidence += 0.3
          }
          if (itemName.startsWith(term)) {
            confidence += 0.2
          }
          if (itemName.endsWith(term)) {
            confidence += 0.1
          }
        })

        // Бонус за точное совпадение
        if (itemName === materialName.toLowerCase()) {
          confidence = 1.0
        }

        return {
          id: item.id,
          name: item.name,
          confidence: Math.min(confidence, 1.0),
          strategy: 'vector'
        }
      })
      .filter(item => item.confidence > 0.1)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20)

    console.log(`  ✅ Найдено ${results.length} результатов с confidence > 0.1`)
    if (results.length > 0) {
      console.log(`  📈 Лучший результат: "${results[0].name}" (confidence: ${results[0].confidence})`)
    }

    return results
  } catch (error) {
    console.error('  ❌ Ошибка алгоритма 2:', error.message)
    return []
  }
}

// Алгоритм 3: Семантический поиск (аналог keywordSearchSupplierNames)
async function algorithm3_SemanticSearch(materialName) {
  console.log(`\n🔍 АЛГОРИТМ 3: Семантический поиск для "${materialName}"`)

  try {
    // Словарь синонимов
    const synonyms = {
      'теплоизоляция': ['утеплитель', 'изоляция', 'термоизоляция', 'теплоизолятор'],
      'минеральная': ['минвата', 'каменная', 'базальтовая', 'стекловата'],
      'плита': ['плиты', 'листы', 'панели', 'блоки'],
      'кран': ['кран', 'вентиль', 'затвор', 'клапан'],
      'шаровой': ['шаровый', 'ball', 'сферический'],
      'резьбовой': ['резьбовый', 'threaded', 'на резьбе']
    }

    const technicalTerms = {
      'dn32': ['ду32', '32мм', 'диаметр32'],
      'bvr': ['бвр', 'бивиар'],
      'ридан': ['riddан', 'ridan', 'ridaan']
    }

    const processedQuery = materialName.toLowerCase()
      .replace(/[^\wа-яё\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('  📝 Обработанный запрос:', processedQuery)

    // Извлекаем ключевые термины
    const originalKeywords = processedQuery
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !['мм', 'см', 'м', 'кг', 'шт', 'т', 'гр', 'л', 'м2', 'м3'].includes(word))

    console.log('  📝 Исходные ключевые слова:', originalKeywords)

    // Расширяем синонимами
    const expandedKeywords = new Set()
    originalKeywords.forEach(keyword => {
      expandedKeywords.add(keyword)

      if (synonyms[keyword]) {
        synonyms[keyword].forEach(synonym => expandedKeywords.add(synonym))
      }

      if (technicalTerms[keyword]) {
        technicalTerms[keyword].forEach(term => expandedKeywords.add(term))
      }

      // Морфологические варианты
      if (keyword.endsWith('ый') || keyword.endsWith('ой')) {
        expandedKeywords.add(keyword.slice(0, -2))
      }
      if (keyword.endsWith('ая') || keyword.endsWith('яя')) {
        expandedKeywords.add(keyword.slice(0, -2))
      }
    })

    const allKeywords = Array.from(expandedKeywords)
    console.log('  📝 Расширенные ключевые слова:', allKeywords)

    // Получаем данные
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .limit(2000)

    if (error) {
      console.error('  ❌ Ошибка получения данных:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      console.log('  ❌ Нет данных в таблице')
      return []
    }

    console.log(`  📊 Анализируем ${data.length} записей`)

    // Интеллектуальный анализ
    const results = data
      .map(item => {
        const itemName = item.name.toLowerCase()
        const itemWords = itemName.split(/\s+/)

        let relevanceScore = 0
        const matchedKeywords = []
        let matchType = 'partial'

        // Точное совпадение фразы
        if (itemName.includes(processedQuery)) {
          relevanceScore += 10
          matchType = 'exact'
          matchedKeywords.push('точное совпадение')
        }

        // Анализ по словам
        originalKeywords.forEach(keyword => {
          if (itemName.includes(keyword)) {
            relevanceScore += 3
            matchedKeywords.push(keyword)

            if (itemName.startsWith(keyword)) {
              relevanceScore += 1
            }

            if (itemWords.includes(keyword)) {
              relevanceScore += 1
            }
          }
        })

        // Синонимы
        allKeywords.forEach(keyword => {
          if (!originalKeywords.includes(keyword) && itemName.includes(keyword)) {
            relevanceScore += 1.5
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(`${keyword} (синоним)`)
            }
          }
        })

        // Бонус за количество совпадений
        const matchRatio = matchedKeywords.length / originalKeywords.length
        relevanceScore += matchRatio * 2

        // Штраф за длину
        const lengthPenalty = Math.max(0, (itemName.length - 50) / 100)
        relevanceScore -= lengthPenalty

        return {
          id: item.id,
          name: item.name,
          matchedKeywords,
          relevanceScore,
          matchType,
          strategy: 'semantic'
        }
      })
      .filter(item => item.relevanceScore > 0.5)
      .sort((a, b) => {
        if (a.matchType === 'exact' && b.matchType !== 'exact') return -1
        if (b.matchType === 'exact' && a.matchType !== 'exact') return 1
        return b.relevanceScore - a.relevanceScore
      })
      .slice(0, 20)

    console.log(`  ✅ Найдено ${results.length} результатов с relevanceScore > 0.5`)
    if (results.length > 0) {
      console.log(`  📈 Лучший результат: "${results[0].name}" (score: ${results[0].relevanceScore})`)
      console.log(`  🎯 Совпавшие ключевые слова: ${results[0].matchedKeywords.join(', ')}`)
    }

    return results.map(item => ({
      id: item.id,
      name: item.name,
      confidence: Math.round(item.relevanceScore * 10) / 10,
      strategy: item.strategy,
      matchedKeywords: item.matchedKeywords,
      matchType: item.matchType
    }))

  } catch (error) {
    console.error('  ❌ Ошибка алгоритма 3:', error.message)
    return []
  }
}

// Основная функция анализа
async function analyzeAlgorithms() {
  console.log('🚀 АНАЛИЗ АЛГОРИТМОВ ПОИСКА ПОСТАВЩИКОВ')
  console.log('=' .repeat(60))

  // Сначала проверим структуру данных
  console.log('\n📊 АНАЛИЗ СТРУКТУРЫ ДАННЫХ В SUPPLIER_NAMES')
  try {
    const { data: totalCount, error: countError } = await supabase
      .from('supplier_names')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Ошибка подсчета записей:', countError.message)
    } else {
      console.log(`📈 Общее количество записей: ${totalCount}`)
    }

    // Получаем примеры записей
    const { data: samples, error: samplesError } = await supabase
      .from('supplier_names')
      .select('name')
      .limit(10)

    if (!samplesError && samples) {
      console.log('\n📝 Примеры записей в таблице:')
      samples.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`)
      })
    }

    // Поиск записей с "пеноплэкс"
    const { data: penoplexSamples } = await supabase
      .from('supplier_names')
      .select('name')
      .ilike('name', '%пеноплэкс%')
      .limit(5)

    if (penoplexSamples && penoplexSamples.length > 0) {
      console.log('\n🔍 Записи с "пеноплэкс":')
      penoplexSamples.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`)
      })
    }

    // Поиск записей с "кран"
    const { data: kranSamples } = await supabase
      .from('supplier_names')
      .select('name')
      .ilike('name', '%кран%')
      .limit(5)

    if (kranSamples && kranSamples.length > 0) {
      console.log('\n🔍 Записи с "кран":')
      kranSamples.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`)
      })
    }

  } catch (error) {
    console.error('❌ Ошибка анализа структуры:', error.message)
  }

  // Тестируем каждый материал
  for (const material of TEST_MATERIALS) {
    console.log('\n' + '='.repeat(60))
    console.log(`🧪 ТЕСТИРОВАНИЕ МАТЕРИАЛА: "${material.name}"`)
    console.log(`📝 Тип: ${material.type}`)
    console.log(`📋 Описание: ${material.description}`)

    // Тестируем все алгоритмы
    const results1 = await algorithm1_SimpleSearch(material.name)
    const results2 = await algorithm2_VectorSearch(material.name)
    const results3 = await algorithm3_SemanticSearch(material.name)

    console.log('\n📊 СВОДКА РЕЗУЛЬТАТОВ:')
    console.log(`  Алгоритм 1 (Простой): ${results1.length} результатов`)
    console.log(`  Алгоритм 2 (Векторный): ${results2.length} результатов`)
    console.log(`  Алгоритм 3 (Семантический): ${results3.length} результатов`)

    // Показываем топ-3 результата для каждого алгоритма
    if (results1.length > 0) {
      console.log('\n🥇 ТОП-3 Алгоритм 1:')
      results1.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.strategy}, confidence: ${result.confidence})`)
      })
    }

    if (results2.length > 0) {
      console.log('\n🥈 ТОП-3 Алгоритм 2:')
      results2.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (confidence: ${result.confidence})`)
      })
    }

    if (results3.length > 0) {
      console.log('\n🥉 ТОП-3 Алгоритм 3:')
      results3.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (confidence: ${result.confidence}, type: ${result.matchType})`)
        if (result.matchedKeywords && result.matchedKeywords.length > 0) {
          console.log(`      🎯 Ключевые слова: ${result.matchedKeywords.join(', ')}`)
        }
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 АНАЛИЗ ЗАВЕРШЕН')
}

// Запускаем анализ
analyzeAlgorithms().catch(console.error)