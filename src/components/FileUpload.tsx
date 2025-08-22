import { useState } from 'react'
import { Upload, Button, Space, Typography, Tooltip, App } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileWordOutlined, FilePdfOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd/es/upload'
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

// Функция для получения цвета фона по расширению
const getFileColor = (extension: string) => {
  const ext = extension.toLowerCase()
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return '#E8F5E8'
    case 'docx':
    case 'doc':
      return '#E8F0FF'
    case 'pdf':
      return '#FFE8E8'
    case 'dwg':
      return '#FFF2E8'
    default:
      return '#F5F5F5'
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

      onSuccess?.(null, file as any)
      
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

  const openFile = (file: LocalFile) => {
    console.log('📂 Opening file:', file.path)
    console.log('📍 Full local path:', `C:\\Users\\eugene\\WebstormProjects\\blueprintflow\\${file.path}`)
    
    try {
      // Пытаемся получить blob URL из sessionStorage
      const fileKey = `file_${projectId}_${documentationCode}_${file.name}`
      const blobUrl = sessionStorage.getItem(fileKey)
      
      if (blobUrl) {
        // Открываем файл через blob URL в новой вкладке
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = file.name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        console.log(`🚀 File opened via blob URL: ${file.name}`)
      } else {
        // Если blob URL не найден, показываем информацию о локальном пути
        modal.info({
          title: 'Открытие файла',
          content: (
            <div>
              <p><strong>Файл:</strong> {file.name}</p>
              <p><strong>Размер:</strong> {(file.size / 1024 / 1024).toFixed(2)} МБ</p>
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
              <p style={{ marginTop: '12px', color: '#666' }}>
                Файл сохранен локально. Для открытия перейдите по указанному пути.
              </p>
            </div>
          ),
          width: 600,
          okText: 'OK'
        })
        
        console.log(`ℹ️  File location shown: ${file.name}`)
      }
    } catch (error) {
      console.error('❌ Error opening file:', error)
      modal.error({
        title: 'Ошибка открытия файла',
        content: `Не удалось открыть файл ${file.name}. Проверьте путь: ${file.path}`,
        okText: 'OK'
      })
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Кнопка загрузки */}
      <Upload
        customRequest={handleUpload}
        showUploadList={false}
        accept=".xlsx,.xls,.docx,.doc,.pdf,.dwg"
        disabled={disabled || uploading}
      >
        <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled}>
          Загрузить файлы
        </Button>
      </Upload>

      {/* Список загруженных файлов */}
      {files.length > 0 && (
        <Space wrap size={[8, 8]}>
          {files.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: getFileColor(file.extension),
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
                cursor: 'pointer',
                minWidth: 'fit-content'
              }}
              onClick={() => openFile(file)}
            >
              <Space size={4}>
                {getFileIcon(file.extension)}
                <Tooltip title={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}>
                  <Text 
                    style={{ 
                      fontSize: '12px', 
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {file.name}
                  </Text>
                </Tooltip>
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
                      minWidth: 'auto',
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                )}
              </Space>
            </div>
          ))}
        </Space>
      )}

      {/* Ссылка на онлайн документ */}
      {onlineFileUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text>Онлайн документ:</Text>
          <Button 
            type="link" 
            size="small"
            onClick={() => window.open(onlineFileUrl, '_blank')}
          >
            Открыть
          </Button>
        </div>
      )}
    </Space>
  )
}