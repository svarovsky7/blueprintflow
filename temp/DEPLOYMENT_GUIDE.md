# Руководство по развёртыванию системы безопасности RPC

## 📋 Что реализовано

### ✅ SQL функции безопасности

**Файл:** `sql/create_all_rpc_functions.sql`

**Вспомогательные функции (3 шт):**
1. `is_user_active()` - проверка активности пользователя
2. `check_user_permission(object_code, action)` - проверка прав доступа
3. `raise_access_denied(action, object)` - генерация ошибки доступа

**Generic CRUD шаблоны (3 шт):**
1. `generic_create_reference()` - универсальное создание для справочников
2. `generic_update_reference()` - универсальное обновление
3. `generic_delete()` - универсальное удаление

**Chessboard RPC функции (4 шт):**
1. `chessboard_create()` - создание записи с валидацией
2. `chessboard_update()` - обновление записи
3. `chessboard_delete()` - удаление записи
4. `chessboard_batch_insert()` - массовый импорт из Excel

**Справочники (7 таблиц × 3 операции = 21 функция):**
1. **units** - `units_create()`, `units_update()`, `units_delete()`
2. **cost_categories** - `cost_categories_create()`, `cost_categories_update()`, `cost_categories_delete()`
3. **projects** - `projects_create()`, `projects_update()`, `projects_delete()`
4. **location** - `locations_create()`, `locations_update()`, `locations_delete()`
5. **rooms** - `rooms_create()`, `rooms_update()`, `rooms_delete()`
6. **statuses** - `statuses_create()`, `statuses_update()`, `statuses_delete()`
7. **documentation_tags** - `documentation_tags_create()`, `documentation_tags_update()`, `documentation_tags_delete()`

**ИТОГО: 31 RPC функция**

### ✅ TypeScript API обёртки

**Файл:** `src/entities/chessboard/api/chessboard-rpc-api.ts`

Реализованы функции:
- `createChessboardRowRPC()` - обёртка над chessboard_create
- `updateChessboardRowRPC()` - обёртка над chessboard_update
- `deleteChessboardRowRPC()` - обёртка над chessboard_delete
- `batchInsertChessboardRPC()` - обёртка над chessboard_batch_insert

### ✅ UI проверки прав (7 страниц)

**Обновлённые файлы:**
1. `src/pages/references/Units.tsx` - единицы измерения
2. `src/pages/references/Projects.tsx` - проекты
3. `src/pages/references/Rooms.tsx` - помещения
4. `src/pages/references/Locations.tsx` - локализации
5. `src/pages/references/CostCategories.tsx` - категории затрат
6. `src/pages/administration/Statuses.tsx` - статусы
7. `src/pages/administration/DocumentationTags.tsx` - тэги документации

**Добавлено:**
- Импорт `usePermissions` hook
- Проверки `canCreate`, `canEdit`, `canDelete`
- Условный рендеринг кнопок действий

---

## 🚀 Развёртывание

### Шаг 1: Подготовка

**1.1. Проверьте наличие DATABASE_URL**

```bash
# Windows (PowerShell)
echo $env:DATABASE_URL

# Linux/MacOS
echo $DATABASE_URL
```

Если переменная не задана:
1. Откройте Supabase Dashboard → Settings → Database
2. Скопируйте Connection String → URI
3. Установите переменную окружения

**1.2. Проверьте наличие psql**

```bash
psql --version
```

Если не установлен:
- Windows: [скачать PostgreSQL](https://www.postgresql.org/download/windows/)
- MacOS: `brew install postgresql`
- Linux: `sudo apt install postgresql-client`

**1.3. Создайте резервную копию БД (КРИТИЧЕСКИ ВАЖНО)**

```bash
# Экспорт схемы и данных
pg_dump "$DATABASE_URL" > backup_before_rpc_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 2: Применение SQL миграции

**2.1. Откройте терминал в корне проекта**

```bash
cd C:\Users\postoev.e.v\WebstormProjects\blueprintflow
```

**2.2. Примените миграцию**

```bash
psql "$DATABASE_URL" -f sql/create_all_rpc_functions.sql
```

**Ожидаемый вывод:**

```
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
...
NOTICE:  ✅ Все RPC функции успешно созданы!
NOTICE:
NOTICE:  Создано функций:
NOTICE:    • Вспомогательные: 3
NOTICE:    • Generic CRUD: 3 (create, update, delete)
NOTICE:    • Chessboard: 4 (create, update, delete, batch_insert)
NOTICE:    • Справочники (7 таблиц × 3 операции): 21
NOTICE:    ИТОГО: 31 RPC функция
NOTICE:
NOTICE:  📝 Защищённые таблицы:
NOTICE:    ✅ chessboard
NOTICE:    ✅ units
NOTICE:    ✅ cost_categories
NOTICE:    ✅ projects
NOTICE:    ✅ location
NOTICE:    ✅ rooms
NOTICE:    ✅ statuses
NOTICE:    ✅ documentation_tags
```

**Если возникли ошибки:**

1. **Функция уже существует:**
   ```
   ERROR: function "is_user_active" already exists
   ```
   **Решение:** Добавьте `OR REPLACE` в определение функции (уже есть в файле)

2. **Таблица не существует:**
   ```
   ERROR: relation "units" does not exist
   ```
   **Решение:** Проверьте схему БД через MCP сервер или примените схему из `supabase/schemas/prod.sql`

3. **Нет прав доступа:**
   ```
   ERROR: permission denied to create function
   ```
   **Решение:** Используйте DATABASE_URL с правами суперпользователя (postgres role)

### Шаг 3: Верификация

**3.1. Проверьте список созданных функций**

```sql
-- Через psql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%chessboard%'
    OR routine_name LIKE 'generic_%'
    OR routine_name LIKE '%_create'
    OR routine_name LIKE '%_update'
    OR routine_name LIKE '%_delete'
    OR routine_name IN ('is_user_active', 'check_user_permission', 'raise_access_denied')
  )
ORDER BY routine_name;
```

**Ожидаемый результат (31 функция):**

```
       routine_name           | routine_type
------------------------------+--------------
 check_user_permission        | FUNCTION
 chessboard_batch_insert      | FUNCTION
 chessboard_create            | FUNCTION
 chessboard_delete            | FUNCTION
 chessboard_update            | FUNCTION
 cost_categories_create       | FUNCTION
 cost_categories_delete       | FUNCTION
 cost_categories_update       | FUNCTION
 documentation_tags_create    | FUNCTION
 documentation_tags_delete    | FUNCTION
 documentation_tags_update    | FUNCTION
 generic_create_reference     | FUNCTION
 generic_delete               | FUNCTION
 generic_update_reference     | FUNCTION
 is_user_active               | FUNCTION
 locations_create             | FUNCTION
 locations_delete             | FUNCTION
 locations_update             | FUNCTION
 projects_create              | FUNCTION
 projects_delete              | FUNCTION
 projects_update              | FUNCTION
 raise_access_denied          | FUNCTION
 rooms_create                 | FUNCTION
 rooms_delete                 | FUNCTION
 rooms_update                 | FUNCTION
 statuses_create              | FUNCTION
 statuses_delete              | FUNCTION
 statuses_update              | FUNCTION
 units_create                 | FUNCTION
 units_delete                 | FUNCTION
 units_update                 | FUNCTION
(31 rows)
```

**3.2. Проверьте одну функцию**

```sql
-- Через psql или Supabase SQL Editor
SELECT prosrc
FROM pg_proc
WHERE proname = 'is_user_active';
```

Должна вернуть исходный код функции.

**3.3. Проверьте права вызова**

```sql
-- Проверьте, что функции имеют SECURITY DEFINER
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%chessboard%';
```

Все функции должны иметь `security_type = 'DEFINER'`.

---

## 🧪 Тестирование

### Подготовка к тестам

**1. Проверьте наличие тестовых пользователей**

```sql
SELECT u.email, r.name as role
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email IN ('viewer@test.com', 'admin@test.com');
```

**2. Если тестовых пользователей нет - создайте их**

```sql
-- Через Supabase Dashboard → Authentication → Users → Invite User
-- Или через SQL (требуется Supabase Auth)
```

**3. Проверьте права пользователей**

```sql
-- Права Наблюдателя (только просмотр)
SELECT upc.object_code, upc.can_view, upc.can_create, upc.can_edit, upc.can_delete
FROM user_permissions_cache upc
WHERE upc.user_id = (SELECT id FROM users WHERE email = 'viewer@test.com')
  AND upc.object_code IN ('chessboard_page', 'units_page', 'projects_page');
```

**Ожидаемый результат для Наблюдателя:**
```
  object_code   | can_view | can_create | can_edit | can_delete
----------------+----------+------------+----------+------------
 chessboard_page|    t     |      f     |    f     |     f
 units_page     |    t     |      f     |    f     |     f
 projects_page  |    t     |      f     |    f     |     f
```

**Ожидаемый результат для Администратора:**
```
  object_code   | can_view | can_create | can_edit | can_delete
----------------+----------+------------+----------+------------
 chessboard_page|    t     |      t     |    t     |     t
 units_page     |    t     |      t     |    t     |     t
 projects_page  |    t     |      t     |    t     |     t
```

### Тест 1: UI проверки прав (Наблюдатель)

**Цель:** Убедиться, что кнопки Create/Edit/Delete скрыты для роли Наблюдатель.

**Шаги:**
1. Войдите в портал как `viewer@test.com`
2. Откройте страницу "Единицы измерения" (`/references/units`)
3. **Ожидаемый результат:**
   - ✅ Кнопка "Добавить единицу измерения" НЕ отображается
   - ✅ В таблице есть только кнопка просмотра (глаз)
   - ✅ Кнопки редактирования (карандаш) и удаления (корзина) НЕ отображаются

4. Повторите для остальных 6 страниц:
   - `/references/projects` - Проекты
   - `/references/rooms` - Помещения
   - `/references/locations` - Локализации
   - `/references/cost-categories` - Категории затрат
   - `/administration/statuses` - Статусы
   - `/administration/tags` - Тэги документации

**Результат:**
- ✅ PASS - кнопки скрыты на всех 7 страницах
- ❌ FAIL - кнопки видны → проверьте код страницы, убедитесь, что `usePermissions` hook добавлен

### Тест 2: UI проверки прав (Администратор)

**Цель:** Убедиться, что все кнопки видны для роли Администратор.

**Шаги:**
1. Войдите в портал как `admin@test.com`
2. Откройте страницу "Единицы измерения" (`/references/units`)
3. **Ожидаемый результат:**
   - ✅ Кнопка "Добавить единицу измерения" отображается
   - ✅ В таблице есть кнопки: просмотр, редактирование, удаление

4. Повторите для остальных 6 страниц

**Результат:**
- ✅ PASS - все кнопки видны на всех 7 страницах
- ❌ FAIL - кнопки скрыты → проверьте права пользователя в БД

### Тест 3: RPC защита (создание записи)

**Цель:** Убедиться, что RPC функция блокирует создание для Наблюдателя.

**ВНИМАНИЕ:** Этот тест требует вызова RPC напрямую из консоли браузера, так как UI кнопки уже скрыты.

**Шаги:**
1. Войдите в портал как `viewer@test.com`
2. Откройте DevTools (F12) → Console
3. Выполните команду:

```javascript
// Попытка создать единицу измерения через RPC
const { data, error } = await window.supabase.rpc('units_create', {
  p_name: 'Hacked Unit',
  p_code: 'HACK'
})

console.log('Data:', data)
console.log('Error:', error)
```

**Ожидаемый результат:**
```javascript
Data: null
Error: {
  message: "Доступ запрещён: недостаточно прав для действия \"создание\" на объекте \"units\"",
  code: "42501"
}
```

**Результат:**
- ✅ PASS - ошибка доступа получена
- ❌ FAIL - запись создана → проверьте, что функция `units_create` вызывает `check_user_permission`

### Тест 4: RPC защита (обновление записи)

**Шаги:**
1. Войдите как `admin@test.com`
2. Создайте единицу измерения "Test Unit"
3. Скопируйте ID созданной записи
4. Выйдите и войдите как `viewer@test.com`
5. В DevTools Console:

```javascript
const { data, error } = await window.supabase.rpc('units_update', {
  p_id: 'ВСТАВЬТЕ_ID_ЗАПИСИ',
  p_name: 'Hacked Name'
})

console.log('Error:', error)
```

**Ожидаемый результат:**
```javascript
Error: {
  message: "Доступ запрещён: недостаточно прав для действия \"редактирование\" на объекте \"units\"",
  code: "42501"
}
```

### Тест 5: RPC защита (удаление записи)

**Шаги:**
1. Войдите как `viewer@test.com`
2. В DevTools Console:

```javascript
const { data, error } = await window.supabase.rpc('units_delete', {
  p_id: 'ВСТАВЬТЕ_ID_ЗАПИСИ'
})

console.log('Error:', error)
```

**Ожидаемый результат:**
```javascript
Error: {
  message: "Доступ запрещён: недостаточно прав для действия \"удаление\" на объекте \"units\"",
  code: "42501"
}
```

### Тест 6: Chessboard RPC (создание)

**Шаги:**
1. Войдите как `viewer@test.com`
2. В DevTools Console:

```javascript
const { data, error } = await window.supabase.rpc('chessboard_create', {
  p_material: 'Hacked Material',
  p_quantity: 999
})

console.log('Error:', error)
```

**Ожидаемый результат:**
```javascript
Error: {
  message: "Доступ запрещён: недостаточно прав для действия \"создание\" на объекте \"Шахматка\"",
  code: "42501"
}
```

### Тест 7: Chessboard RPC (batch import)

**Шаги:**
1. Войдите как `viewer@test.com`
2. В DevTools Console:

```javascript
const { data, error } = await window.supabase.rpc('chessboard_batch_insert', {
  p_rows: [
    { material: 'Material 1', quantity: 100 },
    { material: 'Material 2', quantity: 200 }
  ]
})

console.log('Error:', error)
```

**Ожидаемый результат:**
```javascript
Error: {
  message: "Доступ запрещён: недостаточно прав для действия \"создание\" на объекте \"Шахматка\"",
  code: "42501"
}
```

### Тест 8: Валидация данных

**Цель:** Убедиться, что RPC функции валидируют входящие данные.

**Шаги (под Администратором):**
1. Войдите как `admin@test.com`
2. В DevTools Console:

```javascript
// Пустой материал
const { data, error } = await window.supabase.rpc('chessboard_create', {
  p_material: '',
  p_quantity: 100
})
console.log('Error:', error)
// Ожидается: "Материал не может быть пустым"

// Отрицательное количество
const { data: data2, error: error2 } = await window.supabase.rpc('chessboard_create', {
  p_material: 'Test',
  p_quantity: -10
})
console.log('Error2:', error2)
// Ожидается: "Количество должно быть больше нуля"
```

---

## 📊 Сводка тестов

| # | Тест | Роль | Ожидаемый результат | Статус |
|---|------|------|---------------------|--------|
| 1 | UI кнопки скрыты | Наблюдатель | Кнопки Create/Edit/Delete не видны на 7 страницах | ⏳ Не проведён |
| 2 | UI кнопки видны | Администратор | Все кнопки видны на 7 страницах | ⏳ Не проведён |
| 3 | RPC создание | Наблюдатель | Ошибка "Доступ запрещён" | ⏳ Не проведён |
| 4 | RPC обновление | Наблюдатель | Ошибка "Доступ запрещён" | ⏳ Не проведён |
| 5 | RPC удаление | Наблюдатель | Ошибка "Доступ запрещён" | ⏳ Не проведён |
| 6 | Chessboard создание | Наблюдатель | Ошибка "Доступ запрещён" | ⏳ Не проведён |
| 7 | Chessboard batch | Наблюдатель | Ошибка "Доступ запрещён" | ⏳ Не проведён |
| 8 | Валидация данных | Администратор | Ошибки валидации для некорректных данных | ⏳ Не проведён |

---

## ⚠️ Известные ограничения

### ✅ Защищено (7 страниц)

**UI проверки + RPC функции готовы:**
1. Единицы измерения (`/references/units`)
2. Проекты (`/references/projects`)
3. Помещения (`/references/rooms`)
4. Локализации (`/references/locations`)
5. Категории затрат (`/references/cost-categories`)
6. Статусы (`/administration/statuses`)
7. Тэги документации (`/administration/tags`)

**RPC функции готовы (UI проверки ещё нет):**
8. Шахматка (`/documents/chessboard`) - только RPC функции, UI проверки не добавлены

### ⚠️ НЕ защищено (15+ страниц)

**Критически важные страницы без защиты:**
1. ВОР (`/documents/vor`) - сметные расчёты
2. Документация (`/documents/documentation`) - управление документами
3. Отделка (`/documents/finishing`) - расчёт отделки
4. Пользователи (`/admin/users`) - управление пользователями
5. Контроль доступа (`/admin/access-control`) - управление ролями и правами
6. Безопасность (`/admin/security`) - настройки безопасности
7. API Settings (`/admin/api-settings`) - настройки API ключей
8. Расценки (`/references/rates`) - управление расценками
9. Номенклатура (`/references/nomenclature`) - справочник номенклатуры

**Менее критичные страницы:**
10. Disk (`/disk`) - файловое хранилище
11. Комментарии (компонент Comments)
12. Калькулятор (компонент Calculation)
13. ML эксперименты (`/experiments/chessboard-ml`)

### 🔐 Двухслойная защита

**Текущее состояние:**
- **Слой 1 (UI):** Кнопки скрыты на 7 страницах → легко обойти через DevTools
- **Слой 2 (RPC):** Валидация на сервере для 8 таблиц → невозможно обойти

**КРИТИЧЕСКИ ВАЖНО:**
До добавления RPC функций для остальных таблиц, защита на них отсутствует полностью. Пользователь с ролью Наблюдатель может:
- Создавать/редактировать/удалять записи в ВОР, Документации, Отделке
- Изменять настройки пользователей, ролей, прав доступа
- Модифицировать API ключи

---

## 🔄 Откат изменений (Rollback)

Если после развёртывания возникли критические проблемы:

### Вариант 1: Удалить все RPC функции

```sql
-- Удалить все созданные функции
DROP FUNCTION IF EXISTS is_user_active() CASCADE;
DROP FUNCTION IF EXISTS check_user_permission(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS raise_access_denied(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS generic_create_reference(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) CASCADE;
DROP FUNCTION IF EXISTS generic_update_reference(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS generic_delete(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS chessboard_create(TEXT, NUMERIC, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS chessboard_update(UUID, TEXT, NUMERIC, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS chessboard_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS chessboard_batch_insert(JSONB[]) CASCADE;
DROP FUNCTION IF EXISTS units_create(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS units_update(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS units_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS cost_categories_create(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cost_categories_update(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cost_categories_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS projects_create(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS projects_update(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS projects_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS locations_create(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS locations_update(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS locations_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS rooms_create(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS rooms_update(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS rooms_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS statuses_create(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS statuses_update(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS statuses_delete(UUID) CASCADE;
DROP FUNCTION IF EXISTS documentation_tags_create(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS documentation_tags_update(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS documentation_tags_delete(UUID) CASCADE;
```

### Вариант 2: Восстановить из резервной копии

```bash
# Полное восстановление БД из бэкапа
psql "$DATABASE_URL" < backup_before_rpc_YYYYMMDD_HHMMSS.sql
```

**ВНИМАНИЕ:** Это удалит ВСЕ изменения в БД после создания бэкапа.

### Вариант 3: Откат UI изменений (Git)

```bash
# Откатить изменения в 7 файлах
git checkout HEAD~1 src/pages/references/Units.tsx
git checkout HEAD~1 src/pages/references/Projects.tsx
git checkout HEAD~1 src/pages/references/Rooms.tsx
git checkout HEAD~1 src/pages/references/Locations.tsx
git checkout HEAD~1 src/pages/references/CostCategories.tsx
git checkout HEAD~1 src/pages/administration/Statuses.tsx
git checkout HEAD~1 src/pages/administration/DocumentationTags.tsx
```

---

## 📋 Чек-лист развёртывания

### Предварительные проверки
- [ ] Проверен доступ к DATABASE_URL
- [ ] Установлен psql клиент
- [ ] Создана резервная копия БД
- [ ] Проверено наличие файла `sql/create_all_rpc_functions.sql`

### Развёртывание
- [ ] Применена SQL миграция без ошибок
- [ ] Проверено создание всех 31 функции
- [ ] Проверен тип безопасности (SECURITY DEFINER)

### Тестирование UI
- [ ] Тест 1: UI кнопки скрыты (Наблюдатель) - 7 страниц
- [ ] Тест 2: UI кнопки видны (Администратор) - 7 страниц

### Тестирование RPC
- [ ] Тест 3: RPC создание заблокировано (Наблюдатель)
- [ ] Тест 4: RPC обновление заблокировано (Наблюдатель)
- [ ] Тест 5: RPC удаление заблокировано (Наблюдатель)
- [ ] Тест 6: Chessboard создание заблокировано (Наблюдатель)
- [ ] Тест 7: Chessboard batch заблокировано (Наблюдатель)
- [ ] Тест 8: Валидация данных работает (Администратор)

### Финальная проверка
- [ ] Все 8 тестов пройдены успешно
- [ ] Администратор может создавать/редактировать/удалять записи
- [ ] Наблюдатель НЕ может создавать/редактировать/удалять записи
- [ ] Ошибки доступа отображаются корректно

---

## 📚 Дополнительные материалы

**Файлы для изучения:**
- `temp/SECURITY_AUDIT_REPORT.md` - 47-страничный отчёт аудита безопасности
- `temp/RPC_IMPLEMENTATION_GUIDE.md` - техническое руководство по RPC
- `sql/create_all_rpc_functions.sql` - исходный код всех RPC функций
- `src/entities/chessboard/api/chessboard-rpc-api.ts` - примеры TypeScript обёрток

**Паттерны кода:**
- `src/shared/hooks/usePermissions.ts` - hook для проверки прав
- `src/pages/references/Units.tsx` - референсная реализация UI проверок

---

## 🚧 Следующие шаги (TODO)

### Приоритет 1 (критично)

**RPC функции для рабочих страниц (10-14 часов):**
1. ВОР - CREATE, UPDATE, DELETE (2 часа)
2. Documentation - CREATE, UPDATE, DELETE (2 часа)
3. Finishing - CREATE, UPDATE, DELETE (2 часа)
4. Users - UPDATE (изменение ролей) (1 час)
5. AccessControl - управление правами (2 часа)
6. Rates - CREATE, UPDATE, DELETE (1 час)

**UI проверки прав на рабочих страницах (6-8 часов):**
1. ВОР (`/documents/vor`)
2. Документация (`/documents/documentation`)
3. Отделка (`/documents/finishing`)
4. Шахматка (`/documents/chessboard`) - только UI, RPC уже есть
5. Пользователи (`/admin/users`)
6. Контроль доступа (`/admin/access-control`)
7. API Settings (`/admin/api-settings`)
8. Безопасность (`/admin/security`)

### Приоритет 2 (важно)

**Остальные справочники (3-4 часа):**
- Rates (Расценки)
- Nomenclature (Номенклатура)
- Disk (Файловое хранилище)
- Comments (Комментарии)

### Приоритет 3 (дополнительно)

**Улучшения безопасности:**
- Логирование попыток несанкционированного доступа
- Rate limiting для RPC вызовов
- Audit trail (журнал изменений) для критичных таблиц
- Двухфакторная аутентификация (2FA)

---

## ✅ Итоговая статистика

**Реализовано:**
- 31 RPC функция с проверкой прав
- 7 страниц с UI проверками прав
- 8 таблиц защищены на уровне БД
- Двухслойная защита (UI + RPC)

**Осталось сделать:**
- 15+ страниц без UI проверок
- 10+ таблиц без RPC функций
- Тестирование всех сценариев

**Покрытие безопасностью:**
- Полностью защищено: 7 справочников (Units, Projects, Rooms, Locations, CostCategories, Statuses, Tags)
- Частично защищено: 1 таблица (Chessboard - только RPC, без UI)
- Не защищено: 15+ критичных страниц

---

## 📞 Поддержка

**При возникновении проблем:**
1. Проверьте логи ошибок в Supabase Dashboard → Database → Logs
2. Убедитесь, что `user_permissions_cache` содержит корректные данные
3. Проверьте, что роли пользователей настроены правильно
4. При критических ошибках - выполните откат из резервной копии

**Известные проблемы:**
- RLS отключен - защита только через RPC функции
- UI проверки легко обходятся через DevTools - критически важна защита на уровне RPC
- Незащищённые страницы уязвимы до добавления RPC функций
