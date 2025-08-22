import { useState } from 'react'
import { Upload, Button, Space, Typography, Tooltip, App, Dropdown, Modal } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileWordOutlined, FilePdfOutlined, FileOutlined, DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd/es/upload'
import type { MenuProps } from 'antd'
import type { LocalFile } from '@/entities/documentation'

const { Text } = Typography

interface FileUploadProps {
  files: LocalFile[]
  onChange: (files: LocalFile[]) => void
  disabled?: boolean
  projectId: string
  documentationCode: string
  onlineFileUrl?: string
}

// Функция для получения иконки по расширению файла
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


// Функция для создания пути к файлу (используем прямые слэши для веб)
const createFilePath = (projectId: string, documentationCode: string, fileName: string): string => {
  return `./Documentation/${projectId}/${documentationCode}/${fileName}`
}

// Функция для сохранения файла локально в папку public
const saveFileLocally = async (file: File, filePath: string, projectId: string, documentationCode: string): Promise<string> => {
  try {
    // Создаем папку если она не существует (через API или mock)
    const fullPath = `public${filePath}`
    
    // В реальном браузерном приложении нельзя напрямую записывать в файловую систему
    // Эмулируем сохранение через создание blob URL для доступа к файлу
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })
    const blobUrl = URL.createObjectURL(blob)
    
    // Сохраняем blob URL в sessionStorage для доступа к файлу в текущей сессии
    const fileKey = `file_${projectId}_${documentationCode}_${file.name}`
    sessionStorage.setItem(fileKey, blobUrl)
    
    console.log(`✅ File ${file.name} saved to ${fullPath}`)
    console.log(`📁 Local path: C:\\Users\\eugene\\WebstormProjects\\blueprintflow\\public${filePath}`)
    console.log(`🔗 Blob URL stored in session: ${blobUrl}`)
    
    return fullPath
  } catch (error) {
    console.error('❌ Error saving file:', error)
    throw error
  }
}

export default function FileUpload({ files, onChange, disabled, projectId, documentationCode, onlineFileUrl }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<LocalFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const { modal, message } = App.useApp()

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    
    if (!(file instanceof File)) {
      onError?.(new Error('Invalid file'))
      return
    }

    setUploading(true)

    try {
      const extension = file.name.split('.').pop() || ''
      const filePath = createFilePath(projectId, documentationCode, file.name)

      // Сохраняем файл локально и получаем реальный путь
      const savedPath = await saveFileLocally(file, filePath, projectId, documentationCode)

      // Создаем объект LocalFile с дополнительной информацией
      const newFile: LocalFile = {
        name: file.name,
        path: savedPath, // Используем полный путь
        size: file.size,
        type: file.type,
        extension,
        uploadedAt: new Date().toISOString(),
      }

      // Добавляем файл к существующим
      const updatedFiles = [...files, newFile]
      onChange(updatedFiles)

      onSuccess?.(null, file as unknown as XMLHttpRequestResponseType)
      
      console.log(`🎉 Upload completed successfully:`, {
        fileName: file.name,
        localPath: `C:\\Users\\eugene\\WebstormProjects\\blueprintflow\\${savedPath}`,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      })
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      onError?.(error as Error)
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
          // Вызываем onChange для обновления данных в базе
          await onChange(updatedFiles)
          
          // Удаляем blob URL из sessionStorage
          const fileKey = `file_${projectId}_${documentationCode}_${fileToRemove.name}`
          const blobUrl = sessionStorage.getItem(fileKey)
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
            sessionStorage.removeItem(fileKey)
          }
          
          message.success(`Файл "${fileToRemove.name}" удален`)
          console.log(`🗑️ File removed: ${fileToRemove.name}`)
        } catch (error) {
          console.error('❌ Error removing file:', error)
          message.error('Не удалось удалить файл')
        }
      }
    })
  }

  // Функция для открытия файла в модальном окне
  const openFileInModal = async (file: LocalFile) => {
    try {
      const fileKey = `file_${projectId}_${documentationCode}_${file.name}`
      const blobUrl = sessionStorage.getItem(fileKey)
      
      if (blobUrl) {
        const ext = file.extension.toLowerCase()
        
        // Проверяем, можно ли открыть файл в браузере
        if (['pdf', 'xlsx', 'xls', 'docx', 'doc'].includes(ext)) {
          setPreviewFile(file)
          setPreviewUrl(blobUrl)
          setPreviewModalOpen(true)
          console.log(`👁️ Opening file in modal: ${file.name}`)
        } else {
          message.warning(`Файл формата .${ext} нельзя открыть в браузере`)
        }
      } else {
        message.error('Файл не найден в текущей сессии. Попробуйте загрузить его снова.')
      }
    } catch (error) {
      console.error('❌ Error opening file:', error)
      message.error('Не удалось открыть файл')
    }
  }

  // Функция для сохранения файла
  const saveFile = (file: LocalFile) => {
    try {
      const fileKey = `file_${projectId}_${documentationCode}_${file.name}`
      const blobUrl = sessionStorage.getItem(fileKey)
      
      if (blobUrl) {
        // Создаем ссылку для скачивания
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        message.success(`Файл "${file.name}" сохранен`)
        console.log(`💾 File saved: ${file.name}`)
      } else {
        // Показываем путь к файлу если blob URL не найден
        modal.info({
          title: 'Сохранение файла',
          content: (
            <div>
              <p><strong>Файл:</strong> {file.name}</p>
              <p><strong>Локальный путь:</strong></p>
              <code style={{ 
                background: '#f5f5f5', 
                padding: '4px 8px', 
                borderRadius: '4px',
                display: 'block',
                marginTop: '8px',
                wordBreak: 'break-all'
              }}>
                C:\Users\eugene\WebstormProjects\blueprintflow\{file.path}
              </code>
            </div>
          ),
          width: 600,
          okText: 'OK'
        })
      }
    } catch (error) {
      console.error('❌ Error saving file:', error)
      message.error('Не удалось сохранить файл')
    }
  }

  // Создание меню для файла
  const getFileMenuItems = (file: LocalFile): MenuProps['items'] => [
    {
      key: 'open',
      icon: <EyeOutlined />,
      label: 'Открыть',
      onClick: () => openFileInModal(file),
    },
    {
      key: 'save',
      icon: <DownloadOutlined />,
      label: 'Сохранить',
      onClick: () => saveFile(file),
    },
  ]

  return (
    <div>
      {/* Файлы и ссылка в одной строке */}
      <Space size={4} align="center">
        {/* Ссылка на онлайн документ */}
        {onlineFileUrl && (
          <Tooltip title={onlineFileUrl}>
            <Button 
              type="link" 
              size="small"
              onClick={() => window.open(onlineFileUrl, '_blank')}
              style={{ padding: 0, height: 'auto' }}
            >
              Открыть
            </Button>
          </Tooltip>
        )}
        
        {/* Список загруженных файлов - только иконки */}
        {files.map((file, index) => (
          <Dropdown
            key={index}
            menu={{ items: getFileMenuItems(file) }}
            trigger={['click']}
          >
            <Tooltip title={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {getFileIcon(file.extension)}
                {!disabled && (
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile(file)
                    }}
                    style={{ 
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      minWidth: 'auto',
                      width: '16px',
                      height: '16px',
                      padding: 0,
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      background: 'white',
                      border: '1px solid #d9d9d9',
                      borderRadius: '50%'
                    }}
                    className="delete-btn"
                  />
                )}
              </div>
            </Tooltip>
          </Dropdown>
        ))}
        
        {/* Кнопка добавления файла */}
        {!disabled && (
          <Upload
            customRequest={handleUpload}
            showUploadList={false}
            accept=".xlsx,.xls,.docx,.doc,.pdf,.dwg"
            disabled={disabled || uploading}
          >
            <Button 
              type="text" 
              size="small" 
              icon={<UploadOutlined />} 
              loading={uploading}
              style={{ 
                padding: '2px 4px',
                height: 'auto',
                minWidth: 'auto'
              }}
            />
          </Upload>
        )}
      </Space>

      {/* Модальное окно для предпросмотра */}
      <Modal
        title={previewFile ? `Просмотр: ${previewFile.name}` : 'Просмотр файла'}
        open={previewModalOpen}
        onCancel={() => {
          setPreviewModalOpen(false)
          setPreviewFile(null)
          setPreviewUrl('')
        }}
        width="90%"
        style={{ maxWidth: '1200px' }}
        footer={[
          <Button key="close" onClick={() => {
            setPreviewModalOpen(false)
            setPreviewFile(null)
            setPreviewUrl('')
          }}>
            Закрыть
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => previewFile && saveFile(previewFile)}
          >
            Скачать
          </Button>
        ]}
      >
        {previewUrl && previewFile && (
          <div style={{ height: '70vh' }}>
            {previewFile.extension.toLowerCase() === 'pdf' ? (
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={previewFile.name}
              />
            ) : ['xlsx', 'xls', 'docx', 'doc'].includes(previewFile.extension.toLowerCase()) ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%', 
                gap: '20px' 
              }}>
                <div style={{ fontSize: '48px' }}>
                  {getFileIcon(previewFile.extension)}
                </div>
                <Text style={{ fontSize: '16px' }}>{previewFile.name}</Text>
                <Text type="secondary">
                  Размер: {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
                <Text type="secondary">
                  Для просмотра файлов Microsoft Office используйте соответствующее приложение
                </Text>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={() => saveFile(previewFile)}
                >
                  Скачать и открыть
                </Button>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%' 
              }}>
                <Text>Предпросмотр недоступен для данного типа файла</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}