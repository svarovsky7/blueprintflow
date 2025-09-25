import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal, Input, Button, List, Space, Typography, message } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography

interface Comment {
  id: string
  comment_text: string
  author: string
  created_at: string
}

interface DebouncedCommentModalProps {
  open: boolean
  onCancel: () => void
  comments: Comment[]
  onAddComment: (text: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  title?: string
  loading?: boolean
}

const DebouncedCommentModal: React.FC<DebouncedCommentModalProps> = ({
  open,
  onCancel,
  comments,
  onAddComment,
  onDeleteComment,
  title = 'Комментарии',
  loading = false,
}) => {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Debounced text area для уменьшения re-renders
  const [localComment, setLocalComment] = useState('')

  useEffect(() => {
    setLocalComment(newComment)
  }, [newComment])

  const debouncedSetComment = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setNewComment(value)
        }, 200)
      }
    })(),
    [],
  )

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setLocalComment(value)
      debouncedSetComment(value)
    },
    [debouncedSetComment],
  )

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) {
      message.warning('Введите текст комментария')
      return
    }

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
      setLocalComment('')
      message.success('Комментарий добавлен')
    } catch (error) {
      console.error('Ошибка добавления комментария:', error)
      message.error('Не удалось добавить комментарий')
    } finally {
      setIsSubmitting(false)
    }
  }, [newComment, onAddComment])

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      setDeletingIds((prev) => new Set(prev).add(commentId))
      try {
        await onDeleteComment(commentId)
        message.success('Комментарий удален')
      } catch (error) {
        console.error('Ошибка удаления комментария:', error)
        message.error('Не удалось удалить комментарий')
      } finally {
        setDeletingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(commentId)
          return newSet
        })
      }
    },
    [onDeleteComment],
  )

  // Мемоизированный список комментариев
  const commentsList = useMemo(
    () => (
      <List
        dataSource={comments}
        size="small"
        locale={{ emptyText: 'Комментариев нет' }}
        renderItem={(comment) => (
          <List.Item
            key={comment.id}
            actions={[
              <Button
                key="delete"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteComment(comment.id)}
                loading={deletingIds.has(comment.id)}
                size="small"
                danger
              />,
            ]}
          >
            <List.Item.Meta
              title={
                <Space size="small">
                  <Text strong>{comment.author}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(comment.created_at).toLocaleString('ru-RU')}
                  </Text>
                </Space>
              }
              description={comment.comment_text}
            />
          </List.Item>
        )}
      />
    ),
    [comments, deletingIds, handleDeleteComment],
  )

  const handleCancel = useCallback(() => {
    setNewComment('')
    setLocalComment('')
    onCancel()
  }, [onCancel])

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Список существующих комментариев */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>{commentsList}</div>

        {/* Добавление нового комментария */}
        <Space.Compact direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={localComment}
            onChange={handleCommentChange}
            placeholder="Введите комментарий..."
            rows={3}
            disabled={loading || isSubmitting}
            showCount
            maxLength={500}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddComment}
            loading={isSubmitting}
            disabled={loading || !localComment.trim()}
            style={{ alignSelf: 'flex-end', marginTop: '8px' }}
          >
            Добавить комментарий
          </Button>
        </Space.Compact>
      </Space>
    </Modal>
  )
}

export default React.memo(DebouncedCommentModal)
