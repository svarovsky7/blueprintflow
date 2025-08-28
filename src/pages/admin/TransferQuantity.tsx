import { useState } from 'react'
import { Button, message } from 'antd'
import { supabase } from '@/lib/supabase'

interface ChessboardRow {
  id: string
  floors: string | null
  quantityPd: string | null
  quantitySpec: string | null
  quantityRd: string | null
}

export default function TransferQuantity() {
  const [loading, setLoading] = useState(false)

  const handleTransfer = async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chessboard')
        .select('id, floors, quantityPd, quantitySpec, quantityRd')
      if (error) throw error

      const rows = (data ?? []) as ChessboardRow[]
      for (const row of rows) {
        if (!row.floors) continue
        const floors = parseFloorsString(row.floors)
        if (floors.length === 0) continue
        const count = floors.length
        const qPd = (Number(row.quantityPd) || 0) / count
        const qSpec = (Number(row.quantitySpec) || 0) / count
        const qRd = (Number(row.quantityRd) || 0) / count

        await supabase
          .from('chessboard_floor_mapping')
          .delete()
          .eq('chessboard_id', row.id)

        for (const floor of floors) {
          const { error: insertError } = await supabase
            .from('chessboard_floor_mapping')
            .upsert(
              {
                chessboard_id: row.id,
                floor_number: floor,
                quantityPd: qPd || null,
                quantitySpec: qSpec || null,
                quantityRd: qRd || null,
              },
              { onConflict: 'chessboard_id,floor_number' },
            )
          if (insertError) throw insertError
        }
      }
      message.success('Перенос завершён')
    } catch (e) {
      const err = e as Error
      message.error(`Ошибка переноса: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Перенос количества</h2>
      <Button type="primary" onClick={handleTransfer} loading={loading}>
        Перенести
      </Button>
    </div>
  )
}

function parseFloorsString(floorsStr: string): number[] {
  if (!floorsStr || !floorsStr.trim()) return []
  const floors = new Set<number>()
  const parts = floorsStr.split(',').map(s => s.trim())
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10))
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          floors.add(i)
        }
      }
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num)) floors.add(num)
    }
  }
  return Array.from(floors).sort((a, b) => a - b)
}
