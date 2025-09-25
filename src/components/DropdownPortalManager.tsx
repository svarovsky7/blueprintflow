import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DropdownPosition {
  top: number
  left: number
  width?: number
  maxHeight?: number
}

interface DropdownContextType {
  registerDropdown: (id: string, element: HTMLElement, content: React.ReactNode) => void
  unregisterDropdown: (id: string) => void
  updatePosition: (id: string, position: DropdownPosition) => void
}

interface DropdownInfo {
  id: string
  element: HTMLElement
  content: React.ReactNode
  position: DropdownPosition
  visible: boolean
}

// Context для управления всеми dropdown в приложении
const DropdownContext = createContext<DropdownContextType | null>(null)

// 🚀 ОПТИМИЗАЦИЯ: Портал-менеджер для dropdown меню поверх виртуализированной таблицы
export const DropdownPortalManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dropdowns, setDropdowns] = useState<Map<string, DropdownInfo>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Регистрация нового dropdown
  const registerDropdown = useCallback(
    (id: string, element: HTMLElement, content: React.ReactNode) => {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      const position: DropdownPosition = {
        top: rect.bottom + scrollTop + 4, // Отступ 4px от элемента
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(300, window.innerHeight - rect.bottom - 20), // Максимальная высота с отступом
      }

      setDropdowns((prev) =>
        new Map(prev).set(id, {
          id,
          element,
          content,
          position,
          visible: true,
        }),
      )

      // Автоматическое закрытие при клике вне dropdown
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        const dropdownElement = containerRef.current?.querySelector(`[data-dropdown-id="${id}"]`)

        if (dropdownElement && !dropdownElement.contains(target) && !element.contains(target)) {
          unregisterDropdown(id)
        }
      }

      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)

      // Очистка обработчика при размонтировании
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    },
    [],
  )

  // Отмена регистрации dropdown
  const unregisterDropdown = useCallback((id: string) => {
    setDropdowns((prev) => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [])

  // Обновление позиции dropdown
  const updatePosition = useCallback((id: string, position: DropdownPosition) => {
    setDropdowns((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(id)
      if (existing) {
        newMap.set(id, { ...existing, position })
      }
      return newMap
    })
  }, [])

  // Обработка скролла для обновления позиций
  useEffect(() => {
    const handleScroll = () => {
      // Обновляем позиции всех активных dropdown при скролле
      setDropdowns((prev) => {
        const newMap = new Map()
        prev.forEach((dropdown, id) => {
          const rect = dropdown.element.getBoundingClientRect()
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop

          // Скрываем dropdown если элемент ушёл за границы экрана
          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            return // Не добавляем в новую карту (удаляем)
          }

          const newPosition: DropdownPosition = {
            top: rect.bottom + scrollTop + 4,
            left: rect.left,
            width: rect.width,
            maxHeight: Math.min(300, window.innerHeight - rect.bottom - 20),
          }

          newMap.set(id, { ...dropdown, position: newPosition })
        })
        return newMap
      })
    }

    const debounceScroll = debounce(handleScroll, 16) // 60fps
    window.addEventListener('scroll', debounceScroll, { passive: true })
    window.addEventListener('resize', debounceScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', debounceScroll)
      window.removeEventListener('resize', debounceScroll)
    }
  }, [])

  const contextValue: DropdownContextType = {
    registerDropdown,
    unregisterDropdown,
    updatePosition,
  }

  return (
    <DropdownContext.Provider value={contextValue}>
      {children}

      {/* Портал для рендеринга всех dropdown */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none', // Не блокируем события мыши для основного контента
          zIndex: 9999, // Поверх всего контента
        }}
      >
        {Array.from(dropdowns.values()).map((dropdown) => (
          <div
            key={dropdown.id}
            data-dropdown-id={dropdown.id}
            style={{
              position: 'absolute',
              top: dropdown.position.top,
              left: dropdown.position.left,
              width: dropdown.position.width,
              maxHeight: dropdown.position.maxHeight,
              pointerEvents: 'auto', // Восстанавливаем события для dropdown
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              boxShadow:
                '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
              overflow: 'auto',
              zIndex: 10000,
            }}
          >
            {dropdown.content}
          </div>
        ))}
      </div>
    </DropdownContext.Provider>
  )
}

// Hook для использования dropdown портала
export const useDropdownPortal = () => {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdownPortal must be used within DropdownPortalManager')
  }
  return context
}

// Компонент для портала dropdown меню
export const DropdownPortal: React.FC<{
  trigger: React.ReactElement
  content: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}> = ({ trigger, content, open, onOpenChange }) => {
  const { registerDropdown, unregisterDropdown } = useDropdownPortal()
  const triggerRef = useRef<HTMLElement>(null)
  const dropdownId = useRef(`dropdown-${Math.random().toString(36).substr(2, 9)}`)

  const handleTriggerClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (triggerRef.current) {
        if (open) {
          unregisterDropdown(dropdownId.current)
          onOpenChange?.(false)
        } else {
          registerDropdown(dropdownId.current, triggerRef.current, content)
          onOpenChange?.(true)
        }
      }
    },
    [open, content, registerDropdown, unregisterDropdown, onOpenChange],
  )

  return React.cloneElement(trigger, {
    ref: triggerRef,
    onClick: handleTriggerClick,
  })
}

// Утилита debounce
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
