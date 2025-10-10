# Руководство по реализации RPC функций безопасности

## 📋 Что реализовано

### ✅ SQL функции (sql/create_secure_rpc_functions.sql)

**Вспомогательные функции:**
1. `is_user_active()` - проверка активности текущего пользователя
2. `check_user_permission(object_code, action)` - проверка прав пользователя
3. `raise_access_denied(action, object)` - генерация ошибки доступа

**CRUD функции для Chessboard:**
1. `chessboard_create(...)` - создание записи с валидацией
2. `chessboard_update(...)` - обновление записи
3. `chessboard_delete(id)` - удаление записи
4. `chessboard_batch_insert(rows)` - массовый импорт из Excel

### ✅ API обертки (src/entities/chessboard/api/chessboard-rpc-api.ts)

**Функции:**
- `createChessboardRowRPC(params)` - обертка над chessboard_create
- `updateChessboardRowRPC(params)` - обертка над chessboard_update
- `deleteChessboardRowRPC(id)` - обертка над chessboard_delete
- `batchInsertChessboardRPC(rows)` - обертка над chessboard_batch_insert

---

## 🚀 Развертывание RPC функций

### Шаг 1: Применить SQL миграцию

```bash
# Получить DATABASE_URL из переменной окружения
echo $DATABASE_URL

# Если DATABASE_URL не задан, получить из Supabase Dashboard:
# Settings → Database → Connection string → URI

# Применить миграцию
psql "$DATABASE_URL" -f sql/create_secure_rpc_functions.sql
```

**Ожидаемый вывод:**
```
✅ Secure RPC функции успешно созданы!
Создано функций:
  • Вспомогательные: 3 (is_user_active, check_user_permission, raise_access_denied)
  • Chessboard CRUD: 4 (create, update, delete, batch_insert)

📝 Следующие шаги:
  1. Создать API обертки на клиенте (chessboard-rpc-api.ts)
  2. Интегрировать в существующий код Chessboard
  3. Протестировать с ролями Наблюдатель и Администратор
```

### Шаг 2: Проверить создание функций

```sql
-- В psql или Supabase SQL Editor
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%chessboard%'
ORDER BY routine_name;
```

**Ожидаемый результат:**
```
       routine_name        | routine_type
---------------------------+--------------
 chessboard_batch_insert   | FUNCTION
 chessboard_create         | FUNCTION
 chessboard_delete         | FUNCTION
 chessboard_update         | FUNCTION
 check_user_permission     | FUNCTION
 is_user_active            | FUNCTION
 raise_access_denied       | FUNCTION
```

---

## 🔧 Интеграция в существующий код

### Вариант 1: Полная замена на RPC (рекомендуется)

**Было (прямой вызов Supabase):**
```typescript
// src/entities/chessboard/api/chessboard-api.ts
const { data, error } = await supabase
  .from('chessboard')
  .insert([newRow])
  .select()
  .single()
```

**Стало (через RPC):**
```typescript
// src/entities/chessboard/api/chessboard-api.ts
import { createChessboardRowRPC } from './chessboard-rpc-api'

const data = await createChessboardRowRPC({
  material: 'Кирпич',
  quantity: 100,
  unit_id: 'uuid-here',
  // ... остальные поля
})
```

### Вариант 2: Параллельное использование (для миграции)

```typescript
// Оставить старые функции, добавить новые с суффиксом RPC
export { createChessboardRow } from './chessboard-api' // Старая
export { createChessboardRowRPC } from './chessboard-rpc-api' // Новая

// Постепенно заменять вызовы в коде
// createChessboardRow() → createChessboardRowRPC()
```

---

## 📝 Примеры использования

### Пример 1: Создание записи

```typescript
import { createChessboardRowRPC } from '@/entities/chessboard/api/chessboard-rpc-api'
import { message } from 'antd'

async function handleCreate() {
  try {
    const newRow = await createChessboardRowRPC({
      material: 'Кирпич керамический',
      quantity: 1500,
      unit_id: selectedUnit.id,
      project_id: selectedProject.id,
      cost_category_id: selectedCategory.id,
      notes: 'Для фасада',
    })

    message.success('Запись успешно создана')
    console.log('Создана запись:', newRow)
  } catch (error) {
    if (error.message.includes('Доступ запрещён')) {
      message.error('У вас нет прав на создание записей')
    } else {
      message.error('Ошибка создания: ' + error.message)
    }
  }
}
```

### Пример 2: Обновление записи

```typescript
import { updateChessboardRowRPC } from '@/entities/chessboard/api/chessboard-rpc-api'

async function handleUpdate(rowId: string) {
  try {
    const updated = await updateChessboardRowRPC({
      id: rowId,
      quantity: 2000, // Только это поле обновится
      // Остальные поля не передаем - останутся прежними
    })

    message.success('Запись обновлена')
  } catch (error) {
    if (error.message.includes('Доступ запрещён')) {
      message.error('У вас нет прав на редактирование')
    } else {
      message.error('Ошибка обновления: ' + error.message)
    }
  }
}
```

### Пример 3: Удаление записи

```typescript
import { deleteChessboardRowRPC } from '@/entities/chessboard/api/chessboard-rpc-api'

async function handleDelete(rowId: string) {
  try {
    await deleteChessboardRowRPC(rowId)
    message.success('Запись удалена')
  } catch (error) {
    if (error.message.includes('Доступ запрещён')) {
      message.error('У вас нет прав на удаление')
    } else {
      message.error('Ошибка удаления: ' + error.message)
    }
  }
}
```

### Пример 4: Batch импорт из Excel

```typescript
import { batchInsertChessboardRPC } from '@/entities/chessboard/api/chessboard-rpc-api'

async function handleExcelImport(excelData: any[]) {
  const rows = excelData.map(row => ({
    material: row.material,
    quantity: parseFloat(row.quantity),
    unit_id: row.unit_id,
    project_id: selectedProject.id,
  }))

  try {
    const result = await batchInsertChessboardRPC(rows)

    message.success(
      `Импортировано ${result.inserted_count} из ${rows.length} строк`
    )

    if (result.failed_count > 0) {
      console.error('Ошибки импорта:', result.errors)
      message.warning(`${result.failed_count} строк с ошибками`)
    }
  } catch (error) {
    message.error('Ошибка импорта: ' + error.message)
  }
}
```

---

## 🧪 Тестирование

### Тест 1: Проверка прав Наблюдателя

```typescript
// Войти как пользователь с ролью "Наблюдатель"
// can_view = true, can_create = false, can_edit = false, can_delete = false

// Попытка создания - должна упасть с ошибкой
try {
  await createChessboardRowRPC({ material: 'Test', quantity: 1 })
  console.error('❌ FAIL: Наблюдатель смог создать запись!')
} catch (error) {
  if (error.message.includes('Доступ запрещён')) {
    console.log('✅ PASS: Наблюдатель не может создать запись')
  }
}

// Попытка редактирования - должна упасть
try {
  await updateChessboardRowRPC({ id: 'some-id', quantity: 999 })
  console.error('❌ FAIL: Наблюдатель смог отредактировать!')
} catch (error) {
  if (error.message.includes('Доступ запрещён')) {
    console.log('✅ PASS: Наблюдатель не может редактировать')
  }
}

// Попытка удаления - должна упасть
try {
  await deleteChessboardRowRPC('some-id')
  console.error('❌ FAIL: Наблюдатель смог удалить!')
} catch (error) {
  if (error.message.includes('Доступ запрещён')) {
    console.log('✅ PASS: Наблюдатель не может удалить')
  }
}
```

### Тест 2: Проверка прав Администратора

```typescript
// Войти как пользователь с ролью "Супер-администратор"
// can_view = true, can_create = true, can_edit = true, can_delete = true

// Создание - должно работать
try {
  const row = await createChessboardRowRPC({
    material: 'Admin Test',
    quantity: 100,
  })
  console.log('✅ PASS: Админ создал запись:', row.id)
} catch (error) {
  console.error('❌ FAIL: Админ не может создать запись!')
}

// Редактирование - должно работать
try {
  const updated = await updateChessboardRowRPC({
    id: row.id,
    quantity: 200,
  })
  console.log('✅ PASS: Админ отредактировал запись')
} catch (error) {
  console.error('❌ FAIL: Админ не может редактировать!')
}

// Удаление - должно работать
try {
  await deleteChessboardRowRPC(row.id)
  console.log('✅ PASS: Админ удалил запись')
} catch (error) {
  console.error('❌ FAIL: Админ не может удалить!')
}
```

### Тест 3: Проверка валидации данных

```typescript
// Пустой материал - должно упасть
try {
  await createChessboardRowRPC({ material: '', quantity: 100 })
  console.error('❌ FAIL: Создана запись с пустым материалом')
} catch (error) {
  if (error.message.includes('не может быть пустым')) {
    console.log('✅ PASS: Валидация пустого материала работает')
  }
}

// Отрицательное количество - должно упасть
try {
  await createChessboardRowRPC({ material: 'Test', quantity: -10 })
  console.error('❌ FAIL: Создана запись с отрицательным количеством')
} catch (error) {
  if (error.message.includes('больше нуля')) {
    console.log('✅ PASS: Валидация количества работает')
  }
}
```

---

## 🛡️ Защита от обхода через DevTools

### Попытка обхода №1: Прямой вызов Supabase

```javascript
// В консоли DevTools пользователь пытается:
const { data, error } = await supabase
  .from('chessboard')
  .insert({ material: 'Hacked', quantity: 999 })

// ❌ Это СРАБОТАЕТ, если используется старый API без RPC
// ✅ После миграции на RPC - нужно УДАЛИТЬ старые функции API
```

**Решение:** Удалить или приватизировать старые функции без проверки прав

### Попытка обхода №2: Прямой вызов RPC без прав

```javascript
// Пользователь пытается вызвать RPC напрямую
const { data, error } = await supabase.rpc('chessboard_create', {
  p_material: 'Hacked',
  p_quantity: 999,
})

// ✅ RPC функция проверит права и вернет ошибку:
// "Доступ запрещён: недостаточно прав для действия "создание" на объекте "Шахматка""
```

**Результат:** Защита работает на уровне БД, обойти нельзя

---

## 📊 Следующие шаги

### Этап 1: Тестирование Chessboard RPC (1-2 часа)
1. ✅ Применить миграцию SQL
2. ✅ Протестировать с ролью Наблюдатель
3. ✅ Протестировать с ролью Администратор
4. ✅ Проверить batch импорт

### Этап 2: Создание RPC для остальных таблиц (10-14 часов)

**Приоритет 1 (критично):**
- VOR - CREATE, UPDATE, DELETE (2 часа)
- Documentation - CREATE, UPDATE, DELETE (2 часа)
- Finishing - CREATE, UPDATE, DELETE (2 часа)
- Users - UPDATE (изменение ролей) (1 час)

**Приоритет 2 (важно):**
- Units, CostCategories, Projects, Locations, Rooms, Rates, Nomenclature (по 30 мин каждая = 3.5 часа)

### Этап 3: UI защита на 15 страницах (8-12 часов)

По шаблону Chessboard добавить `usePermissions()` hook и скрыть кнопки без прав

---

## 💡 Рекомендации

1. **Постепенная миграция**: Начать с Chessboard, протестировать, затем масштабировать
2. **Backward compatibility**: Сначала добавить RPC, потом удалить старый API
3. **Error handling**: Всегда обрабатывать ошибки доступа отдельно от технических ошибок
4. **Логирование**: Добавить логи для отслеживания попыток несанкционированного доступа
5. **Документация**: Обновлять CLAUDE.md при добавлении новых RPC функций

---

## 🔗 Полезные ссылки

- **SQL файл**: `sql/create_secure_rpc_functions.sql`
- **API обертки**: `src/entities/chessboard/api/chessboard-rpc-api.ts`
- **UI хук прав**: `src/shared/hooks/usePermissions.ts`
- **Отчет аудита**: `temp/SECURITY_AUDIT_REPORT.md`
