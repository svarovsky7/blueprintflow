import { useState } from 'react';
import { Select } from 'antd';
import DataTable from '../components/DataTable';

const options = [
  { value: 'estimate', label: 'Шахматка' },
  { value: 'estimate_monolith', label: 'Шахматка монолит' },
];

export default function Smeta() {
  const [table, setTable] = useState('estimate');
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
