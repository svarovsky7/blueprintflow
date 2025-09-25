# Инструкция по добавлению нового значения в ENUM type_blocks

## Статус задачи
**Требуется:** Добавить значение 'Типовой корпус.Тех.этаж' в ENUM type_blocks

**Проверено:** Значение еще не добавлено (проверка выполнена 24.09.2025)

## SQL команды для выполнения

### 1. Добавление нового значения
```sql
ALTER TYPE public.type_blocks ADD VALUE 'Типовой корпус.Тех.этаж';
```

### 2. Проверка добавленного значения
```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (
    SELECT oid
    FROM pg_type
    WHERE typname = 'type_blocks'
)
ORDER BY enumsortorder;
```

## Способы выполнения

### Вариант 1: Через Supabase Dashboard
1. Откройте https://supabase.com/dashboard
2. Перейдите в проект (hfqgcaxmufzitdfafdlp)
3. Выберите "SQL Editor" в левом меню
4. Выполните SQL команды выше

### Вариант 2: Через psql (если доступен)
```bash
psql "postgresql://postgres:VGjhEzjRE33LbhH3@hfqgcaxmufzitdfafdlp.supabase.co:5432/postgres" -c "ALTER TYPE public.type_blocks ADD VALUE 'Типовой корпус.Тех.этаж';"
```

### Вариант 3: Через файл миграции
Файл уже подготовлен: `sql/add_technical_floor_enum.sql`
```bash
psql "postgresql://..." -f sql/add_technical_floor_enum.sql
```

## Текущие значения ENUM type_blocks
По состоянию на проверку:
- 'Подземный паркинг'
- 'Типовой корпус'
- 'Стилобат'
- 'Кровля'

**После добавления должно быть:**
- 'Подземный паркинг'
- 'Типовой корпус'
- 'Стилобат'
- 'Кровля'
- 'Типовой корпус.Тех.этаж'

## Таблицы, использующие type_blocks
1. `blocks` - таблица блоков (поле type_blocks)
2. `block_floor_mapping` - маппинг этажей блоков (поле type_blocks)
3. `block_connections_mapping` - связи между блоками (поле connection_type)

## Проверка успешного добавления
После выполнения команды запустите проверочный скрипт:
```bash
node temp/verify_enum_update.js
```

## Важные замечания
- ENUM значения нельзя удалить, только добавить
- Порядок добавления влияет на сортировку в некоторых случаях
- Изменение потребует перезапуска приложения для обновления TypeScript типов