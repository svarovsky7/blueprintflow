-- =============================================
-- RBAC System Migration for BlueprintFlow
-- Система управления доступом на основе ролей
-- Дата создания: 2025-10-08
-- =============================================

-- =============================================
-- 1. ФУНКЦИЯ ДЛЯ АВТООБНОВЛЕНИЯ updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS 'Автоматическое обновление поля updated_at при изменении записи';

-- =============================================
-- 2. РАСШИРЕННЫЕ ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Персональные данные
    first_name text NOT NULL,
    last_name text NOT NULL,
    middle_name text,
    display_name text,

    -- Служебные данные
    position text,
    department text,
    phone text,
    avatar_url text,

    -- Статус
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    last_login_at timestamptz,

    -- Метаданные
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id)
);

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);

COMMENT ON TABLE public.users IS 'Расширенные профили пользователей (дополняет auth.users)';
COMMENT ON COLUMN public.users.id IS 'UUID из auth.users (1:1 связь)';
COMMENT ON COLUMN public.users.display_name IS 'Отображаемое имя (автогенерируется из ФИО)';
COMMENT ON COLUMN public.users.is_active IS 'Активен ли пользователь';
COMMENT ON COLUMN public.users.is_system IS 'Системный пользователь (защита от удаления)';

-- =============================================
-- 3. ГРУППЫ ПОЛЬЗОВАТЕЛЕЙ
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Основные данные
    name text UNIQUE NOT NULL,
    code text UNIQUE NOT NULL,
    description text,

    -- Иерархия (опционально)
    parent_group_id uuid REFERENCES public.user_groups(id) ON DELETE SET NULL,

    -- UI данные
    color text DEFAULT '#1890ff',

    -- Статус
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,

    -- Метаданные
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id)
);

CREATE TRIGGER set_updated_at_user_groups
    BEFORE UPDATE ON public.user_groups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_groups_code ON public.user_groups(code);
CREATE INDEX IF NOT EXISTS idx_user_groups_is_active ON public.user_groups(is_active);

COMMENT ON TABLE public.user_groups IS 'Группы пользователей для организации доступа';
COMMENT ON COLUMN public.user_groups.code IS 'Код для программного доступа (admins, engineers)';
COMMENT ON COLUMN public.user_groups.color IS 'Цвет группы для визуализации в UI';

-- =============================================
-- 4. СВЯЗЬ ПОЛЬЗОВАТЕЛЕЙ И ГРУПП (M:N)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users_groups_mapping (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_users_groups_user ON public.users_groups_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_users_groups_group ON public.users_groups_mapping(group_id);

COMMENT ON TABLE public.users_groups_mapping IS 'Связь пользователей и групп (many-to-many)';

-- =============================================
-- 5. РОЛИ
-- =============================================
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Основные данные
    name text UNIQUE NOT NULL,
    code text UNIQUE NOT NULL,
    description text,

    -- Уровень доступа (для иерархии)
    access_level integer DEFAULT 0 NOT NULL,

    -- Статус
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,

    -- Метаданные
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id)
);

CREATE TRIGGER set_updated_at_roles
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_access_level ON public.roles(access_level);

COMMENT ON TABLE public.roles IS 'Роли - наборы привилегий для управления доступом';
COMMENT ON COLUMN public.roles.access_level IS 'Уровень доступа: 0=обычный, 100=супер-админ';

-- =============================================
-- 6. СВЯЗЬ ПОЛЬЗОВАТЕЛЕЙ И РОЛЕЙ (M:N)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users_roles_mapping (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now() NOT NULL,
    assigned_by uuid REFERENCES public.users(id),
    CONSTRAINT users_roles_mapping_unique UNIQUE (user_id, role_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_users_roles_user ON public.users_roles_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_users_roles_role ON public.users_roles_mapping(role_id);
CREATE INDEX IF NOT EXISTS idx_users_roles_project ON public.users_roles_mapping(project_id);

COMMENT ON TABLE public.users_roles_mapping IS 'Связь пользователей и ролей (many-to-many, опционально с привязкой к проекту)';

-- =============================================
-- 7. СВЯЗЬ ГРУПП И РОЛЕЙ (M:N)
-- =============================================
CREATE TABLE IF NOT EXISTS public.groups_roles_mapping (
    group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_groups_roles_group ON public.groups_roles_mapping(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_roles_role ON public.groups_roles_mapping(role_id);

COMMENT ON TABLE public.groups_roles_mapping IS 'Связь групп и ролей (many-to-many)';

-- =============================================
-- 8. ОБЪЕКТЫ ПОРТАЛА
-- =============================================
CREATE TABLE IF NOT EXISTS public.portal_objects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Основные данные
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    object_type text NOT NULL CHECK (object_type IN ('page', 'section', 'feature', 'action')),
    description text,

    -- Иерархия
    parent_object_id uuid REFERENCES public.portal_objects(id) ON DELETE CASCADE,

    -- Путь маршрута (для страниц)
    route_path text,

    -- UI данные
    icon text,
    sort_order integer DEFAULT 0,

    -- Статус
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,

    -- Метаданные
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id)
);

CREATE TRIGGER set_updated_at_portal_objects
    BEFORE UPDATE ON public.portal_objects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_portal_objects_code ON public.portal_objects(code);
CREATE INDEX IF NOT EXISTS idx_portal_objects_type ON public.portal_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_portal_objects_parent ON public.portal_objects(parent_object_id);
CREATE INDEX IF NOT EXISTS idx_portal_objects_route ON public.portal_objects(route_path);

COMMENT ON TABLE public.portal_objects IS 'Объекты портала (страницы, разделы, действия) для контроля доступа';
COMMENT ON COLUMN public.portal_objects.object_type IS 'Тип объекта: page, section, feature, action';
COMMENT ON COLUMN public.portal_objects.route_path IS 'Путь маршрута React Router (например: /documents/chessboard)';

-- =============================================
-- 9. РАЗРЕШЕНИЯ (PERMISSIONS)
-- =============================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Связи
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    portal_object_id uuid NOT NULL REFERENCES public.portal_objects(id) ON DELETE CASCADE,

    -- Типы доступа
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    can_export boolean DEFAULT false NOT NULL,
    can_import boolean DEFAULT false NOT NULL,
    can_admin boolean DEFAULT false NOT NULL,

    -- Ограничения (JSONB для гибкости)
    constraints jsonb,

    -- Метаданные
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id),

    UNIQUE(role_id, portal_object_id)
);

CREATE TRIGGER set_updated_at_permissions
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_permissions_role ON public.permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_object ON public.permissions(portal_object_id);
CREATE INDEX IF NOT EXISTS idx_permissions_constraints ON public.permissions USING GIN (constraints);

COMMENT ON TABLE public.permissions IS 'Разрешения - связывает роли с объектами портала';
COMMENT ON COLUMN public.permissions.constraints IS 'Дополнительные ограничения в формате JSONB';

-- =============================================
-- 10. MATERIALIZED VIEW ДЛЯ КЭША РАЗРЕШЕНИЙ
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_permissions_cache AS
-- Права через роли пользователя
SELECT
    ur.user_id,
    po.code AS object_code,
    po.object_type,
    po.route_path,
    p.can_view,
    p.can_create,
    p.can_edit,
    p.can_delete,
    p.can_export,
    p.can_import,
    p.can_admin,
    'user_role' AS source,
    r.name AS role_name
FROM users_roles_mapping ur
JOIN permissions p ON ur.role_id = p.role_id
JOIN portal_objects po ON p.portal_object_id = po.id
JOIN roles r ON ur.role_id = r.id
WHERE r.is_active = true AND po.is_active = true

UNION ALL

-- Права через группы пользователя
SELECT
    ug.user_id,
    po.code AS object_code,
    po.object_type,
    po.route_path,
    p.can_view,
    p.can_create,
    p.can_edit,
    p.can_delete,
    p.can_export,
    p.can_import,
    p.can_admin,
    'user_group' AS source,
    r.name AS role_name
FROM users_groups_mapping ug
JOIN groups_roles_mapping gr ON ug.group_id = gr.group_id
JOIN permissions p ON gr.role_id = p.role_id
JOIN portal_objects po ON p.portal_object_id = po.id
JOIN roles r ON gr.role_id = r.id
WHERE r.is_active = true AND po.is_active = true;

-- Уникальный индекс для CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_upc_unique
ON public.user_permissions_cache(user_id, object_code, source, role_name);

-- Индексы для быстрой проверки прав
CREATE INDEX IF NOT EXISTS idx_upc_user_id ON public.user_permissions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_upc_object_code ON public.user_permissions_cache(object_code);
CREATE INDEX IF NOT EXISTS idx_upc_route_path ON public.user_permissions_cache(route_path);
CREATE INDEX IF NOT EXISTS idx_upc_user_object ON public.user_permissions_cache(user_id, object_code);

COMMENT ON MATERIALIZED VIEW public.user_permissions_cache IS 'Кэш разрешений пользователей для быстрой проверки прав (<5ms)';

-- =============================================
-- 11. ФУНКЦИЯ ОБНОВЛЕНИЯ КЭША
-- =============================================
CREATE OR REPLACE FUNCTION public.refresh_user_permissions_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_permissions_cache;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_user_permissions_cache() IS 'Обновление materialized view с разрешениями пользователей';

-- =============================================
-- 12. ТРИГГЕРЫ ДЛЯ АВТООБНОВЛЕНИЯ КЭША
-- =============================================
CREATE OR REPLACE FUNCTION trigger_refresh_permissions_cache()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('refresh_permissions', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_roles_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.users_roles_mapping
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_permissions_cache();

CREATE TRIGGER trg_groups_roles_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.groups_roles_mapping
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_permissions_cache();

CREATE TRIGGER trg_permissions_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.permissions
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_permissions_cache();

-- =============================================
-- 13. НАЧАЛЬНЫЕ ДАННЫЕ (SEED)
-- =============================================

-- Системная группа "Пользователи"
INSERT INTO public.user_groups (name, code, description, is_system, color)
VALUES ('Пользователи', 'users', 'Базовая группа для всех пользователей системы', true, '#52c41a')
ON CONFLICT (code) DO NOTHING;

-- Системная группа "Администраторы"
INSERT INTO public.user_groups (name, code, description, is_system, color)
VALUES ('Администраторы', 'admins', 'Полный доступ ко всем функциям портала', true, '#f5222d')
ON CONFLICT (code) DO NOTHING;

-- Группа "Инженеры ПТО"
INSERT INTO public.user_groups (name, code, description, is_system, color)
VALUES ('Инженеры ПТО', 'pto_engineers', 'Работа с документацией и расчётами', false, '#1890ff')
ON CONFLICT (code) DO NOTHING;

-- Группа "Сметчики"
INSERT INTO public.user_groups (name, code, description, is_system, color)
VALUES ('Сметчики', 'estimators', 'Доступ к сметам и расценкам', false, '#faad14')
ON CONFLICT (code) DO NOTHING;

-- Роли
INSERT INTO public.roles (name, code, description, access_level, is_system) VALUES
('Супер-администратор', 'super_admin', 'Полный доступ ко всем функциям портала', 100, true),
('Администратор', 'admin', 'Управление справочниками и пользователями', 90, true),
('Редактор документов', 'document_editor', 'Создание и редактирование документов', 50, true),
('Наблюдатель', 'viewer', 'Только просмотр данных', 10, true)
ON CONFLICT (code) DO NOTHING;

-- Объекты портала (разделы)
INSERT INTO public.portal_objects (name, code, object_type, route_path, icon, sort_order, is_system) VALUES
('Dashboard', 'dashboard', 'page', '/', 'PieChartOutlined', 1, true),
('Администрирование', 'admin_section', 'section', '/admin', 'SettingOutlined', 100, true),
('Документы', 'documents_section', 'section', '/documents', 'FileTextOutlined', 2, true),
('Справочники', 'references_section', 'section', '/references', 'DatabaseOutlined', 3, true),
('Отчёты', 'reports_section', 'section', '/reports', 'BarChartOutlined', 4, true)
ON CONFLICT (code) DO NOTHING;

-- Объекты портала (страницы администрирования)
WITH admin_section AS (SELECT id FROM public.portal_objects WHERE code = 'admin_section' LIMIT 1)
INSERT INTO public.portal_objects (name, code, object_type, parent_object_id, route_path, icon, sort_order, is_system)
SELECT name, code, 'page', admin_section.id, route_path, icon, sort_order, true
FROM admin_section, (VALUES
    ('Пользователи', 'users_page', '/admin/users', 'UserOutlined', 1),
    ('Группы пользователей', 'groups_page', '/admin/user-groups', 'TeamOutlined', 2),
    ('Роли', 'roles_page', '/admin/roles', 'SafetyOutlined', 3),
    ('Разрешения', 'permissions_page', '/admin/permissions', 'KeyOutlined', 4),
    ('Объекты портала', 'objects_page', '/admin/portal-objects', 'AppstoreOutlined', 5),
    ('Статусы', 'statuses_page', '/admin/statuses', 'CheckCircleOutlined', 10),
    ('Настройки API', 'api_settings_page', '/admin/api-settings', 'ApiOutlined', 11),
    ('Тэги документации', 'tags_page', '/admin/documentation-tags', 'TagsOutlined', 12)
) AS pages(name, code, route_path, icon, sort_order)
ON CONFLICT (code) DO NOTHING;

-- Объекты портала (страницы документов)
WITH docs_section AS (SELECT id FROM public.portal_objects WHERE code = 'documents_section' LIMIT 1)
INSERT INTO public.portal_objects (name, code, object_type, parent_object_id, route_path, icon, is_system)
SELECT name, code, 'page', docs_section.id, route_path, icon, true
FROM docs_section, (VALUES
    ('Шахматка', 'chessboard_page', '/documents/chessboard', 'TableOutlined'),
    ('ВОР', 'vor_page', '/documents/vor', 'FileTextOutlined'),
    ('Отделка', 'finishing_page', '/documents/finishing', 'BgColorsOutlined'),
    ('Документация', 'documentation_page', '/documents/documentation', 'FolderOutlined')
) AS pages(name, code, route_path, icon)
ON CONFLICT (code) DO NOTHING;

-- Объекты портала (страницы справочников)
WITH refs_section AS (SELECT id FROM public.portal_objects WHERE code = 'references_section' LIMIT 1)
INSERT INTO public.portal_objects (name, code, object_type, parent_object_id, route_path, is_system)
SELECT name, code, 'page', refs_section.id, route_path, true
FROM refs_section, (VALUES
    ('Единицы измерения', 'units_page', '/references/units'),
    ('Категории затрат', 'cost_categories_page', '/references/cost-categories'),
    ('Проекты', 'projects_page', '/references/projects'),
    ('Локализации', 'locations_page', '/references/locations'),
    ('Помещения', 'rooms_page', '/references/rooms'),
    ('Расценки', 'rates_page', '/references/rates'),
    ('Номенклатура', 'nomenclature_page', '/references/nomenclature'),
    ('Типы поверхностей', 'surface_types_page', '/references/surface-types')
) AS pages(name, code, route_path)
ON CONFLICT (code) DO NOTHING;

-- Разрешения для роли "Супер-администратор" (полный доступ)
WITH super_admin_role AS (SELECT id FROM public.roles WHERE code = 'super_admin' LIMIT 1)
INSERT INTO public.permissions (
    role_id, portal_object_id,
    can_view, can_create, can_edit, can_delete, can_export, can_import, can_admin
)
SELECT
    super_admin_role.id,
    po.id,
    true, true, true, true, true, true, true
FROM super_admin_role, public.portal_objects po
ON CONFLICT (role_id, portal_object_id) DO NOTHING;

-- Разрешения для роли "Наблюдатель" (только просмотр)
WITH viewer_role AS (SELECT id FROM public.roles WHERE code = 'viewer' LIMIT 1)
INSERT INTO public.permissions (role_id, portal_object_id, can_view)
SELECT viewer_role.id, po.id, true
FROM viewer_role, public.portal_objects po
WHERE po.object_type IN ('page', 'section') AND po.code NOT LIKE '%admin%'
ON CONFLICT (role_id, portal_object_id) DO NOTHING;

-- Назначить роль "Супер-администратор" группе "Администраторы"
INSERT INTO public.groups_roles_mapping (group_id, role_id)
SELECT
    (SELECT id FROM public.user_groups WHERE code = 'admins' LIMIT 1),
    (SELECT id FROM public.roles WHERE code = 'super_admin' LIMIT 1)
ON CONFLICT DO NOTHING;

-- Обновить кэш разрешений
SELECT public.refresh_user_permissions_cache();

-- =============================================
-- МИГРАЦИЯ ЗАВЕРШЕНА
-- =============================================
DO $$
BEGIN
    RAISE NOTICE 'RBAC система успешно развёрнута!';
    RAISE NOTICE 'Создано таблиц: 9';
    RAISE NOTICE 'Создано materialized view: 1';
    RAISE NOTICE 'Создано индексов: 25+';
    RAISE NOTICE 'Начальные данные: 4 группы, 4 роли, 20+ объектов портала';
END $$;
