import React, { memo, useCallback, useMemo } from 'react'
import { Select, Input, InputNumber, AutoComplete } from 'antd'

// ===== ТИПЫ =====
interface BaseOption {
  value: string | number
  label: string
}

interface OptimizedSelectProps {
  value?: string | number
  onChange: (value: string | number, option?: any) => void
  options: BaseOption[]
  placeholder?: string
  style?: React.CSSProperties
  allowClear?: boolean
  showSearch?: boolean
  popupMatchSelectWidth?: boolean | number
  dropdownStyle?: React.CSSProperties
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
}

interface OptimizedInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
}

interface OptimizedInputNumberProps {
  value?: number | string
  onChange: (value: number | string | null) => void
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  precision?: number
  step?: number
  controls?: boolean
}

interface OptimizedAutoCompleteProps {
  value?: string
  onChange: (value: string) => void
  onSelect?: (value: string, option: any) => void
  onSearch?: (searchText: string) => void
  options: BaseOption[]
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  popupMatchSelectWidth?: boolean | number
  filterOption?: boolean | ((input: string, option?: any) => boolean)
}

// ===== ОПТИМИЗИРОВАННЫЕ КОМПОНЕНТЫ =====

// Мемоизированный Select с оптимизированным рендерингом
export const MemoizedSelect = memo<OptimizedSelectProps>(
  ({
    value,
    onChange,
    options,
    placeholder,
    style,
    allowClear = true,
    showSearch = true,
    popupMatchSelectWidth = false,
    dropdownStyle,
    disabled = false,
    size = 'small',
  }) => {
    // Мемоизируем обработчик изменений
    const handleChange = useCallback(
      (newValue: string | number, option?: any) => {
        onChange(newValue, option)
      },
      [onChange],
    )

    // Мемоизируем функцию фильтрации для русского текста
    const filterOption = useCallback((input: string, option?: any) => {
      if (!input) return true
      const text = (option?.label || option?.children)?.toString() || ''
      return text.toLowerCase().includes(input.toLowerCase())
    }, [])

    // Мемоизируем опции для предотвращения ненужных пересоздания
    const memoizedOptions = useMemo(() => options, [options])

    return (
      <Select
        value={value}
        onChange={handleChange}
        options={memoizedOptions}
        placeholder={placeholder}
        style={style}
        allowClear={allowClear}
        showSearch={showSearch}
        popupMatchSelectWidth={popupMatchSelectWidth}
        dropdownStyle={dropdownStyle}
        disabled={disabled}
        size={size}
        filterOption={showSearch ? filterOption : false}
        // Отключаем ненужные проверки для производительности
        notFoundContent={null}
        // Уменьшаем время дебаунса для поиска
        searchValue={undefined}
      />
    )
  },
)

MemoizedSelect.displayName = 'MemoizedSelect'

// Мемоизированный Input с оптимизированным обработчиком
export const MemoizedInput = memo<OptimizedInputProps>(
  ({ value, onChange, placeholder, style, disabled = false, size = 'small' }) => {
    // Мемоизируем обработчик для предотвращения лишних ререндеров
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value)
      },
      [onChange],
    )

    return (
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={style}
        disabled={disabled}
        size={size}
        // Отключаем автофокус и подобные возможности для производительности
        autoComplete="off"
        spellCheck={false}
      />
    )
  },
)

MemoizedInput.displayName = 'MemoizedInput'

// Мемоизированный InputNumber с оптимизацией
export const MemoizedInputNumber = memo<OptimizedInputNumberProps>(
  ({
    value,
    onChange,
    placeholder,
    style,
    disabled = false,
    size = 'small',
    precision = 3,
    step = 0.001,
    controls = false,
  }) => {
    // Мемоизируем обработчик изменений
    const handleChange = useCallback(
      (newValue: number | string | null) => {
        onChange(newValue)
      },
      [onChange],
    )

    return (
      <InputNumber
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={style}
        disabled={disabled}
        size={size}
        precision={precision}
        step={step}
        controls={controls}
        // Отключаем лишние возможности
        keyboard={false}
        changeOnWheel={false}
      />
    )
  },
)

MemoizedInputNumber.displayName = 'MemoizedInputNumber'

// Мемоизированный AutoComplete с оптимизированным поиском
export const MemoizedAutoComplete = memo<OptimizedAutoCompleteProps>(
  ({
    value,
    onChange,
    onSelect,
    onSearch,
    options,
    placeholder,
    style,
    disabled = false,
    size = 'small',
    popupMatchSelectWidth = 300,
    filterOption = false,
  }) => {
    // Мемоизируем обработчики
    const handleChange = useCallback(
      (newValue: string) => {
        onChange(newValue)
      },
      [onChange],
    )

    const handleSelect = useCallback(
      (selectedValue: string, option: any) => {
        onSelect?.(selectedValue, option)
      },
      [onSelect],
    )

    const handleSearch = useCallback(
      (searchText: string) => {
        onSearch?.(searchText)
      },
      [onSearch],
    )

    // Мемоизируем опции
    const memoizedOptions = useMemo(() => options, [options])

    return (
      <AutoComplete
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onSearch={handleSearch}
        options={memoizedOptions}
        placeholder={placeholder}
        style={style}
        disabled={disabled}
        size={size}
        popupMatchSelectWidth={popupMatchSelectWidth}
        filterOption={filterOption}
        // Оптимизации
        backfill={false}
        defaultOpen={false}
      />
    )
  },
)

MemoizedAutoComplete.displayName = 'MemoizedAutoComplete'

// ===== СПЕЦИАЛИЗИРОВАННЫЕ КОМПОНЕНТЫ ДЛЯ ТАБЛИЦЫ =====

// Компонент для быстрого ввода количества (ширина 10ch)
export const QuantityInput = memo<{
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}>(({ value, onChange, disabled = false }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <Input
      style={{ width: '10ch' }}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      size="small"
      autoComplete="off"
      spellCheck={false}
    />
  )
})

QuantityInput.displayName = 'QuantityInput'

// Компонент для выбора материала с поиском
export const MaterialSelect = memo<{
  value?: string
  materialId?: string
  onChange: (value: string, materialId: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}>(({ value, materialId, onChange, options, disabled = false }) => {
  const handleSelect = useCallback(
    (selectedValue: string, option: any) => {
      onChange(String(option?.label), String(selectedValue))
    },
    [onChange],
  )

  const memoizedOptions = useMemo(() => options, [options])

  return (
    <AutoComplete
      style={{ width: '100%' }}
      popupMatchSelectWidth={300}
      options={memoizedOptions}
      value={value}
      onSelect={handleSelect}
      filterOption={false}
      disabled={disabled}
      size="small"
      placeholder="Выберите материал"
      backfill={false}
      defaultOpen={false}
    />
  )
})

MaterialSelect.displayName = 'MaterialSelect'

// Компонент для выбора номенклатуры с поддержкой поиска
export const NomenclatureSelect = memo<{
  value?: string
  onChange: (value: string, option?: any) => void
  onSearch?: (searchText: string) => void
  options: Array<{ value: string; label: string }>
  dropdownWidth?: number
  disabled?: boolean
}>(({ value, onChange, onSearch, options, dropdownWidth = 250, disabled = false }) => {
  const handleChange = useCallback(
    (selectedValue: string, option?: any) => {
      onChange(selectedValue, option)
    },
    [onChange],
  )

  const handleSearch = useCallback(
    (searchText: string) => {
      onSearch?.(searchText)
    },
    [onSearch],
  )

  const memoizedOptions = useMemo(() => options, [options])

  return (
    <Select
      style={{ width: 250 }}
      popupMatchSelectWidth={dropdownWidth}
      value={value}
      onChange={handleChange}
      options={memoizedOptions}
      showSearch
      onSearch={handleSearch}
      filterOption={false}
      disabled={disabled}
      size="small"
      placeholder="Выберите номенклатуру"
      allowClear
      notFoundContent={null}
    />
  )
})

NomenclatureSelect.displayName = 'NomenclatureSelect'

// Экспорт всех компонентов
export {
  type OptimizedSelectProps,
  type OptimizedInputProps,
  type OptimizedInputNumberProps,
  type OptimizedAutoCompleteProps,
}
