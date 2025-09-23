// ТЕСТОВЫЙ КОМПОНЕНТ ДЛЯ ПРОВЕРКИ ТАБЛИЦ DEEPSEEK
// Этот компонент можно временно добавить на страницу для проверки состояния БД

import { useEffect, useState } from 'react'
import { Card, Typography, Button, Alert, Space } from 'antd'
import { supabase } from '@/lib/supabase'

const { Title, Text } = Typography

interface TableCheckResult {
  exists: boolean
  error?: string
  columns?: string[]
}

export function TestDeepseekTables() {
  const [settingsTable, setSettingsTable] = useState<TableCheckResult>({ exists: false })
  const [statsTable, setStatsTable] = useState<TableCheckResult>({ exists: false })
  const [loading, setLoading] = useState(false)

  // Проверка существования таблиц
  const checkTables = async () => {
    setLoading(true)
    console.log('🔍 Проверка таблиц Deepseek...')

    try {
      // Проверяем таблицу настроек
      const { data: settingsData, error: settingsError } = await supabase
        .from('deepseek_settings')
        .select('*')
        .limit(1)

      if (settingsError) {
        setSettingsTable({
          exists: false,
          error: settingsError.message
        })
        console.log('❌ deepseek_settings:', settingsError.message)
      } else {
        setSettingsTable({
          exists: true,
          columns: settingsData && settingsData.length > 0 ? Object.keys(settingsData[0]) : []
        })
        console.log('✅ deepseek_settings найдена')
      }

      // Проверяем таблицу статистики
      const { data: statsData, error: statsError } = await supabase
        .from('deepseek_usage_stats')
        .select('*')
        .limit(1)

      if (statsError) {
        setStatsTable({
          exists: false,
          error: statsError.message
        })
        console.log('❌ deepseek_usage_stats:', statsError.message)
      } else {
        setStatsTable({
          exists: true,
          columns: statsData && statsData.length > 0 ? Object.keys(statsData[0]) : []
        })
        console.log('✅ deepseek_usage_stats найдена')
      }
    } catch (error) {
      console.error('❌ Ошибка при проверке таблиц:', error)
    } finally {
      setLoading(false)
    }
  }

  // Попытка создания таблиц через INSERT (хак)
  const createTablesHack = async () => {
    setLoading(true)
    console.log('🔧 Попытка создания таблиц через INSERT...')

    try {
      // Попробуем вставить запись в deepseek_settings
      const { error: settingsError } = await supabase
        .from('deepseek_settings')
        .insert({
          api_key: '',
          base_url: 'https://api.deepseek.com',
          model: 'deepseek-chat',
          enabled: false,
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: null
        })

      if (settingsError) {
        console.log('❌ Не удалось создать deepseek_settings:', settingsError.message)
      } else {
        console.log('✅ deepseek_settings создана')
      }

      // Попробуем вставить запись в deepseek_usage_stats
      const { error: statsError } = await supabase
        .from('deepseek_usage_stats')
        .insert({
          requests_count: 0,
          tokens_input: 0,
          tokens_output: 0,
          total_cost: 0,
          successful_requests: 0,
          failed_requests: 0
        })

      if (statsError) {
        console.log('❌ Не удалось создать deepseek_usage_stats:', statsError.message)
      } else {
        console.log('✅ deepseek_usage_stats создана')
      }

      // Повторно проверяем таблицы
      await checkTables()
    } catch (error) {
      console.error('❌ Ошибка при создании таблиц:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTables()
  }, [])

  return (
    <Card title="🔍 Проверка таблиц Deepseek" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>

        {/* Статус таблицы настроек */}
        <Alert
          message="Таблица deepseek_settings"
          description={
            settingsTable.exists ? (
              <div>
                ✅ Таблица существует
                {settingsTable.columns && (
                  <div>
                    <strong>Поля:</strong> {settingsTable.columns.join(', ')}
                    <br />
                    <strong>system_prompt:</strong> {settingsTable.columns.includes('system_prompt') ? '✅ Присутствует' : '❌ Отсутствует'}
                  </div>
                )}
              </div>
            ) : (
              <div>
                ❌ Таблица не найдена
                <br />
                <strong>Ошибка:</strong> {settingsTable.error}
              </div>
            )
          }
          type={settingsTable.exists ? 'success' : 'error'}
          showIcon
        />

        {/* Статус таблицы статистики */}
        <Alert
          message="Таблица deepseek_usage_stats"
          description={
            statsTable.exists ? (
              <div>
                ✅ Таблица существует
                {statsTable.columns && (
                  <div>
                    <strong>Поля:</strong> {statsTable.columns.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div>
                ❌ Таблица не найдена
                <br />
                <strong>Ошибка:</strong> {statsTable.error}
              </div>
            )
          }
          type={statsTable.exists ? 'success' : 'error'}
          showIcon
        />

        {/* Кнопки действий */}
        <Space>
          <Button onClick={checkTables} loading={loading}>
            🔄 Перепроверить таблицы
          </Button>
          <Button
            type="primary"
            onClick={createTablesHack}
            loading={loading}
            disabled={settingsTable.exists && statsTable.exists}
          >
            🔧 Попробовать создать таблицы
          </Button>
        </Space>

        {/* Инструкции */}
        <Alert
          message="Инструкции"
          description={
            <div>
              <p><strong>Если таблицы не найдены:</strong></p>
              <ol>
                <li>Откройте веб-интерфейс Supabase: <a href="https://hfqgcaxmufzitdfafdlp.supabase.co" target="_blank">https://hfqgcaxmufzitdfafdlp.supabase.co</a></li>
                <li>Перейдите в раздел "Table Editor"</li>
                <li>Выполните SQL из файла: <code>temp/create_deepseek_tables.sql</code></li>
                <li>Обновите эту страницу</li>
              </ol>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  )
}