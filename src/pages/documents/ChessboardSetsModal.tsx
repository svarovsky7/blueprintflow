import { useState, useEffect } from 'react'
import { Modal, Table, Space, Button, Input, Select, Tag, message, Form, Row, Col, Card } from 'antd'
import { DeleteOutlined, EditOutlined, ArrowRightOutlined, CopyOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import {
  chessboardSetsApi,
  type ChessboardSetTableRow,
  type ChessboardSetSearchFilters,
} from '@/entities/chessboard'
import { supabase } from '@/lib/supabase'

interface ChessboardSetsModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
  onSelectSet?: (setId: string) => void
  currentSetId?: string | null
}

export default function ChessboardSetsModal({
  open,
  onClose,
  projectId,
  onSelectSet,
  currentSetId,
}: ChessboardSetsModalProps) {
  const [searchFilters, setSearchFilters] = useState<ChessboardSetSearchFilters>({
    project_id: projectId,
  })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<ChessboardSetTableRow | null>(null)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyingSet, setCopyingSet] = useState<ChessboardSetTableRow | null>(null)
  const [form] = Form.useForm()
  const [copyForm] = Form.useForm()

  // Обновляем фильтр проекта при изменении projectId
  useEffect(() => {
    setSearchFilters(prev => ({
      ...prev,
      project_id: projectId,
    }))
  }, [projectId])

  // Загрузка комплектов
  const {
    data: sets,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['chessboard-sets', searchFilters],
    queryFn: () => chessboardSetsApi.getSets(searchFilters),
    enabled: open && !!projectId,
  })

  // Загрузка справочников для форм копирования
  const { data: documentations } = useQuery({
    queryKey: ['documentations', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // Загружаем все документы без фильтрации по проекту
      // Это временное решение пока не решена проблема с mapping таблицами
      const { data, error } = await supabase
        .from('documentations')
        .select('id, code, name')
        .order('code')
      
      if (error) {
        console.error('Error loading documentations:', error)
        return []
      }
      
      return data || []
    },
    enabled: !!projectId,
  })

  const { data: documentVersions } = useQuery({
    queryKey: ['document-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentation_versions')
        .select('id, documentation_id, version_number')
        .order('documentation_id, version_number', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: blocks } = useQuery({
    queryKey: ['blocks', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // Загружаем все блоки без фильтрации
      // Это временное решение пока не решена проблема с mapping таблицами
      const { data, error } = await supabase
        .from('blocks')
        .select('id, name')
        .order('name')
      
      if (error) {
        console.error('Error loading blocks:', error)
        return []
      }
      
      return data || []
    },
    enabled: !!projectId,
  })

  const { data: documentationTags } = useQuery({
    queryKey: ['documentation-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentation_tags')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  const { data: costCategories } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  const { data: costTypes } = useQuery({
    queryKey: ['cost-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  // Удаление комплекта
  const handleDelete = async (setId: string) => {
    try {
      await chessboardSetsApi.deleteSet(setId)
      message.success('Комплект удален')
      refetch()
    } catch (error) {
      console.error('Ошибка удаления комплекта:', error)
      message.error('Ошибка при удалении комплекта')
    }
  }

  // Выбор комплекта для применения фильтров
  const handleSelectSet = (setId: string) => {
    onSelectSet?.(setId)
    onClose()
  }

  // Открытие модального окна редактирования
  const handleEdit = (record: ChessboardSetTableRow) => {
    setEditingSet(record)
    form.setFieldsValue({
      name: record.name,
    })
    setEditModalOpen(true)
  }

  // Сохранение изменений комплекта
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingSet) {
        await chessboardSetsApi.updateSet(editingSet.id, {
          name: values.name,
        })
        
        message.success('Комплект обновлен')
        setEditModalOpen(false)
        setEditingSet(null)
        form.resetFields()
        refetch()
      }
    } catch (error) {
      console.error('Ошибка обновления комплекта:', error)
      message.error('Ошибка при обновлении комплекта')
    }
  }

  // Закрытие модального окна редактирования
  const handleCancelEdit = () => {
    setEditModalOpen(false)
    setEditingSet(null)
    form.resetFields()
  }

  // Открытие модального окна копирования
  const handleCopy = (record: ChessboardSetTableRow) => {
    setCopyingSet(record)
    
    // Подготавливаем данные документов с их версиями
    const documentsData = record.documents?.map((doc) => ({
      documentation_id: doc.documentation_id,
      version_id: doc.version_id,
    })) || []


    copyForm.setFieldsValue({
      name: `${record.name || record.set_number} (копия)`,
      documents: documentsData,
      tag_id: record.tag_id || undefined,
      block_ids: record.block_ids || [],
      cost_category_ids: record.cost_category_ids || [],
      cost_type_ids: record.cost_type_ids || [],
    })
    setCopyModalOpen(true)
  }

  // Сохранение копии комплекта
  const handleSaveCopy = async () => {
    try {
      const values = await copyForm.validateFields()
      
      if (copyingSet) {
        // Создаем новый комплект с обновленными данными
        await chessboardSetsApi.createSet({
          project_id: projectId!,
          name: values.name,
          documents: values.documents || [],
          tag_id: values.tag_id,
          block_ids: values.block_ids || [],
          cost_category_ids: values.cost_category_ids || [],
          cost_type_ids: values.cost_type_ids || [],
          status_id: 'in_progress', // Статус "В работе"
        })
        
        message.success('Комплект скопирован')
        setCopyModalOpen(false)
        setCopyingSet(null)
        copyForm.resetFields()
        refetch()
      }
    } catch (error) {
      console.error('Ошибка копирования комплекта:', error)
      message.error('Ошибка при копировании комплекта')
    }
  }

  // Закрытие модального окна копирования
  const handleCancelCopy = () => {
    setCopyModalOpen(false)
    setCopyingSet(null)
    copyForm.resetFields()
  }

  const columns: ColumnsType<ChessboardSetTableRow> = [
    {
      title: 'Номер комплекта',
      dataIndex: 'set_number',
      key: 'set_number',
      width: '10%',
      sorter: true,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: '15%',
      render: (name) => name || '-',
    },
    {
      title: 'Шифр проекта',
      dataIndex: 'documentation_code',
      key: 'documentation_code',
      width: '12%',
    },
    {
      title: 'Вер.',
      dataIndex: 'version_number',
      key: 'version_number',
      width: '4%',
      align: 'center',
    },
    {
      title: 'Раздел',
      dataIndex: 'tag_name',
      key: 'tag_name',
      width: '8%',
      render: (tagName) => tagName || 'Все',
    },
    {
      title: 'Корпуса',
      dataIndex: 'block_names',
      key: 'block_names',
      width: '8%',
      render: (blockNames) => blockNames || 'Все',
    },
    {
      title: 'Категории затрат',
      dataIndex: 'cost_category_names',
      key: 'cost_category_names',
      width: '12%',
      render: (categoryNames) => categoryNames || 'Все',
    },
    {
      title: 'Виды затрат',
      dataIndex: 'cost_type_names',
      key: 'cost_type_names',
      width: '12%',
      render: (typeNames) => typeNames || 'Все',
    },
    {
      title: 'Статус',
      dataIndex: 'status_name',
      key: 'status_name',
      width: '6%',
      render: (statusName, record) => <Tag color={record.status_color}>{statusName}</Tag>,
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '8%',
      render: (date) => new Date(date).toLocaleDateString('ru'),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: '8%',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={() => handleSelectSet(record.id)}
            title="Применить комплект"
            type="link"
          />
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
            title="Копировать комплект"
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать комплект"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            title="Удалить комплект"
          />
        </Space>
      ),
    },
  ]

  return (
    <>
      {/* Инлайн стили для выделения текущего комплекта цветом шапки сайта */}
      {currentSetId && (
        <style>{`
          .current-set-row > td {
            background-color: #1677ff20 !important;
            border-left: 4px solid #1677ff20 !important;
          }
          .current-set-row:hover > td {
            background-color: #1677ff20 !important;
          }
        `}</style>
      )}
      <Modal
        title={`Комплекты шахматок для проекта`}
        open={open}
        onCancel={onClose}
        width="95vw"
        footer={null}
        style={{ top: 20 }}
      >
      {/* Фильтры */}
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Поиск по номеру или названию"
          style={{ width: 250 }}
          value={searchFilters.search}
          onChange={(e) => setSearchFilters((prev) => ({ ...prev, search: e.target.value }))}
          allowClear
        />
        <Select
          placeholder="Статус"
          style={{ width: 150 }}
          value={searchFilters.status_id}
          onChange={(statusId) => setSearchFilters((prev) => ({ ...prev, status_id: statusId }))}
          allowClear
          options={Array.from(
            new Set(sets?.map((s) => ({ id: s.status_name, name: s.status_name }))),
          ).map((status) => ({
            value: status.id,
            label: status.name,
          }))}
        />
        <Select
          placeholder="Шифр проекта"
          style={{ width: 200 }}
          value={searchFilters.documentation_id}
          onChange={(docId) => setSearchFilters((prev) => ({ ...prev, documentation_id: docId }))}
          allowClear
          options={Array.from(
            new Set(
              sets?.map((s) => ({
                id: s.documentation_code,
                name: s.documentation_code,
              })),
            ),
          ).map((doc) => ({
            value: doc.id,
            label: doc.name,
          }))}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={sets}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 'max-content', y: 400 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        size="small"
        rowClassName={(record) => {
          if (record.id === currentSetId) {
            return 'current-set-row'
          }
          return ''
        }}
      />

      {/* Модальное окно редактирования комплекта */}
      <Modal
        title="Редактирование комплекта"
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={handleCancelEdit}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Название комплекта"
            rules={[{ required: false }]}
          >
            <Input placeholder="Введите название комплекта" />
          </Form.Item>
          
          {editingSet && (
            <div style={{ marginTop: 20 }}>
              <h4>Информация о комплекте:</h4>
              <p><strong>Номер:</strong> {editingSet.set_number}</p>
              <p><strong>Проект:</strong> {editingSet.project_name}</p>
              <p><strong>Шифр документа:</strong> {editingSet.documentation_code}</p>
              <p><strong>Раздел:</strong> {editingSet.tag_name || 'Все'}</p>
              <p><strong>Корпуса:</strong> {editingSet.block_names || 'Все'}</p>
              <p><strong>Категории затрат:</strong> {editingSet.cost_category_names || 'Все'}</p>
              <p><strong>Виды затрат:</strong> {editingSet.cost_type_names || 'Все'}</p>
              <p style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                Примечание: В текущей версии можно редактировать только название комплекта. 
                Для изменения фильтров создайте новый комплект.
              </p>
            </div>
          )}
        </Form>
      </Modal>

      {/* Модальное окно копирования комплекта */}
      <Modal
        title="Копирование комплекта"
        open={copyModalOpen}
        onOk={handleSaveCopy}
        onCancel={handleCancelCopy}
        okText="Создать копию"
        cancelText="Отмена"
        width={1000}
      >
        <Form
          form={copyForm}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Название комплекта"
            rules={[{ required: true, message: 'Введите название комплекта' }]}
          >
            <Input placeholder="Введите название комплекта" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="Документы и версии" size="small">
                <Form.List name="documents">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                          <Col span={10}>
                            <Form.Item
                              name={[field.name, 'documentation_id']}
                              rules={[{ required: true, message: 'Выберите документ' }]}
                            >
                              <Select
                                placeholder="Шифр документа"
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                  (option?.children || option?.label)?.toString().toLowerCase().includes(input.toLowerCase())
                                }
                              >
                                {documentations?.map(doc => (
                                  <Select.Option key={doc.id} value={doc.id}>
                                    {doc.code}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item
                              name={[field.name, 'version_id']}
                              rules={[{ required: true, message: 'Выберите версию' }]}
                            >
                              <Select
                                placeholder="Версия"
                                allowClear
                              >
                                {(() => {
                                  const docId = copyForm.getFieldValue(['documents', field.name, 'documentation_id'])
                                  return documentVersions?.filter(v => v.documentation_id === docId)
                                    .map(version => (
                                      <Select.Option key={version.id} value={version.id}>
                                        {version.version_number}
                                      </Select.Option>
                                    ))
                                })()}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                              title="Удалить документ"
                            />
                          </Col>
                        </Row>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        Добавить документ
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="Фильтры" size="small">
                <Form.Item name="tag_id" label="Раздел">
                  <Select
                    placeholder="Выберите раздел"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children || '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {documentationTags?.map(tag => (
                      <Select.Option key={tag.id} value={tag.id}>
                        {tag.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="block_ids" label="Корпуса">
                  <Select
                    mode="multiple"
                    placeholder="Выберите корпуса"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children || '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {blocks?.map(block => (
                      <Select.Option key={block.id} value={block.id}>
                        {block.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="cost_category_ids" label="Категории затрат">
                  <Select
                    mode="multiple"
                    placeholder="Выберите категории затрат"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children || '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {costCategories?.map(category => (
                      <Select.Option key={category.id} value={category.id}>
                        {category.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="cost_type_ids" label="Виды затрат">
                  <Select
                    mode="multiple"
                    placeholder="Выберите виды затрат"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children || '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {costTypes?.map(type => (
                      <Select.Option key={type.id} value={type.id}>
                        {type.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
              💡 Новый комплект будет создан со статусом "В работе"
            </p>
          </div>
        </Form>
      </Modal>
    </Modal>
    </>
  )
}
