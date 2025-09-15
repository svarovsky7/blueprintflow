import React from 'react'
import { Table } from 'antd'
import ChessboardPerformanceWrapper from './ChessboardPerformanceWrapper'

// Пример интеграции с существующим компонентом Шахматки
interface ChessboardIntegrationExampleProps {
  // Существующие пропсы Шахматки
  viewRows: any[]
  columns: any[]
  loading: boolean
  appliedFilters: any

  // Новые настройки производительности
  enableOptimizations?: boolean
  forceVirtualization?: boolean
}

const ChessboardIntegrationExample: React.FC<ChessboardIntegrationExampleProps> = ({
  viewRows,
  columns,
  loading,
  appliedFilters,
  enableOptimizations = true,
  forceVirtualization = false
}) => {
  // Оригинальная таблица Ant Design
  const originalTable = (
    <Table
      dataSource={viewRows}
      columns={columns}
      loading={loading}
      pagination={false}
      scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
      sticky
      size="small"
    />
  )

  // Если оптимизации отключены, возвращаем оригинальную таблицу
  if (!enableOptimizations && !forceVirtualization) {
    return originalTable
  }

  // Возвращаем оптимизированную версию
  return (
    <ChessboardPerformanceWrapper
      originalTable={originalTable}
      data={viewRows}
      columns={columns}
      loading={loading}
      filters={{
        projectId: appliedFilters?.projectId,
        blockId: appliedFilters?.blockId,
        categoryId: appliedFilters?.categoryId,
        typeId: appliedFilters?.typeId,
        tagId: appliedFilters?.tagId,
        documentationId: appliedFilters?.documentationId
      }}
      enableVirtualization={viewRows.length > 200 || forceVirtualization}
      enableServerPagination={false} // Пока отключено, можно включить позже
      enablePerformanceMonitor={true}
    />
  )
}

export default ChessboardIntegrationExample

/*
ИНСТРУКЦИЯ ПО ИНТЕГРАЦИИ:

1. В файле src/pages/documents/Chessboard.tsx найдите место рендера основной таблицы

2. Замените существующий Table компонент на:

import ChessboardIntegrationExample from '@/components/ChessboardIntegrationExample'

// Вместо:
<Table
  dataSource={viewRows}
  columns={...}
  ...
/>

// Используйте:
<ChessboardIntegrationExample
  viewRows={viewRows}
  columns={columns}
  loading={loading}
  appliedFilters={appliedFilters}
  enableOptimizations={true}
/>

3. Для тестирования производительности можете добавить переключатель:

const [useOptimizations, setUseOptimizations] = useState(viewRows.length > 500)

<Switch
  checked={useOptimizations}
  onChange={setUseOptimizations}
  checkedChildren="Оптимизация ВКЛ"
  unCheckedChildren="Оптимизация ВЫКЛ"
/>

<ChessboardIntegrationExample
  viewRows={viewRows}
  columns={columns}
  loading={loading}
  appliedFilters={appliedFilters}
  enableOptimizations={useOptimizations}
/>

4. Монитор производительности будет доступен через кнопку в правом нижнем углу
*/