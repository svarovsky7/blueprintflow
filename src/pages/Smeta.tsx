import { useState } from 'react';
import { Select } from 'antd';
import DataTable from '../components/DataTable';
import TopBar from '../components/TopBar';

const options = [
  { value: 'estimate', label: 'Шахматка' },
  { value: 'estimate_monolith', label: 'Шахматка монолит' },
];

export default function Smeta() {
  const [table, setTable] = useState('estimate');
  return (
    <>
      <TopBar>
        <Select options={options} value={table} onChange={setTable} style={{ width: 240 }} />
      </TopBar>
      <DataTable table={table} />
    </>
  );
}
