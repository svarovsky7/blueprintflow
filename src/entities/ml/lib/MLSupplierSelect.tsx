import React from 'react'
import { AutoComplete, Badge, Tooltip, Space } from 'antd'
import { RobotOutlined, ThunderboltFilled } from '@ant-design/icons'
import { useMLSuppliers } from './useMLSuppliers'
import type { MLPredictionRequest } from '../model/types'

interface MLSupplierSelectProps {
  value?: string
  onChange?: (value: string, option?: any) => void
  onSupplierSelect?: (supplierId: string, supplierName: string) => void
  placeholder?: string
  materialName: string
  context?: MLPredictionRequest['context']
  style?: React.CSSProperties
  disabled?: boolean
  allowClear?: boolean
  showSearch?: boolean
  filterOption?: (input: string, option?: any) => boolean
  options?: Array<{ value: string; label: string }>
}

/**
 * ML-enhanced AutoComplete для выбора поставщиков по материалу
 */
export const MLSupplierSelect: React.FC<MLSupplierSelectProps> = ({
  value,
  onChange,
  onSupplierSelect,
  placeholder = 'Кликните для ML-подбора поставщика...',
  materialName,
  context,
  style,
  disabled,
  allowClear = true,
  showSearch = true,
  filterOption,
  options = [],
  ...props
}) => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [lastRequestTime, setLastRequestTime] = React.useState(0) // Защита от дублирования запросов

  const {
    suggestions,
    isLoading,
    config,
    predict,
    predictNow,
    clearSuggestions,
    confidence,
    processingTime,
    modelUsed
  } = useMLSuppliers({
    enabled: !disabled,
    autoPredict: false, // Отключаем автопредсказание
    debounceMs: 300,
    minQueryLength: 2
  })

  // LOG: Детальная диагностика состояния компонента MLSupplierSelect
  React.useEffect(() => {
    console.log('🔍 MLSupplierSelect Component State:', {
      materialName,
      hasOptions: options.length,
      hasContext: !!context,
      disabled,
      isOpen,
      isLoading,
      suggestionsCount: suggestions.length
    })
  }, [materialName, options.length, context, disabled, isOpen, isLoading, suggestions.length])

  // Функция для выполнения ML предсказания с защитой от дублирования
  const triggerPrediction = React.useCallback((source: string) => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime

    // Если прошло менее 2 секунд с последнего запроса - игнорируем (защита от дублирования)
    if (timeSinceLastRequest < 2000) {
      console.log(`🤖 ML Supplier: ${source} prediction ignored (duplicate within ${timeSinceLastRequest}ms)`) // LOG: игнорирование дублирующего запроса
      return
    }

    if (materialName && materialName.length >= 2 && config?.enabled) {
      console.log(`🤖 ML Supplier: ${source} triggered prediction for:`, materialName) // LOG: ML предсказание поставщиков
      setLastRequestTime(now)
      predictNow(materialName, context)
    }
  }, [materialName, context, predictNow, config?.enabled, lastRequestTime])

  // Обработчик фокуса - запускаем ML предсказание и открываем dropdown
  const handleFocus = React.useCallback(() => {
    setIsOpen(true)
    triggerPrediction('Focus')
  }, [triggerPrediction])

  // Обработчик клика - также запускаем ML предсказание
  const handleClick = React.useCallback(() => {
    setIsOpen(true)
    triggerPrediction('Click')
  }, [triggerPrediction])

  // Обработчик изменения поискового запроса
  const handleSearch = React.useCallback((searchValue: string) => {
    console.log('🔍 Supplier search query changed:', searchValue) // LOG: изменение поискового запроса поставщиков
    setSearchQuery(searchValue)
  }, [])

  // Обработчик закрытия dropdown
  const handleDropdownVisibleChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchQuery('')
    }
  }, [])

  // Стабилизируем массивы для предотвращения избыточных перерендеров (ИСПРАВЛЕНО)
  const stableSuggestions = React.useMemo(() => suggestions, [suggestions.length, suggestions.map(s => s.id).join(',')])
  const stableOptions = React.useMemo(() => options, [options.length, options.map(o => o.value).join(',')])

  // Объединяем ML предложения с обычными опциями (стабилизировано)
  const allOptions = React.useMemo(() => {
    // LOG: пересборка опций поставщиков (только при реальных изменениях)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Rebuilding supplier options:', {
        mlSuggestions: stableSuggestions.length,
        staticOptions: stableOptions.length,
        searchQuery
      })
    }

    const mlOptions = stableSuggestions.map(suggestion => ({
      value: suggestion.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{suggestion.name}</span>
          <Space size="small">
            <Badge
              count={`${Math.round(suggestion.confidence * 100)}%`}
              style={{
                backgroundColor: suggestion.confidence > 0.7 ? '#52c41a' :
                                suggestion.confidence > 0.5 ? '#faad14' : '#ff7875',
                fontSize: '10px',
                height: '16px',
                lineHeight: '16px',
                borderRadius: '8px'
              }}
            />
            <RobotOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Space>
        </div>
      ),
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      isMLSuggestion: true,
      supplierId: suggestion.id,
      supplierName: suggestion.name
    }))

    // Статические опции (из props)
    const staticOptions = stableOptions
      .filter(opt => !mlOptions.some(mlOpt => mlOpt.value === opt.value))
      .map(opt => ({
        ...opt,
        isMLSuggestion: false
      }))

    // Порядок: ML предложения -> Статические опции
    return [...mlOptions, ...staticOptions]
  }, [stableSuggestions, stableOptions]) // Убрал searchQuery из зависимостей - он не влияет на состав опций

  const handleSelect = (selectedValue: string, option: any) => {
    console.log('🤖 ML Supplier: Option selected:', { // LOG: выбор опции поставщика в ML AutoComplete
      selectedValue,
      isMLSuggestion: option.isMLSuggestion,
      confidence: option.confidence,
      supplierName: option.supplierName
    })

    if (option.isMLSuggestion && onSupplierSelect) {
      onSupplierSelect(option.supplierId, option.supplierName)
    }

    onChange?.(selectedValue, option)
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '32px'
    }}>
      <AutoComplete
        value={value}
        onChange={onChange}
        onSelect={handleSelect}
        onFocus={handleFocus}
        onClick={handleClick}
        placeholder={placeholder}
        style={{
          width: '100%',
          ...style
        }}
        disabled={disabled}
        allowClear={allowClear}
        showSearch={showSearch}
        filterOption={filterOption}
        onSearch={handleSearch}
        options={allOptions}
        dropdownStyle={{
          zIndex: 9999,
        }}
        getPopupContainer={(triggerNode) => {
          const scrollContainer = triggerNode.closest('.ant-table-body') ||
                                 triggerNode.closest('.ant-table-container') ||
                                 triggerNode.closest('[data-testid="table-scroll-container"]') ||
                                 document.body
          return scrollContainer as HTMLElement
        }}
        popupMatchSelectWidth={false}
        loading={isLoading}
        notFoundContent={
          isLoading ? (
            <div style={{
              padding: '12px 16px',
              textAlign: 'center',
              color: '#666',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RobotOutlined spin style={{ marginRight: '8px' }} />
              ML анализирует материал для поиска поставщиков...
            </div>
          ) : materialName.length >= 2 ? (
            suggestions.length === 0 && config?.enabled ? (
              <div style={{
                padding: '12px 16px',
                textAlign: 'center',
                color: '#666',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Кликните для ML-анализа поставщиков для "{materialName.substring(0, 20)}{materialName.length > 20 ? '...' : ''}"
              </div>
            ) : (
              <div style={{
                padding: '12px 16px',
                textAlign: 'center',
                color: '#666',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                Нет подходящих поставщиков
              </div>
            )
          ) : (
            <div style={{
              padding: '12px 16px',
              textAlign: 'center',
              color: '#666',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {materialName.length < 2 ? (
                'Сначала введите материал (мин. 2 символа)'
              ) : (
                'Кликните для ML-подбора поставщиков'
              )}
            </div>
          )
        }
        {...props}
      />

      {/* ML статус индикатор для поставщиков */}
      {config?.enabled && materialName.length >= 2 && (
        <div style={{
          position: 'absolute',
          top: '-26px',
          right: '0px',
          fontSize: '11px',
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          height: '20px',
          minWidth: '140px',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RobotOutlined spin style={{ color: '#1890ff' }} />
              <span>ML анализ поставщиков...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <Tooltip title={`ML модель: ${modelUsed}, Время: ${processingTime}мс, Средняя уверенность: ${Math.round(confidence * 100)}%`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}>
                <ThunderboltFilled style={{ color: '#52c41a' }} />
                <span style={{ color: '#52c41a' }}>
                  {suggestions.length} ML поставщиков
                </span>
              </div>
            </Tooltip>
          ) : (
            <Tooltip title="Кликните на поле для ML-анализа поставщиков">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}>
                <RobotOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#1890ff' }}>
                  Готов к ML-анализу
                </span>
              </div>
            </Tooltip>
          )}
        </div>
      )}

      {/* Дебаг информация (только в development) */}
      {import.meta.env.DEV && suggestions.length > 0 && (
        <div style={{
          marginTop: '4px',
          fontSize: '10px',
          color: '#999',
          fontFamily: 'monospace'
        }}>
          🤖 ML Suppliers: {suggestions.length} suggestions, {processingTime}ms, model: {modelUsed}
        </div>
      )}
    </div>
  )
}

export default MLSupplierSelect