import { useMemo, useState, useEffect } from 'react'
import { App, Button, Form, Input, Modal, Space, Table, Tag } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { unitsApi, type UnitWithSynonyms, type UnitFormData, type UnitSynonymFormData } from '@/entities/units'
import { useScale } from '@/shared/contexts/ScaleContext'

interface SynonymModalProps {
  visible: boolean
  unit: UnitWithSynonyms | null
  onClose: () => void
  onSuccess: () => void
}

function SynonymModal({ visible, unit, onClose, onSuccess }: SynonymModalProps) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const { scale } = useScale()

  useEffect(() => {
    if (unit) {
      form.setFieldValue('mainValue', unit.name)
    }
  }, [unit, form])

  const addSynonymMutation = useMutation({
    mutationFn: (data: UnitSynonymFormData) => unitsApi.addSynonym(data),
    onSuccess: () => {
      message.success('Синоним добавлен')
      form.setFieldValue('synonym', '') // Очищаем только поле нового синонима
      onSuccess() // Обновляем данные, но не закрываем модальное окно
    },
    onError: () => {
      message.error('Не удалось добавить синоним')
    }
  })

  const deleteSynonymMutation = useMutation({
    mutationFn: (id: string) => unitsApi.deleteSynonym(id),
    onSuccess: () => {
      message.success('Синоним удален')
      onSuccess() // Обновляем данные
    },
    onError: () => {
      message.error('Не удалось удалить синоним')
    }
  })

  const handleSubmit = async () => {
    if (!unit) return

    try {
      const values = await form.validateFields(['synonym']) // Валидируем только поле synonym
      await addSynonymMutation.mutateAsync({
        unit_id: unit.id,
        synonym: values.synonym.trim()
      })
    } catch (error) {
      // Validation error handled by form
    }
  }

  const handleDeleteSynonym = (synonymId: string, synonymText: string) => {
    modal.confirm({
      title: `Удалить синоним "${synonymText}"?`,
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => deleteSynonymMutation.mutate(synonymId),
    })
  }

  return (
    <Modal
      title={<span style={{ fontSize: `${13.44 * scale}px` }}>Управление синонимами</span>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} style={{ fontSize: `${13.44 * scale}px` }}>
          Закрыть
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={addSynonymMutation.isPending}
          style={{ fontSize: `${13.44 * scale}px` }}
        >
          Добавить
        </Button>
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" style={{ fontSize: `${13.44 * scale}px` }}>
        <Form.Item
          label={<span style={{ fontSize: `${13.44 * scale}px` }}>Основное значение</span>}
          name="mainValue"
        >
          <Input disabled style={{ fontSize: `${13.44 * scale}px` }} />
        </Form.Item>

        <Form.Item label={<span style={{ fontSize: `${13.44 * scale}px` }}>Существующие синонимы</span>}>
          <div style={{ marginBottom: 16 }}>
            {unit?.synonyms && unit.synonyms.length > 0 ? (
              <div>
                {unit.synonyms.map((synonym) => (
                  <Tag
                    key={synonym.id}
                    closable
                    onClose={() => handleDeleteSynonym(synonym.id, synonym.synonym)}
                    style={{ marginBottom: 4, marginRight: 4, fontSize: `${13.44 * scale}px` }}
                  >
                    {synonym.synonym}
                  </Tag>
                ))}
              </div>
            ) : (
              <div style={{ color: '#999', fontStyle: 'italic', fontSize: `${13.44 * scale}px` }}>Нет синонимов</div>
            )}
          </div>
        </Form.Item>

        <Form.Item
          label={<span style={{ fontSize: `${13.44 * scale}px` }}>Новый синоним</span>}
          name="synonym"
          rules={[
            { required: true, message: 'Введите синоним' },
            { whitespace: true, message: 'Синоним не может состоять только из пробелов' }
          ]}
        >
          <Input
            placeholder="Введите альтернативное название единицы измерения"
            onPressEnter={handleSubmit}
            style={{ fontSize: `${13.44 * scale}px` }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function Units() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const { scale } = useScale()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentUnit, setCurrentUnit] = useState<UnitWithSynonyms | null>(null)
  const [synonymModalVisible, setSynonymModalVisible] = useState(false)
  const [synonymUnit, setSynonymUnit] = useState<UnitWithSynonyms | null>(null)
  const [form] = Form.useForm()

  const {
    data: units,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['units-with-synonyms'],
    queryFn: () => unitsApi.getAllWithSynonyms(),
  })

  // Автоматически обновляем synonymUnit когда обновляются units
  useEffect(() => {
    if (synonymUnit && units) {
      const updatedUnit = units.find(u => u.id === synonymUnit.id)
      if (updatedUnit) {
        setSynonymUnit(updatedUnit)
      }
    }
  }, [units, synonymUnit])

  const createMutation = useMutation({
    mutationFn: (data: UnitFormData) => unitsApi.create(data),
    onSuccess: () => {
      message.success('Единица измерения создана')
      setModalMode(null)
      form.resetFields()
      refetch()
    },
    onError: () => {
      message.error('Не удалось создать единицу измерения')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitFormData }) => unitsApi.update(id, data),
    onSuccess: () => {
      message.success('Единица измерения обновлена')
      setModalMode(null)
      form.resetFields()
      refetch()
    },
    onError: () => {
      message.error('Не удалось обновить единицу измерения')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitsApi.delete(id),
    onSuccess: () => {
      message.success('Единица измерения удалена')
      refetch()
    },
    onError: () => {
      message.error('Не удалось удалить единицу измерения')
    }
  })

  const deleteSynonymMutation = useMutation({
    mutationFn: (id: string) => unitsApi.deleteSynonym(id),
    onSuccess: () => {
      message.success('Синоним удален')
      refetch()
    },
    onError: () => {
      message.error('Не удалось удалить синоним')
    }
  })

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
  }

  const openViewModal = (record: UnitWithSynonyms) => {
    setCurrentUnit(record)
    setModalMode('view')
  }

  const openEditModal = (record: UnitWithSynonyms) => {
    setCurrentUnit(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    })
    setModalMode('edit')
  }

  const openSynonymModal = (record: UnitWithSynonyms) => {
    setSynonymUnit(record)
    setSynonymModalVisible(true)
  }

  const closeModal = () => {
    setModalMode(null)
    setCurrentUnit(null)
    form.resetFields()
  }

  const closeSynonymModal = () => {
    setSynonymModalVisible(false)
    setSynonymUnit(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (modalMode === 'add') {
        await createMutation.mutateAsync(values)
      } else if (modalMode === 'edit' && currentUnit) {
        await updateMutation.mutateAsync({ id: currentUnit.id, data: values })
      }
    } catch (error) {
      // Validation error handled by form
    }
  }

  const handleDelete = (record: UnitWithSynonyms) => {
    modal.confirm({
      title: `Удалить единицу измерения "${record.name}"?`,
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(record.id),
    })
  }

  const handleDeleteSynonym = (synonymId: string, synonymText: string) => {
    modal.confirm({
      title: `Удалить синоним "${synonymText}"?`,
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => deleteSynonymMutation.mutate(synonymId),
    })
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: UnitWithSynonyms, b: UnitWithSynonyms) => a.name.localeCompare(b.name),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Синонимы',
      key: 'synonyms',
      render: (record: UnitWithSynonyms) => {
        const synonyms = record.synonyms || []

        if (synonyms.length === 0) {
          return (
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => openSynonymModal(record)}
              size="small"
              style={{ fontSize: '11.2px' }}
            >
              Добавить синоним
            </Button>
          )
        }

        return (
          <div>
            <div style={{ marginBottom: 8 }}>
              {synonyms.map((synonym) => (
                <Tag
                  key={synonym.id}
                  closable
                  onClose={() => handleDeleteSynonym(synonym.id, synonym.synonym)}
                  style={{ marginBottom: 4, fontSize: '11.2px' }}
                >
                  {synonym.synonym}
                </Tag>
              ))}
            </div>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => openSynonymModal(record)}
              size="small"
              style={{ fontSize: '11.2px' }}
            >
              Добавить
            </Button>
          </div>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: UnitWithSynonyms) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
            aria-label="Просмотр"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            aria-label="Редактировать"
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            aria-label="Удалить"
          />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Единицы измерения</h2>
        <Button type="primary" onClick={openAddModal}>
          Добавить единицу измерения
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={units}
        loading={isLoading}
        rowKey="id"
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего ${total} записей`,
        }}
        style={{ fontSize: `${13.44 * scale}px` }}
      />

      <Modal
        title={
          <span style={{ fontSize: `${13.44 * scale}px` }}>
            {modalMode === 'add'
              ? 'Добавить единицу измерения'
              : modalMode === 'edit'
              ? 'Редактировать единицу измерения'
              : 'Просмотр единицы измерения'}
          </span>
        }
        open={modalMode !== null}
        onCancel={closeModal}
        footer={
          modalMode === 'view' ? [
            <Button key="close" onClick={closeModal} style={{ fontSize: `${13.44 * scale}px` }}>
              Закрыть
            </Button>
          ] : [
            <Button key="cancel" onClick={closeModal} style={{ fontSize: `${13.44 * scale}px` }}>
              Отмена
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ fontSize: `${13.44 * scale}px` }}
            >
              {modalMode === 'add' ? 'Создать' : 'Сохранить'}
            </Button>
          ]
        }
      >
        <Form form={form} layout="vertical" style={{ fontSize: `${13.44 * scale}px` }}>
          <Form.Item
            label={<span style={{ fontSize: `${13.44 * scale}px` }}>Название</span>}
            name="name"
            rules={[{ required: true, message: 'Введите название единицы измерения' }]}
          >
            <Input disabled={modalMode === 'view'} style={{ fontSize: `${13.44 * scale}px` }} />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: `${13.44 * scale}px` }}>Описание</span>}
            name="description"
          >
            <Input.TextArea disabled={modalMode === 'view'} rows={3} style={{ fontSize: `${13.44 * scale}px` }} />
          </Form.Item>

          {modalMode === 'view' && currentUnit?.synonyms && currentUnit.synonyms.length > 0 && (
            <Form.Item label={<span style={{ fontSize: `${13.44 * scale}px` }}>Синонимы</span>}>
              <div>
                {currentUnit.synonyms.map((synonym) => (
                  <Tag key={synonym.id} style={{ marginBottom: 4, fontSize: `${13.44 * scale}px` }}>
                    {synonym.synonym}
                  </Tag>
                ))}
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <SynonymModal
        visible={synonymModalVisible}
        unit={synonymUnit}
        onClose={closeSynonymModal}
        onSuccess={() => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['units-with-synonyms'] })
        }}
      />
    </div>
  )
}