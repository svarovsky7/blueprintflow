import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { importFinishingToChessboard } from '@/entities/finishing'
import type { ImportToChessboardResult } from '@/entities/finishing'

export function useImportToChessboard() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation<ImportToChessboardResult, Error, string>({
    mutationFn: (finishingPieId: string) => importFinishingToChessboard(finishingPieId),

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pies'] })
      queryClient.invalidateQueries({ queryKey: ['chessboard-sets'] })
      queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })

      if (result.success) {
        message.success(
          `Комплект ${result.set_name || result.set_number} успешно создан!`
        )
      }
    },

    onError: (error) => {
      console.error('Ошибка импорта:', error)
      message.error(`Ошибка импорта: ${error.message}`)
    },
  })
}
