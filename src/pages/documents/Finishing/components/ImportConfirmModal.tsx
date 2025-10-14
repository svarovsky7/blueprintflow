import { Modal, Descriptions, Statistic, Row, Col, Alert, Input } from 'antd'
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'

interface ImportConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
  documentInfo: {
    name: string
    projectName: string
    blockName?: string
    costCategoryName?: string
    documentationCode?: string
  }
  statistics: {
    totalRows: number
    activeTypes: number
    rowsToImport: number
    excludedRows: number
    estimatedFloorMappings: number
  }
  setName: string
  onSetNameChange: (value: string) => void
}

export function ImportConfirmModal({
  open,
  onCancel,
  onConfirm,
  loading,
  documentInfo,
  statistics,
  setName,
  onSetNameChange,
}: ImportConfirmModalProps) {
  return (
    <Modal
      title="Импорт в Шахматку"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Импортировать"
      cancelText="Отмена"
      confirmLoading={loading}
      width={700}
      okButtonProps={{ danger: false, type: 'primary' }}
    >
      <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Название документа">{documentInfo.name}</Descriptions.Item>
        <Descriptions.Item label="Проект">{documentInfo.projectName}</Descriptions.Item>
        {documentInfo.blockName && (
          <Descriptions.Item label="Корпус">{documentInfo.blockName}</Descriptions.Item>
        )}
        {documentInfo.costCategoryName && (
          <Descriptions.Item label="Категория затрат">
            {documentInfo.costCategoryName}
          </Descriptions.Item>
        )}
        {documentInfo.documentationCode && (
          <Descriptions.Item label="Шифр документа">
            {documentInfo.documentationCode}
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Будет создан комплект:</div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 400 }}>
            Название комплекта:
          </label>
          <Input
            value={setName}
            onChange={(e) => onSetNameChange(e.target.value)}
            placeholder="Введите название комплекта"
            disabled={loading}
          />
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          Номер комплекта: auto-generated
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Анализ данных:</div>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Всего строк в документе"
              value={statistics.totalRows}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Активных типов в расчете"
              value={statistics.activeTypes}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Statistic
              title="Строк для импорта"
              value={statistics.rowsToImport}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          {statistics.excludedRows > 0 && (
            <Col span={12}>
              <Statistic
                title="Исключено строк"
                value={statistics.excludedRows}
                prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          )}
        </Row>
      </div>

      {statistics.excludedRows > 0 && (
        <Alert
          message="Часть строк будет исключена"
          description="Некоторые строки не будут импортированы, т.к. их типы отсутствуют в документе 'Расчет по типам'"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Будет создано в Шахматке:</div>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="Новый комплект" value={1} />
          </Col>
          <Col span={8}>
            <Statistic title="Записей в Шахматке" value={statistics.rowsToImport} />
          </Col>
          <Col span={8}>
            <Statistic
              title="Записей по этажам"
              value={`~${statistics.estimatedFloorMappings}`}
            />
          </Col>
        </Row>
      </div>
    </Modal>
  )
}
