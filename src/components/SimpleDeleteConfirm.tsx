import React from 'react'
import { Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface SimpleDeleteConfirmProps {
  title?: string
  content?: string
  onConfirm: () => void
  children: React.ReactElement
}

const SimpleDeleteConfirm: React.FC<SimpleDeleteConfirmProps> = ({
  title = 'Удалить запись?',
  content = 'Вы уверены, что хотите удалить эту запись?',
  onConfirm,
  children
}) => {
  const showDeleteConfirm = () => {
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          {title}
        </div>
      ),
      content,
      okText: 'Да',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: onConfirm,
      centered: true,
      zIndex: 200000,
      maskClosable: false,
    })
  }

  return React.cloneElement(children, {
    ...children.props,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      showDeleteConfirm()
      children.props.onClick?.(e)
    }
  })
}

export default SimpleDeleteConfirm