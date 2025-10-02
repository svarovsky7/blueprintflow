# Миграция полей finishing_pie - Инструкции

## Выполненные изменения

### 1. SQL миграция
**Файл:** `sql/rename_finishing_pie_columns.sql`
- `section_id` → `documentation_tag_id` (FK на documentation_tags)
- `project_code_id` → `version_id` (FK на documentation_versions)

**Выполнить миграцию в Supabase SQL Editor!**

### 2. TypeScript типы
**Файл:** `src/entities/finishing/model/types.ts`
- Обновлен `FinishingPie` interface
- Обновлен `CreateFinishingPieDto` с обязательными полями

### 3. Модальное окно создания
**Файл:** `src/pages/documents/Finishing/components/CreateFinishingPieModal.tsx`
- Каскадные выпадающие списки: Раздел → Шифр проекта → Версия
- Автоматический выбор последней версии
- Валидация обязательных полей

### 4. Страница Отделка
**Файл:** `src/pages/documents/Finishing.tsx`
- Интеграция модального окна создания документа
- Обновлены фильтры:
  - **Статичный блок**: Проект → Раздел → Шифры проектов + кнопка "Версии"
  - **Скрываемый блок**: Корпус, Категория затрат
- Шифры проектов зависят от выбранного раздела
- Добавлено модальное окно выбора версий документов (как в Шахматке)
- Фильтрация по версиям документов работает на клиенте
- Обновлены запросы для новых названий столбцов

### 5. Компоненты модальных окон
**Файл:** `src/pages/documents/Finishing/components/VersionsModal.tsx`
- Модальное окно выбора версий для каждого документа
- Карточки с Select для выбора версии
- Автоматический выбор последней версии

**Файл:** `src/pages/documents/Finishing/hooks/useVersionsState.ts`
- Хук для управления состоянием версий
- Логика открытия/закрытия модального окна
- Применение выбранных версий к фильтрам

## Что нужно сделать после миграции БД

1. **Выполнить SQL-миграцию** в Supabase
2. **Протестировать создание документа** через модальное окно
3. **Проверить фильтрацию** по новым полям
4. **Обновить страницы FinishingPieType.tsx и FinishingCalculation.tsx** для работы с новыми полями (если требуется)

## Структура данных

```
finishing_pie
├── id (uuid)
├── project_id (uuid FK)
├── block_id (uuid FK, nullable)
├── name (text)
├── cost_category_id (integer FK → cost_categories)
├── documentation_tag_id (integer FK → documentation_tags) ← НОВОЕ
├── version_id (uuid FK → documentation_versions) ← НОВОЕ
├── status_finishing_pie (uuid)
├── status_type_calculation (uuid)
├── created_at
└── updated_at
```

## Связи таблиц

```
finishing_pie
  ├→ cost_categories (cost_category_id)
  ├→ documentation_tags (documentation_tag_id)
  └→ documentation_versions (version_id)
       └→ documentations (documentation_id)
            ├→ documentation_tags (tag_id)
            └→ documentations_projects_mapping → projects
```
