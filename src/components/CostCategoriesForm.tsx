import { Table, Input, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export interface CostCategoryRow {
  key: string;
  category_id?: string;
  parent_id?: string;
  name?: string;
  level?: string;
  created_at?: string;
  author?: string;
}

interface CostCategoriesFormProps {
  rows: CostCategoryRow[];
  setRows: (rows: CostCategoryRow[]) => void;
}

export default function CostCategoriesForm({ rows, setRows }: CostCategoriesFormProps) {
  const updateRow = (index: number, field: keyof CostCategoryRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addRowAfter = (index: number) => {
    const newRow: CostCategoryRow = { key: `${Date.now()}-${Math.random()}` };
    const newRows = [...rows.slice(0, index + 1), newRow, ...rows.slice(index + 1)];
    setRows(newRows);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'category_id',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Input
          value={rows[index].category_id}
          onChange={(e) => updateRow(index, 'category_id', e.target.value)}
        />
      ),
    },
    {
      title: 'ID родителя',
      dataIndex: 'parent_id',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Input
          value={rows[index].parent_id}
          onChange={(e) => updateRow(index, 'parent_id', e.target.value)}
        />
      ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Input value={rows[index].name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
      ),
    },
    {
      title: 'Уровень',
      dataIndex: 'level',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Input value={rows[index].level} onChange={(e) => updateRow(index, 'level', e.target.value)} />
      ),
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Input
          value={rows[index].created_at}
          onChange={(e) => updateRow(index, 'created_at', e.target.value)}
        />
      ),
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      render: (_: unknown, __: CostCategoryRow, index: number) => rows[index].author,
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_: unknown, __: CostCategoryRow, index: number) => (
        <Button icon={<PlusOutlined />} onClick={() => addRowAfter(index)} />
      ),
    },
  ];

  return <Table dataSource={rows} columns={columns} pagination={false} rowKey="key" />;
}
