/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Typography, Table, Alert } from 'antd'

const { Title, Text } = Typography

export default function TestTableStructure() {
  const [tableInfo, setTableInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkTable() {
      if (!supabase) {
        setError('Supabase client not initialized')
        setLoading(false)
        return
      }

      try {
        // Попробуем получить одну запись из таблицы
        const { data, error: queryError } = await supabase
          .from('chessboard_documentation_mapping')
          .select('*')
          .limit(1)
        
        if (queryError) {
          setError(`Error querying table: ${queryError.message}`)
          console.error('Query error details:', queryError)
        } else {
          const info = {
            exists: true,
            sampleData: data,
            columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            recordCount: data?.length || 0
          }
          setTableInfo(info)
        }
      } catch (err) {
        setError(`Unexpected error: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    checkTable()
  }, [])

  const columns = [
    { title: 'Column Name', dataIndex: 'name', key: 'name' },
    { title: 'Sample Value', dataIndex: 'value', key: 'value' },
  ]

  const dataSource = tableInfo?.columns?.map((col: string) => ({
    key: col,
    name: col,
    value: tableInfo.sampleData?.[0]?.[col] || 'null'
  }))

  return (
    <Card title="Проверка таблицы chessboard_documentation_mapping">
      {loading && <Text>Загрузка...</Text>}
      
      {error && (
        <Alert 
          message="Ошибка" 
          description={error} 
          type="error" 
          showIcon 
        />
      )}
      
      {tableInfo && !error && (
        <>
          <Title level={4}>Информация о таблице</Title>
          <Text>Таблица существует: {tableInfo.exists ? 'Да' : 'Нет'}</Text>
          <br />
          <Text>Количество колонок: {tableInfo.columns.length}</Text>
          <br /><br />
          
          <Title level={4}>Структура таблицы</Title>
          <Table 
            columns={columns} 
            dataSource={dataSource} 
            pagination={false}
          />
          
          {tableInfo.sampleData && tableInfo.sampleData.length > 0 && (
            <>
              <Title level={4}>Пример данных (JSON)</Title>
              <pre>{JSON.stringify(tableInfo.sampleData[0], null, 2)}</pre>
            </>
          )}
        </>
      )}
    </Card>
  )
}