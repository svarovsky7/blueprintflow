import { supabase } from '@/lib/supabase'

export interface SetChangeStatus {
  hasChanges: boolean
  changesCount: number
  sourceVersion: number | null
  currentVersion: number | null
  lastChangeDate: string | null
  lastChangedBy: string | null
  lastChangedByName: string | null
}

export interface ChangeLogEntry {
  id: string
  set_id: string
  chessboard_id: string | null
  change_type: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by: string | null
  changed_at: string
  snapshot_data: Record<string, any>
  old_snapshot_data?: Record<string, any>
  changed_by_name?: string
}

export interface ChangeLogFilters {
  changeType?: 'INSERT' | 'UPDATE' | 'DELETE'
  dateFrom?: string
  dateTo?: string
  changedBy?: string
}

export interface VorSetDiff {
  added: ChangeLogEntry[]
  modified: ChangeLogEntry[]
  deleted: ChangeLogEntry[]
  totalChanges: number
}

export async function setCurrentUser(userId: string): Promise<void> {
  if (!userId) {
    console.warn('setCurrentUser: userId is empty')
    return
  }

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `SET LOCAL app.current_user_id = '${userId}'`,
    })

    if (error) {
      console.error('Failed to set current user:', error)
    }
  } catch (err) {
    console.error('Unexpected error in setCurrentUser:', err)
  }
}

export async function checkSetChanges(vorId: string): Promise<SetChangeStatus> {
  try {
    // ШАГ 1: Получить set_id и source_set_version из mapping
    const { data: mappingData, error: mappingError } = await supabase
      .from('vor_chessboard_sets_mapping')
      .select('set_id, source_set_version')
      .eq('vor_id', vorId)
      .single()

    if (mappingError) {
      console.error('Error fetching VOR mapping:', mappingError)
      throw mappingError
    }

    if (!mappingData) {
      return {
        hasChanges: false,
        changesCount: 0,
        sourceVersion: null,
        currentVersion: null,
        lastChangeDate: null,
        lastChangedBy: null,
        lastChangedByName: null,
      }
    }

    // ШАГ 2: Получить данные комплекта с информацией о пользователе
    const { data: setData, error: setError } = await supabase
      .from('chessboard_sets')
      .select(
        `
        version,
        updated_at,
        last_modified_by,
        users!chessboard_sets_last_modified_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `
      )
      .eq('id', mappingData.set_id)
      .single()

    if (setError) {
      console.error('Error fetching set data:', setError)
      throw setError
    }

    if (!setData) {
      return {
        hasChanges: false,
        changesCount: 0,
        sourceVersion: mappingData.source_set_version ?? 0,
        currentVersion: null,
        lastChangeDate: null,
        lastChangedBy: null,
        lastChangedByName: null,
      }
    }

    const sourceVersion = mappingData.source_set_version ?? 0
    const currentVersion = setData.version ?? 0
    const changesCount = Math.max(0, currentVersion - sourceVersion)

    // Формируем имя пользователя
    const user = setData.users as any
    const userName = user?.display_name ||
                     (user?.first_name && user?.last_name
                       ? `${user.first_name} ${user.last_name}`
                       : null)

    return {
      hasChanges: currentVersion > sourceVersion,
      changesCount,
      sourceVersion,
      currentVersion,
      lastChangeDate: setData.updated_at ?? null,
      lastChangedBy: setData.last_modified_by ?? null,
      lastChangedByName: userName,
    }
  } catch (err) {
    console.error('Unexpected error in checkSetChanges:', err)
    throw err
  }
}

export async function getSetChangeLog(
  setId: string,
  filters?: ChangeLogFilters
): Promise<ChangeLogEntry[]> {
  try {
    let query = supabase
      .from('chessboard_sets_change_log')
      .select(
        `
        id,
        set_id,
        chessboard_id,
        change_type,
        changed_by,
        changed_at,
        snapshot_data,
        old_snapshot_data,
        users:changed_by (
          display_name,
          first_name,
          last_name
        )
      `
      )
      .eq('set_id', setId)
      .order('changed_at', { ascending: false })

    if (filters?.changeType) {
      query = query.eq('change_type', filters.changeType)
    }

    if (filters?.dateFrom) {
      query = query.gte('changed_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('changed_at', filters.dateTo)
    }

    if (filters?.changedBy) {
      query = query.eq('changed_by', filters.changedBy)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching change log:', error)
      throw error
    }

    return (
      data?.map((entry: any) => {
        const user = entry.users
        const userName = user?.display_name ||
                         (user?.first_name && user?.last_name
                           ? `${user.first_name} ${user.last_name}`
                           : null)

        return {
          id: entry.id,
          set_id: entry.set_id,
          chessboard_id: entry.chessboard_id,
          change_type: entry.change_type,
          changed_by: entry.changed_by,
          changed_at: entry.changed_at,
          snapshot_data: entry.snapshot_data,
          old_snapshot_data: entry.old_snapshot_data,
          changed_by_name: userName,
        }
      }) ?? []
    )
  } catch (err) {
    console.error('Unexpected error in getSetChangeLog:', err)
    throw err
  }
}

export async function getVorSetDiff(vorId: string): Promise<VorSetDiff> {
  try {
    const changeStatus = await checkSetChanges(vorId)

    if (!changeStatus.hasChanges) {
      return {
        added: [],
        modified: [],
        deleted: [],
        totalChanges: 0,
      }
    }

    const { data: mappingData } = await supabase
      .from('vor_chessboard_sets_mapping')
      .select('set_id')
      .eq('vor_id', vorId)
      .single()

    if (!mappingData) {
      throw new Error('VOR mapping not found')
    }

    const changeLog = await getSetChangeLog(mappingData.set_id)

    const added = changeLog.filter((entry) => entry.change_type === 'INSERT')
    const modified = changeLog.filter((entry) => entry.change_type === 'UPDATE')
    const deleted = changeLog.filter((entry) => entry.change_type === 'DELETE')

    return {
      added,
      modified,
      deleted,
      totalChanges: changeLog.length,
    }
  } catch (err) {
    console.error('Unexpected error in getVorSetDiff:', err)
    throw err
  }
}
