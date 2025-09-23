export interface Comment {
  id: string
  comment_text: string
  author_id: number | null
  created_at: string
  updated_at: string
}

export interface CommentWithMapping extends Comment {
  entity_comments_mapping: Array<{
    entity_type: string
    entity_id: string
    comment_id: string
  }>
}

export interface CreateCommentData {
  comment_text: string
  author_id?: number | null
}

export interface UpdateCommentData {
  comment_text: string
}

export interface EntityCommentMapping {
  entity_type: string
  entity_id: string
  comment_id: string
}