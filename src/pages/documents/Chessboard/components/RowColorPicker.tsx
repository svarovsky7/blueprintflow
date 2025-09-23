import { Button, Dropdown } from 'antd'
import { BgColorsOutlined } from '@ant-design/icons'
import type { RowColor } from '../types'
import { colorMap, ROW_COLORS } from '../utils/constants'

interface RowColorPickerProps {
  value: RowColor
  onChange: (color: RowColor) => void
  disabled?: boolean
}

export const RowColorPicker = ({ value, onChange, disabled }: RowColorPickerProps) => (
  <Dropdown
    trigger={['click']}
    disabled={disabled}
    menu={{
      items: ROW_COLORS.map((color) => ({
        key: color,
        label: (
          <div
            style={{
              width: 16,
              height: 16,
              background: colorMap[color],
              border: color ? undefined : '1px solid #d9d9d9',
            }}
          />
        ),
      })),
      onClick: ({ key }) => onChange(key as RowColor),
    }}
  >
    <Button
      type="text"
      size="small"
      style={{
        padding: '2px 4px',
        width: 20,
        height: 20,
        background: colorMap[value],
        border: value ? '1px solid #d9d9d9' : '1px solid #d9d9d9',
        borderRadius: 2,
      }}
      icon={!value ? <BgColorsOutlined style={{ fontSize: 12 }} /> : undefined}
      disabled={disabled}
    />
  </Dropdown>
)