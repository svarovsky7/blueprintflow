# Руководство для AGENTS

> Единая инструкция для всех ИИ‑инструментов, агентов и автокодов в репозитории.
> Общение — **по‑русски**. Код и технические идентификаторы — **на английском**.

## Обзор проекта
BlueprintFlow — корпоративный портал для анализа РД и работы сметного/тендерного блока генподрядчика (200+ пользователей, масштабируемость). Поддерживаются OAuth 2.0, импорт из Excel и совместная работа в реальном времени.

## Технологический стек (обязательные версии)
- **Frontend:** React **19.1**, TypeScript **5.8** (strict), Vite **7**
- **UI:** Ant Design **5.21** (+ Vibe подход)
- **Состояние:** TanStack Query **5.59+** (server state), Zustand **5.0+** (только auth)
- **Backend:** Supabase **2.47+** (PostgreSQL **17**, Auth, Storage, Edge Functions, Realtime WS)
- **Observability:** Sentry, Grafana Cloud, OpenTelemetry
- **Excel:** `xlsx` **0.18**
- **Даты:** Day.js **1.11**
- **Роутинг:** React Router DOM **6.27**
- **Разработка:** ESLint, Prettier, `dotenv`
- **IDE:** WebStorm

## Архитектура и структура (FSD)
```
src/
├── app/          # провайдеры приложения, роутинг
├── pages/        # страницы маршрутов (main, admin/, documents/, references/)
├── widgets/      # сложные переиспользуемые блоки
├── features/     # пользовательские сценарии (например, auth/)
├── entities/     # бизнес‑сущности и их API (chessboard/, documentation/, rates/, …)
├── shared/       # утилиты, типы и общий UI (lib/, types/, ui/)
├── layout/       # Layout‑компоненты (MainLayout.tsx)
└── components/   # легаси‑компоненты (DataTable, FileUpload, …)
```

**Публичный API каждого слайса** — через `index.ts`.  
**Алиасы импортов** (в `vite.config.ts` и `tsconfig.app.json`):
- `@/` → `./src`
- `@/app/`, `@/pages/`, `@/widgets/`, `@/features/`, `@/entities/`, `@/shared/`

## Правила кодовой базы
- Только **TypeScript** со строгой типизацией. `any` запрещён.
- Функциональные React‑компоненты и хуки.
- Серверные данные — через TanStack Query.
- Auth‑состояние — только в Zustand store.
- Именование: компоненты `PascalCase`, функции/переменные `camelCase`.
- Абсолютные импорты по алиасам, относительные «лесенки» `../../../` запрещены.
- Секреты и сборочные артефакты **не** коммитим.

## База данных и интеграция
- Источник истины по схеме — `supabase/schemas/prod.sql`.
- Первичные ключи — UUID `id` (легаси integer допускается временно).
- Поля `created_at` и `updated_at` обязательны **во всех** таблицах **кроме** mapping/junction‑таблиц.
- Названия mapping‑таблиц: суффикс `*_mapping`.
- Конкурентное редактирование — optimistic locking по `updated_at`.
- **RLS не используется**. Авторизация и права — на уровне приложения.
- Базовый паттерн Supabase:
  ```ts
  const { data, error } = await supabase
    .from('table')
    .select('*, relation:table(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  ```

### Переменные окружения (пример)
`.env.local` (не коммитить):
```
VITE_SUPABASE_URL=<YOUR_SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_STORAGE_BUCKET=<YOUR_STORAGE_BUCKET>
```

### MCP (Model Context Protocol) — Supabase
- При наличии `.mcp.json` указывайте `SUPABASE_ACCESS_TOKEN` в окружении.
- Инструменты MCP использовать **в приоритете** для операций с БД.
- Любые скрипты с ключами — только локально и только из окружения.

## UI/UX требования
- Mobile‑first, WCAG 2.1 AA.
- Современный UI на Ant Design 5 / Vibe.
- Все таблицы: сортировка и фильтры в заголовках; действия — **только иконки**.
- Заголовок страницы — в шапке каждой новой страницы.
- Русские лейблы для всех пользовательских элементов.

### Шаблон «Документ»
**Структура:** шапка → 2 блока фильтров (статичный + скрываемый) → таблица.  
**Режимы таблицы:** view / add / edit / delete / массовое редактирование.  
**Операции строк:** add, copy, edit (inline), delete (одиночное/массовое), цветовая маркировка.  
**Сохранение:** кнопки «Сохранить/Отмена» (или «Удалить(N)/Отмена» в delete‑режиме) с режимной логикой.  
**Настройка столбцов:** Drawer справа (350 px), чекбокс «Выделить все», «По умолчанию», сортировка столбцов; состояние — в `localStorage`:
- `{page}-column-visibility`
- `{page}-column-order`

### Скролл таблиц (единое правило)
- Главный контейнер фиксирует высоту и **блокирует скролл страницы**:
  ```tsx
  <div style={{
    height: 'calc(100vh - 96px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }}>
    <div style={{ flexShrink: 0, paddingBottom: 16 }}>{/* Фильтры */}</div>
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <Table sticky scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }} />
    </div>
  </div>
  ```
- Ключевое: `overflow: hidden` у контейнеров и фиксированное `scroll.y` у `Table`.

### Фильтры — стандарт для `Select`
- Всегда включать `allowClear`, `showSearch` и свой `filterOption` для кириллицы.

## Импорт/Экспорт Excel
- Drag‑and‑drop до 250 МБ.
- Гибкое сопоставление заголовков («материал», «кол», «ед»).
- Хранение исходников в Supabase Storage.
- Экспорт — текущий отфильтрованный набор.

## Производительность и SLA
- Импорт 5 000 строк ≤ **30 с**.
- Рендер 10 000 строк ≤ **100 мс**.
- 100 одновременных пользователей, latency < **300 мс** (Realtime).
- Uptime **99.9%**, **MTTR ≤ 5 мин**.
- Реалтайм: каналы Supabase Realtime, оптимистические обновления, диалог разрешения конфликтов (Merge/Overwrite/Rollback).

## Команды и качество
```bash
# Разработка
npm install
npm run dev         # http://localhost:5173
npm run preview

# Качество
npm run lint
npm run format
npm run format:check
npm run build       # обязательно должен проходить
npx tsc --noEmit    # отдельная проверка типов
```

### Pre‑commit чек‑лист
1) `npm run lint` — без предупреждений  
2) `npm run format` — единый стиль  
3) `npm run build` — успешная сборка  
4) Conventional Commits: `feat:`, `fix:`, `chore:`, …

## Деплой и наблюдаемость
- FE: GitHub Actions → Vercel
- BE: Supabase Cloud
- Настроить Sentry и Grafana Cloud; трассировка через OTEL.

## Разрешено/Запрещено (MUST/NEVER)
**MUST:**
- Строгая типизация, публичные API через `index.ts`, абсолютные импорты.
- Обработка ошибок во **всех** запросах к Supabase.
- Сохранение пользовательских настроек таблиц в `localStorage`.

**NEVER:**
- RLS (Row Level Security).
- Коммитить `.env.local` или секреты.
- Использовать `any`, «лесенки» `../../../` и лишние файлы.
- Добавлять комментарии «ради комментариев» — только по необходимости/запросу.
=======
## Контекст проекта
- **BlueprintFlow** — портал для анализа рабочей документации и сметного отдела строительного генподрядчика.
- Команда более 200 сотрудников; решение должно масштабироваться.
- **Стек**: React + TypeScript + Vite, дизайн‑система Ant Design 5 и подход Vibe, управление состоянием через TanStack Query.
- **Back‑end**: Supabase (PostgreSQL 16, Storage, Edge Functions, Realtime WebSocket).
- **Аутентификация**: Supabase Auth c поддержкой OAuth 2 (Google, Microsoft) и MFA.
- **Наблюдаемость**: Sentry, Grafana Cloud, OTEL.

## Принципы разработки
- Mobile‑first, соответствие WCAG 2.1 AA.
- Оптимистические блокировки и резолвер конфликтов при совместном редактировании.
- Модерновый, отзывчивый UI с Ant Design 5/Vibe.
- Подготовка к нагрузке: импорт 5 000 строк ≤ 30 с, рендер 10 000 строк ≤ 100 мс, 100 одновременных пользователей, latency < 300 мс.

## Функциональные ориентиры
- Импорт ВОР, смет и шахматок из Excel/CSV; хранение исходных файлов в Supabase Storage.
- Предпросмотр PDF/DWG/XLS/DOC, drag‑and‑drop загрузка до 250 МБ.
- Onboarding‑wizard и AI‑подсказки (Codex).
- Дашборд аналитики (win‑rate, динамика затрат) и история действий.

## Код и стиль
- Писать только на **TypeScript** с строгой типизацией.
- Использовать функциональные компоненты React и хуки; для данных — TanStack Query.
- Компоненты — `PascalCase`, переменные и функции — `camelCase`.
- Не хранить секреты и сгенерированные артефакты в репозитории.
- Все таблицы обязаны иметь сортировку и фильтры в заголовках столбцов.
- Элементы управления в строках таблиц создавайте в виде иконок без текста.
- Все новые таблицы должны содержать поля `created_at` и `updated_at`.
- На всех новых страницах портала в шапке отображать название страницы.

## Git‑процесс
- Работать в ветках, отправлять изменения через Pull Request.
- Сообщения коммитов в формате Conventional Commits (`feat:`, `fix:`, `chore:` и т.д.).
- Обновляйте документацию и при необходимости ссылку на `tech_task.md`.

## Проверки перед коммитом
- Запустить `npm run lint` и исправить все предупреждения.
- Запустить `npm run build` и убедиться, что проект собирается.

## Развертывание
- FE — GitHub Actions → Vercel; BE — Supabase Cloud.
- Настроить Sentry и Grafana Cloud; MTTR ≤ 5 мин.

## Дополнительно
- Основной редактор: **WebStorm**.
- Для подробных требований и бенчмарков см. `tech_task.md`.
- Никогда не использовать RLS (Row Level Security).

