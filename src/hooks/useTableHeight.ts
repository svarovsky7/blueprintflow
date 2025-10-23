import { useState, useLayoutEffect } from 'react'
import { useCallbackRef } from './useCallbackRef'

interface UseTableHeightOptions {
  paginationRef: React.RefObject<HTMLDivElement>
  extraHeight?: number
}

export const useTableHeight = (options: UseTableHeightOptions) => {
  const { paginationRef, extraHeight = 0 } = options
  const [height, setHeight] = useState(0)

  const containerRef = useCallbackRef<HTMLDivElement>((containerNode) => {
    if (!containerNode) return

    const observer = new ResizeObserver(() => {
      if (!containerNode) return

      const headerEl = containerNode.querySelector<HTMLElement>('.ant-table-header')
      const headerHeight = headerEl?.offsetHeight ?? 0

      const paginationHeight = paginationRef.current?.offsetHeight ?? 0
      
      const newHeight = containerNode.offsetHeight - paginationHeight - headerHeight - extraHeight
      
      if (newHeight > 0) {
        setHeight(newHeight)
      }
    })

    observer.observe(containerNode)

    return () => {
      observer.disconnect()
    }
  }, [paginationRef, extraHeight])

  return { tableHeight: height, containerRef }
}
