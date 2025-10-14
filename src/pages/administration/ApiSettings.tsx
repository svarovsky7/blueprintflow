// СТРАНИЦА НАСТРОЕК API
// Объединяет настройки Яндекс Диска и Deepseek AI в одном интерфейсе
// Использует вкладки для разделения разных типов API

import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Statistic,
  Switch,
  Tabs,
  Typography,
  message,
  Alert,
  Space,
  Spin,
  Badge,
  Divider,
} from 'antd'
import {
  CloudOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  yandexDiskApi,
  deepseekApi,
  type YandexDiskSettings,
  type DeepseekSettings,
  type DeepseekUsageStats,
} from '@/entities/api-settings'
import { parseNumberWithSeparators } from '@/shared/lib'

const { Title, Text } = Typography

/**
 * ===============================
 * КОМПОНЕНТ НАСТРОЕК ЯНДЕКС ДИСКА
 * ===============================
 */
const YandexDiskTab = () => {
  const [form] = Form.useForm<YandexDiskSettings>()
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [diskInfo, setDiskInfo] = useState<any>(null)

  // Загрузка настроек
  const { data: settings, isLoading } = useQuery({
    queryKey: ['yandex-disk-settings'],
    queryFn: yandexDiskApi.getSettings,
  })

  // Сохранение настроек
  const saveMutation = useMutation({
    mutationFn: yandexDiskApi.upsertSettings,
    onSuccess: () => {
      message.success('Настройки Яндекс Диска сохранены')
    },
    onError: (err) => {
      console.error('Failed to save Yandex Disk settings:', err)
      message.error('Не удалось сохранить настройки')
    },
  })

  // Заполнение формы при загрузке данных
  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings)
      // Автоматически проверяем подключение если есть токен
      if (settings.token) {
        testConnection(settings.token)
      }
    }
  }, [settings, form])

  // Тестирование подключения к Яндекс Диску
  const testConnection = async (token?: string) => {
    const tokenToTest = token || form.getFieldValue('token')
    if (!tokenToTest) {
      message.warning('Введите OAuth токен для проверки подключения')
      return
    }

    setConnectionStatus('testing')
    try {
      const isConnected = await yandexDiskApi.testConnection(tokenToTest)
      if (isConnected) {
        setConnectionStatus('success')
        message.success('Подключение к Яндекс Диску успешно')

        // Загружаем информацию о диске
        const info = await yandexDiskApi.getDiskInfo(tokenToTest)
        setDiskInfo(info)
      } else {
        setConnectionStatus('error')
        message.error('Не удалось подключиться к Яндекс Диску. Проверьте токен.')
      }
    } catch (error) {
      setConnectionStatus('error')
      message.error('Ошибка при проверке подключения')
    }
  }

  const handleSave = async (values: YandexDiskSettings) => {
    await saveMutation.mutateAsync(values)
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Настройки Яндекс Диска
          </Title>
          <Badge
            status={
              connectionStatus === 'success'
                ? 'success'
                : connectionStatus === 'error'
                  ? 'error'
                  : 'default'
            }
            text={
              connectionStatus === 'success'
                ? 'Подключен'
                : connectionStatus === 'error'
                  ? 'Ошибка'
                  : connectionStatus === 'testing'
                    ? 'Проверка...'
                    : 'Не проверен'
            }
          />
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => testConnection()}
          loading={connectionStatus === 'testing'}
        >
          Проверить подключение
        </Button>
      </div>

      <Alert
        message="Информация"
        description="OAuth токен можно получить в Яндекс.OAuth. Базовый путь определяет папку для загрузки файлов на диске."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={16}>
          <Card loading={isLoading}>
            <Form form={form} layout="vertical" onFinish={handleSave} autoComplete="off">
              <Form.Item
                label="OAuth токен"
                name="token"
                rules={[{ required: true, message: 'Введите токен' }]}
              >
                <Input.Password placeholder="Введите OAuth токен от Яндекс.OAuth" />
              </Form.Item>

              <Form.Item
                label="Базовый путь"
                name="base_path"
                rules={[{ required: true, message: 'Введите путь' }]}
              >
                <Input placeholder="Например: disk:/blueprintflow" />
              </Form.Item>

              <Form.Item
                label="Публиковать автоматически"
                name="make_public"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saveMutation.isPending}
                  style={{ marginRight: 8 }}
                >
                  Сохранить
                </Button>
                <Button onClick={() => testConnection()} loading={connectionStatus === 'testing'}>
                  Проверить подключение
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {diskInfo && (
            <Card title="Информация о диске" size="small">
              <Statistic
                title="Всего места"
                value={diskInfo.total_space}
                formatter={(value) => `${(Number(value) / 1024 / 1024 / 1024).toFixed(1)} ГБ`}
              />
              <Statistic
                title="Использовано"
                value={diskInfo.used_space}
                formatter={(value) => `${(Number(value) / 1024 / 1024 / 1024).toFixed(1)} ГБ`}
                style={{ marginTop: 16 }}
              />
              <Statistic
                title="Свободно"
                value={diskInfo.free_space}
                formatter={(value) => `${(Number(value) / 1024 / 1024 / 1024).toFixed(1)} ГБ`}
                style={{ marginTop: 16 }}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}

/**
 * ===============================
 * КОМПОНЕНТ НАСТРОЕК DEEPSEEK
 * ===============================
 */
const DeepseekTab = () => {
  const [form] = Form.useForm<DeepseekSettings>()
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [connectionInfo, setConnectionInfo] = useState<any>(null)
  const queryClient = useQueryClient()

  // Загрузка настроек Deepseek
  const { data: settings, isLoading } = useQuery({
    queryKey: ['deepseek-settings'],
    queryFn: deepseekApi.getSettings,
  })

  // Загрузка статистики использования
  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['deepseek-usage-stats'],
    queryFn: deepseekApi.getUsageStats,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })

  // Сохранение настроек
  const saveMutation = useMutation({
    mutationFn: deepseekApi.upsertSettings,
    onSuccess: () => {
      message.success('Настройки Deepseek сохранены')
      queryClient.invalidateQueries({ queryKey: ['deepseek-settings'] })
    },
    onError: (err) => {
      console.error('Failed to save Deepseek settings:', err)
      message.error('Не удалось сохранить настройки')
    },
  })

  // Сброс статистики
  const resetStatsMutation = useMutation({
    mutationFn: deepseekApi.resetUsageStats,
    onSuccess: () => {
      message.success('Статистика сброшена')
      queryClient.invalidateQueries({ queryKey: ['deepseek-usage-stats'] })
    },
    onError: (err) => {
      console.error('Failed to reset stats:', err)
      message.error('Не удалось сбросить статистику')
    },
  })

  // Заполнение формы при загрузке данных
  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings)
      // Автоматически проверяем подключение если есть API ключ и Deepseek включен
      if (settings.api_key && settings.enabled) {
        testConnection(settings.api_key, settings.base_url)
      }
    }
  }, [settings, form])

  // Тестирование подключения к Deepseek API
  const testConnection = async (apiKey?: string, baseUrl?: string) => {
    const keyToTest = apiKey || form.getFieldValue('api_key')
    const urlToTest = baseUrl || form.getFieldValue('base_url')

    if (!keyToTest) {
      message.warning('Введите API ключ для проверки подключения')
      return
    }

    setConnectionStatus('testing')
    try {
      const result = await deepseekApi.testConnection(keyToTest, urlToTest)
      if (result.success) {
        setConnectionStatus('success')
        setConnectionInfo(result)
        message.success(`Подключение успешно (${result.latency_ms}мс)`)
      } else {
        setConnectionStatus('error')
        setConnectionInfo(result)
        message.error(`Ошибка подключения: ${result.error}`)
      }
    } catch (error) {
      setConnectionStatus('error')
      message.error('Ошибка при проверке подключения')
    }
  }

  const handleSave = async (values: DeepseekSettings) => {
    await saveMutation.mutateAsync(values)
  }

  const handleResetStats = () => {
    resetStatsMutation.mutate()
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ fontSize: 20, color: '#722ed1' }} />
          <Title level={4} style={{ margin: 0 }}>
            Настройки Deepseek AI
          </Title>
          <Badge
            status={
              settings?.enabled
                ? connectionStatus === 'success'
                  ? 'success'
                  : connectionStatus === 'error'
                    ? 'error'
                    : 'processing'
                : 'default'
            }
            text={
              !settings?.enabled
                ? 'Отключен'
                : connectionStatus === 'success'
                  ? 'Подключен'
                  : connectionStatus === 'error'
                    ? 'Ошибка'
                    : connectionStatus === 'testing'
                      ? 'Проверка...'
                      : 'Не проверен'
            }
          />
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => testConnection()}
            loading={connectionStatus === 'testing'}
          >
            Проверить подключение
          </Button>
        </Space>
      </div>

      <Alert
        message="Информация о Deepseek AI"
        description={
          <div>
            <p>
              API ключ можно получить на{' '}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.deepseek.com
              </a>
            </p>
            <p>
              <strong>Важно:</strong> Deepseek API совместим с OpenAI форматом. Включение AI режима
              заменяет локальный ML алгоритм.
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={16}>
          <Card loading={isLoading}>
            <Form form={form} layout="vertical" onFinish={handleSave} autoComplete="off">
              <Form.Item
                label="API ключ"
                name="api_key"
                rules={[
                  { required: true, message: 'Введите API ключ' },
                  { min: 20, message: 'API ключ слишком короткий' },
                ]}
              >
                <Input.Password placeholder="sk-..." />
              </Form.Item>

              <Form.Item
                label="Базовый URL"
                name="base_url"
                rules={[{ required: true, message: 'Введите базовый URL' }]}
              >
                <Input placeholder="https://api.deepseek.com" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Модель"
                    name="model"
                    rules={[{ required: true, message: 'Выберите модель' }]}
                  >
                    <Select placeholder="Выберите модель">
                      <Select.Option value="deepseek-chat">deepseek-chat</Select.Option>
                      <Select.Option value="deepseek-reasoner">deepseek-reasoner</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Включить Deepseek" name="enabled" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Температура"
                    name="temperature"
                    tooltip="Креативность AI: 0.0 (точно) - 1.0 (креативно)"
                  >
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.1}
                      style={{ width: '100%' }}
                      placeholder="0.7"
                      parser={parseNumberWithSeparators}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Максимум токенов"
                    name="max_tokens"
                    tooltip="Максимальное количество токенов в ответе"
                  >
                    <InputNumber
                      min={100}
                      max={4000}
                      style={{ width: '100%' }}
                      placeholder="1000"
                      parser={parseNumberWithSeparators}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Системный промпт (опционально)"
                name="system_prompt"
                tooltip="Кастомный промпт для анализа материалов. Если не заполнен, используется стандартный промпт."
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Оставьте пустым для использования стандартного промпта..."
                  showCount
                  maxLength={2000}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                    Сохранить
                  </Button>
                  <Button onClick={() => testConnection()} loading={connectionStatus === 'testing'}>
                    Проверить подключение
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="Статистика использования"
            size="small"
            loading={statsLoading}
            extra={
              <Button
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleResetStats}
                loading={resetStatsMutation.isPending}
              >
                Сбросить
              </Button>
            }
          >
            {usageStats ? (
              <div>
                <Statistic
                  title="Всего запросов"
                  value={usageStats.requests_count}
                  suffix={`(${usageStats.successful_requests} успешных)`}
                />
                <Divider />
                <Statistic
                  title="Токены"
                  value={usageStats.tokens_input + usageStats.tokens_output}
                  suffix={`(${usageStats.tokens_input}⬇ + ${usageStats.tokens_output}⬆)`}
                  style={{ marginTop: 16 }}
                />
                <Divider />
                <Statistic
                  title="Стоимость"
                  value={usageStats.total_cost}
                  precision={4}
                  prefix="$"
                  style={{ marginTop: 16 }}
                />
                {usageStats.last_request_at && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      Последний запрос: {new Date(usageStats.last_request_at).toLocaleString()}
                    </Text>
                  </div>
                )}
              </div>
            ) : (
              <Text type="secondary">Статистика отсутствует</Text>
            )}
          </Card>

          {connectionInfo && (
            <Card title="Информация о подключении" size="small" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {connectionStatus === 'success' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text strong>
                  {connectionStatus === 'success' ? 'Подключение активно' : 'Ошибка подключения'}
                </Text>
              </div>
              <Text type="secondary">Задержка: {connectionInfo.latency_ms}мс</Text>
              {connectionInfo.error && (
                <div style={{ marginTop: 8 }}>
                  <Text type="danger">{connectionInfo.error}</Text>
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}

/**
 * ===============================
 * ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ
 * ===============================
 */
export default function ApiSettings() {
  const [activeTab, setActiveTab] = useState('yandex-disk')

  const tabItems = [
    {
      key: 'yandex-disk',
      label: (
        <span>
          <CloudOutlined />
          Яндекс Диск
        </span>
      ),
      children: <YandexDiskTab />,
    },
    {
      key: 'deepseek',
      label: (
        <span>
          <RobotOutlined />
          Deepseek AI
        </span>
      ),
      children: <DeepseekTab />,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Настройки API
        </Title>
        <Text type="secondary">Управление интеграциями с внешними сервисами</Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
    </div>
  )
}
