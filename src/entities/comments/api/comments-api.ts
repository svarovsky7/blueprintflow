import { supabase } from '@/lib/supabase'
import type { Comment, CreateCommentData, UpdateCommentData, EntityCommentMapping } from '../model/types'

export const commentsApi = {
  // Получить все комментарии для конкретной сущности
  async getByEntity(entityType: string, entityId: string): Promise<Comment[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        entity_comments_mapping!inner(
          entity_type,
          entity_id,
          comment_id
        )
      `)
      .eq('entity_comments_mapping.entity_type', entityType)
      .eq('entity_comments_mapping.entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch comments:', error)
      throw error
    }

    return data as Comment[]
  },

  // Получить комментарии для нескольких сущностей одного типа (батч-запрос)
  async getByEntities(entityType: string, entityIds: string[]): Promise<Comment[]> {
    if (!supabase) throw new Error('Supabase is not configured')
    if (!entityIds.length) return []

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        entity_comments_mapping!inner(
          entity_type,
          entity_id,
          comment_id
        )
      `)
      .eq('entity_comments_mapping.entity_type', entityType)
      .in('entity_comments_mapping.entity_id', entityIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch batch comments:', error)
      throw error
    }

    return data as Comment[]
  },

  // Создать новый комментарий
  async create(commentData: CreateCommentData): Promise<Comment> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('comments')
      .insert({
        comment_text: commentData.comment_text,
        author_id: commentData.author_id || null,
      })
      .select()

    if (error) {
      console.error('Failed to create comment:', error)
      throw error
    }

    return data[0] as Comment
  },

  // Обновить комментарий
  async update(commentId: string, updateData: UpdateCommentData): Promise<Comment> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('comments')
      .update({
        comment_text: updateData.comment_text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()

    if (error) {
      console.error('Failed to update comment:', error)
      throw error
    }

    return data[0] as Comment
  },

  // Удалить комментарий
  async delete(commentId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Failed to delete comment:', error)
      throw error
    }
  },

  // Связать комментарий с сущностью
  async linkToEntity(commentId: string, entityType: string, entityId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase
      .from('entity_comments_mapping')
      .insert({
        comment_id: commentId,
        entity_type: entityType,
        entity_id: entityId,
      })

    if (error) {
      console.error('Failed to link comment to entity:', error)
      throw error
    }
  },

  // Отвязать комментарий от сущности
  async unlinkFromEntity(commentId: string, entityType: string, entityId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase
      .from('entity_comments_mapping')
      .delete()
      .eq('comment_id', commentId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (error) {
      console.error('Failed to unlink comment from entity:', error)
      throw error
    }
  },

  // Создать комментарий и сразу связать его с сущностью
  async createAndLink(
    commentData: CreateCommentData,
    entityType: string,
    entityId: string
  ): Promise<Comment> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Создаем комментарий
    const comment = await this.create(commentData)

    // Связываем с сущностью
    await this.linkToEntity(comment.id, entityType, entityId)

    return comment
  },

  // Удалить комментарий и все его связи
  async deleteWithMappings(commentId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Удаляем комментарий (связи удалятся автоматически благодаря CASCADE)
    await this.delete(commentId)
  },
}

// Специализированный API для работы с комментариями chessboard
export const chessboardCommentsApi = {
  // Получить комментарии для записи chessboard
  async getByChessboardId(chessboardId: string): Promise<Comment[]> {
    return commentsApi.getByEntity('chessboard', chessboardId)
  },

  // Получить комментарии для нескольких записей chessboard
  async getByChessboardIds(chessboardIds: string[]): Promise<Comment[]> {
    return commentsApi.getByEntities('chessboard', chessboardIds)
  },

  // Создать комментарий для записи chessboard
  async createForChessboard(
    chessboardId: string,
    commentData: CreateCommentData
  ): Promise<Comment> {
    return commentsApi.createAndLink(commentData, 'chessboard', chessboardId)
  },

  // Обновить комментарий
  async update(commentId: string, updateData: UpdateCommentData): Promise<Comment> {
    return commentsApi.update(commentId, updateData)
  },

  // Удалить комментарий
  async delete(commentId: string): Promise<void> {
    return commentsApi.deleteWithMappings(commentId)
  },
}