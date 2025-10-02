import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, App } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreateFinishingPieDto } from '@/entities/finishing/model/types'

interface CreateFinishingPieModalProps {
  visible: boolean
  projectId: string
  onCancel: () => void
  onCreate: (dto: CreateFinishingPieDto) => Promise<void>
}

interface Option {
  value: string | number
  label: string
}

interface VersionOption {
  value: string
  label: string
  version_number: number
}

export function CreateFinishingPieModal({
  visible,
  projectId,
  onCancel,
  onCreate,
}: CreateFinishingPieModalProps) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const [selectedDocumentationTag, setSelectedDocumentationTag] = useState<number>()
  const [selectedDocumentation, setSelectedDocumentation] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Категории затрат
  const { data: costCategories = [] } = useQuery<Option[]>({
    queryKey: ['cost-categories-for-finishing-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((c) => ({ value: c.id, label: c.name })) || []
    },
  })

  // Разделы документации
  const { data: documentationTags = [] } = useQuery<Option[]>({
    queryKey: ['documentation-tags-for-finishing-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentation_tags')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((t) => ({ value: t.id, label: t.name })) || []
    },
  })

  // Шифры проектов (зависит от раздела)
  const { data: documentations = [] } = useQuery<Option[]>({
    queryKey: ['documentations-for-finishing-create', projectId, selectedDocumentationTag],
    queryFn: async () => {
      if (!projectId) return []

      let query = supabase
        .from('documentations')
        .select('id, code, documentations_projects_mapping!inner(project_id)')
        .eq('documentations_projects_mapping.project_id', projectId)

      if (selectedDocumentationTag) {
        query = query.eq('tag_id', selectedDocumentationTag)
      }

      const { data, error } = await query.order('code')

      if (error) throw error
      return data?.map((d) => ({ value: d.id, label: d.code })) || []
    },
    enabled: !!projectId,
  })

  // Версии шифра проекта (зависит от выбранного шифра)
  const { data: versions = [] } = useQuery<VersionOption[]>({
    queryKey: ['documentation-versions-for-finishing-create', selectedDocumentation],
    queryFn: async () => {
      if (!selectedDocumentation) return []

      const { data, error } = await supabase
        .from('documentation_versions')
        .select('id, version_number')
        .eq('documentation_id', selectedDocumentation)
        .order('version_number', { ascending: false })

      if (error) throw error
      return (
        data?.map((v) => ({
          value: v.id,
          label: `Версия ${v.version_number}`,
          version_number: v.version_number,
        })) || []
      )
    },
    enabled: !!selectedDocumentation,
  })

  // Автоматически выбрать последнюю версию
  useEffect(() => {
    if (versions.length > 0 && !form.getFieldValue('version_id')) {
      form.setFieldsValue({ version_id: versions[0].value })
    }
  }, [versions, form])

  // Сброс зависимых полей
  useEffect(() => {
    if (selectedDocumentationTag) {
      form.setFieldsValue({ documentation_id: undefined, version_id: undefined })
      setSelectedDocumentation(undefined)
    }
  }, [selectedDocumentationTag, form])

  useEffect(() => {
    if (selectedDocumentation) {
      form.setFieldsValue({ version_id: undefined })
    }
  }, [selectedDocumentation, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setIsSubmitting(true)

      const dto: CreateFinishingPieDto = {
        project_id: projectId,
        name: values.name,
        cost_category_id: values.cost_category_id,
        documentation_tag_id: values.documentation_tag_id,
        version_id: values.version_id,
      }

      await onCreate(dto)
      form.resetFields()
      setSelectedDocumentationTag(undefined)
      setSelectedDocumentation(undefined)
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Заполните все обязательные поля')
      } else {
        message.error(`Ошибка создания документа: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSelectedDocumentationTag(undefined)
    setSelectedDocumentation(undefined)
    onCancel()
  }

  return (
    <Modal
      title="Создание документа Типы пирогов"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={isSubmitting}
      okText="Создать"
      cancelText="Отмена"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Наименование документа"
          name="name"
          rules={[{ required: true, message: 'Введите наименование' }]}
        >
          <Input placeholder="Введите наименование документа" />
        </Form.Item>

        <Form.Item
          label="Категория затрат"
          name="cost_category_id"
          rules={[{ required: true, message: 'Выберите категорию затрат' }]}
        >
          <Select
            placeholder="Выберите категорию затрат"
            options={costCategories}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label="Раздел"
          name="documentation_tag_id"
          rules={[{ required: true, message: 'Выберите раздел' }]}
        >
          <Select
            placeholder="Выберите раздел"
            options={documentationTags}
            onChange={(value) => setSelectedDocumentationTag(value as number)}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label="Шифр проекта"
          name="documentation_id"
          rules={[{ required: true, message: 'Выберите шифр проекта' }]}
        >
          <Select
            placeholder="Выберите шифр проекта"
            options={documentations}
            onChange={(value) => setSelectedDocumentation(value as string)}
            disabled={!selectedDocumentationTag}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label="Версия проекта"
          name="version_id"
          rules={[{ required: true, message: 'Выберите версию' }]}
        >
          <Select
            placeholder="Выберите версию"
            options={versions}
            disabled={!selectedDocumentation}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
