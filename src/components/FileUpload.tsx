import { useState } from 'react'
import { Upload, Button, Space, Typography, Tooltip, Dropdown, Modal, App } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileWordOutlined, FilePdfOutlined, FileOutlined, DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd/es/upload'
import type { MenuProps } from 'antd'
import type { LocalFile } from '@/entities/documentation'
import { diskApi } from '@/entities/disk'
import { transliterate } from '@/lib/transliterate'

const { Text } = Typography

interface FileUploadProps {
  files: LocalFile[]
  onChange: (files: LocalFile[]) => void
  disabled?: boolean

  projectName: string

  sectionName: string
  documentationCode: string
  onlineFileUrl?: string
}

const getFileIcon = (extension: string) => {
  const ext = extension.toLowerCase()
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return <FileExcelOutlined style={{ color: '#1D6F42', fontSize: 16 }} />
    case 'docx':
    case 'doc':
      return <FileWordOutlined style={{ color: '#2B579A', fontSize: 16 }} />
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#FF6B6B', fontSize: 16 }} />
    case 'dwg':
      return <FileOutlined style={{ color: '#FF9500', fontSize: 16 }} />
    default:
      return <FileOutlined style={{ color: '#666', fontSize: 16 }} />
  }
}


const ensureFolderPath = async (folderPath: string, token: string): Promise<void> => {
  const segments = folderPath.split('/').filter(Boolean)
  if (segments.length === 0) return
  let current = segments[0]
  for (let i = 1; i < segments.length; i++) {
    current = `${current}/${segments[i]}`
    const res = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(current)}`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${token}` }
      }
    )
    if (!res.ok && res.status !== 409) {
      const errorText = await res.text()
      throw new Error(`Failed to create folder ${current}: ${res.status} ${errorText}`)
    }
  }
}

const uploadToYandexDisk = async (
  file: File,
  projectName: string,

  sectionName: string,
  documentationCode: string
): Promise<{ url: string; path: string }> => {
  const settings = await diskApi.getSettings()
  if (!settings) throw new Error('Disk settings not configured')


  let basePath = settings.base_path
  const pathMatch = basePath.match(/path=([^&]+)/)
  if (pathMatch) {
    basePath = decodeURIComponent(pathMatch[1])
  }
  if (basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1)
  }

  const folderPath = `${basePath}/${transliterate(projectName)}/${transliterate(sectionName)}/${transliterate(documentationCode)}`
  const filePath = `${folderPath}/${file.name}`

  await ensureFolderPath(folderPath, settings.token)

  const res = await fetch(
    `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true`,
    {
      headers: { Authorization: `OAuth ${settings.token}` },
    }
  )
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to get upload URL: ${res.status} ${errorText}`)
  }
  const { href } = await res.json()

  const uploadRes = await fetch(href, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/octet-stream' },
  })
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text()
    throw new Error(`Failed to upload file: ${uploadRes.status} ${errorText}`)
  }

  let publicUrl = ''
  if (settings.make_public) {
    const publishRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${settings.token}` },
      }
    )
    if (!publishRes.ok) {
      const errorText = await publishRes.text()
      throw new Error(`Failed to publish file: ${publishRes.status} ${errorText}`)
    }
    const infoRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(filePath)}&fields=public_url`,
      {
        headers: { Authorization: `OAuth ${settings.token}` },
      }
    )
    if (!infoRes.ok) {
      const errorText = await infoRes.text()
      throw new Error(`Failed to fetch file info: ${infoRes.status} ${errorText}`)
    }
    const info = await infoRes.json()
    publicUrl = info.public_url
  }


  return { url: publicUrl, path: filePath }
}


export default function FileUpload({ files, onChange, disabled, projectName, sectionName, documentationCode, onlineFileUrl }: FileUploadProps) {

  const [uploading, setUploading] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<LocalFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const { modal, message } = App.useApp()

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!(file instanceof File)) {
      onError?.(new Error('Invalid file'))
      return
    }
    setUploading(true)
    try {
      const extension = file.name.split('.').pop() || ''

      const { url, path } = await uploadToYandexDisk(file, projectName, sectionName, documentationCode)

      const newFile: LocalFile = {
        name: file.name,
        path,
        url,
        size: file.size,
        type: file.type,
        extension,
        uploadedAt: new Date().toISOString(),
      }
      const updatedFiles = [...files, newFile]
      onChange(updatedFiles)
      onSuccess?.(null, file as unknown as XMLHttpRequestResponseType)
    } catch (e) {
      console.error('❌ Error uploading file:', e)

      message.error('Не удалось загрузить файл')

      onError?.(e as Error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = (fileToRemove: LocalFile) => {
    modal.confirm({
      title: 'Удалить файл?',
      content: `Вы уверены, что хотите удалить файл "${fileToRemove.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const updatedFiles = files.filter(f => f.path !== fileToRemove.path)
          await onChange(updatedFiles)
          message.success(`Файл "${fileToRemove.name}" удален`)
        } catch (err) {
          console.error('❌ Error removing file:', err)
          message.error('Не удалось удалить файл')
        }
      }
    })
  }

  const openFileInModal = async (file: LocalFile) => {
    try {
      const url = file.url || onlineFileUrl
      if (url) {
        setPreviewFile(file)
        setPreviewUrl(url)
        setPreviewModalOpen(true)
      } else {
        message.error('Ссылка на файл недоступна')
      }
    } catch (err) {
      console.error('❌ Error opening file:', err)
      message.error('Не удалось открыть файл')
    }
  }

  const saveFile = (file: LocalFile) => {
    if (file.url) {
      window.open(file.url, '_blank')
    } else {
      message.error('Ссылка на файл недоступна')
    }
  }

  const getFileMenuItems = (file: LocalFile): MenuProps['items'] => [
    { key: 'open', icon: <EyeOutlined />, label: 'Открыть', onClick: () => openFileInModal(file) },
    { key: 'save', icon: <DownloadOutlined />, label: 'Скачать', onClick: () => saveFile(file) },
    { key: 'delete', icon: <DeleteOutlined />, danger: true, label: 'Удалить', onClick: () => handleRemoveFile(file) }
  ]

  return (
    <div>
      <Space size={4} align="center">
        {files.map(file => (
          <Dropdown key={file.path} menu={{ items: getFileMenuItems(file) }} trigger={['click']}
            overlayStyle={{ minWidth: 100 }}
          >
            <Tooltip title={file.name}>
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                {getFileIcon(file.extension)}
                <Text style={{ marginLeft: 4 }}>{file.name}</Text>
              </div>
            </Tooltip>
          </Dropdown>
        ))}

        {!disabled && (
          <Tooltip title="Загрузка файлов pdf, xls/xlsx, doc/docx, dwg">
            <Upload
              customRequest={handleUpload}
              showUploadList={false}
              accept=".xlsx,.xls,.docx,.doc,.pdf,.dwg"
              disabled={disabled || uploading}
            >
              <Button type="text" size="small" icon={<UploadOutlined />} loading={uploading} />
            </Upload>
          </Tooltip>
        )}
      </Space>

      <Modal
        title={previewFile ? `Просмотр: ${previewFile.name}` : 'Просмотр файла'}
        open={previewModalOpen}
        onCancel={() => {
          setPreviewModalOpen(false)
          setPreviewFile(null)
          setPreviewUrl('')
        }}
        width="90%"
        style={{ maxWidth: 1200 }}
        footer={null}
      >
        {previewUrl && previewFile && (
          <div style={{ height: '70vh' }}>
            {previewFile.extension.toLowerCase() === 'pdf' ? (
              <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={previewFile.name} />
            ) : ['xlsx', 'xls', 'docx', 'doc'].includes(previewFile.extension.toLowerCase()) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                <div style={{ fontSize: 48 }}>{getFileIcon(previewFile.extension)}</div>
                <Text style={{ fontSize: 16 }}>{previewFile.name}</Text>
                <Text type="secondary">Размер: {(previewFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => saveFile(previewFile)}>
                  Скачать
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Text>Предпросмотр недоступен для данного типа файла</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
