import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface PaginationParams {
  page: number
  pageSize: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

interface FilterParams {
  projectId?: string
  blockId?: string[]
  categoryId?: string[]
  typeId?: string[]
  tagId?: string[]
  documentationId?: string[]
  search?: string
}

interface UseServerPaginationProps {
  table: string
  filters?: FilterParams
  enabled?: boolean
  defaultPageSize?: number
}

interface UseServerPaginationReturn {
  data: any[]
  loading: boolean
  error: any
  pagination: {
    current: number
    pageSize: number
    total: number
    showSizeChanger: boolean
    showQuickJumper: boolean
    showTotal: (total: number, range: [number, number]) => string
    onChange: (page: number, size: number) => void
    onShowSizeChange: (current: number, size: number) => void
  }
  setSorting: (field: string, order: 'asc' | 'desc' | null) => void
  refresh: () => void
}

export const useServerPagination = ({
  table,
  filters = {},
  enabled = true,
  defaultPageSize = 200,
}: UseServerPaginationProps): UseServerPaginationReturn => {
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: defaultPageSize,
  })

  // Строим запрос с фильтрами
  const buildQuery = useCallback(() => {
    if (!supabase) return null

    let query = supabase.from(table).select('*', { count: 'exact' })

    // Применяем фильтры
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters.blockId && filters.blockId.length > 0) {
      // Для множественных фильтров используем массивы
      if (filters.blockId.length === 1) {
        query = query.eq('block_id', filters.blockId[0])
      } else {
        query = query.in('block_id', filters.blockId)
      }
    }

    if (filters.categoryId && filters.categoryId.length > 0) {
      if (filters.categoryId.length === 1) {
        query = query.eq('cost_category_id', parseInt(filters.categoryId[0]))
      } else {
        query = query.in(
          'cost_category_id',
          filters.categoryId.map((id) => parseInt(id)),
        )
      }
    }

    if (filters.typeId && filters.typeId.length > 0) {
      if (filters.typeId.length === 1) {
        query = query.eq('cost_type_id', parseInt(filters.typeId[0]))
      } else {
        query = query.in(
          'cost_type_id',
          filters.typeId.map((id) => parseInt(id)),
        )
      }
    }

    // Поиск по материалам
    if (filters.search && filters.search.trim()) {
      query = query.ilike('material', `%${filters.search.trim()}%`)
    }

    // Пагинация
    const from = (pagination.page - 1) * pagination.pageSize
    const to = from + pagination.pageSize - 1
    query = query.range(from, to)

    // Сортировка
    if (pagination.sortField) {
      query = query.order(pagination.sortField, { ascending: pagination.sortOrder === 'asc' })
    } else {
      // Дефолтная сортировка
      query = query.order('created_at', { ascending: false })
    }

    return query
  }, [table, filters, pagination])

  // Запрос данных
  const {
    data: queryResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'server-pagination',
      table,
      filters,
      pagination.page,
      pagination.pageSize,
      pagination.sortField,
      pagination.sortOrder,
    ],
    queryFn: async () => {
      const query = buildQuery()
      if (!query) throw new Error('Supabase not initialized')

      const result = await query
      if (result.error) throw result.error

      return {
        data: result.data || [],
        count: result.count || 0,
      }
    },
    enabled: enabled && !!supabase,
    staleTime: 30000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  })

  // Обработчики пагинации
  const handlePageChange = useCallback((page: number, size: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
      pageSize: size,
    }))
  }, [])

  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPagination((prev) => ({
      ...prev,
      page: 1, // Сбрасываем на первую страницу при изменении размера
      pageSize: size,
    }))
  }, [])

  // Обработчик сортировки
  const setSorting = useCallback((field: string, order: 'asc' | 'desc' | null) => {
    setPagination((prev) => ({
      ...prev,
      page: 1, // Сбрасываем на первую страницу при сортировке
      sortField: order ? field : undefined,
      sortOrder: order || undefined,
    }))
  }, [])

  // Конфигурация пагинации для Ant Design
  const paginationConfig = useMemo(
    () => ({
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: queryResult?.count || 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} из ${total.toLocaleString('ru-RU')} записей`,
      pageSizeOptions: ['50', '100', '200', '500'],
      onChange: handlePageChange,
      onShowSizeChange: handlePageSizeChange,
    }),
    [pagination, queryResult?.count, handlePageChange, handlePageSizeChange],
  )

  return {
    data: queryResult?.data || [],
    loading: isLoading,
    error,
    pagination: paginationConfig,
    setSorting,
    refresh: refetch,
  }
}
