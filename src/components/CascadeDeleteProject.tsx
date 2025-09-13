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

  const handleDelete = async () => {
    try {
      if (!supabase) {
        message.error('Ошибка подключения к базе данных')
        return
      }

      // Удаляем проект (каскадное удаление настроено в БД)
      const { error } = await supabase.from('projects').delete().eq('id', projectId)

      if (error) {
        console.error('Ошибка при удалении проекта:', error)
        message.error('Не удалось удалить проект')
        return
      }

      message.success('Проект успешно удален')
      onSuccess?.()
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error)
      message.error('Произошла ошибка при удалении')
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
            ⚠️ Это действие также удалит все связанные данные: корпуса, этажи, документы и записи
            шахматки.
          </p>
        </div>
      ),
      okText: 'Да, удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: handleDelete,
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
