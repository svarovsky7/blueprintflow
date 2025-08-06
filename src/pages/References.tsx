import { useState } from 'react';
import { Button, Select } from 'antd';
import DataTable from '../components/DataTable';

const options = [
  { value: 'works', label: 'Работы' },
  { value: 'materials', label: 'Материалы' },
  { value: 'authors', label: 'Авторы' },
  { value: 'cost_categories', label: 'Категории затрат' },
];

export default function References() {
  const [table, setTable] = useState(options[0].value);
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Название справочника:</span>
          <Select options={options} value={table} onChange={setTable} style={{ width: 240 }} />
        </div>
        <div>
          <Button type="primary" style={{ marginRight: 8 }}>
            Добавить
          </Button>
          <Button>Вывести</Button>
        </div>
      </div>
      <DataTable table={table} />
    </>
  );
}
