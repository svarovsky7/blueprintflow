import { Card, Button, Space } from 'antd'
import { ExperimentOutlined, TableOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

export default function Experiments() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ExperimentOutlined />
        Эксперименты
      </h1>

      <p style={{ marginBottom: '24px', color: '#666' }}>
        Раздел для тестирования новых функций и ML-алгоритмов без влияния на основной функционал портала.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <Card
          title="ML Шахматка"
          extra={<TableOutlined />}
          hoverable
          actions={[
            <Button
              type="primary"
              onClick={() => navigate('/experiments/chessboard-ml')}
              key="open"
            >
              Открыть
            </Button>
          ]}
        >
          <p>Тестовая версия Шахматки с интегрированным ML-модулем для автоматического подбора номенклатуры по названию материала.</p>
          <Space direction="vertical" size="small">
            <div><strong>Функции:</strong></div>
            <div>• ML-powered автокомплит номенклатуры</div>
            <div>• Семантический поиск материалов</div>
            <div>• Confidence score для предложений</div>
            <div>• Fallback на классический поиск</div>
          </Space>
        </Card>

        <Card
          title="Будущие эксперименты"
          extra={<ExperimentOutlined />}
          style={{ opacity: 0.6 }}
        >
          <p>Здесь будут добавляться новые экспериментальные функции по мере их разработки.</p>
        </Card>
      </div>
    </div>
  )
}