import React, { useState, useEffect } from 'react'
import { Drawer, Form, Select, Slider, Switch, Button, Space, Divider, Tooltip } from 'antd'
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { getMLConfig, saveMLConfig } from '../api/ml-api'
import type { MLConfig } from '../model/types'

interface MLConfigPanelProps {
  open: boolean
  onClose: () => void
  onConfigChange?: (config: MLConfig) => void
}

export const MLConfigPanel: React.FC<MLConfigPanelProps> = ({
  open,
  onClose,
  onConfigChange
}) => {
  const [form] = Form.useForm()
  const [config, setConfig] = useState<MLConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [formValues, setFormValues] = useState<Partial<MLConfig>>({})
  const queryClient = useQueryClient()

  // Загружаем текущую конфигурацию при открытии
  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  const loadConfig = async () => {
    try {
      const currentConfig = await getMLConfig()
      setConfig(currentConfig)
      setFormValues(currentConfig)
      form.setFieldsValue(currentConfig)
    } catch (error) {
      console.error('Failed to load ML config:', error)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      await saveMLConfig(values)
      setConfig(values)

      // КРИТИЧНО: Инвалидируем все кэши ML для применения новых настроек
      console.log('🤖 ML Config: Invalidating caches for new config:', values) // LOG: инвалидация кэшей ML
      await queryClient.invalidateQueries({ queryKey: ['ml-config'] })
      await queryClient.invalidateQueries({ queryKey: ['ml-nomenclature-predictions'] })

      onConfigChange?.(values)
      onClose()
    } catch (error) {
      console.error('Failed to save ML config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      setLoading(true)
      // Сбрасываем к настройкам по умолчанию
      const defaultConfig: MLConfig = {
        enabled: true,
        confidenceThreshold: 0.3,
        maxSuggestions: 5,
        algorithm: 'balanced',
        keywordBonus: 0.3,
        exactMatchBonus: 0.2,
        prefixBonus: 0.25,
        similarityWeight: 0.6,
        minWordLength: 3,
        ignoredTerms: ['м3', 'м2', 'кг', 'шт', 'п.м.', 'компл.', 'м.п.', 'т']
      }

      await saveMLConfig(defaultConfig)
      setConfig(defaultConfig)
      setFormValues(defaultConfig)
      form.setFieldsValue(defaultConfig)

      // КРИТИЧНО: Инвалидируем кэши при сбросе настроек
      console.log('🤖 ML Config: Resetting to default config and invalidating caches') // LOG: сброс настроек ML
      await queryClient.invalidateQueries({ queryKey: ['ml-config'] })
      await queryClient.invalidateQueries({ queryKey: ['ml-nomenclature-predictions'] })

      onConfigChange?.(defaultConfig)
    } catch (error) {
      console.error('Failed to reset ML config:', error)
    } finally {
      setLoading(false)
    }
  }

  const algorithmDescriptions = {
    strict: 'Высокая точность, меньше ложных совпадений',
    balanced: 'Сбалансированный режим (рекомендуется)',
    fuzzy: 'Мягкий поиск, больше потенциальных совпадений'
  }

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined />
          Настройки ML сопоставления
        </Space>
      }
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            loading={loading}
          >
            Сбросить
          </Button>
          <Space>
            <Button onClick={onClose}>Отмена</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
            >
              Применить
            </Button>
          </Space>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={(_, allValues) => setFormValues(allValues)}
      >
        {/* Основные настройки */}
        <Form.Item name="enabled" valuePropName="checked" label="ML поиск">
          <Switch checkedChildren="Включен" unCheckedChildren="Выключен" />
        </Form.Item>

        <Form.Item
          name="algorithm"
          label={
            <Tooltip title="Влияет на общую точность сопоставления">
              Режим алгоритма
            </Tooltip>
          }
        >
          <Select>
            {Object.entries(algorithmDescriptions).map(([key, desc]) => (
              <Select.Option key={key} value={key}>
                <div>
                  <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {key === 'strict' ? 'Строгий' : key === 'balanced' ? 'Сбалансированный' : 'Мягкий'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{desc}</div>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>Пороги и ограничения</Divider>

        <Form.Item
          name="confidenceThreshold"
          label={
            <Tooltip title="Минимальная уверенность для показа предложения">
              Порог уверенности: {formValues.confidenceThreshold ? Math.round(formValues.confidenceThreshold * 100) : 30}%
            </Tooltip>
          }
        >
          <Slider
            min={0.1}
            max={0.9}
            step={0.05}
            marks={{
              0.1: '10%',
              0.3: '30%',
              0.5: '50%',
              0.7: '70%',
              0.9: '90%'
            }}
          />
        </Form.Item>

        <Form.Item name="maxSuggestions" label="Максимум предложений">
          <Slider
            min={1}
            max={15}
            marks={{
              1: '1',
              5: '5',
              10: '10',
              15: '15'
            }}
          />
        </Form.Item>

        <Form.Item name="minWordLength" label="Мин. длина слова для анализа">
          <Slider
            min={2}
            max={6}
            marks={{
              2: '2',
              3: '3',
              4: '4',
              5: '5',
              6: '6'
            }}
          />
        </Form.Item>

        <Divider>Веса алгоритма</Divider>

        <Form.Item
          name="similarityWeight"
          label={
            <Tooltip title="Влияние алгоритма Levenshtein Distance">
              Вес схожести: {formValues.similarityWeight ? Math.round(formValues.similarityWeight * 100) : 60}%
            </Tooltip>
          }
        >
          <Slider
            min={0.1}
            max={1.0}
            step={0.1}
            marks={{
              0.1: '10%',
              0.5: '50%',
              1.0: '100%'
            }}
          />
        </Form.Item>

        <Form.Item
          name="keywordBonus"
          label={
            <Tooltip title="Бонус за совпадение ключевых слов">
              Бонус за слова: {formValues.keywordBonus ? Math.round(formValues.keywordBonus * 100) : 30}%
            </Tooltip>
          }
        >
          <Slider
            min={0}
            max={0.5}
            step={0.05}
            marks={{
              0: '0%',
              0.25: '25%',
              0.5: '50%'
            }}
          />
        </Form.Item>

        <Form.Item
          name="exactMatchBonus"
          label={
            <Tooltip title="Бонус за точное вхождение">
              Бонус за вхождение: {formValues.exactMatchBonus ? Math.round(formValues.exactMatchBonus * 100) : 20}%
            </Tooltip>
          }
        >
          <Slider
            min={0}
            max={0.4}
            step={0.05}
            marks={{
              0: '0%',
              0.2: '20%',
              0.4: '40%'
            }}
          />
        </Form.Item>

        <Form.Item
          name="prefixBonus"
          label={
            <Tooltip title="Бонус за совпадение в начале строки">
              Бонус за префикс: {formValues.prefixBonus ? Math.round(formValues.prefixBonus * 100) : 25}%
            </Tooltip>
          }
        >
          <Slider
            min={0}
            max={0.4}
            step={0.05}
            marks={{
              0: '0%',
              0.2: '20%',
              0.4: '40%'
            }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}

export default MLConfigPanel