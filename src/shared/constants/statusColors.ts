// Константы для работы с цветами статусов
// Обеспечивают единообразие между БД и UI

// Маппинг текстовых названий цветов в HEX формат
export const COLOR_NAME_TO_HEX: Record<string, string> = {
  // Основные цвета Ant Design
  green: '#52c41a',
  yellow: '#faad14',
  blue: '#1890ff',
  red: '#ff4d4f',
  gray: '#d9d9d9',
  grey: '#d9d9d9',
  orange: '#fa8c16',
  purple: '#722ed1',
  cyan: '#13c2c2',
  pink: '#eb2f96',
  lime: '#a0d911',
  gold: '#faad14',

  // Дополнительные цвета для статусов
  черновик: '#888888',
  'на проверке': '#faad14',
  утвержден: '#52c41a',
  отклонен: '#ff4d4f',
  архив: '#d9d9d9',
}

// Маппинг HEX цветов в текстовые названия (для обратного преобразования)
export const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#52c41a': 'green',
  '#faad14': 'yellow',
  '#1890ff': 'blue',
  '#ff4d4f': 'red',
  '#d9d9d9': 'gray',
  '#fa8c16': 'orange',
  '#722ed1': 'purple',
  '#13c2c2': 'cyan',
  '#eb2f96': 'pink',
  '#a0d911': 'lime',
  '#888888': 'gray',
}

// Функция для нормализации цвета к HEX формату
export function normalizeColorToHex(color: string | undefined | null): string {
  if (!color) return '#d9d9d9' // Цвет по умолчанию

  // Если уже в HEX формате
  if (color.startsWith('#')) {
    return color.toLowerCase()
  }

  // Преобразуем текстовое название в HEX
  const hex = COLOR_NAME_TO_HEX[color.toLowerCase()]
  return hex || '#d9d9d9' // Цвет по умолчанию, если не найден
}

// Функция для получения текстового названия цвета (если нужно для UI)
export function getColorName(hexColor: string | undefined | null): string | null {
  if (!hexColor) return null

  const normalizedHex = hexColor.toLowerCase()
  return HEX_TO_COLOR_NAME[normalizedHex] || null
}

// Стандартные цвета для статусов Шахматки
export const CHESSBOARD_STATUS_COLORS = {
  DRAFT: '#888888', // Черновик
  REVIEW: '#faad14', // На проверке
  APPROVED: '#52c41a', // Утвержден
  REJECTED: '#ff4d4f', // Отклонен
  ARCHIVE: '#d9d9d9', // Архив
}

// Формат страницы для applicable_pages
export const PAGE_FORMATS = {
  CHESSBOARD: 'documents/chessboard',
  // Добавьте другие страницы по мере необходимости
}
