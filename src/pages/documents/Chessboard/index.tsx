import { useCallback } from 'react'
import { Typography } from 'antd'
import { useScale } from '@/shared/contexts/ScaleContext'
import { useFiltersState } from './hooks/useFiltersState'
import { useChessboardData } from './hooks/useChessboardData'
import { useColumnSettings } from './hooks/useColumnSettings'
import { useTableOperations } from './hooks/useTableOperations'
import { ChessboardFilters } from './components/ChessboardFilters'
import { ChessboardTable } from './components/ChessboardTable'
import { ColumnSettingsDrawer } from './components/ColumnSettingsDrawer'

const { Title } = Typography

export default function Chessboard() {
  const { scale } = useScale()

  // Хуки для управления состоянием
  const {
    filters,
    appliedFilters,
    filtersCollapsed,
    hasActiveFilters,
    hasAppliedFilters,
    updateFilter,
    updateCascadingFilter,
    resetFilters,
    applyFilters,
    toggleFiltersCollapsed,
  } = useFiltersState()

  const {
    data,
    isLoading,
    error,
    statistics,
  } = useChessboardData({
    appliedFilters,
    enabled: !!appliedFilters.project_id,
  })

  const {
    columnSettings,
    drawerVisible,
    toggleColumnVisibility,
    moveColumn,
    resetToDefault,
    toggleAllColumns,
    openDrawer,
    closeDrawer,
    getVisibleColumns,
    getAllColumnsWithVisibility,
  } = useColumnSettings()

  const {
    tableMode,
    hasUnsavedChanges,
    setMode,
    setSelectedRowKeys,
    addNewRow,
    removeNewRow,
    copyRow,
    updateNewRow,
    startEditing,
    updateEditedRow,
    updateRowColor,
    saveChanges,
    cancelChanges,
    deleteSelectedRows,
    getDisplayData,
  } = useTableOperations()

  // Обработчики событий
  const handleAddRow = useCallback(() => {
    if (appliedFilters.project_id) {
      addNewRow(appliedFilters.project_id)
    }
  }, [appliedFilters.project_id, addNewRow])

  const handleRowUpdate = useCallback((rowId: string, updates: any) => {
    if (tableMode.mode === 'add') {
      updateNewRow(rowId, updates)
    } else if (tableMode.mode === 'edit') {
      updateEditedRow(rowId, updates)
    }
  }, [tableMode.mode, updateNewRow, updateEditedRow])

  const handleStartEditing = useCallback((rowId: string) => {
    console.log('🔍 DEBUG: handleStartEditing вызван для строки:', rowId, 'текущий режим:', tableMode.mode) // LOG: отладочная информация
    if (tableMode.mode === 'view') {
      console.log('🔍 DEBUG: Переводим в режим edit и начинаем редактирование') // LOG: отладочная информация
      setMode('edit')
      startEditing(rowId)
    } else {
      console.log('🔍 DEBUG: Режим уже не view, пропускаем редактирование') // LOG: отладочная информация
    }
  }, [tableMode.mode, setMode, startEditing])

  const handleRowDelete = useCallback((rowId: string) => {
    if (tableMode.mode === 'add') {
      removeNewRow(rowId)
    }
  }, [tableMode.mode, removeNewRow])


  // Получение финальных данных для отображения
  const displayData = getDisplayData(data)
  const visibleColumns = getVisibleColumns()
  const allColumnsWithVisibility = getAllColumnsWithVisibility()

  // Проверка наличия примененного проекта
  const hasAppliedProject = !!appliedFilters.project_id

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={2}>Шахматка</Title>
        <div style={{ color: 'red' }}>Ошибка загрузки данных: {error.message}</div>
      </div>
    )
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Заголовок */}
      <div style={{ flexShrink: 0, padding: '16px 24px 0 24px' }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Шахматка
          {statistics.totalRows > 0 && (
            <span style={{ fontSize: Math.round(14 * scale), fontWeight: 'normal', color: '#666' }}>
              {' '}({statistics.totalRows} записей, материалов: {statistics.uniqueMaterials}, номенклатур: {statistics.uniqueNomenclature})
            </span>
          )}
        </Title>
      </div>

      {/* Фильтры */}
      <div style={{ flexShrink: 0, padding: '16px 24px 0 24px' }}>
        <ChessboardFilters
          filters={filters}
          appliedFilters={appliedFilters}
          filtersCollapsed={filtersCollapsed}
          hasActiveFilters={hasActiveFilters}
          hasAppliedFilters={hasAppliedFilters}
          onFilterChange={updateFilter}
          onCascadingFilterChange={updateCascadingFilter}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          onToggleCollapsed={toggleFiltersCollapsed}
          onOpenColumnSettings={openDrawer}
          tableMode={tableMode}
          hasAppliedProject={hasAppliedProject}
          hasUnsavedChanges={hasUnsavedChanges}
          selectedRowsCount={tableMode.selectedRowKeys.length}
          onSetMode={setMode}
          onSaveChanges={saveChanges}
          onCancelChanges={cancelChanges}
          onDeleteSelected={deleteSelectedRows}
          onAddRow={handleAddRow}
        />
      </div>


      {/* Контейнер таблицы с правильной структурой прокрутки */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        padding: '0 24px 24px 24px'
      }}>
        <div style={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: '6px'
        }}>
          <ChessboardTable
            data={displayData}
            loading={isLoading}
            tableMode={tableMode}
            visibleColumns={visibleColumns}
            currentProjectId={appliedFilters.project_id}
            onSelectionChange={setSelectedRowKeys}
            onRowUpdate={handleRowUpdate}
            onRowCopy={copyRow}
            onRowDelete={handleRowDelete}
            onRowColorChange={updateRowColor}
            onStartEditing={handleStartEditing}
          />
        </div>
      </div>

      {/* Настройки столбцов */}
      <ColumnSettingsDrawer
        visible={drawerVisible}
        columns={allColumnsWithVisibility}
        onClose={closeDrawer}
        onToggleColumn={toggleColumnVisibility}
        onMoveColumn={moveColumn}
        onToggleAll={toggleAllColumns}
        onResetToDefault={resetToDefault}
      />
    </div>
  )
}