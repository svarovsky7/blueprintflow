import { useCallback, useState, useEffect, useMemo } from 'react'
import { Typography, Pagination } from 'antd'
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

  // Состояние пагинации
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('chessboard-pagination-page')
    return saved ? parseInt(saved, 10) : 1
  })
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('chessboard-pagination-size')
    return saved ? parseInt(saved, 10) : 100
  })

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

  const { data, isLoading, error, statistics } = useChessboardData({
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
    startEditBackup,
    stopEditBackup,
    updateEditingRow,
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

  const handleRowUpdate = useCallback(
    (rowId: string, updates: any) => {
      console.log('📝 handleRowUpdate called:', {
        rowId,
        updates,
        currentMode: tableMode.mode
      }) // LOG: главный обработчик обновления строк

      if (tableMode.mode === 'add') {
        console.log('📝 Routing to updateNewRow') // LOG: маршрутизация к новым строкам
        updateNewRow(rowId, updates)
      } else if (tableMode.mode === 'edit') {
        console.log('📝 Routing to updateEditedRow') // LOG: маршрутизация к редактируемым строкам
        updateEditedRow(rowId, updates)
      } else {
        console.warn('📝 Unknown table mode, ignoring update:', tableMode.mode) // LOG: неизвестный режим
      }
    },
    [tableMode.mode, updateNewRow, updateEditedRow],
  )

  const handleStartEditing = useCallback(
    (rowId: string, rowData?: RowData) => {
      console.log(
        '🔍 DEBUG: handleStartEditing вызван для строки:',
        rowId,
        'текущий режим:',
        tableMode.mode,
      ) // LOG: отладочная информация

      if (tableMode.mode === 'view') {
        console.log('🔍 DEBUG: Переводим в режим edit и начинаем редактирование') // LOG: отладочная информация
        setMode('edit')
        startEditing(rowId)
      } else if (tableMode.mode === 'edit') {
        // Если уже в режиме редактирования, используем backup подход для множественного редактирования
        console.log('🔍 DEBUG: Уже в режиме edit, начинаем backup редактирование') // LOG: отладочная информация
        if (rowData) {
          startEditBackup(rowId, rowData)
        }
      } else {
        console.log('🔍 DEBUG: Режим не позволяет редактирование:', tableMode.mode) // LOG: отладочная информация
      }
    },
    [tableMode.mode, setMode, startEditing, startEditBackup],
  )

  const handleBackupRowUpdate = useCallback(
    (rowId: string, updates: any) => {
      console.log('🔍 DEBUG: handleBackupRowUpdate для строки:', rowId, updates) // LOG: отладочная информация
      updateEditingRow(rowId, updates)
    },
    [updateEditingRow],
  )

  const handleRowDelete = useCallback(
    (rowId: string) => {
      if (tableMode.mode === 'add') {
        removeNewRow(rowId)
      }
    },
    [tableMode.mode, removeNewRow],
  )

  // Обработчики пагинации
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    localStorage.setItem('chessboard-pagination-page', page.toString())
  }, [])

  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setCurrentPage(1) // Сбрасываем на первую страницу при изменении размера
    setPageSize(size)
    localStorage.setItem('chessboard-pagination-page', '1')
    localStorage.setItem('chessboard-pagination-size', size.toString())
  }, [])

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Мемоизируем вызовы функций без зависимости от самих функций
  const allDisplayData = useMemo(() => getDisplayData(data), [data, tableMode.mode, tableMode.selectedRowKeys?.length || 0, tableMode.newRows?.length || 0, tableMode.editedRows?.size || 0])
  const visibleColumns = useMemo(() => getVisibleColumns(), [columnSettings.columnOrder, columnSettings.hiddenColumns])
  const allColumnsWithVisibility = useMemo(() => getAllColumnsWithVisibility(), [columnSettings.columnOrder, columnSettings.hiddenColumns])

  // Применение пагинации к данным
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return allDisplayData.slice(startIndex, endIndex)
  }, [allDisplayData, currentPage, pageSize])

  const displayData = paginatedData

  // Сброс пагинации при изменении данных
  useEffect(() => {
    if (currentPage > 1 && allDisplayData.length <= (currentPage - 1) * pageSize) {
      setCurrentPage(1)
      localStorage.setItem('chessboard-pagination-page', '1')
    }
  }, [allDisplayData.length, currentPage, pageSize])

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
              {' '}
              ({statistics.totalRows} записей, материалов: {statistics.uniqueMaterials},
              номенклатур: {statistics.uniqueNomenclature})
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
          isLoading={isLoading}
          statistics={statistics}
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
          padding: '0 24px 24px 24px',
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'auto', // Восстанавливаем прокрутку
            border: '1px solid #f0f0f0',
            borderRadius: '6px',
            minHeight: 0,
          }}
        >
          <ChessboardTable
            data={displayData}
            loading={isLoading}
            tableMode={tableMode}
            visibleColumns={visibleColumns}
            currentProjectId={appliedFilters.project_id}
            onSelectionChange={setSelectedRowKeys}
            onRowUpdate={handleRowUpdate}
            onBackupRowUpdate={handleBackupRowUpdate}
            onRowCopy={copyRow}
            onRowDelete={handleRowDelete}
            onRowColorChange={updateRowColor}
            onStartEditing={handleStartEditing}
          />
        </div>

        {/* Пагинация под таблицей */}
        <div style={{
          padding: '16px 0',
          textAlign: 'center',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Pagination
            size="small"
            current={currentPage}
            total={allDisplayData.length}
            pageSize={pageSize}
            showSizeChanger
            showQuickJumper
            onChange={handlePageChange}
            onShowSizeChange={handlePageSizeChange}
            showTotal={(total, range) => `${range[0]}-${range[1]} из ${total} записей`}
            pageSizeOptions={['10', '20', '50', '100', '200', '500']}
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
