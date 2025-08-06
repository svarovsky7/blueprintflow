import { List, Card } from 'antd';

const notifications = [
  { id: 1, text: 'Новая версия сметы загружена' },
  { id: 2, text: 'Срок сдачи шахматки истекает завтра' },
  { id: 3, text: 'Подписан новый договор с подрядчиком' },
];

export default function Dashboard() {
  return (
    <>
      <List
        bordered
        dataSource={notifications}
        renderItem={(item) => <List.Item>{item.text}</List.Item>}
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <Card title="Всего шахматок">0</Card>
        <Card title="Всего ВОР">0</Card>
        <Card title="Общая сумма смет">0 ₽</Card>
      </div>
    </>
  );
}
