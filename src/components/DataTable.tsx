import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { supabase } from '../lib/supabase';
import FilePreview from './FilePreview';

interface DataTableProps {
  table: string;
}

export default function DataTable({ table }: DataTableProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from(table)
      .select('*')
      .limit(100)
      .then(({ data }) => setData((data as Record<string, unknown>[]) ?? []));
  }, [table]);

  const columns = Object.keys(data[0] ?? {}).map((key) => ({
    title: key,
    dataIndex: key,
    render: (value: unknown) =>
      typeof value === 'string' && value.startsWith('http') ? (
        <FilePreview url={value} name={value.split('/').pop()!} />
      ) : (
        value as React.ReactNode
      ),
  }));

  return <Table dataSource={data} columns={columns} rowKey={columns[0]?.dataIndex || 'id'} />;
}
