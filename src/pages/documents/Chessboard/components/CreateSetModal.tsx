import { useState, useEffect, useCallback } from 'react'
import { Modal, Form, Input, Select, Card, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ChessboardSetFilters, ChessboardSetDocument } from '@/entities/chessboard/types'

const { Text } = Typography

interface CreateSetModalProps {
  open: boolean
  onCancel: () => void
  onOk: (data: CreateSetFormData) => void
  initialFilters: {
    project_id: string
    project_name: string
    documentation_section_ids: string[]
    documentation_code_ids: string[]
    documentation_version_ids: Record<string, string>
    block_ids: string[]
    cost_category_ids: string[]
    detail_cost_category_ids: string[]
  }
  initialStatusId: string
}

export interface CreateSetFormData {
  name?: string
  filters: ChessboardSetFilters
  status_id: string
}

export const CreateSetModal = ({
  open,
  onCancel,
  onOk,
  initialFilters,
  initialStatusId,
}: CreateSetModalProps) => {
  const [form] = Form.useForm()

  // Локальные состояния для управления зависимостями фильтров
  const [selectedSections, setSelectedSections] = useState<string[]>(
    initialFilters.documentation_section_ids
  )
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
    initialFilters.documentation_code_ids
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilters.cost_category_ids
  )
  const [documentVersions, setDocumentVersions] = useState<Record<string, string>>(
    initialFilters.documentation_version_ids
  )

  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (open) {
      setSelectedSections(initialFilters.documentation_section_ids)
      setSelectedDocuments(initialFilters.documentation_code_ids)
      setSelectedCategories(initialFilters.cost_category_ids)
      setDocumentVersions(initialFilters.documentation_version_ids)

      form.setFieldsValue({
        name: undefined,
        documentation_section_ids: initialFilters.documentation_section_ids,
        documentation_code_ids: initialFilters.documentation_code_ids,
        block_ids: initialFilters.block_ids,
        cost_category_ids: initialFilters.cost_category_ids,
        detail_cost_category_ids: initialFilters.detail_cost_category_ids,
      })
    }
  }, [open, initialFilters, form])

  // Загрузка разделов (Тэги проекта)
  const { data: documentationSections = [] } = useQuery({
    queryKey: ['documentation-tags-for-create-set', initialFilters.project_id],
    queryFn: async () => {
      if (!initialFilters.project_id) return []

      const { data } = await supabase
        .from('documentations_projects_mapping')
        .select(`
          documentations!inner(
            tag_id,
            documentation_tags!inner(id, name, tag_number)
          )
        `)
        .eq('project_id', initialFilters.project_id)

      const uniqueTags = new Map()
      data?.forEach((item) => {
        const tag = item.documentations?.documentation_tags
        if (tag) {
          uniqueTags.set(tag.id, tag)
        }
      })

      return Array.from(uniqueTags.values())
        .sort((a, b) => a.tag_number - b.tag_number)
        .map((t) => ({ value: t.id, label: t.name }))
    },
    enabled: !!initialFilters.project_id && open,
  })

  // Загрузка шифров документов (зависит от разделов)
  const { data: documentationCodes = [] } = useQuery({
    queryKey: ['documentation-for-create-set', initialFilters.project_id, selectedSections],
    queryFn: async () => {
      if (!initialFilters.project_id || selectedSections.length === 0) return []

      const { data } = await supabase
        .from('documentations_projects_mapping')
        .select(`
          documentations!inner(
            id, code, project_name, tag_id
          )
        `)
        .eq('project_id', initialFilters.project_id)
        .in('documentations.tag_id', selectedSections)

      return (
        data
          ?.map((item) => item.documentations)
          .filter(Boolean)
          .sort((a, b) => a!.code.localeCompare(b!.code))
          .map((d) => ({ value: d!.id, label: `${d!.code} - ${d!.project_name}` })) || []
      )
    },
    enabled: !!initialFilters.project_id && selectedSections.length > 0 && open,
  })

  // Загрузка версий документов для каждого выбранного документа
  const { data: allDocumentVersions = [] } = useQuery({
    queryKey: ['document-versions-for-create-set', selectedDocuments],
    queryFn: async () => {
      if (selectedDocuments.length === 0) return []

      const { data } = await supabase
        .from('documentation_versions')
        .select('*')
        .in('documentation_id', selectedDocuments)
        .order('version_number', { ascending: false })

      return data || []
    },
    enabled: selectedDocuments.length > 0 && open,
  })

  // Загрузка корпусов
  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks-for-create-set', initialFilters.project_id],
    queryFn: async () => {
      if (!initialFilters.project_id) return []
      const { data } = await supabase
        .from('projects_blocks')
        .select('blocks(id, name)')
        .eq('project_id', initialFilters.project_id)
      return data?.map((pb) => ({ value: pb.blocks.id, label: pb.blocks.name })) || []
    },
    enabled: !!initialFilters.project_id && open,
  })

  // Загрузка категорий затрат
  const { data: costCategories = [] } = useQuery({
    queryKey: ['cost-categories-for-create-set'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cost_categories')
        .select('id, number, name')
        .order('number')
      return data?.map((c) => ({ value: c.id.toString(), label: c.name })) || []
    },
    enabled: open,
  })

  // Загрузка видов затрат (зависит от категорий)
  const { data: costTypes = [] } = useQuery({
    queryKey: ['cost-types-for-create-set', selectedCategories],
    queryFn: async () => {
      if (selectedCategories.length === 0) return []
      const { data } = await supabase
        .from('detail_cost_categories_mapping')
        .select('detail_cost_categories(id, name)')
        .in('cost_category_id', selectedCategories.map((id) => parseInt(id)))

      const uniqueDetails = new Map()
      data?.forEach((item) => {
        const detail = item.detail_cost_categories
        if (detail) {
          uniqueDetails.set(detail.id, detail)
        }
      })

      return Array.from(uniqueDetails.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({ value: t.id.toString(), label: t.name }))
    },
    enabled: selectedCategories.length > 0 && open,
  })

  // Загрузка данных документов для отображения
  const { data: documentsInfo = [] } = useQuery({
    queryKey: ['documents-info-for-create-set', selectedDocuments],
    queryFn: async () => {
      if (selectedDocuments.length === 0) return []

      const { data } = await supabase
        .from('documentations')
        .select('id, code, project_name')
        .in('id', selectedDocuments)

      return data || []
    },
    enabled: selectedDocuments.length > 0 && open,
  })

  // Обработчики изменений
  const handleSectionChange = useCallback((values: string[]) => {
    setSelectedSections(values)
    // Сбрасываем документы и версии при смене разделов
    setSelectedDocuments([])
    setDocumentVersions({})
    form.setFieldsValue({
      documentation_code_ids: [],
    })
  }, [form])

  const handleDocumentChange = useCallback((values: string[]) => {
    setSelectedDocuments(values)
    // Сохраняем только версии для выбранных документов
    const newVersions: Record<string, string> = {}
    values.forEach(docId => {
      if (documentVersions[docId]) {
        newVersions[docId] = documentVersions[docId]
      }
    })
    setDocumentVersions(newVersions)
  }, [documentVersions])

  const handleVersionChange = useCallback((docId: string, versionId: string) => {
    setDocumentVersions(prev => ({
      ...prev,
      [docId]: versionId
    }))
  }, [])

  const handleCategoryChange = useCallback((values: string[]) => {
    setSelectedCategories(values)
    // Сбрасываем виды затрат при смене категорий
    form.setFieldsValue({
      detail_cost_category_ids: [],
    })
  }, [form])

  // Обработчик подтверждения
  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields()

      // Формируем массив документов с версиями
      const documents: ChessboardSetDocument[] = selectedDocuments.map(docId => ({
        documentation_id: docId,
        version_id: documentVersions[docId] || '',
      }))

      const filters: ChessboardSetFilters = {
        project_id: initialFilters.project_id,
        documents: documents.length > 0 ? documents : undefined,
        documentation_ids: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        tag_id: selectedSections.length > 0 ? Number(selectedSections[0]) : undefined,
        block_ids: values.block_ids?.length > 0 ? values.block_ids : undefined,
        cost_category_ids: values.cost_category_ids?.length > 0
          ? values.cost_category_ids.map(Number)
          : undefined,
        cost_type_ids: values.detail_cost_category_ids?.length > 0
          ? values.detail_cost_category_ids.map(Number)
          : undefined,
      }

      const formData: CreateSetFormData = {
        name: values.name || undefined,
        filters,
        status_id: initialStatusId,
      }

      onOk(formData)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }, [form, selectedDocuments, selectedSections, documentVersions, initialFilters, initialStatusId, onOk])

  // Обработчик отмены
  const handleCancel = useCallback(() => {
    form.resetFields()
    onCancel()
  }, [form, onCancel])

  return (
    <Modal
      title="Создание комплекта"
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      width={800}
      okText="Создать"
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ maxHeight: 500, overflowY: 'auto' }}
      >
        {/* Название комплекта */}
        <Form.Item
          name="name"
          label="Название комплекта"
          help="Если не указано, будет сгенерировано автоматически"
        >
          <Input placeholder="Введите название комплекта" />
        </Form.Item>

        {/* Проект (disabled) */}
        <Form.Item label="Проект">
          <Input value={initialFilters.project_name} disabled />
        </Form.Item>

        {/* Раздел */}
        <Form.Item
          name="documentation_section_ids"
          label="Раздел"
        >
          <Select
            mode="multiple"
            placeholder="Выберите разделы"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={documentationSections}
            onChange={handleSectionChange}
          />
        </Form.Item>

        {/* Шифр документа */}
        <Form.Item
          name="documentation_code_ids"
          label="Шифр документа"
        >
          <Select
            mode="multiple"
            placeholder="Выберите шифры документов"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={documentationCodes}
            onChange={handleDocumentChange}
            disabled={selectedSections.length === 0}
          />
        </Form.Item>

        {/* Версии документов */}
        {selectedDocuments.length > 0 && (
          <Card size="small" title="Версии документов" style={{ marginBottom: 16 }}>
            {documentsInfo.map((doc) => {
              const versions = allDocumentVersions.filter(v => v.documentation_id === doc.id)
              return (
                <div key={doc.id} style={{ marginBottom: 12 }}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    {doc.code} - {doc.project_name}
                  </Text>
                  <Select
                    placeholder="Выберите версию"
                    style={{ width: '100%' }}
                    value={documentVersions[doc.id]}
                    onChange={(value) => handleVersionChange(doc.id, value)}
                    options={versions.map(v => ({
                      value: v.id,
                      label: `Версия ${v.version_number}${v.issue_date ? ` (${new Date(v.issue_date).toLocaleDateString('ru')})` : ''}`
                    }))}
                  />
                </div>
              )
            })}
          </Card>
        )}

        {/* Корпус */}
        <Form.Item
          name="block_ids"
          label="Корпус"
        >
          <Select
            mode="multiple"
            placeholder="Выберите корпусы"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={blocks}
          />
        </Form.Item>

        {/* Категория затрат */}
        <Form.Item
          name="cost_category_ids"
          label="Категория затрат"
        >
          <Select
            mode="multiple"
            placeholder="Выберите категории затрат"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={costCategories}
            onChange={handleCategoryChange}
          />
        </Form.Item>

        {/* Вид затрат */}
        <Form.Item
          name="detail_cost_category_ids"
          label="Вид затрат"
        >
          <Select
            mode="multiple"
            placeholder="Выберите виды затрат"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={costTypes}
            disabled={selectedCategories.length === 0}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
