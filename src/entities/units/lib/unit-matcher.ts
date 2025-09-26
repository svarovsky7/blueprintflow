import { unitsApi } from '../api/units-api'
import type { Unit } from '../model/types'

interface UnitMatch {
  unit: Unit | null
  confidence: 'exact' | 'synonym' | 'fuzzy' | 'none'
  originalText: string
}

class UnitMatcher {
  private units: Unit[] = []
  private synonymsMap: Map<string, Unit> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Загружаем все единицы и их синонимы
      const [units, synonymsFlat] = await Promise.all([
        unitsApi.getAll(),
        unitsApi.getAllSynonymsFlat()
      ])

      this.units = units
      this.synonymsMap.clear()

      // Создаем карту синонимов для быстрого поиска
      for (const synonym of synonymsFlat) {
        const unit = units.find(u => u.id === synonym.unitId)
        if (unit) {
          // Нормализуем синоним для поиска (lowercase, trim)
          const normalizedSynonym = synonym.synonym.toLowerCase().trim()
          this.synonymsMap.set(normalizedSynonym, unit)
        }
      }

      this.initialized = true
      console.log(`🔧 UnitMatcher инициализирован: ${units.length} единиц, ${synonymsFlat.length} синонимов`) // LOG
    } catch (error) {
      console.error('❌ Ошибка инициализации UnitMatcher:', error) // LOG
      throw error
    }
  }

  /**
   * Находит подходящую единицу измерения для текста
   */
  async findUnit(text: string): Promise<UnitMatch> {
    await this.initialize()

    if (!text || typeof text !== 'string') {
      return { unit: null, confidence: 'none', originalText: text || '' }
    }

    const normalizedText = text.toLowerCase().trim()

    // 1. Точное совпадение по основному названию
    const exactMatch = this.units.find(unit =>
      unit.name.toLowerCase().trim() === normalizedText
    )
    if (exactMatch) {
      return { unit: exactMatch, confidence: 'exact', originalText: text }
    }

    // 2. Поиск по синонимам
    const synonymMatch = this.synonymsMap.get(normalizedText)
    if (synonymMatch) {
      return { unit: synonymMatch, confidence: 'synonym', originalText: text }
    }

    // 3. Нечеткий поиск (fuzzy matching)
    const fuzzyMatch = this.findFuzzyMatch(normalizedText)
    if (fuzzyMatch) {
      return { unit: fuzzyMatch, confidence: 'fuzzy', originalText: text }
    }

    return { unit: null, confidence: 'none', originalText: text }
  }

  /**
   * Находит единицы для массива текстов
   */
  async findUnits(texts: string[]): Promise<UnitMatch[]> {
    await this.initialize()

    const results: UnitMatch[] = []
    for (const text of texts) {
      results.push(await this.findUnit(text))
    }
    return results
  }

  /**
   * Нечеткий поиск с учетом опечаток и вариаций написания
   */
  private findFuzzyMatch(normalizedText: string): Unit | null {
    const variations = this.generateVariations(normalizedText)

    // Ищем среди основных названий
    for (const unit of this.units) {
      const unitName = unit.name.toLowerCase().trim()
      if (variations.includes(unitName) || this.isCloseMatch(normalizedText, unitName)) {
        return unit
      }
    }

    // Ищем среди синонимов
    for (const [synonym, unit] of this.synonymsMap) {
      if (variations.includes(synonym) || this.isCloseMatch(normalizedText, synonym)) {
        return unit
      }
    }

    return null
  }

  /**
   * Генерирует возможные вариации написания
   */
  private generateVariations(text: string): string[] {
    const variations = [text]

    // Замены для популярных символов
    const replacements: Record<string, string[]> = {
      '²': ['2', '^2', 'кв'],
      '³': ['3', '^3', 'куб'],
      'м2': ['м²', 'кв.м', 'квм'],
      'м3': ['м³', 'куб.м', 'кубм'],
      'кв.м': ['м²', 'м2', 'квм'],
      'куб.м': ['м³', 'м3', 'кубм'],
      'кг': ['килограмм', 'килограммы'],
      'т': ['тонн', 'тонна', 'тонны'],
      'шт': ['штук', 'штука', 'штуки', 'шт.'],
      'м': ['метр', 'метры', 'метров'],
      'см': ['сантиметр', 'сантиметры'],
      'мм': ['миллиметр', 'миллиметры']
    }

    for (const [key, values] of Object.entries(replacements)) {
      if (text.includes(key)) {
        for (const value of values) {
          variations.push(text.replace(key, value))
        }
      }
    }

    return [...new Set(variations)]
  }

  /**
   * Проверяет близость совпадения (учитывает небольшие опечатки)
   */
  private isCloseMatch(text1: string, text2: string): boolean {
    if (Math.abs(text1.length - text2.length) > 2) return false

    // Простая проверка на расстояние Левенштейна
    const distance = this.levenshteinDistance(text1, text2)
    const maxDistance = Math.max(1, Math.floor(Math.min(text1.length, text2.length) * 0.2))

    return distance <= maxDistance
  }

  /**
   * Вычисляет расстояние Левенштейна между двумя строками
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Получает статистику по использованию синонимов
   */
  getStats(): { totalUnits: number; totalSynonyms: number; initialized: boolean } {
    return {
      totalUnits: this.units.length,
      totalSynonyms: this.synonymsMap.size,
      initialized: this.initialized
    }
  }

  /**
   * Сбрасывает кэш (для обновления данных)
   */
  reset(): void {
    this.initialized = false
    this.units = []
    this.synonymsMap.clear()
  }
}

// Экспортируем singleton экземпляр
export const unitMatcher = new UnitMatcher()

// Экспортируем типы
export type { UnitMatch }