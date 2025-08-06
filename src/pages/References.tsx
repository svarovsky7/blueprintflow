import { useState } from 'react';
import { Select } from 'antd';
import DataTable from '../components/DataTable';

const options = [
  { value: 'works', label: 'Работы' },
  { value: 'materials', label: 'Материалы' },
  { value: 'authors', label: 'Авторы' },
];

export default function References() {
  const [table, setTable] = useState(options[0].value);
  return (
    <>
      <Select
        options={options}
        value={table}
        onChange={setTable}
        style={{ width: 240, marginBottom: 16 }}
      />
      <DataTable table={table} />
    </>
  );
}
