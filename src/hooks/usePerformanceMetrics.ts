import { useState, useEffect, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  frameCount: number
  lastUpdate: number
}

interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetrics
  startMeasure: (label?: string) => void
  endMeasure: (label?: string) => void
  markRender: () => void
}

export const usePerformanceMetrics = (): UsePerformanceMetricsReturn => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    frameCount: 0,
    lastUpdate: Date.now(),
  })

  const measureStartTime = useRef<number>(0)
  const frameCountRef = useRef<number>(0)

  // Измеряем использование памяти
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize || 0
    }
    return 0
  }, [])

  // Начинаем измерение времени
  const startMeasure = useCallback((label = 'render') => {
    measureStartTime.current = performance.now()
    if (typeof performance.mark === 'function') {
      performance.mark(`${label}-start`)
    }
  }, [])

  // Заканчиваем измерение времени
  const endMeasure = useCallback(
    (label = 'render') => {
      const endTime = performance.now()
      const renderTime = endTime - measureStartTime.current

      if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
        performance.mark(`${label}-end`)
        performance.measure(label, `${label}-start`, `${label}-end`)
      }

      setMetrics((prev) => ({
        ...prev,
        renderTime: Math.round(renderTime),
        memoryUsage: measureMemory(),
        lastUpdate: Date.now(),
      }))
    },
    [measureMemory],
  )

  // Отмечаем кадр рендеринга
  const markRender = useCallback(() => {
    frameCountRef.current++
    setMetrics((prev) => ({
      ...prev,
      frameCount: frameCountRef.current,
    }))
  }, [])

  // Автоматическое обновление метрик памяти каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: measureMemory(),
        lastUpdate: Date.now(),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [measureMemory])

  // Сброс счетчика кадров каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      frameCountRef.current = 0
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    metrics,
    startMeasure,
    endMeasure,
    markRender,
  }
}
