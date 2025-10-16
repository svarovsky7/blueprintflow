import { useState } from 'react'
import { Modal, Form, Input, App, Select } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVorFromChessboardSet, VOR_TYPE_LABELS } from '@/entities/vor'
import type { CreateVorFromChessboardSetDto, VorType } from '@/entities/vor'

interface CreateVorModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (vorId: string) => void
  chessboardSet: {
    id: string
    name: string
    project_id: string
    set_number: string
  } | null
}

export default function CreateVorModal({
  open,
  onClose,
  onSuccess,
  chessboardSet,
}: CreateVorModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  // Мутация для создания ВОР
  const createVorMutation = useMutation({
    mutationFn: async (dto: CreateVorFromChessboardSetDto) => {
      return await createVorFromChessboardSet(dto)
    },
    onSuccess: (vorId: string) => {
      message.success('ВОР успешно создан')
      // Инвалидируем кеш для обновления списка ВОР комплекта
      queryClient.invalidateQueries({ queryKey: ['chessboard-sets-vors'] })
      onSuccess(vorId)
      handleClose()
    },
    onError: (error: any) => {
      console.error('Ошибка создания ВОР:', error)
      message.error('Ошибка при создании ВОР')
      setIsSubmitting(false)
    },
  })

  // Обработчик создания ВОР
  const handleCreate = async () => {
    if (!chessboardSet) {
      message.error('Не выбран комплект для создания ВОР')
      return
    }

    try {
      const values = await form.validateFields()
      setIsSubmitting(true)

      const dto: CreateVorFromChessboardSetDto = {
        name: values.name,
        project_id: chessboardSet.project_id,
        set_id: chessboardSet.id,
        rate_coefficient: 1.0, // По умолчанию коэффициент 1.0
        vor_type: values.vor_type, // Тип ВОР: brigade или contractor
      }

      createVorMutation.mutate(dto)
    } catch (error) {
      console.error('Ошибка валидации формы:', error)
      setIsSubmitting(false)
    }
  }

  // Обработчик закрытия модального окна
  const handleClose = () => {
    form.resetFields()
    setIsSubmitting(false)
    onClose()
  }

  // Генерируем предлагаемое название ВОР
  const getDefaultVorName = () => {
    if (!chessboardSet) return ''

    const currentDate = new Date().toLocaleDateString('ru')
    return `ВОР по комплекту ${chessboardSet.set_number} от ${currentDate}`
  }

  // Устанавливаем значение по умолчанию при открытии модального окна
  const handleAfterOpenChange = (open: boolean) => {
    if (open && chessboardSet) {
      form.setFieldValue('name', getDefaultVorName())
    }
  }

  return (
    <Modal
      title="Создание ведомости объемов работ"
      open={open}
      onOk={handleCreate}
      onCancel={handleClose}
      okText="Создать ВОР"
      cancelText="Отмена"
      confirmLoading={isSubmitting}
      width={600}
      destroyOnClose
      afterOpenChange={handleAfterOpenChange}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 20 }}
      >
        {chessboardSet && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
              <strong>Комплект:</strong> {chessboardSet.set_number}
            </p>
            {chessboardSet.name && (
              <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                <strong>Название:</strong> {chessboardSet.name}
              </p>
            )}
          </div>
        )}

        <Form.Item
          name="vor_type"
          label="Тип ведомости объемов работ"
          initialValue="brigade"
          rules={[{ required: true, message: 'Выберите тип ВОР' }]}
        >
          <Select
            placeholder="Выберите тип ВОР"
            options={[
              {
                value: 'brigade' as VorType,
                label: 'Для бригады (с ценами работ и материалов)',
              },
              {
                value: 'contractor' as VorType,
                label: 'Для подрядчика (без цен, только объемы)',
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Название ведомости объемов работ"
          rules={[
            { required: true, message: 'Введите название ВОР' },
            { min: 3, message: 'Название должно содержать минимум 3 символа' },
            { max: 200, message: 'Название не должно превышать 200 символов' },
          ]}
        >
          <Input.TextArea
            placeholder="Введите название ведомости объемов работ"
            autoSize={{ minRows: 2, maxRows: 4 }}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: '#e6f7ff',
            borderRadius: 6,
            fontSize: 12,
            color: '#666',
          }}
        >
          💡 <strong>Что произойдет при создании:</strong>
          <br />
          • Будет создана новая ВОР с указанным названием
          <br />
          • Автоматически загрузятся работы и материалы из комплекта шахматки
          <br />
          • Все данные будут помечены как не измененные (соответствуют комплекту)
          <br />• После создания вы сможете редактировать данные ВОР
        </div>
      </Form>
    </Modal>
  )
}