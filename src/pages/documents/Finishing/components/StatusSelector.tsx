import React from 'react'
import { Dropdown, Badge, Button, Space } from 'antd'
import type { MenuProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { statusesApi } from '@/entities/statuses'

interface StatusSelectorProps {
  statusId: string | null
  onChange: (statusId: string) => void
  pageKey?: string
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  statusId,
  onChange,
  pageKey = 'documents/finishing',
}) => {
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', pageKey],
    queryFn: () => statusesApi.getStatuses(pageKey),
  })

  const currentStatus = statuses.find((s) => s.id === statusId)

  const items: MenuProps['items'] = statuses.map((status) => ({
    key: status.id,
    label: (
      <Space size={4}>
        <Badge color={status.color || '#d9d9d9'} />
        <span>{status.name}</span>
      </Space>
    ),
    onClick: () => onChange(status.id),
  }))

  if (!currentStatus) {
    return <span style={{ color: '#999' }}>—</span>
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="text" size="small">
        <Space size={4}>
          <Badge color={currentStatus.color || '#d9d9d9'} />
          <span>{currentStatus.name}</span>
        </Space>
      </Button>
    </Dropdown>
  )
}
