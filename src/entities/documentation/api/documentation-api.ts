/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { supabase } from '@/lib/supabase'
import type {
  Documentation,
  DocumentationVersion,
  LocalFile,
  Comment,
  DocumentationImportRow,
  DocumentationTableRow,
  DocumentationFilters,
  ImportConflict,
  ConflictResolution,
  Project,
  Block,
} from '../types'

export const documentationApi = {
  // Удаление записи документации
  async deleteDocumentation(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase.from('documentations').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete documentation code:', error)
      throw error
    }
  },

  // Удаление версии документации
  async deleteVersion(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase.from('documentation_versions').delete().eq('id', id)

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
  async updateDocumentationColor(id: string, _color: string | null) {
    if (!supabase) throw new Error('Supabase client not initialized')

    // TODO: Раскомментировать после добавления колонки color в БД
    console.warn('Color update temporarily disabled - column not yet in database')

    // Возвращаем документацию без обновления
    const { data, error } = await supabase.from('documentations').select().eq('id', id).single()

    if (error) {
      console.error('Failed to fetch documentation:', error)
      throw error
    }

    return data as Documentation
  },
  // Получение всех записей документации с фильтрами
  async getDocumentation(filters?: DocumentationFilters) {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Если есть фильтр по проекту или блоку, сначала получаем документы через маппинг
    let documentationIds: string[] | null = null

    if (filters?.project_id || filters?.block_id) {
      let mappingQuery = supabase.from('documentations_projects_mapping').select('documentation_id')

      if (filters.project_id) {
        mappingQuery = mappingQuery.eq('project_id', filters.project_id)
      }
      if (filters.block_id) {
        mappingQuery = mappingQuery.eq('block_id', filters.block_id)
      }

      const { data: mappingData, error: mappingError } = await mappingQuery

      if (mappingError) {
        console.error('Failed to fetch project mapping:', mappingError)
        throw mappingError
      }

      documentationIds = mappingData?.map((m) => m.documentation_id) || []
    }

    let query = supabase
      .from('documentations')
      .select(
        `
        *,
        tag:documentation_tags(*),
        versions:documentation_versions(
          id,
          documentation_id,
          version_number,
          issue_date,
          file_url,
          local_files,
          status,
          created_at,
          updated_at
        ),
        project_mappings:documentations_projects_mapping(
          project:projects(*),
          block:blocks(*)
        )
      `,
      )
      .order('code', { ascending: true })

    // Применяем фильтры
    if (documentationIds !== null) {
      if (documentationIds.length === 0) {
        // Если нет документов для данного проекта/блока, возвращаем пустой результат
        return []
      }
      query = query.in('id', documentationIds)
    }

    if (filters?.tag_id) {
      query = query.eq('tag_id', filters.tag_id)
    }
    if (filters?.stage) {
      query = query.eq('stage', filters.stage)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch documentation:', error)
      throw error
    }

    // Преобразуем данные для отображения в таблице
    const tableData: DocumentationTableRow[] = (data || []).map((doc) => {
      let versions = Array.isArray(doc.versions) ? doc.versions : []

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
      versions.sort(
        (a: DocumentationVersion, b: DocumentationVersion) => a.version_number - b.version_number,
      )

      // Получаем данные проекта и блока из маппинга
      const projectMapping = (
        doc as Documentation & { project_mappings?: Array<{ project?: Project; block?: Block }> }
      ).project_mappings?.[0]
      const project = projectMapping?.project
      const block = projectMapping?.block

      // Так как все версии имеют одинаковый номер (1), нужно использовать ID версии
      let defaultSelectedVersionId: string | undefined
      let defaultSelectedVersionNumber: number | undefined

      if (versions.length > 0) {
        // Находим версию с максимальным номером версии
        const maxVersion = versions.reduce(
          (max: DocumentationVersion, current: DocumentationVersion) => {
            return current.version_number > max.version_number ? current : max
          },
          versions[0],
        )

        defaultSelectedVersionId = maxVersion.id
        defaultSelectedVersionNumber = maxVersion.version_number
      }

      return {
        id: doc.id, // Используем UUID как есть
        documentation_id: doc.id,
        stage: doc.stage || 'П',
        tag_id: doc.tag_id, // Добавляем tag_id для фильтрации
        tag_name: doc.tag?.name || '',
        tag_number: doc.tag?.tag_number || 0,
        project_code: doc.code,
        project_name: project?.name || '',
        version_count: versions.length,
        versions,
        selected_version: defaultSelectedVersionNumber,
        selected_version_id: defaultSelectedVersionId, // Добавляем ID выбранной версии
        comments: '', // TODO: загрузить комментарии
        project_id: project?.id || null,
        block_id: block?.id || null,
        color: doc.color || '', // TODO: убедиться что колонка существует в БД
      }
    })

    return tableData
  },

  // Создание или обновление документации
  async upsertDocumentation(
    code: string,
    tagId?: number,
    projectId?: string,
    blockId?: string,
    _color?: string,
    stage?: 'П' | 'Р',
  ) {
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
        { onConflict: 'code' },
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to upsert documentation code:', error)
      throw error
    }

    // 2. Сохраняем связь с проектом и корпусом в таблице маппинга
    if (projectId) {
      const { error: mappingError } = await supabase.from('documentations_projects_mapping').upsert(
        {
          documentation_id: data.id,
          project_id: projectId,
          block_id: blockId || null,
        },
        { onConflict: 'documentation_id,project_id' },
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
    filePath?: string,
    status: DocumentationVersion['status'] = 'not_filled',
  ) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const insertData = {
      documentation_id: documentationId,
      version_number: versionNumber,
      issue_date: issueDate || null,
      file_url: fileUrl || null,
      file_path: filePath || null,
      status,
    }

    const { data, error } = await supabase
      .from('documentation_versions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create documentation version:', error)
      console.error('Insert data that caused error:', insertData)
      throw error
    }

    return data as DocumentationVersion
  },

  // Создание или обновление версии документации
  async upsertVersion(
    documentationId: string,
    versionNumber: number,
    issueDate?: string,
    fileUrl?: string,
    filePath?: string,
    status: DocumentationVersion['status'] = 'not_filled',
  ) {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Сначала проверяем, существует ли версия
    const { data: existingVersion } = await supabase
      .from('documentation_versions')
      .select('id')
      .eq('documentation_id', documentationId)
      .eq('version_number', versionNumber)
      .single()

    const versionData = {
      documentation_id: documentationId,
      version_number: versionNumber,
      issue_date: issueDate || null,
      file_url: fileUrl || null,
      file_path: filePath || null,
      status,
    }

    if (existingVersion) {
      // Обновляем существующую версию
      const { data, error } = await supabase
        .from('documentation_versions')
        .update({
          issue_date: issueDate || null,
          file_url: fileUrl || null,
          file_path: filePath || null,
          status,
        })
        .eq('id', existingVersion.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update documentation version:', error)
        throw error
      }

      return data as DocumentationVersion
    } else {
      // Создаем новую версию
      const { data, error } = await supabase
        .from('documentation_versions')
        .insert(versionData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create documentation version:', error)
        throw error
      }

      return data as DocumentationVersion
    }
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

  // Обновление локальных файлов версии
  async updateVersionLocalFiles(versionId: string, localFiles: LocalFile[]) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_versions')
      .update({
        local_files: localFiles,
      })
      .eq('id', versionId)
      .select()
      .single()

    if (!error) {
      await supabase.from('documentation_file_paths').delete().eq('version_id', versionId)
      const rows = localFiles.map((f) => ({ version_id: versionId, file_path: f.path }))
      if (rows.length) {
        await supabase.from('documentation_file_paths').insert(rows)
      }
    }

    if (error) {
      console.error('Failed to update version local files:', error)
      throw error
    }

    return data as DocumentationVersion
  },

  // Проверка конфликтов перед импортом
  async checkForConflicts(rows: DocumentationImportRow[]): Promise<ImportConflict[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const conflicts: ImportConflict[] = []
    const uniqueCodes = [...new Set(rows.map((r) => r.code))]

    // Получаем project_id из первой строки (все строки импорта относятся к одному проекту)
    const projectId = rows[0]?.project_id

    if (!projectId) {
      console.warn('No project_id in import rows, checking conflicts globally')
    }

    // Получаем существующие записи с этими кодами
    const { data: existingDocs } = await supabase
      .from('documentations')
      .select(
        `
        *,
        tag:documentation_tags(*),
        versions:documentation_versions(*),
        project_mappings:documentations_projects_mapping!inner(
          project_id,
          block_id
        )
      `,
      )
      .in('code', uniqueCodes)

    if (existingDocs && existingDocs.length > 0) {
      // Фильтруем документы по проекту, если указан
      const relevantDocs = projectId
        ? existingDocs.filter((doc) =>
            doc.project_mappings?.some((mapping: any) => mapping.project_id === projectId),
          )
        : existingDocs

      // Создаем карту существующих документов с учетом версий
      const existingMap = new Map<string, any>()

      relevantDocs.forEach((doc) => {
        if (doc.versions && doc.versions.length > 0) {
          doc.versions.forEach((version: any) => {
            const key = `${doc.code}_${version.version_number}`
            existingMap.set(key, { ...doc, conflictVersion: version })
          })
        } else {
          // Если нет версий, все равно добавляем документ для проверки конфликта по коду
          existingMap.set(doc.code, doc)
        }
      })

      rows.forEach((row, index) => {
        // Проверяем конфликт по сочетанию код + версия
        const versionKey = `${row.code}_${row.version_number}`
        const existingWithVersion = existingMap.get(versionKey)

        if (existingWithVersion) {
          conflicts.push({
            row,
            existingData: existingWithVersion,
            index,
          })
        } else {
          // Проверяем, существует ли документ с таким кодом (для новых версий)
          const existingDoc = existingMap.get(row.code)
          if (existingDoc && !existingDoc.conflictVersion) {
            // Документ существует, но это новая версия - не конфликт
          }
        }
      })
    }

    return conflicts
  },

  // Импорт данных из Excel с учетом разрешения конфликтов
  async importFromExcelWithResolutions(
    rows: DocumentationImportRow[],
    resolutions?: Map<number, ConflictResolution>,
  ) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const results = []
    const errors = []
    const skipped = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Проверяем, есть ли решение для этой строки
      const hasResolution = resolutions?.has(i)
      const resolution = resolutions?.get(i)

      if (hasResolution && resolution === 'skip') {
        skipped.push({ row, reason: 'Пропущено пользователем' })
        continue
      }

      try {
        // Находим или создаем тэг по имени
        let tagId: number | null = null
        if (row.tag) {
          const { data: tags, error: tagError } = await supabase
            .from('documentation_tags')
            .select('id')
            .eq('name', row.tag)
            .limit(1)

          if (tagError) {
            console.error(`Error finding tag "${row.tag}":`, tagError)
          } else if (tags && tags.length > 0) {
            tagId = tags[0].id
          }
        }

        // Если пользователь выбрал "Принять" при конфликте, устанавливаем флаг перезаписи
        const forceOverwrite = hasResolution && resolution === 'accept'

        // Используем комплексный метод сохранения для Excel импорта
        const result = await this.saveDocumentationComplete({
          code: row.code,
          tagId: tagId ?? undefined,
          projectId: row.project_id,
          blockId: row.block_id,
          stage: row.stage || 'П',
          versionNumber: row.version_number,
          issueDate: row.issue_date,
          fileUrl: row.file_url,
          status: 'not_filled',
          forceOverwrite,
        })

        results.push({ row, ...result })
      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, row, error)
        errors.push({ row, error })
      }
    }

    return { results, errors, skipped }
  },

  // Старый метод для обратной совместимости (без проверки конфликтов)
  async importFromExcel(rows: DocumentationImportRow[]) {
    return this.importFromExcelWithResolutions(rows)
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
    const { error: linkError } = await supabase.from('entity_comments_mapping').insert({
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

    return (data || [])
      .map((item: { comment: Comment | Comment[] }) => {
        if (Array.isArray(item.comment)) {
          return item.comment[0]
        }
        return item.comment
      })
      .filter(Boolean) as Comment[]
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
    filePath?: string
    status?: DocumentationVersion['status']
    comment?: string
    forceOverwrite?: boolean // Флаг для принудительной перезаписи при конфликте
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
        data.stage,
      )

      // 2. Создаем или обновляем версию документации
      let version: DocumentationVersion | null = null
      if (data.versionNumber) {
        // Если флаг forceOverwrite установлен, используем upsertVersion для перезаписи
        if (data.forceOverwrite) {
          version = await this.upsertVersion(
            doc.id,
            data.versionNumber,
            data.issueDate,
            data.fileUrl,
            data.filePath,
            data.status || 'not_filled',
          )
          version = await this.createVersion(
            doc.id,
            data.versionNumber,
            data.issueDate,
            data.fileUrl,
            data.filePath,
            data.status || 'not_filled',
          )
        }
      }

      // 3. Сохраняем комментарий, если есть
      let comment: Comment | null = null
      if (data.comment && data.comment.trim()) {
        comment = await this.addComment(data.comment, 'documentation', doc.id)
      }

      return {
        documentation: doc,
        version,
        comment,
      }
    } catch (error) {
      console.error('Failed to save documentation complete:', error)
      throw error
    }
  },
}
