import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Comment } from '../shared/types'

interface CommentWithMapping {
  id: string
  comment_text: string
  author_id?: number
  created_at: string
  updated_at: string
  entity_comments_mapping: Array<{
    entity_type: string
    entity_id: string
    comment_id: string
  }>
}

interface UseCommentsLazyReturn {
  commentsMap: Map<string, Comment[]>
  loadCommentsForIds: (chessboardIds: string[]) => Promise<void>
  isLoading: boolean
}

export const useCommentsLazy = (): UseCommentsLazyReturn => {
  const [commentsMap, setCommentsMap] = useState<Map<string, Comment[]>>(new Map())
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef<Set<string>>(new Set())

  const loadCommentsForIds = useCallback(async (chessboardIds: string[]) => {
    if (!supabase) return

    // Фильтруем только новые ID, которые еще не загружались и не загружаются сейчас
    const newIds = chessboardIds.filter(id => !loadedIds.has(id) && !loadingRef.current.has(id))

    if (newIds.length === 0) return

    // Добавляем ID в список загружающихся
    newIds.forEach(id => loadingRef.current.add(id))
    setIsLoading(true)

    try {
      // Используем батч-обработку для избежания длинных URL
      const batchSize = 50
      const allMappings: any[] = []

      for (let i = 0; i < newIds.length; i += batchSize) {
        const batch = newIds.slice(i, i + batchSize)

        const { data: mappingsBatch, error: mappingError } = await supabase
          .from('entity_comments_mapping')
          .select('entity_id, comment_id')
          .eq('entity_type', 'chessboard')
          .in('entity_id', batch)

        if (mappingError) {
          console.warn(`Ошибка загрузки маппинга комментариев для батча ${i / batchSize + 1}:`, mappingError)
          continue
        }

        if (mappingsBatch && mappingsBatch.length > 0) {
          allMappings.push(...mappingsBatch)
        }
      }

      if (allMappings.length === 0) {
        // Даже если комментариев нет, помечаем ID как загруженные
        setLoadedIds(prev => new Set([...prev, ...newIds]))
        return
      }

      // Получаем все уникальные comment_id
      const commentIds = [...new Set(allMappings.map((m: any) => m.comment_id))]

      // Загружаем сами комментарии
      const allComments: any[] = []
      const commentBatchSize = 100

      for (let i = 0; i < commentIds.length; i += commentBatchSize) {
        const batch = commentIds.slice(i, i + commentBatchSize)

        const { data: commentsBatch, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .in('id', batch)
          .order('created_at', { ascending: false })

        if (commentsError) {
          console.warn(`Ошибка загрузки комментариев для батча ${i / commentBatchSize + 1}:`, commentsError)
          continue
        }

        if (commentsBatch && commentsBatch.length > 0) {
          allComments.push(...commentsBatch)
        }
      }

      // Группируем комментарии по entity_id
      const newCommentsMap = new Map<string, Comment[]>()

      // Сначала инициализируем пустые массивы для всех запрошенных ID
      newIds.forEach(id => {
        newCommentsMap.set(id, [])
      })

      // Затем заполняем комментарии
      allComments.forEach((comment) => {
        const commentMappings = allMappings.filter((m: any) => m.comment_id === comment.id)

        commentMappings.forEach((mapping: any) => {
          const entityId = mapping.entity_id
          if (newIds.includes(entityId)) {
            if (!newCommentsMap.has(entityId)) {
              newCommentsMap.set(entityId, [])
            }
            newCommentsMap.get(entityId)!.push({
              id: comment.id,
              comment_text: comment.comment_text,
              author_id: comment.author_id,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
            })
          }
        })
      })

      // Обновляем общую карту комментариев
      setCommentsMap(prev => {
        const updated = new Map(prev)
        for (const [key, value] of newCommentsMap) {
          updated.set(key, value)
        }
        return updated
      })

      // Помечаем ID как загруженные
      setLoadedIds(prev => new Set([...prev, ...newIds]))

    } catch (error) {
      console.warn('Ошибка при загрузке комментариев:', error)
    } finally {
      // Удаляем ID из списка загружающихся
      newIds.forEach(id => loadingRef.current.delete(id))
      setIsLoading(loadingRef.current.size > 0)
    }
  }, [loadedIds, supabase])

  return {
    commentsMap,
    loadCommentsForIds,
    isLoading
  }
}