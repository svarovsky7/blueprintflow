import { Card, Typography, Upload, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useLogo } from '@/shared/contexts/LogoContext'

const { Title } = Typography

export default function PortalSettings() {
  const { lightLogo, darkLogo, setLightLogo, setDarkLogo } = useLogo()

  const uploadProps = (setter: (logo: string) => void) => ({
    beforeUpload: (file: File) => {
      const reader = new FileReader()
      reader.onload = () => setter(reader.result as string)
      reader.readAsDataURL(file)
      return false
    },
    showUploadList: false,
    accept: 'image/svg+xml'
  })

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>
          Настройка портала
        </Title>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <img src={lightLogo} alt="Логотип светлой темы" style={{ width: 120, marginBottom: 16 }} />
            <Upload {...uploadProps(setLightLogo)}>
              <Button icon={<UploadOutlined />}>Загрузить для светлой темы</Button>
            </Upload>
          </div>
          <div style={{ textAlign: 'center' }}>
            <img src={darkLogo} alt="Логотип тёмной темы" style={{ width: 120, marginBottom: 16 }} />
            <Upload {...uploadProps(setDarkLogo)}>
              <Button icon={<UploadOutlined />}>Загрузить для тёмной темы</Button>
            </Upload>
          </div>
        </div>
      </Card>
    </div>
  )
}
