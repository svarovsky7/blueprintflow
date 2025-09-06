import { useEffect, useMemo, useState } from 'react'
import { Table } from 'antd'
import { supabase } from '../lib/supabase'
import FilePreview from './FilePreview'

interface DataTableProps {
  table: string
}

export default function DataTable({ table }: DataTableProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from(table)
      .select('*')
      .limit(100)
      .then(({ data }) => setData((data as Record<string, unknown>[]) ?? []))
  }, [table])

  const columns = useMemo(
    () =>
      Object.keys(data[0] ?? {}).map((key) => {
        const values = Array.from(
          new Set(data.map((row) => row[key]).filter((v) => v !== null && v !== undefined)),
        )
        return {
          title: key,
          dataIndex: key,
          sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aValue = a[key]
            const bValue = b[key]
            if (typeof aValue === 'number' && typeof bValue === 'number') {
              return aValue - bValue
            }
            return String(aValue ?? '').localeCompare(String(bValue ?? ''))
          },
          filters: values.map((v) => ({ text: String(v), value: String(v) })),
          onFilter: (value: string | number | boolean | bigint, record: Record<string, unknown>) =>
            String(record[key]) === String(value),
          render: (value: unknown) =>
            typeof value === 'string' && value.startsWith('http') ? (
              <FilePreview url={value} name={value.split('/').pop()!} />
            ) : (
              (value as React.ReactNode)
            ),
        }
      }),
    [data],
  )

  return <Table dataSource={data} columns={columns} rowKey={columns[0]?.dataIndex || 'id'} />
}
