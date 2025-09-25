import { useCallback, memo, useState } from 'react'
import { Button, Select, Space, Input, Badge } from 'antd'
import {
  FilterOutlined,
  CaretUpFilled,
  CaretDownFilled,
  SettingOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { documentationApi } from '@/entities/documentation'
import { documentationTagsApi } from '@/entities/documentation-tags'
import { MLConfigPanel } from '@/entities/ml'
import { ChessboardActionButtons } from './ChessboardActionButtons'
import type {
  ChessboardFilters,
  ProjectOption,
  BlockOption,
  CostCategoryOption,
  CostTypeOption,
  TableMode,
} from '../types'

interface ChessboardFiltersProps {
  filters: ChessboardFilters
  appliedFilters: any
  filtersCollapsed: boolean
  hasActiveFilters: boolean
  hasAppliedFilters: boolean
  onFilterChange: (key: keyof ChessboardFilters, value: any) => void
  onCascadingFilterChange: (key: keyof ChessboardFilters, value: any) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onToggleCollapsed: () => void
  onOpenColumnSettings: () => void
  // Пропы для управления таблицей
  tableMode: TableMode
  hasAppliedProject: boolean
  hasUnsavedChanges: boolean
  selectedRowsCount: number
  onSetMode: (mode: TableMode['mode']) => void
  onSaveChanges: () => void
  onCancelChanges: () => void
  onDeleteSelected: () => void
  onAddRow: () => void
}

export const ChessboardFilters = memo(
  ({
    filters,
    appliedFilters,
    filtersCollapsed,
    hasActiveFilters,
    hasAppliedFilters,
    onFilterChange,
    onCascadingFilterChange,
    onApplyFilters,
    onResetFilters,
    onToggleCollapsed,
    onOpenColumnSettings,
    tableMode,
    hasAppliedProject,
    hasUnsavedChanges,
    selectedRowsCount,
    onSetMode,
    onSaveChanges,
    onCancelChanges,
    onDeleteSelected,
    onAddRow,
  }: ChessboardFiltersProps) => {
    // Состояние для панели настроек ML
    const [mlConfigOpen, setMLConfigOpen] = useState(false)

    // Обработчик применения фильтров с автосворачиванием
    const handleApplyFilters = useCallback(() => {
      onApplyFilters()
      // Автоматически сворачиваем фильтры после применения
      if (!filtersCollapsed) {
        onToggleCollapsed()
      }
    }, [onApplyFilters, onToggleCollapsed, filtersCollapsed])
    // Загрузка проектов
    const { data: projects = [] } = useQuery({
      queryKey: ['projects-for-filter'],
      queryFn: async () => {
        const { data } = await supabase.from('projects').select('id, name').order('name')
        return data?.map((p) => ({ value: p.id, label: p.name })) || []
      },
    })

    // Загрузка разделов (Тэги проекта) - зависит от выбранного проекта
    const { data: documentationSections = [] } = useQuery({
      queryKey: ['documentation-tags-for-filter', filters.project],
      queryFn: async () => {
        if (!filters.project) return []

        // Получаем тэги через документы, привязанные к проекту
        const { data } = await supabase
          .from('documentations_projects_mapping')
          .select(
            `
          documentations!inner(
            tag_id,
            documentation_tags!inner(id, name, tag_number)
          )
        `,
          )
          .eq('project_id', filters.project)

        // Извлекаем уникальные тэги
        const uniqueTags = new Map()
        data?.forEach((item) => {
          const tag = item.documentations?.documentation_tags
          if (tag) {
            uniqueTags.set(tag.id, tag)
          }
        })

        return Array.from(uniqueTags.values())
          .sort((a, b) => a.tag_number - b.tag_number)
          .map((t) => ({ value: t.id, label: t.name }))
      },
      enabled: !!filters.project,
    })

    // Загрузка шифров проектов (Документация) - зависит от проекта И раздела
    const { data: documentationCodes = [] } = useQuery({
      queryKey: [
        'documentation-for-filter',
        filters.project,
        JSON.stringify(filters.documentationSection),
      ], // ИСПРАВЛЕНИЕ: стабилизируем массив
      queryFn: async () => {
        if (!filters.project || !filters.documentationSection.length) return []

        // Получаем документы через связку проект + раздел
        const { data } = await supabase
          .from('documentations_projects_mapping')
          .select(
            `
          documentations!inner(
            id, code, project_name, tag_id
          )
        `,
          )
          .eq('project_id', filters.project)
          .in('documentations.tag_id', filters.documentationSection)

        return (
          data
            ?.map((item) => item.documentations)
            .filter(Boolean)
            .sort((a, b) => a!.code.localeCompare(b!.code))
            .map((d) => ({ value: d!.id, label: `${d!.code} - ${d!.project_name}` })) || []
        )
      },
      enabled: !!filters.project && filters.documentationSection.length > 0,
    })

    // Загрузка корпусов (зависит от проекта)
    const { data: blocks = [] } = useQuery({
      queryKey: ['blocks-for-filter', filters.project],
      queryFn: async () => {
        if (!filters.project) return []
        const { data } = await supabase
          .from('projects_blocks')
          .select('blocks(id, name)')
          .eq('project_id', filters.project)
        return data?.map((pb) => ({ value: pb.blocks.id, label: pb.blocks.name })) || []
      },
      enabled: !!filters.project,
    })

    // Загрузка категорий затрат
    const { data: costCategories = [] } = useQuery({
      queryKey: ['cost-categories-for-filter'],
      queryFn: async () => {
        const { data } = await supabase
          .from('cost_categories')
          .select('id, number, name')
          .order('number')
        return data?.map((c) => ({ value: c.id.toString(), label: c.name })) || []
      },
    })

    // Загрузка видов затрат (зависит от категорий затрат)
    const { data: costTypes = [] } = useQuery({
      queryKey: ['cost-types-for-filter', JSON.stringify(filters.costCategory)], // ИСПРАВЛЕНИЕ: стабилизируем массив
      queryFn: async () => {
        if (!filters.costCategory.length) return []
        const { data } = await supabase
          .from('detail_cost_categories')
          .select('id, name, cost_category_id')
          .in(
            'cost_category_id',
            filters.costCategory.map((id) => parseInt(id)),
          )
        return data?.map((t) => ({ value: t.id.toString(), label: t.name })) || []
      },
      enabled: filters.costCategory.length > 0,
    })

    const handleCascadingChange = useCallback(
      (key: keyof ChessboardFilters, value: any) => {
        onCascadingFilterChange(key, value)
      },
      [onCascadingFilterChange],
    )

    return (
      <div>
        {/* Постоянный блок фильтров */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Space wrap size="middle">
            {/* Проект */}
            <div style={{ minWidth: 200 }}>
              <Select
                value={filters.project}
                onChange={(value) => handleCascadingChange('project', value)}
                placeholder="Выберите проект"
                allowClear
                showSearch
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={projects}
              />
            </div>

            {/* Раздел (Тэги проекта) */}
            <div style={{ minWidth: 250 }}>
              <Select
                mode="multiple"
                value={filters.documentationSection}
                onChange={(value) => onFilterChange('documentationSection', value)}
                placeholder="Выберите разделы"
                allowClear
                showSearch
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={documentationSections}
              />
            </div>

            {/* Шифр проекта */}
            <div style={{ minWidth: 300 }}>
              <Select
                mode="multiple"
                value={filters.documentationCode}
                onChange={(value) => onFilterChange('documentationCode', value)}
                placeholder="Выберите шифры проектов"
                allowClear
                showSearch
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={documentationCodes}
              />
            </div>

            {/* Кнопки основного управления фильтрами */}
            <Space>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleApplyFilters}
                disabled={!hasActiveFilters}
              >
                Применить
              </Button>

              <Button onClick={onResetFilters} disabled={!hasAppliedFilters}>
                Сбросить
              </Button>

              <Button
                onClick={onToggleCollapsed}
                icon={filtersCollapsed ? <CaretDownFilled /> : <CaretUpFilled />}
              >
                {filtersCollapsed ? 'Развернуть' : 'Свернуть'}
              </Button>
            </Space>
          </Space>

          {/* Кнопки управления таблицей */}
          <ChessboardActionButtons
            tableMode={tableMode}
            hasAppliedProject={hasAppliedProject}
            hasUnsavedChanges={hasUnsavedChanges}
            selectedRowsCount={selectedRowsCount}
            onSetMode={onSetMode}
            onSaveChanges={onSaveChanges}
            onCancelChanges={onCancelChanges}
            onDeleteSelected={onDeleteSelected}
            onAddRow={onAddRow}
          />
        </div>

        {/* Сворачиваемый блок фильтров */}
        {!filtersCollapsed && (
          <div style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
            >
              <Space wrap size="middle">
                {/* Корпус */}
                <div style={{ minWidth: 200 }}>
                  <Select
                    mode="multiple"
                    value={filters.block}
                    onChange={(value) => onFilterChange('block', value)}
                    placeholder="Выберите корпусы"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    disabled={!filters.project}
                    filterOption={(input, option) =>
                      (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={blocks}
                  />
                </div>

                {/* Категория затрат */}
                <div style={{ minWidth: 250 }}>
                  <Select
                    mode="multiple"
                    value={filters.costCategory}
                    onChange={(value) => handleCascadingChange('costCategory', value)}
                    placeholder="Выберите категории"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    filterOption={(input, option) =>
                      (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={costCategories}
                  />
                </div>

                {/* Вид затрат */}
                <div style={{ minWidth: 200 }}>
                  <Select
                    mode="multiple"
                    value={filters.costType}
                    onChange={(value) => onFilterChange('costType', value)}
                    placeholder="Выберите виды"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    disabled={!filters.costCategory.length}
                    filterOption={(input, option) =>
                      (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={costTypes}
                  />
                </div>
              </Space>

              {/* Кнопки управления */}
              <Space>
                {/* Кнопка настроек ML */}
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => setMLConfigOpen(true)}
                  title="ML настройки поиска номенклатуры поставщика"
                >
                  ML
                </Button>

                {/* Кнопка настройки столбцов */}
                <Button icon={<SettingOutlined />} onClick={onOpenColumnSettings}>
                  Настройка столбцов
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Панель настроек ML */}
        <MLConfigPanel
          open={mlConfigOpen}
          onClose={() => setMLConfigOpen(false)}
          onConfigUpdate={(newConfig) => {
            console.log('🤖 ML Config updated:', newConfig) // LOG: обновление конфигурации ML
          }}
        />
      </div>
    )
  },
)

ChessboardFilters.displayName = 'ChessboardFilters'
