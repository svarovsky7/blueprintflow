import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { deleteFinishingChessboardSet } from '@/entities/finishing'

interface DeleteSetParams {
  finishingPieId: string
  setId: string
}

export function useDeleteFinishingSet() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation<{ success: boolean; message: string }, Error, DeleteSetParams>({
    mutationFn: ({ finishingPieId, setId }: DeleteSetParams) =>
      deleteFinishingChessboardSet(finishingPieId, setId),

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pies'] })
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-documents'] })
      queryClient.invalidateQueries({ queryKey: ['chessboard-sets'] })
      queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })

      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message)
      }
    },

    onError: (error) => {
      console.error('Ошибка удаления комплекта:', error)
      message.error(`Ошибка удаления: ${error.message}`)
    },
  })
}
