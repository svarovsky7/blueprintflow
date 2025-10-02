import { Modal, Select, Card, Typography } from 'antd'

interface DocumentationInfo {
  id: string
  code: string
}

interface DocumentVersion {
  id: string
  documentation_id: string
  version_number: number
}

interface VersionsModalProps {
  open: boolean
  onCancel: () => void
  onOk: () => void
  selectedDocumentations: DocumentationInfo[]
  documentVersions: DocumentVersion[]
  selectedVersions: Record<string, string>
  onVersionSelect: (documentationId: string, versionId: string) => void
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
                    label: `Версия ${version.version_number}`,
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
