import React, { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  Input,
  List,
  Popconfirm,
  Space,
  Typography,
  Empty,
  Spin,
  message,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  chessboardCommentsApi,
  type Comment,
  type CreateCommentData,
  type UpdateCommentData,
} from '@/entities/comments'

const { TextArea } = Input
const { Text } = Typography

interface CommentsManagementModalProps {
  open: boolean
  chessboardId: string
  onClose: () => void
}

interface EditingComment {
  id: string
  text: string
}

export const CommentsManagementModal: React.FC<CommentsManagementModalProps> = ({
  open,
  chessboardId,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const [newCommentText, setNewCommentText] = useState('')
  const [editingComment, setEditingComment] = useState<EditingComment | null>(null)

  // Загрузка комментариев
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chessboard-comments', chessboardId],
    queryFn: () => chessboardCommentsApi.getByChessboardId(chessboardId),
    enabled: open && !!chessboardId && !chessboardId.startsWith('new-'),
  })

  // Создание комментария
  const createCommentMutation = useMutation({
    mutationFn: (commentData: CreateCommentData) =>
      chessboardCommentsApi.createForChessboard(chessboardId, commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard-comments', chessboardId] })
      setNewCommentText('')
      message.success('Комментарий добавлен')
    },
    onError: (error) => {
      console.error('Error creating comment:', error)
      message.error('Ошибка при добавлении комментария')
    },
  })

  // Обновление комментария
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, updateData }: { commentId: string; updateData: UpdateCommentData }) =>
      chessboardCommentsApi.update(commentId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard-comments', chessboardId] })
      setEditingComment(null)
      message.success('Комментарий обновлен')
    },
    onError: (error) => {
      console.error('Error updating comment:', error)
      message.error('Ошибка при обновлении комментария')
    },
  })

  // Удаление комментария
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => chessboardCommentsApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard-comments', chessboardId] })
      message.success('Комментарий удален')
    },
    onError: (error) => {
      console.error('Error deleting comment:', error)
      message.error('Ошибка при удалении комментария')
    },
  })

  const handleAddComment = () => {
    if (!newCommentText.trim()) return

    createCommentMutation.mutate({
      comment_text: newCommentText.trim(),
    })
  }

  const handleStartEdit = (comment: Comment) => {
    setEditingComment({
      id: comment.id,
      text: comment.comment_text,
    })
  }

  const handleSaveEdit = () => {
    if (!editingComment || !editingComment.text.trim()) return

    updateCommentMutation.mutate({
      commentId: editingComment.id,
      updateData: {
        comment_text: editingComment.text.trim(),
      },
    })
  }

  const handleCancelEdit = () => {
    setEditingComment(null)
  }

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Очистка состояния при закрытии модального окна
  useEffect(() => {
    if (!open) {
      setNewCommentText('')
      setEditingComment(null)
    }
  }, [open])

  return (
    <Modal
      title="Управление комментариями"
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
    >
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Введите новый комментарий..."
            rows={3}
            maxLength={500}
            showCount
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddComment}
            loading={createCommentMutation.isPending}
            disabled={!newCommentText.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            Добавить
          </Button>
        </Space.Compact>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'red' }}>
            Ошибка загрузки комментариев
          </div>
        ) : comments.length === 0 ? (
          <Empty description="Комментариев пока нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item
                key={comment.id}
                actions={[
                  editingComment?.id === comment.id ? (
                    <Space key="edit-actions">
                      <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={handleSaveEdit}
                        loading={updateCommentMutation.isPending}
                      >
                        Сохранить
                      </Button>
                      <Button size="small" icon={<CloseOutlined />} onClick={handleCancelEdit}>
                        Отмена
                      </Button>
                    </Space>
                  ) : (
                    <Space key="default-actions">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleStartEdit(comment)}
                      />
                      <Popconfirm
                        title="Удаление комментария"
                        description="Вы уверены, что хотите удалить этот комментарий?"
                        onConfirm={() => handleDeleteComment(comment.id)}
                        okText="Да"
                        cancelText="Нет"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          loading={deleteCommentMutation.isPending}
                        />
                      </Popconfirm>
                    </Space>
                  ),
                ]}
              >
                <List.Item.Meta
                  description={
                    <div>
                      {editingComment?.id === comment.id ? (
                        <TextArea
                          value={editingComment.text}
                          onChange={(e) =>
                            setEditingComment({
                              ...editingComment,
                              text: e.target.value,
                            })
                          }
                          rows={3}
                          maxLength={500}
                          showCount
                        />
                      ) : (
                        <div>
                          <div style={{ marginBottom: 8, fontSize: '16px', fontWeight: 'normal' }}>
                            {comment.comment_text}
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Создан: {formatDate(comment.created_at)}
                            {comment.updated_at !== comment.created_at && (
                              <span> • Изменен: {formatDate(comment.updated_at)}</span>
                            )}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  )
}
