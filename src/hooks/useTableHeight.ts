import { useState, useEffect, useCallback, useRef } from 'react'
import { useScale } from '../shared/contexts/ScaleContext'

interface UseTableHeightProps {
  /** Селектор контейнера фильтров (по умолчанию .filters) */
  filtersSelector?: string
  /** Дополнительная высота для элементов управления таблицей (кнопки) */
  controlsHeight?: number
  /** Минимальная высота таблицы */
  minHeight?: number
  /** Дополнительные отступы */
  extraPadding?: number
}

export const useTableHeight = ({
  filtersSelector = '.filters',
  controlsHeight = 56, // высота кнопок управления таблицей + 56px для пагинации
  minHeight = 300,
  extraPadding = -20, // оставляем место для пагинации (уменьшено с -80)
}: UseTableHeightProps = {}) => {
  const { scale } = useScale()
  const [tableHeight, setTableHeight] = useState<string>('calc(100vh - 300px)')
  const measurementRef = useRef<{
    headerHeight: number
    contentPadding: number
    filtersHeight: number
    controlsHeight: number
  }>({
    headerHeight: 64,
    contentPadding: 32, // 16px * 2 (top + bottom)
    filtersHeight: 0,
    controlsHeight,
  })

  const calculateHeight = useCallback(() => {
    try {
      // Получаем точные размеры элементов
      const measurements = measurementRef.current

      // 1. Высота header'а (фиксированная)
      measurements.headerHeight = 64

      // 2. Padding контента (16px сверху и снизу, масштабируется)
      measurements.contentPadding = Math.round(32 * scale)

      // 3. Высота блока фильтров (измеряем реальную высоту)
      const filtersElement = document.querySelector(filtersSelector)
      if (filtersElement) {
        const rect = filtersElement.getBoundingClientRect()
        measurements.filtersHeight = Math.round(rect.height)
      } else {
        // Fallback: примерная высота блока фильтров с учетом масштаба
        measurements.filtersHeight = Math.round(120 * scale)
      }

      // 4. Высота элементов управления таблицей (кнопки добавить/удалить и т.д.)
      measurements.controlsHeight = Math.round(controlsHeight * scale)

      // 5. Рассчитываем общую высоту занятых элементов
      const totalUsedHeight =
        measurements.headerHeight +
        measurements.contentPadding +
        measurements.filtersHeight +
        measurements.controlsHeight +
        Math.round(extraPadding * scale)

      // 6. Вычисляем доступную высоту для таблицы
      const availableHeight = `calc(100vh - ${totalUsedHeight}px)`

      // 7. Проверяем минимальную высоту
      const calculatedMinHeight = Math.round(minHeight * scale)
      const finalHeight = `max(${availableHeight}, ${calculatedMinHeight}px)`

      setTableHeight(finalHeight)

      // Убираем частые логи - только при значительных изменениях в development режиме
      if (process.env.NODE_ENV === 'development' && Math.abs(totalUsedHeight - (measurementRef.current?.lastLoggedHeight || 0)) > 10) {
        console.log('🔧 Table height calculation:', {
          scale,
          totalUsedHeight,
          finalHeight,
          viewport: `${window.innerHeight}px`,
        })
        measurementRef.current = measurementRef.current || {}
        measurementRef.current.lastLoggedHeight = totalUsedHeight
      }

    } catch (error) {
      console.error('❌ Error calculating table height:', error)
      // Fallback к безопасному значению
      setTableHeight(`calc(100vh - ${Math.round(300 * scale)}px)`)
    }
  }, [scale, filtersSelector, controlsHeight, minHeight, extraPadding])

  // Пересчитываем высоту при изменении масштаба, размера окна или DOM
  useEffect(() => {
    const recalculate = () => {
      // Небольшая задержка для обновления DOM
      requestAnimationFrame(() => {
        setTimeout(calculateHeight, 10)
      })
    }

    // Первоначальный расчет
    recalculate()

    // Обработчики событий
    const handleResize = () => recalculate()
    const handleScaleChange = () => recalculate()
    const handleDOMChange = () => recalculate()

    window.addEventListener('resize', handleResize)
    window.addEventListener('ui:scale-changed', handleScaleChange)

    // MutationObserver для отслеживания изменений фильтров (раскрытие/сворачивание)
    let observer: MutationObserver | null = null
    if (typeof window !== 'undefined') {
      observer = new MutationObserver(handleDOMChange)
      const filtersElement = document.querySelector(filtersSelector)
      if (filtersElement) {
        observer.observe(filtersElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        })
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('ui:scale-changed', handleScaleChange)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [calculateHeight, filtersSelector])

  // Функция для принудительного пересчета (для случаев когда фильтры изменяются программно)
  const recalculateHeight = useCallback(() => {
    requestAnimationFrame(calculateHeight)
  }, [calculateHeight])

  return {
    tableHeight,
    recalculateHeight,
    measurements: measurementRef.current,
  }
}