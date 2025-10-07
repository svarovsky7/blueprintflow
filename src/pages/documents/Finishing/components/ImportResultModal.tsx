import { Modal, Result, Descriptions, Alert, Space } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ImportToChessboardResult } from '@/entities/finishing'

interface ImportResultModalProps {
  open: boolean
  onClose: () => void
  result: ImportToChessboardResult | null
}

export function ImportResultModal({ open, onClose, result }: ImportResultModalProps) {
  const navigate = useNavigate()

  if (!result) return null

  const handleOpenSet = () => {
    if (result.set_id) {
      navigate(`/documents/chessboard?set=${result.set_id}`)
      onClose()
    }
  }

  const hasErrors = result.errors && result.errors.length > 0
  const hasWarnings = result.warnings && result.warnings.length > 0

  return (
    <Modal
      title="Результаты импорта"
      open={open}
      onCancel={onClose}
      footer={[
        <button
          key="close"
          onClick={onClose}
          className="ant-btn ant-btn-default"
        >
          Закрыть
        </button>,
        result.success && result.set_id && (
          <button
            key="open"
            onClick={handleOpenSet}
            className="ant-btn ant-btn-primary"
          >
            <FolderOpenOutlined /> Открыть комплект в Шахматке
          </button>
        ),
      ].filter(Boolean)}
      width={700}
    >
      {result.success ? (
        <>
          <Result
            status="success"
            title="Импорт успешно завершен"
            subTitle={`Комплект ${result.set_name || result.set_number} успешно создан`}
            icon={<CheckCircleOutlined />}
          />

          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Комплект" span={2}>
              {result.set_name || result.set_number} (№{result.set_number})
            </Descriptions.Item>
            <Descriptions.Item label="Создано строк">
              {result.created_rows}
            </Descriptions.Item>
            <Descriptions.Item label="Создано записей по этажам">
              {result.created_floor_mappings}
            </Descriptions.Item>
            {result.excluded_rows! > 0 && (
              <Descriptions.Item label="Исключено строк" span={2}>
                {result.excluded_rows}
              </Descriptions.Item>
            )}
          </Descriptions>

          {hasWarnings && (
            <Alert
              message="Предупреждения"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          {hasErrors && (
            <Alert
              message="Частичные ошибки"
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    Некоторые записи не были созданы из-за ошибок:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
        </>
      ) : (
        <>
          <Result
            status="error"
            title="Ошибка импорта"
            subTitle={result.message || 'Не удалось выполнить импорт'}
          />

          {hasErrors && (
            <Alert
              message="Ошибки"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
            />
          )}
        </>
      )}
    </Modal>
  )
}
