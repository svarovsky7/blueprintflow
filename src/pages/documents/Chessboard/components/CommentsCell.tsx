import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { PlusOutlined, CommentOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { chessboardCommentsApi } from '@/entities/comments'
import { CommentsManagementModal } from './CommentsManagementModal'

interface CommentsCellProps {
  rowId: string
  mode?: 'view' | 'edit' | 'add'
}

export const CommentsCell: React.FC<CommentsCellProps> = ({ rowId, mode = 'view' }) => {
  const [modalVisible, setModalVisible] = useState(false)

  // Загружаем комментарии для определения отображения кнопки
  const { data: comments = [] } = useQuery({
    queryKey: ['chessboard-comments', rowId],
    queryFn: () => chessboardCommentsApi.getByChessboardId(rowId),
    enabled: !!rowId,
  })

  // Определяем, есть ли комментарии
  const hasComments = comments.length > 0
  const latestComment = hasComments ? comments[0] : null

  // Для отображения первых 8 символов + многоточие
  const displayText = latestComment
    ? latestComment.comment_text.substring(0, 8) +
      (latestComment.comment_text.length > 8 ? '...' : '')
    : ''

  const handleOpenModal = () => {
    setModalVisible(true)
  }

  const handleCloseModal = () => {
    setModalVisible(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {hasComments ? (
        <Tooltip
          title={`${comments.length} комментарий(ев). Последний: ${latestComment?.comment_text}`}
        >
          <div>
            <Button
              type="text"
              size="small"
              icon={<CommentOutlined />}
              onClick={handleOpenModal}
              style={{ padding: '0 4px', height: 'auto', fontSize: '12px' }}
            >
              {displayText}
            </Button>
          </div>
        </Tooltip>
      ) : (
        <Tooltip title="Добавить комментарий">
          <div>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleOpenModal}
              style={{ padding: '0 4px', height: 'auto' }}
            />
          </div>
        </Tooltip>
      )}

      <CommentsManagementModal
        open={modalVisible}
        chessboardId={rowId}
        onClose={handleCloseModal}
      />
    </div>
  )
}
