import { useMemo, useCallback, useState, useRef } from 'react'
import { useCommentsLazy } from './useCommentsLazy'

interface UseVirtualizedChessboardProps {
  data: any[]
  enabled?: boolean
}

interface VirtualizedRange {
  startIndex: number
  endIndex: number
}

export const useVirtualizedChessboard = ({ data, enabled = true }: UseVirtualizedChessboardProps) => {
  const [visibleRange, setVisibleRange] = useState<VirtualizedRange>({ startIndex: 0, endIndex: 50 })
  const { commentsMap, loadCommentsForIds, isLoading: commentsLoading } = useCommentsLazy()

  // Мемоизируем видимые элементы
  const visibleData = useMemo(() => {
    if (!enabled) return data

    const { startIndex, endIndex } = visibleRange
    return data.slice(startIndex, Math.min(endIndex, data.length))
  }, [data, visibleRange, enabled])

  // Мемоизируем данные с комментариями
  const dataWithComments = useMemo(() => {
    return visibleData.map(item => ({
      ...item,
      comments: commentsMap.get(item.id) || []
    }))
  }, [visibleData, commentsMap])

  // Callback для обновления видимого диапазона
  const handleVisibleRangeChange = useCallback((range: VirtualizedRange) => {
    setVisibleRange(range)

    // Загружаем комментарии для видимых строк с буфером
    const bufferSize = 10
    const startWithBuffer = Math.max(0, range.startIndex - bufferSize)
    const endWithBuffer = Math.min(data.length, range.endIndex + bufferSize)

    const visibleIds = data
      .slice(startWithBuffer, endWithBuffer)
      .map(item => item.id)
      .filter(Boolean)

    if (visibleIds.length > 0) {
      loadCommentsForIds(visibleIds)
    }
  }, [data, loadCommentsForIds])

  // Оптимизированный поиск/фильтрация
  const searchInData = useCallback((searchTerm: string, fields: string[] = ['material']) => {
    if (!searchTerm.trim()) return data

    const lowerSearchTerm = searchTerm.toLowerCase()
    return data.filter(item =>
      fields.some(field =>
        item[field]?.toString().toLowerCase().includes(lowerSearchTerm)
      )
    )
  }, [data])

  // Мемоизированные вычисления для статистики
  const stats = useMemo(() => {
    return {
      totalItems: data.length,
      visibleItems: visibleData.length,
      loadedComments: commentsMap.size,
      commentsLoading
    }
  }, [data.length, visibleData.length, commentsMap.size, commentsLoading])

  return {
    visibleData: dataWithComments,
    handleVisibleRangeChange,
    searchInData,
    stats,
    commentsMap,
    loadCommentsForIds
  }
}