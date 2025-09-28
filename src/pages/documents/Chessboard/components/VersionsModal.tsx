import { Modal, Select, Card, Typography } from 'antd'
import type { DocumentVersion, DocumentationForVersions } from '../types'

interface VersionsModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
  selectedDocumentations: DocumentationForVersions[]
  documentVersions: DocumentVersion[]
  selectedVersions: Record<string, string>
  onVersionSelect: (documentationId: string, versionId: string) => void
}

const getStatusColor = (status: DocumentVersion['status']) => {
  switch (status) {
    case 'filled_recalc':
      return '#52c41a'
    case 'filled_spec':
      return '#1890ff'
    case 'vor_created':
      return '#722ed1'
    default:
      return '#faad14'
  }
}

const getStatusText = (status: DocumentVersion['status']) => {
  switch (status) {
    case 'filled_recalc':
      return 'Заполнено (пересчет)'
    case 'filled_spec':
      return 'Заполнено (спец.)'
    case 'vor_created':
      return 'ВОР создан'
    default:
      return 'Не заполнено'
  }
}

export const VersionsModal = ({
  open,
  onCancel,
  onOk,
  selectedDocumentations,
  documentVersions,
  selectedVersions,
  onVersionSelect,
}: VersionsModalProps) => {
  return (
    <Modal
      title="Выбор версий документов"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      width={800}
      okText="Применить версии"
      cancelText="Отмена"
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {selectedDocumentations.map((doc) => {
          const docVersions = documentVersions.filter((v) => v.documentation_id === doc.id)

          return (
            <Card key={doc.id} size="small" style={{ marginBottom: 16 }}>
              <Typography.Title level={5} style={{ marginBottom: 8 }}>
                Шифр: {doc.code}
              </Typography.Title>

              {docVersions.length > 0 ? (
                <Select
                  placeholder="Выберите версию"
                  style={{ width: '100%' }}
                  value={selectedVersions[doc.id]}
                  onChange={(value) => onVersionSelect(doc.id, value)}
                  options={docVersions.map((version) => ({
                    value: version.id,
                    label: (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Версия {version.version_number}</span>
                        <div style={{ display: 'flex', gap: 8, fontSize: '12px', color: '#666' }}>
                          {version.issue_date && (
                            <span>
                              {new Date(version.issue_date).toLocaleDateString('ru')}
                            </span>
                          )}
                          <span style={{ color: getStatusColor(version.status) }}>
                            {getStatusText(version.status)}
                          </span>
                        </div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Typography.Text type="secondary">Версии не найдены</Typography.Text>
              )}
            </Card>
          )
        })}
      </div>
    </Modal>
  )
}