import { useEffect } from 'react'
import { Button, Card, Form, Input, Switch, Typography, message } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { diskApi, type DiskSettings } from '@/entities/disk'

const { Title } = Typography

export default function Disk() {
  const [form] = Form.useForm<DiskSettings>()

  const { data, isLoading } = useQuery({
    queryKey: ['disk-settings'],
    queryFn: diskApi.getSettings
  })

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data)
    }
  }, [data, form])

  const mutation = useMutation({
    mutationFn: diskApi.upsertSettings,
    onSuccess: () => {
      message.success('Настройки сохранены')
    },
    onError: (err) => {
      console.error('Failed to save settings:', err)
      message.error('Не удалось сохранить настройки')
    }
  })

  const handleFinish = async (values: DiskSettings) => {
    await mutation.mutateAsync(values)
  }

  const fillMutation = useMutation({
    mutationFn: diskApi.fillMappings,
    onSuccess: () => {
      message.success('Таблица заполнена')
    },
    onError: (err) => {
      console.error('Failed to fill mappings:', err)
      message.error('Не удалось заполнить таблицу')
    }
  })

  const handleFill = async () => {
    await fillMutation.mutateAsync()
  }

  return (
    <div style={{ padding: 24 }}>
      <Card loading={isLoading}>
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Диск
          </Title>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
        >
          <Form.Item
            label="OAuth токен"
            name="token"
            rules={[{ required: true, message: 'Введите токен' }]}
          >
            <Input.Password placeholder="Введите токен" />
          </Form.Item>
          <Form.Item
            label="Базовый путь"
            name="base_path"
            rules={[{ required: true, message: 'Введите путь' }]}
          >
            <Input placeholder="Например, disk:/blueprintflow" />
          </Form.Item>
          <Form.Item label="Публиковать автоматически" name="make_public" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} style={{ marginRight: 8 }}>
              Сохранить
            </Button>
            <Button onClick={handleFill} loading={fillMutation.isPending}>
              Заполнить соответствия
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
