import { Modal, Statistic, Row, Col, Alert, Typography, List, Tag } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { ImportResults } from '@/entities/documentation/types'

const { Text } = Typography

interface ImportResultsModalProps {
  open: boolean
  onClose: () => void
  results: ImportResults | null
}

export default function ImportResultsModal({ open, onClose, results }: ImportResultsModalProps) {
  if (!results) return null

  const hasErrors = results.errorCount > 0
  const hasSkipped = results.skippedRows > 0
  const isSuccess = results.importedRows > 0 && !hasErrors

  return (
    <Modal
      title="Результаты импорта"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
    >
      <div style={{ marginBottom: 24 }}>
        <Alert
          message={
            isSuccess && !hasSkipped
              ? 'Импорт выполнен успешно'
              : hasErrors
                ? 'Импорт завершен с ошибками'
                : 'Импорт завершен'
          }
          type={isSuccess && !hasSkipped ? 'success' : hasErrors ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Всего строк"
              value={results.totalRows}
              prefix={<InfoCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Обработано"
              value={results.processedRows}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Загружено"
              value={results.importedRows}
              prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Ошибок"
              value={results.errorCount}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Col>
        </Row>

        {hasSkipped && (
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Statistic
                title="Пропущено записей"
                value={results.skippedRows}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              />
            </Col>
          </Row>
        )}
      </div>

      {hasSkipped && results.skipped.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Пропущенные записи:</Text>
          <List
            size="small"
            dataSource={results.skipped.slice(0, 10)} // Показываем только первые 10
            renderItem={(item) => (
              <List.Item>
                <Text type="secondary">Строка {item.index + 1}:</Text>{' '}
                <Text code>{item.row.code}</Text> - {item.reason}
              </List.Item>
            )}
            style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}
          />
          {results.skipped.length > 10 && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              ... и еще {results.skipped.length - 10} записей
            </Text>
          )}
        </div>
      )}

      {hasErrors && results.errors.length > 0 && (
        <div>
          <Text strong>Ошибки импорта:</Text>
          <List
            size="small"
            dataSource={results.errors.slice(0, 10)} // Показываем только первые 10 ошибок
            renderItem={(item) => (
              <List.Item>
                <div>
                  <div>
                    <Text type="secondary">Строка {item.index + 1}:</Text>{' '}
                    <Text code>{item.row.code}</Text>
                    {item.row.project_name && (
                      <>
                        {' - '}
                        <Text>{item.row.project_name}</Text>
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="red">{item.error}</Tag>
                  </div>
                </div>
              </List.Item>
            )}
            style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}
          />
          {results.errors.length > 10 && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              ... и еще {results.errors.length - 10} ошибок
            </Text>
          )}
        </div>
      )}
    </Modal>
  )
}
