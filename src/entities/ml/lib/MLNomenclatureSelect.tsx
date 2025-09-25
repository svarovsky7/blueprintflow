import React from 'react'
import { AutoComplete, Badge, Tooltip, Space } from 'antd'
import { RobotOutlined, ThunderboltFilled } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useMLNomenclature } from './useMLNomenclature'
import { searchNomenclature } from '../api/ml-api'
import type { MLPredictionRequest } from '../model/types'

interface MLNomenclatureSelectProps {
  value?: string
  onChange?: (value: string, option?: any) => void
  placeholder?: string
  materialName: string
  context?: MLPredictionRequest['context']
  style?: React.CSSProperties
  disabled?: boolean
  allowClear?: boolean
  showSearch?: boolean
  filterOption?: (input: string, option?: any) => boolean
  options?: Array<{ value: string; label: string }>
  onMLSuggestionSelect?: (suggestion: any) => void
}

/**
 * ML-enhanced AutoComplete для выбора номенклатуры
 */
export const MLNomenclatureSelect: React.FC<MLNomenclatureSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите номенклатуру (ML-подбор по материалу)...',
  materialName,
  context,
  style,
  disabled,
  allowClear = true,
  showSearch = true,
  filterOption,
  options = [],
  onMLSuggestionSelect,
  ...props
}) => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)

  const {
    suggestions,
    isLoading,
    config,
    predict,
    predictNow,
    clearSuggestions,
    confidence,
    processingTime,
    modelUsed,
  } = useMLNomenclature({
    enabled: !disabled,
    autoPredict: false, // Отключаем автопредсказание
    debounceMs: 300,
    minQueryLength: 2,
  })

  // Server-side поиск номенклатуры для больших данных
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['nomenclature-search', searchQuery],
    queryFn: () => searchNomenclature(searchQuery, 100),
    enabled: isOpen && searchQuery.length >= 1,
    staleTime: 30 * 1000, // 30 секунд кэша
    gcTime: 5 * 60 * 1000, // 5 минут в памяти
  })

  // Обработчик фокуса - запускаем ML предсказание и открываем dropdown
  const handleFocus = React.useCallback(() => {
    setIsOpen(true)
    if (materialName && materialName.length >= 2 && config?.enabled) {
      console.log('🤖 ML AutoComplete: Focus triggered prediction for:', materialName) // LOG: ML предсказание по фокусу
      predictNow(materialName, context)
    }
  }, [materialName, context, predictNow, config?.enabled])

  // Обработчик клика - также запускаем ML предсказание
  const handleClick = React.useCallback(() => {
    setIsOpen(true)
    if (materialName && materialName.length >= 2 && config?.enabled) {
      console.log('🤖 ML AutoComplete: Click triggered prediction for:', materialName) // LOG: ML предсказание по клику
      predictNow(materialName, context)
    }
  }, [materialName, context, predictNow, config?.enabled])

  // Обработчик изменения поискового запроса
  const handleSearch = React.useCallback((searchValue: string) => {
    console.log('🔍 Search query changed:', searchValue) // LOG: изменение поискового запроса
    setSearchQuery(searchValue)
  }, [])

  // Обработчик закрытия dropdown
  const handleDropdownVisibleChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchQuery('')
    }
  }, [])

  // Стабилизируем массивы для предотвращения избыточных перерендеров
  const stableSuggestions = React.useMemo(() => suggestions, [JSON.stringify(suggestions)])
  const stableSearchResults = React.useMemo(() => searchResults, [JSON.stringify(searchResults)])
  const stableOptions = React.useMemo(() => options, [JSON.stringify(options)])

  // Объединяем ML предложения с server-side поиском и обычными опциями
  const allOptions = React.useMemo(() => {
    // LOG: пересборка опций (только при реальных изменениях)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Rebuilding options:', {
        mlSuggestions: stableSuggestions.length,
        searchResults: stableSearchResults.length,
        staticOptions: stableOptions.length,
        searchQuery,
      })
    }

    const mlOptions = stableSuggestions.map((suggestion) => ({
      value: suggestion.id,
      label: (
        <Tooltip
          title={
            <div style={{ maxWidth: '300px' }}>
              <div>
                <strong>📋 {suggestion.tooltip_info || suggestion.name}</strong>
              </div>
              {suggestion.supplier_name && <div>🏢 Поставщик: {suggestion.supplier_name}</div>}
              {suggestion.quality_score && <div>⭐ Качество: {suggestion.quality_score}/10</div>}
              {suggestion.price_analysis && <div>💰 Цена: {suggestion.price_analysis}</div>}
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                {suggestion.reasoning}
              </div>
            </div>
          }
          placement="left"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold' }}>{suggestion.name}</div>
              {suggestion.supplier_name && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  🏢 {suggestion.supplier_name}
                </div>
              )}
            </div>
            <Space size="small">
              {suggestion.quality_score && (
                <Badge
                  count={`⭐${suggestion.quality_score}`}
                  style={{
                    backgroundColor:
                      suggestion.quality_score >= 8
                        ? '#52c41a'
                        : suggestion.quality_score >= 6
                          ? '#faad14'
                          : '#ff7875',
                    fontSize: '9px',
                    height: '16px',
                    lineHeight: '16px',
                    borderRadius: '8px',
                  }}
                />
              )}
              <Badge
                count={`${Math.round(suggestion.confidence * 100)}%`}
                style={{
                  backgroundColor:
                    suggestion.confidence > 0.7
                      ? '#52c41a'
                      : suggestion.confidence > 0.5
                        ? '#faad14'
                        : '#ff7875',
                  fontSize: '10px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                }}
              />
              <RobotOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
            </Space>
          </div>
        </Tooltip>
      ),
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      // ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ОТ DEEPSEEK
      tooltip_info: suggestion.tooltip_info,
      price_analysis: suggestion.price_analysis,
      quality_score: suggestion.quality_score,
      supplier_name: suggestion.supplier_name,
      isMLSuggestion: true,
    }))

    // Server-side результаты поиска
    const serverOptions = stableSearchResults
      .filter((item) => !mlOptions.some((mlOpt) => mlOpt.value === item.id))
      .map((item) => ({
        value: item.id,
        label: item.name,
        isMLSuggestion: false,
        isServerResult: true,
      }))

    // Статические опции (из props)
    const staticOptions = stableOptions
      .filter(
        (opt) =>
          !mlOptions.some((mlOpt) => mlOpt.value === opt.value) &&
          !serverOptions.some((serverOpt) => serverOpt.value === opt.value),
      )
      .map((opt) => ({
        ...opt,
        isMLSuggestion: false,
        isServerResult: false,
      }))

    // Порядок: ML предложения -> Server-side результаты -> Статические опции
    return [...mlOptions, ...serverOptions, ...staticOptions]
  }, [stableSuggestions, stableSearchResults, stableOptions, searchQuery])

  const handleSelect = (selectedValue: string, option: any) => {
    console.log('🤖 ML AutoComplete: Option selected:', {
      // LOG: выбор опции в ML AutoComplete
      selectedValue,
      isMLSuggestion: option.isMLSuggestion,
      confidence: option.confidence,
    })

    if (option.isMLSuggestion && onMLSuggestionSelect) {
      onMLSuggestionSelect({
        id: selectedValue,
        name: option.children?.props?.children?.[0] || option.label,
        confidence: option.confidence,
        reasoning: option.reasoning,
        // РАСШИРЕННАЯ ИНФОРМАЦИЯ ОТ DEEPSEEK
        tooltip_info: option.tooltip_info,
        price_analysis: option.price_analysis,
        quality_score: option.quality_score,
        supplier_name: option.supplier_name,
      })
    }

    onChange?.(selectedValue, option)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%', // Фиксируем ширину
        minHeight: '32px', // Минимальная высота для предотвращения скачков
      }}
    >
      <AutoComplete
        value={value}
        onChange={onChange}
        onSelect={handleSelect}
        onFocus={handleFocus}
        onClick={handleClick}
        placeholder={placeholder}
        style={{
          width: '100%', // Фиксируем ширину AutoComplete
          ...style,
        }}
        disabled={disabled}
        allowClear={allowClear}
        showSearch={showSearch}
        filterOption={filterOption}
        onSearch={handleSearch}
        options={allOptions}
        dropdownStyle={{
          zIndex: 9999, // Высокий z-index для предотвращения перекрытий
        }}
        getPopupContainer={(triggerNode) => {
          // Попап будет создан в фиксированном контейнере для предотвращения скачков
          const scrollContainer =
            triggerNode.closest('.ant-table-body') ||
            triggerNode.closest('.ant-table-container') ||
            triggerNode.closest('[data-testid="table-scroll-container"]') ||
            document.body
          return scrollContainer as HTMLElement
        }}
        popupMatchSelectWidth={false} // Отключаем автоматическое совпадение ширины
        loading={isLoading || isSearching}
        notFoundContent={
          isLoading || isSearching ? (
            <div
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                color: '#666',
                minHeight: '44px', // Фиксированная высота для стабильности
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RobotOutlined spin style={{ marginRight: '8px' }} />
              ML анализирует материал...
            </div>
          ) : materialName.length >= 2 ? (
            suggestions.length === 0 && config?.enabled ? (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: '#666',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Кликните для ML-анализа материала "{materialName.substring(0, 20)}
                {materialName.length > 20 ? '...' : ''}"
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: '#666',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Нет подходящих вариантов
              </div>
            )
          ) : (
            <div
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                color: '#666',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {materialName.length < 2
                ? 'Сначала введите материал (мин. 2 символа)'
                : 'Кликните для ML-подбора номенклатуры'}
            </div>
          )
        }
        {...props}
      />

      {/* ML статус индикатор */}
      {config?.enabled && materialName.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: '-26px',
            right: '0px',
            fontSize: '11px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            height: '20px', // Фиксированная высота
            minWidth: '120px', // Минимальная ширина для предотвращения скачков
            justifyContent: 'flex-end',
            pointerEvents: 'none', // Не блокируем клики
            zIndex: 10,
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RobotOutlined spin style={{ color: '#1890ff' }} />
              <span>ML анализ...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <Tooltip
              title={`ML модель: ${modelUsed}, Время: ${processingTime}мс, Средняя уверенность: ${Math.round(confidence * 100)}%`}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}
              >
                <ThunderboltFilled style={{ color: '#52c41a' }} />
                <span style={{ color: '#52c41a' }}>{suggestions.length} ML предложений</span>
              </div>
            </Tooltip>
          ) : (
            <Tooltip title="Кликните на поле для ML-анализа материала">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}
              >
                <RobotOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#1890ff' }}>Готов к ML-анализу</span>
              </div>
            </Tooltip>
          )}
        </div>
      )}

      {/* Дебаг информация (только в development) */}
      {import.meta.env.DEV && suggestions.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '10px',
            color: '#999',
            fontFamily: 'monospace',
          }}
        >
          🤖 ML: {suggestions.length} suggestions, {processingTime}ms, model: {modelUsed}
        </div>
      )}
    </div>
  )
}

export default MLNomenclatureSelect
