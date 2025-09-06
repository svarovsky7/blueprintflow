export interface DocumentationTag {
  id: number
  tag_number: number
  name: string
  created_at: string
  updated_at: string
}

export type DocumentationTagCreateInput = Omit<DocumentationTag, 'id' | 'created_at' | 'updated_at'>

export type DocumentationTagUpdateInput = Partial<DocumentationTagCreateInput>
