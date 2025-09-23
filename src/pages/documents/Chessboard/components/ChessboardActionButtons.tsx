import { memo } from 'react'
import { Button, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
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
}

export const ChessboardActionButtons = memo(({
  tableMode,
  hasAppliedProject,
  hasUnsavedChanges,
  selectedRowsCount,
  onSetMode,
  onSaveChanges,
  onCancelChanges,
  onDeleteSelected,
  onAddRow,
}: ChessboardActionButtonsProps) => {
  const { mode, selectedRowKeys } = tableMode

  // В режиме добавления или редактирования показываем кнопки сохранения
  if (mode === 'add' || mode === 'edit') {
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
        <Button
          icon={<CloseOutlined />}
          onClick={onCancelChanges}
        >
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
        <Button
          icon={<CloseOutlined />}
          onClick={() => onSetMode('view')}
        >
          Отмена
        </Button>
      </Space>
    )
  }

  // В режиме просмотра показываем основные действия
  return (
    <Space>
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
        <Button
          icon={<DeleteOutlined />}
          onClick={() => onSetMode('delete')}
        >
          Удалить
        </Button>
      )}
    </Space>
  )
})