/**
 * Парсинг строки с этажами и создание массива номеров этажей
 * Поддерживает форматы:
 * - Одиночные: "1", "-3", "5"
 * - Через запятую: "1,2,3", "-3,-2,-1"
 * - Диапазоны: "1-3", "-3-7", "-1--3", "5-2"
 * - Смешанные: "2-4,6", "-3--1,2,5-7"
 */
export function parseFloorsFromString(floorsStr: string): number[] {
  if (!floorsStr?.trim()) {
    return []
  }

  const floors: number[] = []
  const parts = floorsStr.split(',').map(part => part.trim()).filter(Boolean)

  for (const part of parts) {
    // Regex для диапазона: захватывает "1-3", "-3-7", "-1--3", "5-2" и т.д.
    const rangeMatch = part.match(/^(-?\d+)-(-?\d+)$/)

    if (rangeMatch) {
      // Обрабатываем диапазон
      let start = parseInt(rangeMatch[1], 10)
      let end = parseInt(rangeMatch[2], 10)

      // Нормализуем порядок (если start > end, меняем местами)
      if (start > end) {
        [start, end] = [end, start]
      }

      if (!isNaN(start) && !isNaN(end)) {
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
 * Группирует последовательные этажи в диапазоны
 * Примеры: [-3,-2,-1,2,6] → "-3--1,2,6", [1,2,3,5,6,8] → "1-3,5-6,8"
 */
export function formatFloorsForDisplay(floors: number[]): string {
  if (floors.length === 0) return ''
  if (floors.length === 1) return floors[0].toString()

  const sortedFloors = [...floors].sort((a, b) => a - b)

  // Группируем последовательные этажи
  const groups: number[][] = []
  let currentGroup: number[] = [sortedFloors[0]]

  for (let i = 1; i < sortedFloors.length; i++) {
    const prev = sortedFloors[i - 1]
    const curr = sortedFloors[i]

    if (curr === prev + 1) {
      // Последовательный этаж - добавляем в текущую группу
      currentGroup.push(curr)
    } else {
      // Разрыв - сохраняем текущую группу и начинаем новую
      groups.push(currentGroup)
      currentGroup = [curr]
    }
  }
  // Добавляем последнюю группу
  groups.push(currentGroup)

  // Форматируем каждую группу
  const formatted = groups.map(group => {
    if (group.length === 1) {
      return group[0].toString()
    } else if (group.length === 2) {
      return `${group[0]},${group[1]}`
    } else {
      return `${group[0]}-${group[group.length - 1]}`
    }
  })

  return formatted.join(',')
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

  const floors = parseFloorsFromString(floorsStr)

  if (floors.length === 0) {
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
    return result
  }

  // Множественные этажи - равномерное распределение
  const floorQuantities: Record<number, any> = {}
  const quantityPerFloorPd = totalQuantityPd / floors.length
  const quantityPerFloorSpec = totalQuantitySpec / floors.length
  const quantityPerFloorRd = totalQuantityRd / floors.length


  floors.forEach(floor => {
    floorQuantities[floor] = {
      quantityPd: quantityPerFloorPd.toString(),
      quantitySpec: quantityPerFloorSpec.toString(),
      quantityRd: quantityPerFloorRd.toString()
    }
  })

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