import { supabase } from '@/lib/supabase'
import type {
  Documentation,
  DocumentationVersion,
  Comment,
  DocumentationImportRow,
  DocumentationTableRow,
  DocumentationFilters,
} from '../types'

export const documentationApi = {
  // Удаление записи документации
  async deleteDocumentation(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('documentations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete documentation code:', error)
      throw error
    }
  },

  // Удаление версии документации
  async deleteVersion(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('documentation_versions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete version:', error)
      throw error
    }
  },

  // Обновление записи документации
  async updateDocumentation(id: string, updates: Partial<Documentation>) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update documentation code:', error)
      throw error
    }

    return data as Documentation
  },

  // Обновление цвета записи
  async updateDocumentationColor(id: string, color: string | null) {
    if (!supabase) throw new Error('Supabase client not initialized')

    // TODO: Раскомментировать после добавления колонки color в БД
    console.warn('Color update temporarily disabled - column not yet in database')
    
    // Возвращаем документацию без обновления
    const { data, error } = await supabase
      .from('documentations')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch documentation:', error)
      throw error
    }

    return data as Documentation
  },
  // Получение всех записей документации с фильтрами
  async getDocumentation(filters?: DocumentationFilters) {
    if (!supabase) throw new Error('Supabase client not initialized')

    console.log('Getting documentation with filters:', filters)

    let query = supabase
      .from('documentations')
      .select(`
        *,
        tag:documentation_tags(*),
        versions:documentation_versions(*),
        project_mappings:documentations_projects_mapping(
          project:projects(*),
          block:blocks(*)
        )
      `)
      .order('code', { ascending: true })

    // Применяем фильтры
    if (filters?.project_id) {
      // Фильтруем через таблицу маппинга
      query = query.eq('project_mappings.project_id', filters.project_id)
    }
    if (filters?.tag_id) {
      query = query.eq('tag_id', filters.tag_id)
    }
    if (filters?.block_id) {
      // Фильтруем через таблицу маппинга
      query = query.eq('project_mappings.block_id', filters.block_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch documentation:', error)
      throw error
    }

    console.log('Fetched documentations:', data?.length || 0)

    // Преобразуем данные для отображения в таблице
    const tableData: DocumentationTableRow[] = (data || []).map(doc => {
      let versions = doc.versions || []
      
      // Фильтруем по статусу если нужно
      if (filters?.status) {
        versions = versions.filter((v: DocumentationVersion) => v.status === filters.status)
      }
      
      // Оставляем только последнюю версию если нужно
      if (filters?.show_latest_only && versions.length > 0) {
        const maxVersion = Math.max(...versions.map((v: DocumentationVersion) => v.version_number))
        versions = versions.filter((v: DocumentationVersion) => v.version_number === maxVersion)
      }

      // Сортируем версии по номеру
      versions.sort((a: DocumentationVersion, b: DocumentationVersion) => a.version_number - b.version_number)

      // Получаем данные проекта и блока из маппинга
      const projectMapping = (doc as any).project_mappings?.[0]
      const project = projectMapping?.project
      const block = projectMapping?.block

      return {
        id: doc.id, // Используем UUID как есть
        documentation_id: doc.id,
        stage: doc.stage || 'П',
        tag_name: doc.tag?.name || '',
        tag_number: doc.tag?.tag_number || 0,
        project_code: doc.code,
        version_count: versions.length,
        versions,
        selected_version: versions.length > 0 ? versions[versions.length - 1].version_number : undefined,
        comments: '', // TODO: загрузить комментарии
        project_id: project?.id || null,
        block_id: block?.id || null,
        color: doc.color || '', // TODO: убедиться что колонка существует в БД
      }
    })

    return tableData
  },

  // Создание или обновление документации
  async upsertDocumentation(code: string, tagId?: number, projectId?: string, blockId?: string, color?: string, stage?: 'П' | 'Р') {
    if (!supabase) throw new Error('Supabase client not initialized')

    // 1. Сохраняем документацию (только шифр проекта, тэг и стадию)
    const { data, error } = await supabase
      .from('documentations')
      .upsert(
        {
          code,
          tag_id: tagId || null,
          stage: stage || 'П', // По умолчанию П (проект)
          // color: color || null, // TODO: раскомментировать после добавления колонки в БД
          // Убираем project_id и block_id - они теперь в таблице маппинга
        },
        { onConflict: 'code' }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to upsert documentation code:', error)
      throw error
    }

    // 2. Сохраняем связь с проектом и корпусом в таблице маппинга
    if (projectId) {
      const { error: mappingError } = await supabase
        .from('documentations_projects_mapping')
        .upsert(
          {
            documentation_id: data.id,
            project_id: projectId,
            block_id: blockId || null,
          },
          { onConflict: 'documentation_id,project_id' }
        )

      if (mappingError) {
        console.error('Failed to create project mapping:', mappingError)
        throw mappingError
      }
    }

    return data as Documentation
  },

  // Создание версии документации
  async createVersion(
    documentationId: string,
    versionNumber: number,
    issueDate?: string,
    fileUrl?: string,
    status: DocumentationVersion['status'] = 'not_filled'
  ) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_versions')
      .insert({
        documentation_id: documentationId,
        version_number: versionNumber,
        issue_date: issueDate || null,
        file_url: fileUrl || null,
        status,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create documentation version:', error)
      throw error
    }

    return data as DocumentationVersion
  },

  // Обновление статуса версии
  async updateVersionStatus(versionId: string, status: DocumentationVersion['status']) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_versions')
      .update({ status })
      .eq('id', versionId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update version status:', error)
      throw error
    }

    return data as DocumentationVersion
  },

  // Импорт данных из Excel
  async importFromExcel(rows: DocumentationImportRow[]) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const results = []
    const errors = []

    for (const row of rows) {
      try {
        // Находим или создаем тэг по имени
        let tagId: number | null = null
        if (row.tag) {
          const { data: tags } = await supabase
            .from('documentation_tags')
            .select('id')
            .eq('name', row.tag)
            .limit(1)

          if (tags && tags.length > 0) {
            tagId = tags[0].id
          }
        }

        // Используем комплексный метод сохранения для Excel импорта
        const result = await this.saveDocumentationComplete({
          code: row.code,
          tagId: tagId ?? undefined,
          versionNumber: row.version_number,
          issueDate: row.issue_date,
          status: 'not_filled'
        })

        results.push({ row, ...result })
      } catch (error) {
        console.error('Error importing row:', row, error)
        errors.push({ row, error })
      }
    }

    return { results, errors }
  },

  // Добавление комментария
  async addComment(text: string, entityType: string, entityId: string, authorId?: number) {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Создаем комментарий
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        comment_text: text,
        author_id: authorId || null,
      })
      .select()
      .single()

    if (commentError) {
      console.error('Failed to create comment:', commentError)
      throw commentError
    }

    // Связываем с сущностью
    const { error: linkError } = await supabase
      .from('entity_comments_mapping')
      .insert({
        entity_type: entityType,
        entity_id: entityId, // Теперь UUID
        comment_id: comment.id,
      })

    if (linkError) {
      console.error('Failed to link comment:', linkError)
      throw linkError
    }

    return comment as Comment
  },

  // Получение комментариев для сущности
  async getComments(entityType: string, entityId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('entity_comments_mapping')
      .select('comment:comments(*)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (error) {
      console.error('Failed to fetch comments:', error)
      throw error
    }

    return (data || []).map((item: any) => item.comment) as Comment[]
  },

  // Комплексное сохранение документации с версиями и комментариями
  async saveDocumentationComplete(data: {
    code: string
    stage?: 'П' | 'Р'
    tagId?: number
    projectId?: string
    blockId?: string
    color?: string
    versionNumber?: number
    issueDate?: string
    fileUrl?: string
    status?: DocumentationVersion['status']
    comment?: string
  }) {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      // 1. Сохраняем документацию (шифр проекта, тэг и стадию)
      const doc = await this.upsertDocumentation(
        data.code,
        data.tagId,
        data.projectId,
        data.blockId,
        data.color,
        data.stage
      )

      // 2. Создаем версию документации, если указаны данные версии
      let version: DocumentationVersion | null = null
      if (data.versionNumber) {
        version = await this.createVersion(
          doc.id,
          data.versionNumber,
          data.issueDate,
          data.fileUrl,
          data.status || 'not_filled'
        )
      }

      // 3. Сохраняем комментарий, если есть
      let comment: Comment | null = null
      if (data.comment && data.comment.trim()) {
        comment = await this.addComment(data.comment, 'documentation', doc.id)
      }

      return {
        documentation: doc,
        version,
        comment
      }
    } catch (error) {
      console.error('Failed to save documentation complete:', error)
      throw error
    }
  },
}