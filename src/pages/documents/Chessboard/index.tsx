import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { Typography, Pagination } from 'antd'
import { useScale } from '@/shared/contexts/ScaleContext'
import { useFiltersState } from './hooks/useFiltersState'
import { useChessboardData } from './hooks/useChessboardData'
import { useColumnSettings } from './hooks/useColumnSettings'
import { useTableOperations } from './hooks/useTableOperations'
import { useVersionsState } from './hooks/useVersionsState'
import { ChessboardFilters } from './components/ChessboardFilters'
import { ChessboardTable } from './components/ChessboardTable'
import { ColumnSettingsDrawer } from './components/ColumnSettingsDrawer'
import { VersionsModal } from './components/VersionsModal'
import ChessboardSetsModal from '../ChessboardSetsModal'
import { chessboardSetsApi } from '@/entities/chessboard/api/chessboard-sets-api'

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
    updateDocumentVersions,
    toggleFiltersCollapsed,
    setAppliedFilters,
  } = useFiltersState()

  const { data, isLoading, error, statistics, documentVersions, documentationInfo } = useChessboardData({
    appliedFilters,
    filters,
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

  // Хук для управления версиями документов
  const {
    versionsModalOpen,
    selectedVersions,
    openVersionsModal,
    closeVersionsModal,
    handleVersionSelect,
    applyVersions,
  } = useVersionsState()

  // Состояние для управления модалом комплектов
  const [setsModalOpen, setSetsModalOpen] = useState(false)

  // Состояние для текущего статуса шахматки
  const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined)

  // Ref для отслеживания ручной установки статуса (чтобы избежать переопределения через useEffect)
  const statusSetManuallyRef = useRef(false)

  // Автоматическое определение статуса комплекта при изменении примененных фильтров
  useEffect(() => {
    const detectSetStatus = async () => {
      if (!appliedFilters.project_id) {
        setCurrentStatus(undefined)
        statusSetManuallyRef.current = false
        return
      }

      // Если статус был установлен вручную (из комплекта), не переопределяем его
      if (statusSetManuallyRef.current) {
        console.log('🔍 Пропускаем автоопределение - статус установлен вручную') // LOG: пропуск автоопределения
        return
      }

      try {
        // Формируем фильтры для поиска комплекта
        const searchFilters = {
          project_id: appliedFilters.project_id,
          documentation_id: appliedFilters.documentation_code_ids.length > 0 ? appliedFilters.documentation_code_ids[0] : undefined,
          tag_id: appliedFilters.documentation_section_ids.length > 0 ? Number(appliedFilters.documentation_section_ids[0]) : undefined,
          block_ids: appliedFilters.block_ids.length > 0 ? appliedFilters.block_ids : undefined,
          cost_category_ids: appliedFilters.cost_category_ids.length > 0 ? appliedFilters.cost_category_ids.map(Number) : undefined,
          cost_type_ids: appliedFilters.detail_cost_category_ids.length > 0 ? appliedFilters.detail_cost_category_ids.map(Number) : undefined,
        }

        console.log('🔍 Поиск комплекта по фильтрам:', searchFilters) // LOG: поиск комплекта

        const matchedSet = await chessboardSetsApi.findSetByFilters(searchFilters)

        if (matchedSet && matchedSet.status) {
          console.log('✅ Найден комплект с статусом:', matchedSet.status) // LOG: найден комплект
          setCurrentStatus(matchedSet.status.id)
          statusSetManuallyRef.current = false // Это автоматическое определение
        } else {
          console.log('❌ Комплект не найден или без статуса') // LOG: комплект не найден
          setCurrentStatus(undefined)
          statusSetManuallyRef.current = false
        }
      } catch (error) {
        console.error('Ошибка поиска комплекта:', error) // LOG: ошибка поиска
        setCurrentStatus(undefined)
        statusSetManuallyRef.current = false
      }
    }

    detectSetStatus()
  }, [
    appliedFilters.project_id,
    appliedFilters.documentation_code_ids,
    appliedFilters.documentation_section_ids,
    appliedFilters.block_ids,
    appliedFilters.cost_category_ids,
    appliedFilters.detail_cost_category_ids,
    appliedFilters.documentation_version_ids
  ])

  // Сбрасываем флаг ручной установки статуса при смене проекта
  useEffect(() => {
    statusSetManuallyRef.current = false
  }, [appliedFilters.project_id])

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

  // Обработчики версий документов
  const handleOpenVersionsModal = useCallback(() => {
    // Проверяем что есть выбранные документы в фильтрах
    if (filters.documentationCode.length > 0) {
      // Если данные уже загружены - используем их
      if (documentationInfo.length > 0 && documentVersions.length > 0) {
        openVersionsModal(documentationInfo, documentVersions)
      } else {
        console.log('📋 Данные еще не загружены. Документы:', documentationInfo.length, 'Версии:', documentVersions.length) // LOG: информация о загрузке данных
      }
    }
  }, [filters.documentationCode, documentationInfo, documentVersions, openVersionsModal])

  const handleApplyVersions = useCallback(() => {
    const requiredDocIds = documentationInfo.map(doc => doc.id)
    applyVersions(requiredDocIds, (versions) => {
      console.log('🔍 Применены версии документов:', versions) // LOG: применение версий
      // Обновляем версии в appliedFilters
      updateDocumentVersions(versions)
    })
  }, [documentationInfo, applyVersions, updateDocumentVersions])

  // Обработчики комплектов
  const handleOpenSetsModal = useCallback(() => {
    if (filters.project) {
      setSetsModalOpen(true)
    }
  }, [filters.project])

  const handleCloseSetsModal = useCallback(() => {
    setSetsModalOpen(false)
  }, [])

  const handleSelectSet = useCallback(async (setId: string) => {
    console.log('🔍 Выбран комплект:', setId) // LOG: отладочная информация

    try {
      // Загружаем данные комплекта
      const set = await chessboardSetsApi.getSetById(setId)
      if (!set) {
        console.error('Комплект не найден:', setId) // LOG: ошибка загрузки
        return
      }

      console.log('🔍 Загружен комплект:', set) // LOG: данные комплекта

      // Получаем фильтры из комплекта
      const setFilters = chessboardSetsApi.getFiltersFromSet(set)
      console.log('🔍 Фильтры комплекта:', setFilters) // LOG: фильтры

      // Сначала обновляем все фильтры
      const updates = []

      if (setFilters.project_id) {
        updates.push(() => updateFilter('project', setFilters.project_id))
      }

      // Применяем фильтр раздела (тэг проекта)
      if (setFilters.tag_id !== undefined) {
        if (setFilters.tag_id === null) {
          updates.push(() => updateFilter('documentationSection', []))
        } else {
          updates.push(() => updateFilter('documentationSection', [String(setFilters.tag_id)]))
        }
      }

      if (setFilters.block_ids && setFilters.block_ids.length > 0) {
        updates.push(() => updateFilter('block', setFilters.block_ids))
      }

      if (setFilters.cost_category_ids && setFilters.cost_category_ids.length > 0) {
        updates.push(() => updateFilter('costCategory', setFilters.cost_category_ids.map(String)))
      }

      if (setFilters.cost_type_ids && setFilters.cost_type_ids.length > 0) {
        updates.push(() => updateFilter('costType', setFilters.cost_type_ids.map(String)))
      }

      // Применяем документы если есть (новый формат)
      if (set.documents && set.documents.length > 0) {
        const docIds = set.documents.map(doc => doc.documentation_id)
        updates.push(() => updateFilter('documentationCode', docIds))

        // Применяем версии документов
        const versionMapping = set.documents.reduce((acc, doc) => {
          acc[doc.documentation_id] = doc.version_id
          return acc
        }, {} as Record<string, string>)
        updates.push(() => updateDocumentVersions(versionMapping))
      } else if (setFilters.documentation_id && setFilters.version_id) {
        // Обратная совместимость для старого формата
        updates.push(() => updateFilter('documentationCode', [setFilters.documentation_id]))
        updates.push(() => updateDocumentVersions({ [setFilters.documentation_id]: setFilters.version_id }))
      }

      // Закрываем модал
      setSetsModalOpen(false)

      // Применяем все обновления последовательно
      console.log('🔍 Применяем обновления фильтров:', updates.length) // LOG: количество обновлений
      for (const update of updates) {
        update()
      }

      // Устанавливаем статус комплекта сразу
      if (set.status) {
        console.log('🔍 Устанавливаем статус комплекта:', set.status) // LOG: установка статуса
        setCurrentStatus(set.status.id)
        statusSetManuallyRef.current = true // Помечаем как ручную установку
      }

      console.log('✅ Все фильтры комплекта установлены, применяем немедленно') // LOG: завершение установки

      // НЕМЕДЛЕННО применяем фильтры напрямую из данных комплекта (без ожидания состояния React)
      const directAppliedFilters = {
        // Постоянные фильтры
        project_id: setFilters.project_id || '',
        documentation_section_ids: setFilters.tag_id ? [String(setFilters.tag_id)] : [],
        documentation_code_ids: set.documents && set.documents.length > 0
          ? set.documents.map(doc => doc.documentation_id)
          : [],
        documentation_version_ids: appliedFilters.documentation_version_ids,

        // Сворачиваемые фильтры
        block_ids: setFilters.block_ids || [],
        cost_category_ids: setFilters.cost_category_ids ? setFilters.cost_category_ids.map(String) : [],
        detail_cost_category_ids: setFilters.cost_type_ids ? setFilters.cost_type_ids.map(String) : [],

        // Дополнительные фильтры
        material_search: '',
      }

      console.log('🔍 Применяем фильтры напрямую из комплекта:', directAppliedFilters) // LOG: прямое применение
      setAppliedFilters(directAppliedFilters)
      console.log('✅ Фильтры комплекта применены напрямую') // LOG: успешное применение

    } catch (error) {
      console.error('Ошибка при применении комплекта:', error) // LOG: ошибка
      setSetsModalOpen(false)
    }
  }, [updateFilter, updateDocumentVersions, appliedFilters.documentation_version_ids, setAppliedFilters])

  // Обработчик изменения статуса
  const handleStatusChange = useCallback(async (statusId: string) => {
    console.log('🔍 Изменен статус шахматки:', statusId) // LOG: изменение статуса
    setCurrentStatus(statusId)
    statusSetManuallyRef.current = true // Помечаем как ручное изменение пользователем

    // Если есть примененные фильтры, пытаемся найти соответствующий комплект и обновить его статус
    if (appliedFilters.project_id) {
      try {
        const searchFilters = {
          project_id: appliedFilters.project_id,
          documentation_id: appliedFilters.documentation_code_ids.length > 0 ? appliedFilters.documentation_code_ids[0] : undefined,
          tag_id: appliedFilters.documentation_section_ids.length > 0 ? Number(appliedFilters.documentation_section_ids[0]) : undefined,
          block_ids: appliedFilters.block_ids.length > 0 ? appliedFilters.block_ids : undefined,
          cost_category_ids: appliedFilters.cost_category_ids.length > 0 ? appliedFilters.cost_category_ids.map(Number) : undefined,
          cost_type_ids: appliedFilters.detail_cost_category_ids.length > 0 ? appliedFilters.detail_cost_category_ids.map(Number) : undefined,
        }

        const matchedSet = await chessboardSetsApi.findSetByFilters(searchFilters)

        if (matchedSet) {
          console.log('🔍 Обновляем статус комплекта:', matchedSet.id, statusId) // LOG: обновление статуса комплекта
          await chessboardSetsApi.addStatusToSet({
            chessboard_set_id: matchedSet.id,
            status_id: statusId,
            comment: 'Статус обновлен через шахматку',
          })
          console.log('✅ Статус комплекта обновлен') // LOG: статус обновлен
        } else {
          console.log('❌ Комплект для обновления статуса не найден') // LOG: комплект не найден
        }
      } catch (error) {
        console.error('Ошибка обновления статуса комплекта:', error) // LOG: ошибка обновления
      }
    }
  }, [
    appliedFilters.project_id,
    appliedFilters.documentation_code_ids,
    appliedFilters.documentation_section_ids,
    appliedFilters.block_ids,
    appliedFilters.cost_category_ids,
    appliedFilters.detail_cost_category_ids
  ])


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
          onOpenVersionsModal={handleOpenVersionsModal}
          onOpenSetsModal={handleOpenSetsModal}
          tableMode={tableMode}
          hasAppliedProject={hasAppliedProject}
          hasUnsavedChanges={hasUnsavedChanges}
          selectedRowsCount={tableMode.selectedRowKeys.length}
          onSetMode={setMode}
          onSaveChanges={saveChanges}
          onCancelChanges={cancelChanges}
          onDeleteSelected={deleteSelectedRows}
          onAddRow={handleAddRow}
          currentStatus={currentStatus}
          onStatusChange={handleStatusChange}
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

      {/* Модальное окно выбора версий документов */}
      <VersionsModal
        open={versionsModalOpen}
        onCancel={closeVersionsModal}
        onOk={handleApplyVersions}
        selectedDocumentations={documentationInfo}
        documentVersions={documentVersions}
        selectedVersions={selectedVersions}
        onVersionSelect={handleVersionSelect}
      />

      {/* Модальное окно управления комплектами */}
      <ChessboardSetsModal
        open={setsModalOpen}
        onClose={handleCloseSetsModal}
        projectId={appliedFilters.project_id}
        onSelectSet={handleSelectSet}
      />
    </div>
  )
}
