import { useEffect, useState } from 'react';
import { Button, Select } from 'antd';
import DataTable from '../components/DataTable';
import CostCategoriesForm, {
  CostCategoryRow,
} from '../components/CostCategoriesForm';
import { supabase } from '../supabaseClient';

const options = [
  { value: 'works', label: 'Работы' },
  { value: 'materials', label: 'Материалы' },
  { value: 'authors', label: 'Авторы' },
  { value: 'cost_categories', label: 'Категории затрат' },
];

export default function References() {
  const [table, setTable] = useState(options[0].value);
  const [adding, setAdding] = useState(false);
  const [rows, setRows] = useState<CostCategoryRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user.id);
    });
  }, []);

  const handleAdd = () => {
    if (table !== 'cost_categories') return;
    const newRows: CostCategoryRow[] = Array.from({ length: 10 }, (_, i) => ({
      key: `${Date.now()}-${i}`,
      created_at: new Date().toISOString(),
      author: currentUser,
    }));
    setRows(newRows);
    setAdding(true);
  };

  const handleSave = async () => {
    const payload = rows
      .filter((r) => r.category_id && r.name && r.level)
      .map((r) => ({
        category_id: Number(r.category_id),
        parent_id: r.parent_id ? Number(r.parent_id) : null,
        name: r.name!,
        level: r.level!,
        created_at: r.created_at || new Date().toISOString(),
        author: r.author || currentUser,
      }));
    if (payload.length) {
      await supabase.from('cost_categories').insert(payload);
      setRefreshKey((k) => k + 1);
    }
    setAdding(false);
    setRows([]);
  };

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
          <Select
            options={options}
            value={table}
            onChange={(value) => {
              setTable(value);
              setAdding(false);
            }}
            style={{ width: 240 }}
          />
        </div>
        <div>
          {table === 'cost_categories' && adding ? (
            <Button type="primary" style={{ marginRight: 8 }} onClick={handleSave}>
              Сохранить
            </Button>
          ) : (
            <Button type="primary" style={{ marginRight: 8 }} onClick={handleAdd}>
              Добавить
            </Button>
          )}
          <Button>Вывести</Button>
        </div>
      </div>
      {table === 'cost_categories' && adding ? (
        <CostCategoriesForm rows={rows} setRows={setRows} />
      ) : (
        <DataTable key={refreshKey} table={table} />
      )}
    </>
  );
}
