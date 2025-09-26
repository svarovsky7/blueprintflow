import { memo } from 'react'
import { Drawer, List, Checkbox, Button, Space, Typography } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface ColumnSettingsDrawerProps {
  visible: boolean
  columns: Array<{
    key: string
    visible: boolean
    isService: boolean
  }>
  onClose: () => void
  onToggleColumn: (columnKey: string) => void
  onMoveColumn: (fromIndex: number, toIndex: number) => void
  onToggleAll: (visible: boolean) => void
  onResetToDefault: () => void
}

const COLUMN_LABELS: Record<string, string> = {
  actions: '',
  documentationSection: 'Раздел',
  documentationCode: 'Шифр проекта',
  documentationProjectName: 'Наименование проекта',
  documentationVersion: 'Вер.',
  block: 'Корпус',
  floors: 'Этажи',
  costCategory: 'Категория затрат',
  costType: 'Вид затрат',
  workName: 'Наименование работ',
  workUnit: 'Ед.Изм. Работ',
  location: 'Локализация',
  material: 'Материал',
  materialType: 'Тип материала',
  quantityPd: 'Кол-во по ПД',
  quantitySpec: 'Кол-во по спецификации РД',
  quantityRd: 'Кол-во по пересчету РД',
  nomenclature: 'Номенклатура',
  supplier: 'Наименование номенклатуры поставщика',
  unit: 'Ед.изм.',
  comments: 'Комментарии',
}

export const ColumnSettingsDrawer = memo(
  ({
    visible,
    columns,
    onClose,
    onToggleColumn,
    onMoveColumn,
    onToggleAll,
    onResetToDefault,
  }: ColumnSettingsDrawerProps) => {
    const managedColumns = columns.filter((col) => !col.isService)
    const visibleCount = managedColumns.filter((col) => col.visible).length
    const allVisible = visibleCount === managedColumns.length

    return (
      <Drawer
        title="Настройка столбцов"
        width={350}
        open={visible}
        onClose={onClose}
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={onResetToDefault}>По умолчанию</Button>
            <Button type="primary" onClick={onClose}>
              Готово
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={allVisible}
            indeterminate={visibleCount > 0 && visibleCount < managedColumns.length}
            onChange={(e) => onToggleAll(e.target.checked)}
          >
            Выделить все
          </Checkbox>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            ({visibleCount} из {managedColumns.length})
          </Text>
        </div>

        <List
          size="small"
          dataSource={managedColumns}
          renderItem={(column, index) => {
            const canMoveUp = index > 0
            const canMoveDown = index < managedColumns.length - 1

            return (
              <List.Item
                style={{
                  padding: '8px 0',
                }}
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={!canMoveUp}
                    onClick={() => onMoveColumn(index, index - 1)}
                  />,
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={!canMoveDown}
                    onClick={() => onMoveColumn(index, index + 1)}
                  />,
                ]}
              >
                <Checkbox
                  checked={column.visible}
                  onChange={() => onToggleColumn(column.key)}
                >
                  <span>
                    {COLUMN_LABELS[column.key] || column.key}
                  </span>
                </Checkbox>
              </List.Item>
            )
          }}
        />

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>Подсказка:</strong> Служебные столбцы всегда отображаются и не настраиваются.
            Используйте стрелки для изменения порядка столбцов.
          </Text>
        </div>
      </Drawer>
    )
  },
)
