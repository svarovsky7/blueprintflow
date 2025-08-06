import { useState } from 'react';
import { Button, Space, Table, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface RowData {
  key: number;
  department: string;
  description: string;
}

export default function Departments() {
  const [rows, setRows] = useState<RowData[]>([]);

  const handleAdd = () => {
    setRows([{ key: Date.now(), department: '', description: '' }]);
  };

  const addRowAfter = (index: number) => {
    const newRow: RowData = { key: Date.now() + index, department: '', description: '' };
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newRow);
      return copy;
    });
  };

  const handleChange = (index: number, field: keyof Omit<RowData, 'key'>, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    const { data: last, error: fetchError } = await supabase
      .from('departments')
      .select('department_id')
      .order('department_id', { ascending: false })
      .limit(1);

    if (fetchError) {
      message.error('Ошибка сохранения');
      return;
    }

    const startId = last?.[0]?.department_id ? last[0].department_id + 1 : 1;

    const payload = rows.map((r, idx) => ({
      department_id: startId + idx,
      department: r.department,
      description: r.description,
      user_id: 1,
    }));
    const { error } = await supabase.from('departments').insert(payload);
    if (error) {
      message.error('Ошибка сохранения');
      return;
    }
    message.success('Сохранено');
    setRows([]);
  };

  const columns: ColumnsType<RowData> = [
    {
      title: 'Название',
      dataIndex: 'department',
      render: (_value, _record, index) => (
        <Input
          value={rows[index].department}
          onChange={(e) => handleChange(index, 'department', e.target.value)}
        />
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      render: (_value, _record, index) => (
        <Input
          value={rows[index].description}
          onChange={(e) => handleChange(index, 'description', e.target.value)}
        />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_value, _record, index) => <Button onClick={() => addRowAfter(index)}>+</Button>,
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Link to="/admin/users">
            <Button>Пользователи</Button>
          </Link>
          <Button>Роли</Button>
          <Link to="/admin/departments">
            <Button type="primary">Подразделения</Button>
          </Link>
          <Button>Привилегии</Button>
          <Button>Настройки</Button>
        </Space>
        <Space>
          {rows.length === 0 ? (
            <Button type="primary" onClick={handleAdd}>
              Добавить
            </Button>
          ) : (
            <Button type="primary" onClick={handleSave}>
              Сохранить
            </Button>
          )}
          <Button>Редактировать</Button>
        </Space>
      </div>
      {rows.length > 0 && (
        <Table<RowData>
          dataSource={rows}
          columns={columns}
          pagination={false}
          rowKey="key"
        />
      )}
    </>
  );
}

