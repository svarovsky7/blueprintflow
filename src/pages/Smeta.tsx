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
      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 1,
          background: '#333333',
          paddingBottom: 16,
        }}
      >
        <Select options={options} value={table} onChange={setTable} style={{ width: 240 }} />
      </div>
      <DataTable table={table} />
    </>
  );
}
