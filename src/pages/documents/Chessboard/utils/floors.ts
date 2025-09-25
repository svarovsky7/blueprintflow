/**
 * Парсинг строки с этажами и создание массива номеров этажей
 * Поддерживает форматы: "1", "1,2,3", "1-3", "2-4,6", "2-3,5-7"
 */
export function parseFloorsFromString(floorsStr: string): number[] {
  if (!floorsStr?.trim()) {
    return []
  }

  const floors: number[] = []
  const parts = floorsStr.split(',').map(part => part.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      // Обрабатываем диапазон типа "2-4"
      const [start, end] = part.split('-').map(num => parseInt(num.trim(), 10))
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          floors.push(i)
        }
      }
    } else {
      // Обрабатываем отдельный этаж
      const floorNum = parseInt(part, 10)
      if (!isNaN(floorNum)) {
        floors.push(floorNum)
      }
    }
  }

  // Удаляем дубликаты и сортируем
  return [...new Set(floors)].sort((a, b) => a - b)
}

/**
 * Проверка, что строка этажей содержит множественные этажи
 */
export function hasMultipleFloors(floorsStr: string): boolean {
  const floors = parseFloorsFromString(floorsStr)
  return floors.length > 1
}

/**
 * Формирование строки этажей из массива номеров этажей для отображения
 */
export function formatFloorsForDisplay(floors: number[]): string {
  if (floors.length === 0) return ''
  if (floors.length === 1) return floors[0].toString()

  const sortedFloors = [...floors].sort((a, b) => a - b)

  // Простое форматирование - если этажи подряд, показываем как диапазон
  if (sortedFloors.length > 2) {
    const isSequential = sortedFloors.every((floor, index) =>
      index === 0 || floor === sortedFloors[index - 1] + 1
    )

    if (isSequential) {
      return `${sortedFloors[0]}-${sortedFloors[sortedFloors.length - 1]}`
    }
  }

  return sortedFloors.join(',')
}

/**
 * Распределение количества материала по этажам при изменении строки этажей
 * @param floorsStr - новая строка с этажами
 * @param currentQuantities - текущие количества по этажам (если есть)
 * @param totalQuantityPd - общее количество по ПД
 * @param totalQuantitySpec - общее количество по спецификации РД
 * @param totalQuantityRd - общее количество по пересчету РД
 * @returns новый объект с количествами по этажам
 */
export function distributeQuantitiesAcrossFloors(
  floorsStr: string,
  currentQuantities: Record<number, any> = {},
  totalQuantityPd: number = 0,
  totalQuantitySpec: number = 0,
  totalQuantityRd: number = 0
): Record<number, any> {
  console.log('🏢📊 distributeQuantitiesAcrossFloors called:', {
    floorsStr,
    currentQuantities,
    totalQuantityPd,
    totalQuantitySpec,
    totalQuantityRd
  }) // LOG: вызов функции распределения

  const floors = parseFloorsFromString(floorsStr)
  console.log('🏢📊 Parsed floors:', floors) // LOG: распарсенные этажи

  if (floors.length === 0) {
    console.log('🏢📊 No floors found, returning empty object') // LOG: нет этажей
    return {}
  }

  if (floors.length === 1) {
    // Одиночный этаж - все количества идут на этот этаж
    const floor = floors[0]
    const result = {
      [floor]: {
        quantityPd: totalQuantityPd.toString(),
        quantitySpec: totalQuantitySpec.toString(),
        quantityRd: totalQuantityRd.toString()
      }
    }
    console.log('🏢📊 Single floor distribution:', result) // LOG: распределение по одному этажу
    return result
  }

  // Множественные этажи - равномерное распределение
  const floorQuantities: Record<number, any> = {}
  const quantityPerFloorPd = totalQuantityPd / floors.length
  const quantityPerFloorSpec = totalQuantitySpec / floors.length
  const quantityPerFloorRd = totalQuantityRd / floors.length

  console.log('🏢📊 Calculating per-floor quantities:', {
    quantityPerFloorPd,
    quantityPerFloorSpec,
    quantityPerFloorRd
  }) // LOG: количества на этаж

  floors.forEach(floor => {
    floorQuantities[floor] = {
      quantityPd: quantityPerFloorPd.toString(),
      quantitySpec: quantityPerFloorSpec.toString(),
      quantityRd: quantityPerFloorRd.toString()
    }
  })

  console.log('🏢📊 Multiple floors distribution result:', floorQuantities) // LOG: финальный результат распределения
  return floorQuantities
}

/**
 * Вычисление общих количеств из распределения по этажам
 * @param floorQuantities - количества по этажам
 * @returns объект с общими количествами
 */
export function calculateTotalQuantitiesFromFloors(
  floorQuantities: Record<number, any>
): {
  totalQuantityPd: number
  totalQuantitySpec: number
  totalQuantityRd: number
} {
  let totalQuantityPd = 0
  let totalQuantitySpec = 0
  let totalQuantityRd = 0

  Object.values(floorQuantities).forEach(quantities => {
    totalQuantityPd += parseFloat(quantities.quantityPd || '0')
    totalQuantitySpec += parseFloat(quantities.quantitySpec || '0')
    totalQuantityRd += parseFloat(quantities.quantityRd || '0')
  })

  return {
    totalQuantityPd,
    totalQuantitySpec,
    totalQuantityRd
  }
}