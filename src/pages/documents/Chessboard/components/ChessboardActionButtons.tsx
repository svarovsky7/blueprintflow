import { memo } from 'react'
import { Button, Space, Select, Tooltip } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  AppstoreOutlined,
  CopyOutlined,
  BgColorsOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { statusesApi } from '@/entities/statuses'
import { PAGE_FORMATS, normalizeColorToHex } from '@/shared/constants/statusColors'
import { useScale } from '@/shared/contexts/ScaleContext'
import type { TableMode } from '../types'

interface ChessboardActionButtonsProps {
  tableMode: TableMode
  hasAppliedProject: boolean
  hasUnsavedChanges: boolean
  selectedRowsCount: number
  onSetMode: (mode: TableMode['mode']) => void
  onSaveChanges: () => void
  onCancelChanges: () => void
  onDeleteSelected: () => void
  onAddRow: () => void
  onAddRowAfter?: (rowIndex: number) => void
  onCopyRow?: (rowData: any, rowIndex: number) => void
  onRemoveRow?: (rowId: string) => void
  onOpenSetsModal?: () => void
  currentStatus?: string
  currentSetName?: string
  onStatusChange?: (statusId: string) => void
}

export const ChessboardActionButtons = memo(
  ({
    tableMode,
    hasAppliedProject,
    hasUnsavedChanges,
    selectedRowsCount,
    onSetMode,
    onSaveChanges,
    onCancelChanges,
    onDeleteSelected,
    onAddRow,
    onAddRowAfter,
    onCopyRow,
    onRemoveRow,
    onOpenSetsModal,
    currentStatus,
    currentSetName,
    onStatusChange,
  }: ChessboardActionButtonsProps) => {
    const { mode, selectedRowKeys } = tableMode
    const { scale } = useScale()

    // Загрузка статусов для Шахматки
    const { data: chessboardStatuses = [] } = useQuery({
      queryKey: ['chessboard-statuses'],
      queryFn: async () => {
        const allStatuses = await statusesApi.getAllStatuses()
        return allStatuses.filter(status =>
          status.is_active &&
          status.applicable_pages?.includes(PAGE_FORMATS.CHESSBOARD)
        )
      },
    })

    // Создаем компонент для отображения цветовой пиктограммы
    const StatusIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: normalizeColorToHex(color),
          border: '1px solid #d9d9d9',
        }}
      />
    )

    // Находим текущий статус для отображения только пиктограммы
    const currentStatusData = chessboardStatuses.find(s => s.id === currentStatus)

    // В режиме добавления показываем только кнопки сохранения
    if (mode === 'add') {
      return (
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSaveChanges}
            disabled={!hasUnsavedChanges}
          >
            Сохранить
          </Button>

          <Button icon={<CloseOutlined />} onClick={onCancelChanges}>
            Отмена
          </Button>
        </Space>
      )
    }

    // В режиме редактирования показываем кнопки сохранения
    if (mode === 'edit') {
      return (
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSaveChanges}
            disabled={!hasUnsavedChanges}
          >
            Сохранить
          </Button>
          <Button icon={<CloseOutlined />} onClick={onCancelChanges}>
            Отмена
          </Button>
        </Space>
      )
    }


    // В режиме удаления показываем кнопки удаления
    if (mode === 'delete') {
      return (
        <Space>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={onDeleteSelected}
            disabled={selectedRowKeys.length === 0}
          >
            Удалить ({selectedRowKeys.length})
          </Button>
          <Button icon={<CloseOutlined />} onClick={() => onSetMode('view')}>
            Отмена
          </Button>
        </Space>
      )
    }

    // В режиме просмотра показываем основные действия
    return (
      <Space>
        {/* Поле статусов с пиктограммами */}
        {hasAppliedProject && (
          <Select
            value={currentStatus}
            onChange={onStatusChange}
            style={{ width: 40 }}
            placeholder=""
            allowClear={false}
            suffixIcon={null}
            popupMatchSelectWidth={200}
            optionLabelProp="label"
            dropdownRender={(menu) => (
              <>
                {currentSetName && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      fontWeight: 500,
                      fontSize: `${13 * scale}px`,
                      color: '#1890ff',
                    }}
                  >
                    Комплект: {currentSetName}
                  </div>
                )}
                {menu}
              </>
            )}
          >
            {chessboardStatuses.map(status => (
              <Select.Option
                key={status.id}
                value={status.id}
                label={<StatusIcon color={status.color || '#d9d9d9'} />}
              >
                <Space>
                  <StatusIcon color={status.color || '#d9d9d9'} />
                  {status.name}
                </Space>
              </Select.Option>
            ))}
          </Select>
        )}

        {hasAppliedProject && onOpenSetsModal && (
          <Button icon={<AppstoreOutlined />} onClick={onOpenSetsModal}>
            Комплект
          </Button>
        )}

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            onSetMode('add')
            onAddRow()
          }}
          disabled={!hasAppliedProject}
        >
          Добавить
        </Button>

        {hasAppliedProject && (
          <Button icon={<DeleteOutlined />} onClick={() => onSetMode('delete')}>
            Удалить
          </Button>
        )}
      </Space>
    )
  },
)
