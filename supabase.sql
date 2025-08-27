create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text
);

create table if not exists floors (
  number integer primary key
);

insert into floors (number)
select generate_series(-3, 120)
on conflict do nothing;

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bottom_underground_floor integer,
  top_ground_floor integer
);

create table if not exists projects_blocks (
  project_id uuid references projects on delete cascade,
  block_id uuid references blocks on delete cascade,
  primary key (project_id, block_id)
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  type text check (type in ('chessboard', 'vor')) not null,
  name text
);

create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates on delete cascade,
  description text,
  quantity numeric,
  unit_price numeric
);

create table if not exists chessboard (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit_id uuid references units on delete set null,
  cost_category_code text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- reference data (renamed from reserved keyword "references")
create table if not exists reference_data (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists work_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  description text,
  quantity numeric,
  unit_id uuid references units on delete set null,
  completed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists location (
  id integer primary key generated always as identity,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cost_categories (
  id integer primary key generated always as identity,
  number integer not null,
  name text not null,
  unit_id uuid references units on delete set null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists detail_cost_categories (
  id integer primary key generated always as identity,
  cost_category_id integer references cost_categories(id),
  location_id integer references location(id),
  name text not null,
  description text,
  unit_id uuid references units on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into cost_categories (number, name)
values (99, 'Прочее')
on conflict (number) do nothing;

update chessboard
set cost_category_code = '99'
where cost_category_code is null;

-- Настройки Яндекс.Диска
create table if not exists disk_settings (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  base_path text not null,
  make_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop table if exists storage_mappings;
create table storage_mappings (
  table_name text not null,
  entity_id text not null,
  slug text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (table_name, entity_id)
);

-- Функция транслитерации
create or replace function transliterate(input text) returns text as $$
declare
  result text := '';
  ch text;
  mapped text;
begin
  for ch in select unnest(regexp_split_to_array(input, '')) loop
    case lower(ch)
      when 'а' then mapped := 'a';
      when 'б' then mapped := 'b';
      when 'в' then mapped := 'v';
      when 'г' then mapped := 'g';
      when 'д' then mapped := 'd';
      when 'е' then mapped := 'e';
      when 'ё' then mapped := 'e';
      when 'ж' then mapped := 'zh';
      when 'з' then mapped := 'z';
      when 'и' then mapped := 'i';
      when 'й' then mapped := 'j';
      when 'к' then mapped := 'k';
      when 'л' then mapped := 'l';
      when 'м' then mapped := 'm';
      when 'н' then mapped := 'n';
      when 'о' then mapped := 'o';
      when 'п' then mapped := 'p';
      when 'р' then mapped := 'r';
      when 'с' then mapped := 's';
      when 'т' then mapped := 't';
      when 'у' then mapped := 'u';
      when 'ф' then mapped := 'f';
      when 'х' then mapped := 'h';
      when 'ц' then mapped := 'c';
      when 'ч' then mapped := 'ch';
      when 'ш' then mapped := 'sh';
      when 'щ' then mapped := 'sch';
      when 'ь' then mapped := '';
      when 'ы' then mapped := 'y';
      when 'ъ' then mapped := '';
      when 'э' then mapped := 'e';
      when 'ю' then mapped := 'yu';
      when 'я' then mapped := 'ya';
      else mapped := lower(ch);
    end case;
    if ch ~ '[A-Z]' then
      result := result || upper(left(mapped,1)) || substring(mapped from 2);
    else
      result := result || mapped;
    end if;
  end loop;
  return regexp_replace(result, '[^a-zA-Z0-9]', '_', 'g');
end;
$$ language plpgsql immutable;

-- Заполнение таблицы соответствий
create or replace function fill_storage_mappings() returns void as $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  select 'projects', id::text, transliterate(name)
  from projects
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();

  insert into storage_mappings(table_name, entity_id, slug)
  select 'documentation_tags', id::text, transliterate(name)
  from documentation_tags
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();

  insert into storage_mappings(table_name, entity_id, slug)
  select 'documentation_versions', v.id::text, transliterate(d.code) || '_ver' || v.version_number
  from documentation_versions v
  join documentations d on d.id = v.documentation_id
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
end;
$$ language plpgsql security definer;

grant execute on function fill_storage_mappings() to anon, authenticated, service_role;

-- Триггеры для автоматического заполнения соответствий
create or replace function trg_storage_projects() returns trigger as $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  values ('projects', new.id::text, transliterate(new.name))
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists storage_projects_after_insert on projects;
create trigger storage_projects_after_insert
after insert on projects
for each row execute function trg_storage_projects();

create or replace function trg_storage_doc_tags() returns trigger as $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  values ('documentation_tags', new.id::text, transliterate(new.name))
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists storage_doc_tags_after_insert on documentation_tags;
create trigger storage_doc_tags_after_insert
after insert on documentation_tags
for each row execute function trg_storage_doc_tags();

create or replace function trg_storage_doc_versions() returns trigger as $$
declare
  doc_code text;
begin
  select code into doc_code from documentations where id = new.documentation_id;
  insert into storage_mappings(table_name, entity_id, slug)
  values (
    'documentation_versions',
    new.id::text,
    transliterate(doc_code) || '_ver' || new.version_number
  )
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists storage_doc_versions_after_insert on documentation_versions;
create trigger storage_doc_versions_after_insert
after insert on documentation_versions
for each row execute function trg_storage_doc_versions();

-- Таблица путей к файлам версий документации
create table if not exists documentation_file_paths (
  id uuid primary key default gen_random_uuid(),
  version_id uuid references documentation_versions(id) on delete cascade,
  file_path text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists documentation_versions drop column if exists file_path;
