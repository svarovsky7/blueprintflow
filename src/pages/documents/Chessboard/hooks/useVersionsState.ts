import { useState, useCallback } from 'react'
import { message } from 'antd'
import type { DocumentVersion, DocumentationForVersions } from '../types'

export const useVersionsState = () => {
  const [versionsModalOpen, setVersionsModalOpen] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})

  const openVersionsModal = useCallback(
    (
      selectedDocumentations: DocumentationForVersions[],
      documentVersions: DocumentVersion[]
    ) => {
      // Автоматически устанавливаем последние версии, если они еще не установлены
      if (selectedDocumentations.length > 0 && documentVersions.length > 0) {
        const newVersions: Record<string, string> = { ...selectedVersions }
        let hasChanges = false

        selectedDocumentations.forEach((doc) => {
          if (!selectedVersions[doc.id]) {
            const versions = documentVersions.filter((v) => v.documentation_id === doc.id)
            if (versions.length > 0) {
              const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
              newVersions[doc.id] = latestVersion.id
              hasChanges = true
            }
          }
        })

        if (hasChanges) {
          setSelectedVersions(newVersions)
        }
      }

      setVersionsModalOpen(true)
    },
    [selectedVersions]
  )

  const closeVersionsModal = useCallback(() => {
    setVersionsModalOpen(false)
  }, [])

  const handleVersionSelect = useCallback((documentationId: string, versionId: string) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [documentationId]: versionId,
    }))
  }, [])

  const applyVersions = useCallback(
    (requiredDocIds: string[], onApply: (versions: Record<string, string>) => void) => {
      // Проверяем, что для всех документов выбрана версия
      const missingVersions = requiredDocIds.filter((docId) => !selectedVersions[docId])

      if (missingVersions.length > 0) {
        message.warning('Необходимо выбрать версии для всех документов')
        return
      }

      // Закрываем модальное окно и применяем версии
      setVersionsModalOpen(false)
      message.success(`Выбрано версий документов: ${Object.keys(selectedVersions).length}`)

      // Вызываем колбэк для применения версий
      onApply(selectedVersions)
    },
    [selectedVersions]
  )

  const resetVersions = useCallback(() => {
    setSelectedVersions({})
  }, [])

  return {
    versionsModalOpen,
    selectedVersions,
    openVersionsModal,
    closeVersionsModal,
    handleVersionSelect,
    applyVersions,
    resetVersions,
    setSelectedVersions,
  }
}