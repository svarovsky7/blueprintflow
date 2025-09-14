import React from 'react'
import { Modal, App } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabase'

interface CascadeDeleteProjectProps {
  projectId: string
  projectName: string
  onSuccess?: () => void
  children: React.ReactElement
}

const CascadeDeleteProject: React.FC<CascadeDeleteProjectProps> = ({
  projectId,
  projectName,
  onSuccess,
  children,
}) => {
  const { message } = App.useApp()

  // Функция подсчёта данных для удаления
  const countDataForDeletion = async () => {
    try {
      if (!supabase) {
        throw new Error('Нет подключения к БД')
      }

      // Подсчитываем записи в шахматке
      const { count: chessboardCount } = await supabase
        .from('chessboard')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Подсчитываем комплекты
      const { count: setsCount } = await supabase
        .from('chessboard_sets')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Подсчитываем шифры проектов
      const { count: docsCount } = await supabase
        .from('documentations_projects_mapping')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Подсчитываем файлы в storage
      const { data: filesList } = await supabase
        .storage
        .from('files')
        .list(`projects/${projectId}`)

      const filesCount = filesList?.length || 0

      // Подсчитываем сметы
      const { count: estimatesCount } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Подсчитываем элементы смет через связанные сметы
      let estimateItemsCount = 0
      if (estimatesCount && estimatesCount > 0) {
        const { data: estimatesIds } = await supabase
          .from('estimates')
          .select('id')
          .eq('project_id', projectId)

        if (estimatesIds && estimatesIds.length > 0) {
          const estimateIdsList = estimatesIds.map(item => item.id)
          const { count: itemsCount } = await supabase
            .from('estimate_items')
            .select('*', { count: 'exact', head: true })
            .in('estimate_id', estimateIdsList)

          estimateItemsCount = itemsCount || 0
        }
      }

      // Подсчитываем блоки проекта
      const { count: projectBlocksCount } = await supabase
        .from('projects_blocks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Подсчитываем привязки этажей к блокам
      let blockFloorMappingCount = 0
      if (projectBlocksCount && projectBlocksCount > 0) {
        const { data: projectBlocksIds } = await supabase
          .from('projects_blocks')
          .select('block_id')
          .eq('project_id', projectId)

        if (projectBlocksIds && projectBlocksIds.length > 0) {
          const blockIdsList = projectBlocksIds.map(item => item.block_id)
          const { count: floorMappingCount } = await supabase
            .from('block_floor_mapping')
            .select('*', { count: 'exact', head: true })
            .in('block_id', blockIdsList)

          blockFloorMappingCount = floorMappingCount || 0
        }
      }

      // Подсчитываем ведомости объемов работ (если есть такая таблица)
      const { count: vorCount } = await supabase
        .from('vor')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      return {
        chessboardCount: chessboardCount || 0,
        setsCount: setsCount || 0,
        docsCount: docsCount || 0,
        filesCount,
        estimatesCount: estimatesCount || 0,
        estimateItemsCount,
        projectBlocksCount: projectBlocksCount || 0,
        blockFloorMappingCount,
        vorCount: vorCount || 0
      }
    } catch (error) {
      console.error('Ошибка подсчёта данных:', error)
      return {
        chessboardCount: 0,
        setsCount: 0,
        docsCount: 0,
        filesCount: 0,
        estimatesCount: 0,
        estimateItemsCount: 0,
        projectBlocksCount: 0,
        blockFloorMappingCount: 0,
        vorCount: 0
      }
    }
  }

  const handleDelete = async () => {
    try {
      if (!supabase) {
        message.error('Ошибка подключения к базе данных')
        return
      }

      console.log('🗑️ Начинаем каскадное удаление проекта:', projectId)

      // Шаг 1: Удаляем mapping таблицы связанные с шахматкой
      console.log('1️⃣ Удаляем mapping таблицы...')

      // Получаем ID записей chessboard для удаления связанных mappings
      const { data: chessboardIds } = await supabase
        .from('chessboard')
        .select('id')
        .eq('project_id', projectId)

      if (chessboardIds && chessboardIds.length > 0) {
        const chessboardIdsList = chessboardIds.map(item => item.id)

        // Удаляем chessboard_documentation_mapping
        await supabase
          .from('chessboard_documentation_mapping')
          .delete()
          .in('chessboard_id', chessboardIdsList)

        // Удаляем chessboard_rates_mapping
        await supabase
          .from('chessboard_rates_mapping')
          .delete()
          .in('chessboard_id', chessboardIdsList)
      }

      // Шаг 2: Удаляем записи из chessboard (шахматка)
      console.log('2️⃣ Удаляем записи из chessboard...')
      const { error: chessboardError } = await supabase
        .from('chessboard')
        .delete()
        .eq('project_id', projectId)

      if (chessboardError) {
        console.error('Ошибка при удалении записей шахматки:', chessboardError)
        message.error('Ошибка при удалении записей шахматки')
        return
      }

      // Шаг 3: Удаляем комплекты шахматки
      console.log('3️⃣ Удаляем комплекты шахматки...')
      const { error: setsError } = await supabase
        .from('chessboard_sets')
        .delete()
        .eq('project_id', projectId)

      if (setsError) {
        console.error('Ошибка при удалении комплектов:', setsError)
        message.error('Ошибка при удалении комплектов шахматки')
        return
      }

      // Шаг 4: Удаляем связи с документацией (шифры проектов)
      console.log('4️⃣ Удаляем связи с документацией...')
      const { error: docsError } = await supabase
        .from('documentations_projects_mapping')
        .delete()
        .eq('project_id', projectId)

      if (docsError) {
        console.error('Ошибка при удалении связей с документацией:', docsError)
        message.error('Ошибка при удалении связей с документацией')
        return
      }

      // Шаг 5: Получаем ID смет для проекта
      console.log('5️⃣ Получаем ID смет для проекта...')
      const { data: estimatesIds } = await supabase
        .from('estimates')
        .select('id')
        .eq('project_id', projectId)

      // Удаляем элементы смет если есть сметы
      if (estimatesIds && estimatesIds.length > 0) {
        console.log('📋 Удаляем элементы смет...')
        const estimateIdsList = estimatesIds.map(item => item.id)
        const { error: estimateItemsError } = await supabase
          .from('estimate_items')
          .delete()
          .in('estimate_id', estimateIdsList)

        if (estimateItemsError) {
          console.error('Ошибка при удалении элементов смет:', estimateItemsError)
          message.error('Ошибка при удалении элементов смет')
          return
        }
      }

      // Шаг 6: Удаляем сметы
      console.log('6️⃣ Удаляем сметы...')
      const { error: estimatesError } = await supabase
        .from('estimates')
        .delete()
        .eq('project_id', projectId)

      if (estimatesError) {
        console.error('Ошибка при удалении смет:', estimatesError)
        message.error('Ошибка при удалении смет')
        return
      }

      // Шаг 7: Удаляем ведомости объемов работ
      console.log('7️⃣ Удаляем ведомости объемов работ...')
      const { error: vorError } = await supabase
        .from('vor')
        .delete()
        .eq('project_id', projectId)

      if (vorError) {
        console.error('Ошибка при удалении ведомостей:', vorError)
        message.error('Ошибка при удалении ведомостей объемов работ')
        return
      }

      // Шаг 8: Получаем список файлов для удаления из storage
      console.log('8️⃣ Ищем файлы для удаления...')
      const { data: filesList, error: filesListError } = await supabase
        .storage
        .from('files')
        .list(`projects/${projectId}`)

      // Удаляем файлы из storage если они есть
      if (filesList && filesList.length > 0) {
        console.log('📁 Удаляем файлы из storage:', filesList.length)
        const filePaths = filesList.map(file => `projects/${projectId}/${file.name}`)
        const { error: filesDeleteError } = await supabase
          .storage
          .from('files')
          .remove(filePaths)

        if (filesDeleteError) {
          console.warn('Предупреждение: не удалось удалить некоторые файлы:', filesDeleteError)
        }
      }

      // Шаг 9: Получаем ID блоков проекта для удаления связанных данных
      console.log('9️⃣ Получаем ID блоков проекта...')
      const { data: projectBlocksIds } = await supabase
        .from('projects_blocks')
        .select('block_id')
        .eq('project_id', projectId)

      // Удаляем block_floor_mapping если есть блоки
      if (projectBlocksIds && projectBlocksIds.length > 0) {
        console.log('🏢 Удаляем привязки этажей к блокам...')
        const blockIdsList = projectBlocksIds.map(item => item.block_id)

        const { error: blockFloorMappingError } = await supabase
          .from('block_floor_mapping')
          .delete()
          .in('block_id', blockIdsList)

        if (blockFloorMappingError) {
          console.error('Ошибка при удалении привязок этажей:', blockFloorMappingError)
          message.error('Ошибка при удалении привязок этажей к блокам')
          return
        }
      }

      // Шаг 10: Удаляем связи проектов с блоками
      console.log('🔟 Удаляем связи проектов с блоками...')
      const { error: projectsBlocksError } = await supabase
        .from('projects_blocks')
        .delete()
        .eq('project_id', projectId)

      if (projectsBlocksError) {
        console.error('Ошибка при удалении связей проектов с блоками:', projectsBlocksError)
        message.error('Ошибка при удалении связей проектов с блоками')
        return
      }

      // Шаг 11: Удаляем блоки, которые больше не связаны ни с одним проектом
      if (projectBlocksIds && projectBlocksIds.length > 0) {
        console.log('🏗️ Удаляем изолированные блоки...')
        const blockIdsList = projectBlocksIds.map(item => item.block_id)

        // Для каждого блока проверяем, связан ли он с другими проектами
        for (const blockId of blockIdsList) {
          const { count: otherProjectsCount } = await supabase
            .from('projects_blocks')
            .select('*', { count: 'exact', head: true })
            .eq('block_id', blockId)

          // Если блок не связан с другими проектами, удаляем его
          if (!otherProjectsCount || otherProjectsCount === 0) {
            const { error: blockDeleteError } = await supabase
              .from('blocks')
              .delete()
              .eq('id', blockId)

            if (blockDeleteError) {
              console.warn('Предупреждение: не удалось удалить блок:', blockId, blockDeleteError)
            }
          }
        }
      }

      // Шаг 12: Удаляем сам проект
      console.log('1️⃣2️⃣ Удаляем проект...')
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (projectError) {
        console.error('Ошибка при удалении проекта:', projectError)
        message.error('Не удалось удалить проект')
        return
      }

      console.log('✅ Каскадное удаление проекта завершено успешно')
      message.success('Проект и все связанные данные успешно удалены')
      onSuccess?.()
    } catch (error) {
      console.error('Ошибка при каскадном удалении проекта:', error)
      message.error('Произошла ошибка при удалении проекта')
    }
  }

  // Функция показа второго модального окна с подробной информацией
  const showDetailedConfirm = async () => {
    try {
      const counts = await countDataForDeletion()

      Modal.confirm({
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            ОКОНЧАТЕЛЬНОЕ ПОДТВЕРЖДЕНИЕ
          </div>
        ),
        content: (
          <div>
            <p style={{ marginBottom: 16, fontSize: 14 }}>
              Проект <strong>"{projectName}"</strong> будет удалён безвозвратно вместе со следующими данными:
            </p>

            <div style={{ backgroundColor: '#fff2f0', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📋 Записи в шахматке:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.chessboardCount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📦 Комплекты шахматки:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.setsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📄 Шифры проектов:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.docsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📊 Сметы:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.estimatesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📋 Элементы смет:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.estimateItemsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>🏢 Блоки проекта:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.projectBlocksCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>🏗️ Привязки этажей:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.blockFloorMappingCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>📋 Ведомости объемов работ:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.vorCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📁 Загруженные файлы:</span>
                <strong style={{ color: '#ff4d4f' }}>{counts.filesCount}</strong>
              </div>
            </div>

            <p style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 'bold' }}>
              ⚠️ ВНИМАНИЕ: Это действие необратимо!
            </p>
          </div>
        ),
        okText: 'УДАЛИТЬ БЕЗВОЗВРАТНО',
        cancelText: 'Отмена',
        okType: 'danger',
        onOk: handleDelete,
        centered: true,
        zIndex: 200001,
        maskClosable: false,
        width: 520,
      })
    } catch (error) {
      console.error('Ошибка при подготовке детального подтверждения:', error)
      message.error('Ошибка при подготовке информации об удалении')
    }
  }

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          Удалить проект?
        </div>
      ),
      content: (
        <div>
          <p>
            Вы уверены, что хотите удалить проект <strong>"{projectName}"</strong>?
          </p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            ⚠️ Это действие удалит ВСЕ связанные данные:
          </p>
          <ul style={{ color: '#ff4d4f', fontSize: '11px', margin: '8px 0', paddingLeft: '16px' }}>
            <li>Записи шахматки и комплекты</li>
            <li>Шифры проектов в документации</li>
            <li>Сметы, элементы смет и ведомости объемов работ</li>
            <li>Загруженные файлы</li>
            <li>Блоки, привязки этажей и карточка проекта</li>
          </ul>
        </div>
      ),
      okText: 'Продолжить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: showDetailedConfirm,
      centered: true,
      zIndex: 200000,
      maskClosable: false,
      width: 480,
    })
  }

  return React.cloneElement(children, {
    ...children.props,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      showDeleteConfirm()
      children.props.onClick?.(e)
    },
  })
}

export default CascadeDeleteProject
