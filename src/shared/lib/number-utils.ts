/**
 * Парсит строку в число, поддерживая и точку, и запятую как десятичный разделитель
 * Удаляет пробелы (разделители тысяч)
 * @param value - строка для парсинга
 * @returns число или 0 если парсинг не удался
 * @example
 * parseNumberWithSeparators('1,5') // 1.5
 * parseNumberWithSeparators('1.5') // 1.5
 * parseNumberWithSeparators('1 000,5') // 1000.5
 * parseNumberWithSeparators('1 000.5') // 1000.5
 */
export const parseNumberWithSeparators = (value: string | undefined): number => {
  if (!value) return 0
  // Удаляем пробелы и заменяем запятую на точку
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}
