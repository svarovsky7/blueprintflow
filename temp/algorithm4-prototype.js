// ПРОТОТИП 4-ГО АЛГОРИТМА: АДАПТИВНЫЙ ГИБРИДНЫЙ ПОИСК
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

// ЭТАП 1: КЛАССИФИКАЦИЯ ЗАПРОСА
function classifyQuery(materialName) {
  const analysis = {
    wordCount: materialName.split(/\s+/).length,
    hasArticles: /[A-Za-z]+\d+|[A-Z]+[-_]\d+/.test(materialName),
    hasDimensions: /\d+[x*×]\d+|\d+мм|DN\d+|Ду\d+/.test(materialName),
    hasBrands: /[A-Z]{2,}|"[^"]+"|РИДАН|FORBO|DIN|BROEN/.test(materialName),
    hasSpecialChars: /[-_()[\]{}#№@&%]/.test(materialName),
    hasRussianOnly: /^[а-яё\s\d]+$/i.test(materialName.replace(/[^\wа-яё\s\d]/g, ''))
  }

  console.log(`🔍 Анализ запроса "${materialName}":`, analysis)

  if (analysis.wordCount <= 3 && !analysis.hasArticles && !analysis.hasBrands && analysis.hasRussianOnly) {
    return 'SIMPLE'
  } else if (analysis.hasArticles || analysis.hasBrands || analysis.hasDimensions) {
    return 'TECHNICAL'
  } else {
    return 'MIXED'
  }
}

// ЭТАП 2: ТОКЕНИЗАЦИЯ НА БЛОКИ
function tokenizeIntoBlocks(materialName) {
  const blocks = {
    material: [],
    dimensions: [],
    articles: [],
    brands: [],
    technical: []
  }

  // Извлечение размеров
  const dimensionPatterns = [
    /DN\d+/gi,
    /Ду\d+/gi,
    /\d+x\d+/gi,
    /\d+×\d+/gi,
    /\d+\*\d+/gi,
    /\d+мм/gi
  ]

  dimensionPatterns.forEach(pattern => {
    const matches = materialName.match(pattern)
    if (matches) {
      blocks.dimensions.push(...matches.map(m => m.toLowerCase()))
    }
  })

  // Извлечение артикулов
  const articlePatterns = [
    /[A-Z]+[-_][A-Z\d]+/gi,
    /\d{3}[A-Z]\d+[A-Z]?/gi,
    /BVR[-]?[A-Z]?/gi,
    /\d{6,}/gi
  ]

  articlePatterns.forEach(pattern => {
    const matches = materialName.match(pattern)
    if (matches) {
      blocks.articles.push(...matches.map(m => m.toUpperCase()))
    }
  })

  // Извлечение брендов
  const brandPatterns = [
    /РИДАН/gi,
    /FORBO/gi,
    /DIN/gi,
    /BROEN/gi,
    /DANFOSS/gi,
    /ARLIGHT/gi,
    /"[^"]+"/gi
  ]

  brandPatterns.forEach(pattern => {
    const matches = materialName.match(pattern)
    if (matches) {
      blocks.brands.push(...matches.map(m => m.replace(/"/g, '').toUpperCase()))
    }
  })

  // Извлечение основного материала (все остальное)
  let cleanMaterial = materialName
    .replace(/DN\d+/gi, '')
    .replace(/Ду\d+/gi, '')
    .replace(/\d+[x*×]\d+/gi, '')
    .replace(/\d+мм/gi, '')
    .replace(/[A-Z]+[-_][A-Z\d]+/gi, '')
    .replace(/\d{3}[A-Z]\d+[A-Z]?/gi, '')
    .replace(/BVR[-]?[A-Z]?/gi, '')
    .replace(/\d{6,}/gi, '')
    .replace(/РИДАН|FORBO|DIN|BROEN|DANFOSS|ARLIGHT/gi, '')
    .replace(/"[^"]+"/gi, '')
    .replace(/[^\wа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleanMaterial) {
    blocks.material = cleanMaterial.toLowerCase().split(/\s+/).filter(word => word.length >= 2)
  }

  console.log('📦 Блоки:', blocks)
  return blocks
}

// ЭТАП 3: ПОИСК ПО МЕТОДАМ

// Метод A: Точные совпадения
async function exactMatchSearch(blocks, weight = 3.0) {
  const results = []

  if (blocks.material.length > 0) {
    const searchTerm = blocks.material.join(' ')

    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${searchTerm}%`)
      .limit(20)

    if (!error && data) {
      results.push(...data.map(item => ({
        ...item,
        method: 'exact',
        baseScore: weight,
        matchReason: `Точное совпадение материала: ${searchTerm}`
      })))
    }
  }

  return results
}

// Метод B: Поиск по блокам (для технических материалов)
async function blockBasedSearch(blocks, weight = 2.5) {
  const results = []

  // Поиск по артикулам (высокий приоритет)
  for (const article of blocks.articles) {
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${article}%`)
      .limit(10)

    if (!error && data) {
      results.push(...data.map(item => ({
        ...item,
        method: 'block_article',
        baseScore: weight + 1.0, // Бонус за артикул
        matchReason: `Совпадение артикула: ${article}`
      })))
    }
  }

  // Поиск по размерам
  for (const dimension of blocks.dimensions) {
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${dimension}%`)
      .limit(10)

    if (!error && data) {
      results.push(...data.map(item => ({
        ...item,
        method: 'block_dimension',
        baseScore: weight + 0.5, // Средний бонус за размер
        matchReason: `Совпадение размера: ${dimension}`
      })))
    }
  }

  // Поиск по брендам
  for (const brand of blocks.brands) {
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${brand}%`)
      .limit(10)

    if (!error && data) {
      results.push(...data.map(item => ({
        ...item,
        method: 'block_brand',
        baseScore: weight + 0.3, // Небольшой бонус за бренд
        matchReason: `Совпадение бренда: ${brand}`
      })))
    }
  }

  return results
}

// Метод C: Семантический поиск
async function semanticSearch(blocks, weight = 1.5) {
  const results = []

  // Словарь синонимов
  const synonyms = {
    'кран': ['вентиль', 'затвор', 'клапан'],
    'шаровой': ['шаровый', 'ball', 'сферический'],
    'резьбовой': ['резьбовый', 'threaded'],
    'пеноплэкс': ['пенополистирол', 'полистирол', 'утеплитель']
  }

  // Поиск по синонимам
  for (const word of blocks.material) {
    if (synonyms[word]) {
      for (const synonym of synonyms[word]) {
        const { data, error } = await supabase
          .from('supplier_names')
          .select('id, name')
          .ilike('name', `%${synonym}%`)
          .limit(5)

        if (!error && data) {
          results.push(...data.map(item => ({
            ...item,
            method: 'semantic',
            baseScore: weight,
            matchReason: `Семантическое совпадение: ${word} → ${synonym}`
          })))
        }
      }
    }
  }

  return results
}

// Метод D: Нечеткий поиск
async function fuzzySearch(blocks, weight = 1.0) {
  const results = []

  // Поиск по частям слов
  for (const word of blocks.material) {
    if (word.length >= 4) {
      const { data, error } = await supabase
        .from('supplier_names')
        .select('id, name')
        .ilike('name', `%${word}%`)
        .limit(5)

      if (!error && data) {
        results.push(...data.map(item => ({
          ...item,
          method: 'fuzzy',
          baseScore: weight,
          matchReason: `Нечеткое совпадение: ${word}`
        })))
      }
    }
  }

  return results
}

// ЭТАП 4: УМНОЕ РАНЖИРОВАНИЕ
function smartRanking(allResults, blocks, queryType) {
  // Убираем дубликаты и группируем по ID
  const resultMap = new Map()

  allResults.forEach(result => {
    if (resultMap.has(result.id)) {
      const existing = resultMap.get(result.id)
      existing.baseScore += result.baseScore * 0.5 // Половина веса за дополнительное совпадение
      existing.matchReasons.push(result.matchReason)
      existing.methods.add(result.method)
    } else {
      resultMap.set(result.id, {
        ...result,
        matchReasons: [result.matchReason],
        methods: new Set([result.method])
      })
    }
  })

  // Применяем дополнительные бонусы и штрафы
  const rankedResults = Array.from(resultMap.values()).map(item => {
    let finalScore = item.baseScore

    // Бонусы за точные совпадения блоков
    blocks.material.forEach(word => {
      if (item.name.toLowerCase().includes(word)) {
        finalScore += 2.0
      }
    })

    blocks.dimensions.forEach(dim => {
      if (item.name.toLowerCase().includes(dim.toLowerCase())) {
        finalScore += 3.0
      }
    })

    blocks.articles.forEach(article => {
      if (item.name.toLowerCase().includes(article.toLowerCase())) {
        finalScore += 4.0
      }
    })

    blocks.brands.forEach(brand => {
      if (item.name.toLowerCase().includes(brand.toLowerCase())) {
        finalScore += 2.0
      }
    })

    // Бонус за множественные методы
    if (item.methods.size > 1) {
      finalScore += 1.0
    }

    // Штраф за слишком длинные названия
    if (item.name.length > 100) {
      finalScore -= 1.0
    }

    // Адаптивные бонусы
    if (queryType === 'SIMPLE') {
      // Бонус за краткость для простых материалов
      if (item.name.length < 50) {
        finalScore += 0.5
      }
    } else if (queryType === 'TECHNICAL') {
      // Бонус за техническую релевантность
      if (item.methods.has('block_article') || item.methods.has('block_dimension')) {
        finalScore += 1.5
      }
    }

    return {
      ...item,
      finalScore: Math.round(finalScore * 10) / 10,
      methods: Array.from(item.methods)
    }
  })

  return rankedResults.sort((a, b) => b.finalScore - a.finalScore)
}

// ОСНОВНАЯ ФУНКЦИЯ 4-ГО АЛГОРИТМА
async function hybridAdaptiveSearch(materialName, limit = 20) {
  console.log(`\n🚀 ЗАПУСК 4-ГО АЛГОРИТМА для "${materialName}"`)
  console.log('=' .repeat(80))

  // Этап 1: Классификация
  const queryType = classifyQuery(materialName)
  console.log(`📊 Тип запроса: ${queryType}`)

  // Этап 2: Токенизация
  const blocks = tokenizeIntoBlocks(materialName)

  // Этап 3: Многометодный поиск
  const allResults = []

  console.log('\n🔍 Выполняем поиск разными методами...')

  // Выбор стратегии в зависимости от типа
  if (queryType === 'SIMPLE') {
    console.log('  📍 Стратегия для простого материала')
    allResults.push(...await exactMatchSearch(blocks, 3.0))
    allResults.push(...await semanticSearch(blocks, 2.0))
    allResults.push(...await fuzzySearch(blocks, 1.5))
  } else if (queryType === 'TECHNICAL') {
    console.log('  📍 Стратегия для технического материала')
    allResults.push(...await blockBasedSearch(blocks, 3.0))
    allResults.push(...await exactMatchSearch(blocks, 2.0))
    allResults.push(...await semanticSearch(blocks, 1.5))
  } else {
    console.log('  📍 Смешанная стратегия')
    allResults.push(...await exactMatchSearch(blocks, 2.5))
    allResults.push(...await blockBasedSearch(blocks, 2.5))
    allResults.push(...await semanticSearch(blocks, 1.5))
    allResults.push(...await fuzzySearch(blocks, 1.0))
  }

  console.log(`  📈 Собрано ${allResults.length} сырых результатов`)

  // Этап 4: Умное ранжирование
  const finalResults = smartRanking(allResults, blocks, queryType)

  console.log(`  🎯 Итоговых результатов: ${finalResults.length}`)

  return finalResults.slice(0, limit)
}

// ТЕСТИРОВАНИЕ НА НАШИХ МАТЕРИАЛАХ
async function testAlgorithm4() {
  console.log('🧪 ТЕСТИРОВАНИЕ 4-ГО АЛГОРИТМА')
  console.log('=' .repeat(80))

  const testMaterials = [
    'пеноплэкс',
    'Кран шаровой резьбовой BVR-R DN32 BVR-R DN32 065B8310R Ридан'
  ]

  for (const material of testMaterials) {
    const results = await hybridAdaptiveSearch(material, 10)

    console.log(`\n📊 РЕЗУЛЬТАТЫ для "${material}":`)
    console.log(`   Найдено: ${results.length} результатов`)

    results.slice(0, 5).forEach((result, index) => {
      console.log(`\n${index + 1}. "${result.name}"`)
      console.log(`   🏆 Итоговая оценка: ${result.finalScore}`)
      console.log(`   📋 Методы: ${result.methods.join(', ')}`)
      console.log(`   🎯 Причины совпадения:`)
      result.matchReasons.forEach(reason => {
        console.log(`      • ${reason}`)
      })
    })

    console.log('\n' + '-'.repeat(80))
  }
}

// Запуск тестирования
testAlgorithm4().catch(console.error)