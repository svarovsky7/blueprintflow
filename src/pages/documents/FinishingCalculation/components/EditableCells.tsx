import { Select } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  getDetailCostCategories,
  getWorkSets,
  getRatesByWorkSet,
} from '@/entities/calculation'

interface DetailCostCategoryCellProps {
  value: number | null
  costCategoryId: number
  locationId: number | null
  onChange: (value: number | null) => void
  onCascadeReset: () => void
}

export function DetailCostCategoryCell({
  value,
  costCategoryId,
  locationId,
  onChange,
  onCascadeReset,
}: DetailCostCategoryCellProps) {
  const { data: detailCostCategories = [] } = useQuery({
    queryKey: ['detail-cost-categories', costCategoryId, locationId],
    queryFn: () => getDetailCostCategories(costCategoryId, locationId),
    enabled: !!costCategoryId,
  })

  return (
    <Select
      value={value}
      onChange={(val) => {
        onChange(val)
        onCascadeReset()
      }}
      options={detailCostCategories.map((d) => ({ value: d.id, label: d.name }))}
      placeholder="Выберите вид затрат"
      allowClear
      showSearch
      filterOption={(input, option) =>
        (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    />
  )
}

interface WorkSetCellProps {
  value: string | null
  detailCostCategoryId: number | null
  onChange: (value: string | null) => void
  onCascadeReset: () => void
}

export function WorkSetCell({
  value,
  detailCostCategoryId,
  onChange,
  onCascadeReset,
}: WorkSetCellProps) {
  const { data: workSets = [], isLoading } = useQuery({
    queryKey: ['work-sets', detailCostCategoryId],
    queryFn: () => getWorkSets(detailCostCategoryId!),
    enabled: !!detailCostCategoryId,
  })

  return (
    <Select
      value={value}
      onChange={(val) => {
        onChange(val)
        onCascadeReset()
      }}
      options={workSets}
      placeholder={
        detailCostCategoryId
          ? workSets.length === 0 && !isLoading
            ? 'Нет связанных наборов'
            : 'Выберите набор'
          : 'Выберите вид затрат'
      }
      allowClear
      showSearch
      filterOption={(input, option) =>
        (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
      loading={isLoading}
    />
  )
}

interface RateCellProps {
  value: string | null
  detailCostCategoryId: number | null
  workSet: string | null
  onChange: (value: string | null) => void
}

export function RateCell({
  value,
  detailCostCategoryId,
  workSet,
  onChange,
}: RateCellProps) {
  const { data: rates = [] } = useQuery({
    queryKey: ['rates-by-work-set', detailCostCategoryId, workSet],
    queryFn: () => getRatesByWorkSet(detailCostCategoryId!, workSet!),
    enabled: !!detailCostCategoryId && !!workSet,
  })

  return (
    <Select
      value={value}
      onChange={onChange}
      options={rates.map((r) => ({ value: r.id, label: r.work_name }))}
      placeholder="Выберите работу"
      allowClear
      showSearch
      filterOption={(input, option) =>
        (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    />
  )
}
