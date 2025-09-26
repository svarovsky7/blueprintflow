// Пример использования unitMatcher для импорта данных
// Этот файл показывает, как интегрировать поиск единиц измерения по синонимам

import { unitMatcher, type UnitMatch } from '@/entities/units'

/**
 * Пример функции обработки данных из Excel с использованием синонимов единиц измерения
 */
async function processExcelRowWithUnits(excelRow: any) {
  // Предполагаем, что в Excel есть колонка с единицами измерения
  const unitText = excelRow['Ед. изм.'] || excelRow['Единица'] || excelRow['Unit'] || ''

  // Используем unitMatcher для поиска подходящей единицы
  const unitMatch: UnitMatch = await unitMatcher.findUnit(unitText)

  switch (unitMatch.confidence) {
    case 'exact':
      console.log(`✅ Точное совпадение: "${unitMatch.originalText}" → ${unitMatch.unit?.name}`) // LOG
      break
    case 'synonym':
      console.log(`🔄 Найден синоним: "${unitMatch.originalText}" → ${unitMatch.unit?.name}`) // LOG
      break
    case 'fuzzy':
      console.log(`🔍 Нечеткое совпадение: "${unitMatch.originalText}" → ${unitMatch.unit?.name}`) // LOG
      break
    case 'none':
      console.warn(`⚠️ Единица измерения не найдена: "${unitMatch.originalText}"`) // LOG
      // Здесь можно добавить логику для создания новой единицы или запроса пользователя
      break
  }

  return {
    ...excelRow,
    unit_id: unitMatch.unit?.id || null,
    unit_name: unitMatch.unit?.name || unitMatch.originalText,
    unit_match_confidence: unitMatch.confidence
  }
}

/**
 * Пример массовой обработки данных импорта
 */
async function processExcelImport(excelData: any[]) {
  console.log('🚀 Начало обработки импорта с поиском единиц измерения') // LOG

  // Инициализируем matcher (загрузка всех единиц и синонимов)
  await unitMatcher.initialize()

  const stats = unitMatcher.getStats()
  console.log(`📊 Статистика UnitMatcher:`, stats) // LOG

  const processedData = []
  const unitMatchStats = {
    exact: 0,
    synonym: 0,
    fuzzy: 0,
    none: 0
  }

  for (let i = 0; i < excelData.length; i++) {
    const row = excelData[i]
    console.log(`🔄 Обработка строки ${i + 1}/${excelData.length}`) // LOG

    const processedRow = await processExcelRowWithUnits(row)
    processedData.push(processedRow)

    // Собираем статистику
    if (processedRow.unit_match_confidence) {
      unitMatchStats[processedRow.unit_match_confidence]++
    }
  }

  console.log('📈 Статистика сопоставления единиц измерения:') // LOG
  console.log(`  ✅ Точные совпадения: ${unitMatchStats.exact}`) // LOG
  console.log(`  🔄 Найдено по синонимам: ${unitMatchStats.synonym}`) // LOG
  console.log(`  🔍 Нечеткие совпадения: ${unitMatchStats.fuzzy}`) // LOG
  console.log(`  ⚠️ Не найдено: ${unitMatchStats.none}`) // LOG

  return {
    processedData,
    stats: unitMatchStats
  }
}

/**
 * Пример интеграции в существующий handleImport
 */
export async function enhancedHandleImport(file: File) {
  try {
    // 1. Парсинг Excel файла (используем существующую логику)
    const excelData = await parseExcelFile(file)

    // 2. Обработка с использованием синонимов единиц
    const { processedData, stats } = await processExcelImport(excelData)

    // 3. Валидация и сохранение данных
    const validData = processedData.filter(row => row.unit_id !== null)
    const invalidData = processedData.filter(row => row.unit_id === null)

    if (invalidData.length > 0) {
      console.warn(`⚠️ ${invalidData.length} строк с неопознанными единицами измерения`) // LOG
      // Здесь можно показать пользователю список неопознанных единиц
      // и предложить создать синонимы или выбрать подходящие единицы
    }

    // 4. Сохранение в БД (используем существующую логику)
    await saveImportData(validData)

    return {
      success: true,
      imported: validData.length,
      failed: invalidData.length,
      unitMatchStats: stats
    }

  } catch (error) {
    console.error('❌ Ошибка импорта:', error) // LOG
    throw error
  }
}

// Заглушки для демонстрации
async function parseExcelFile(file: File): Promise<any[]> {
  // Здесь должна быть реальная логика парсинга Excel
  return []
}

async function saveImportData(data: any[]): Promise<void> {
  // Здесь должна быть реальная логика сохранения в БД
}

/*
ИНСТРУКЦИЯ ПО ИНТЕГРАЦИИ:

1. В файлах импорта (например, в Шахматке) импортируйте unitMatcher:
   import { unitMatcher } from '@/entities/units'

2. В функции обработки строки Excel добавьте:
   const unitMatch = await unitMatcher.findUnit(rowData.unit_text)
   const unitId = unitMatch.unit?.id

3. Перед началом массового импорта вызовите:
   await unitMatcher.initialize()

4. Для показа статистики используйте:
   const stats = unitMatcher.getStats()

5. Для сброса кэша после изменения синонимов:
   unitMatcher.reset()

ПРИМЕРЫ СОПОСТАВЛЕНИЯ:
- "м2" → найдет "м²" по синониму
- "кв.м" → найдет "м²" по синониму
- "куб.м" → найдет "м³" по синониму
- "килограмм" → найдет "кг" по синониму
- "м²" → точное совпадение
- "тонн" → найдет "т" по синониму
*/