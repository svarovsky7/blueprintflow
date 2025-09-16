import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input, InputNumber } from 'antd'

interface DebouncedInputProps {
  value: any
  onChange: (value: any) => void
  debounceMs?: number
  type?: 'text' | 'number'
  placeholder?: string
  size?: 'small' | 'middle' | 'large'
  style?: React.CSSProperties
  disabled?: boolean
  // Новые опции для производительности
  throttleMs?: number
  immediate?: boolean
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = 150, // Уменьшена задержка с 300 до 150мс
  throttleMs = 50, // Добавлен throttling для быстрых изменений
  type = 'text',
  placeholder,
  size = 'small',
  style,
  disabled = false,
  immediate = false, // Опция для немедленного обновления
}) => {
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const throttleRef = useRef<NodeJS.Timeout | null>(null)
  const lastChangeRef = useRef<number>(0)

  // Синхронизация с внешним значением только при изменении извне
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }
    }
  }, [])

  // Оптимизированная debounce функция с throttling
  const debouncedOnChange = useCallback((newValue: any) => {
    const now = Date.now()

    // Немедленное обновление если включено
    if (immediate) {
      onChange(newValue)
      return
    }

    // Throttling для частых изменений
    if (throttleMs > 0 && now - lastChangeRef.current < throttleMs) {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }

      throttleRef.current = setTimeout(() => {
        onChange(newValue)
        lastChangeRef.current = Date.now()
      }, throttleMs)
      return
    }

    // Обычный debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
      lastChangeRef.current = Date.now()
    }, debounceMs)
  }, [onChange, debounceMs, throttleMs, immediate])

  const handleChange = useCallback((e: any) => {
    const newValue = e?.target?.value ?? e
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }, [debouncedOnChange])

  if (type === 'number') {
    return (
      <InputNumber
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        size={size}
        style={style}
        disabled={disabled}
        precision={3}
        step={0.001}
        controls={false}
        // Оптимизации производительности
        keyboard={false}
        changeOnWheel={false}
        autoComplete="off"
      />
    )
  }

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      style={style}
      disabled={disabled}
      // Оптимизации производительности
      autoComplete="off"
      spellCheck={false}
    />
  )
}

export default React.memo(DebouncedInput)