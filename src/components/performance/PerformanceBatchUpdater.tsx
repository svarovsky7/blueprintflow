import React, { useCallback, useRef, useMemo } from 'react'
import { unstable_batchedUpdates } from 'react-dom'

// ===== ТИПЫ =====
interface BatchUpdate<T = any> {
  key: string
  field: string
  value: T
  timestamp: number
}

interface BatchUpdateConfig {
  batchDelay?: number
  maxBatchSize?: number
  priorityKeys?: string[]
  onBatchComplete?: (updates: BatchUpdate[]) => void
  onError?: (error: Error, updates: BatchUpdate[]) => void
}

interface PerformanceBatchUpdaterProps<T extends Record<string, any>> {
  data: T[]
  onUpdate: (key: string, field: string, value: any) => void
  onBatchUpdate?: (updates: Array<{ key: string; field: string; value: any }>) => void
  config?: BatchUpdateConfig
  children: (batchedUpdate: (key: string, field: string, value: any) => void) => React.ReactNode
}

// ===== УТИЛИТЫ =====

// Функция для группировки обновлений по ключам
const groupUpdatesByKey = (updates: BatchUpdate[]): Record<string, BatchUpdate[]> => {
  return updates.reduce((groups, update) => {
    if (!groups[update.key]) {
      groups[update.key] = []
    }
    groups[update.key].push(update)
    return groups
  }, {} as Record<string, BatchUpdate[]>)
}

// Функция для дедупликации обновлений (оставляем только последнее для каждого field в key)
const deduplicateUpdates = (updates: BatchUpdate[]): BatchUpdate[] => {
  const latestUpdates = new Map<string, BatchUpdate>()

  updates.forEach(update => {
    const uniqueKey = `${update.key}-${update.field}`
    const existing = latestUpdates.get(uniqueKey)

    if (!existing || update.timestamp > existing.timestamp) {
      latestUpdates.set(uniqueKey, update)
    }
  })

  return Array.from(latestUpdates.values())
}

// ===== ОСНОВНОЙ КОМПОНЕНТ =====

function PerformanceBatchUpdater<T extends Record<string, any>>({
  data,
  onUpdate,
  onBatchUpdate,
  config = {},
  children,
}: PerformanceBatchUpdaterProps<T>) {
  const {
    batchDelay = 100,
    maxBatchSize = 50,
    priorityKeys = [],
    onBatchComplete,
    onError,
  } = config

  // Хранилище ожидающих обновлений
  const pendingUpdatesRef = useRef<BatchUpdate[]>([])
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const frameRef = useRef<number | null>(null)

  // Функция для применения пакета обновлений
  const applyBatch = useCallback(
    (updates: BatchUpdate[]) => {
      if (updates.length === 0) return

      try {
        // Дедуплицируем обновления
        const dedupedUpdates = deduplicateUpdates(updates)

        unstable_batchedUpdates(() => {
          if (onBatchUpdate) {
            // Используем batch обновление если доступно
            onBatchUpdate(dedupedUpdates.map(({ key, field, value }) => ({ key, field, value })))
          } else {
            // Применяем обновления по одному
            dedupedUpdates.forEach(({ key, field, value }) => {
              onUpdate(key, field, value)
            })
          }
        })

        onBatchComplete?.(dedupedUpdates)
      } catch (error) {
        onError?.(error as Error, updates)
        console.error('Ошибка при применении пакета обновлений:', error)
      }
    },
    [onUpdate, onBatchUpdate, onBatchComplete, onError]
  )

  // Функция для обработки ожидающих обновлений
  const processPendingUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current
    if (updates.length === 0) return

    // Сортируем обновления по приоритету
    const sortedUpdates = [...updates].sort((a, b) => {
      const aPriority = priorityKeys.includes(a.key) ? 1 : 0
      const bPriority = priorityKeys.includes(b.key) ? 1 : 0

      if (aPriority !== bPriority) {
        return bPriority - aPriority // Приоритетные элементы первыми
      }

      return a.timestamp - b.timestamp // Затем по времени
    })

    // Применяем обновления по частям если превышен лимит
    if (sortedUpdates.length > maxBatchSize) {
      const chunks = []
      for (let i = 0; i < sortedUpdates.length; i += maxBatchSize) {
        chunks.push(sortedUpdates.slice(i, i + maxBatchSize))
      }

      // Применяем первый чанк сразу
      applyBatch(chunks[0])

      // Остальные чанки применяем в следующих фреймах
      chunks.slice(1).forEach((chunk, index) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            applyBatch(chunk)
          })
        }, (index + 1) * 16) // ~60fps
      })
    } else {
      applyBatch(sortedUpdates)
    }

    // Очищаем ожидающие обновления
    pendingUpdatesRef.current = []
  }, [applyBatch, maxBatchSize, priorityKeys])

  // Функция для планирования обработки пакета
  const scheduleBatch = useCallback(() => {
    // Отменяем предыдущие таймеры
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    // Если накопилось много обновлений, обрабатываем немедленно
    if (pendingUpdatesRef.current.length >= maxBatchSize) {
      frameRef.current = requestAnimationFrame(processPendingUpdates)
      return
    }

    // Иначе ждем заданную задержку
    batchTimeoutRef.current = setTimeout(() => {
      frameRef.current = requestAnimationFrame(processPendingUpdates)
    }, batchDelay)
  }, [batchDelay, maxBatchSize, processPendingUpdates])

  // Главная функция для добавления обновления в пакет
  const batchedUpdate = useCallback(
    (key: string, field: string, value: any) => {
      const update: BatchUpdate = {
        key,
        field,
        value,
        timestamp: performance.now(),
      }

      pendingUpdatesRef.current.push(update)
      scheduleBatch()
    },
    [scheduleBatch]
  )

  // Очистка при размонтировании
  React.useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      // Применяем оставшиеся обновления
      if (pendingUpdatesRef.current.length > 0) {
        processPendingUpdates()
      }
    }
  }, [processPendingUpdates])

  return <>{children(batchedUpdate)}</>
}

// ===== ЭКСПОРТИРУЕМЫЙ КОМПОНЕНТ С МЕМОИЗАЦИЕЙ =====

export default React.memo(PerformanceBatchUpdater) as <T extends Record<string, any>>(
  props: PerformanceBatchUpdaterProps<T>
) => JSX.Element

// ===== ХУКИ ДЛЯ УДОБСТВА ИСПОЛЬЗОВАНИЯ =====

// Хук для создания батчер функции
export const useBatchUpdater = <T extends Record<string, any>>(
  onUpdate: (key: string, field: string, value: any) => void,
  config: BatchUpdateConfig = {}
) => {
  const {
    batchDelay = 100,
    maxBatchSize = 50,
    priorityKeys = [],
    onBatchComplete,
    onError,
  } = config

  const pendingUpdatesRef = useRef<BatchUpdate[]>([])
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const frameRef = useRef<number | null>(null)

  const applyBatch = useCallback(
    (updates: BatchUpdate[]) => {
      if (updates.length === 0) return

      try {
        const dedupedUpdates = deduplicateUpdates(updates)

        unstable_batchedUpdates(() => {
          dedupedUpdates.forEach(({ key, field, value }) => {
            onUpdate(key, field, value)
          })
        })

        onBatchComplete?.(dedupedUpdates)
      } catch (error) {
        onError?.(error as Error, updates)
        console.error('Ошибка при применении пакета обновлений:', error)
      }
    },
    [onUpdate, onBatchComplete, onError]
  )

  const processPendingUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current
    if (updates.length === 0) return

    const sortedUpdates = [...updates].sort((a, b) => {
      const aPriority = priorityKeys.includes(a.key) ? 1 : 0
      const bPriority = priorityKeys.includes(b.key) ? 1 : 0

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      return a.timestamp - b.timestamp
    })

    if (sortedUpdates.length > maxBatchSize) {
      const chunks = []
      for (let i = 0; i < sortedUpdates.length; i += maxBatchSize) {
        chunks.push(sortedUpdates.slice(i, i + maxBatchSize))
      }

      applyBatch(chunks[0])

      chunks.slice(1).forEach((chunk, index) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            applyBatch(chunk)
          })
        }, (index + 1) * 16)
      })
    } else {
      applyBatch(sortedUpdates)
    }

    pendingUpdatesRef.current = []
  }, [applyBatch, maxBatchSize, priorityKeys])

  const scheduleBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    if (pendingUpdatesRef.current.length >= maxBatchSize) {
      frameRef.current = requestAnimationFrame(processPendingUpdates)
      return
    }

    batchTimeoutRef.current = setTimeout(() => {
      frameRef.current = requestAnimationFrame(processPendingUpdates)
    }, batchDelay)
  }, [batchDelay, maxBatchSize, processPendingUpdates])

  const batchedUpdate = useCallback(
    (key: string, field: string, value: any) => {
      const update: BatchUpdate = {
        key,
        field,
        value,
        timestamp: performance.now(),
      }

      pendingUpdatesRef.current.push(update)
      scheduleBatch()
    },
    [scheduleBatch]
  )

  // Функция для немедленной обработки всех ожидающих обновлений
  const flushPendingUpdates = useCallback(() => {
    processPendingUpdates()
  }, [processPendingUpdates])

  React.useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      if (pendingUpdatesRef.current.length > 0) {
        processPendingUpdates()
      }
    }
  }, [processPendingUpdates])

  return {
    batchedUpdate,
    flushPendingUpdates,
    hasPendingUpdates: () => pendingUpdatesRef.current.length > 0,
  }
}

// ===== ЭКСПОРТЫ =====
export type { BatchUpdate, BatchUpdateConfig, PerformanceBatchUpdaterProps }