-- Миграция корпусов из projects и заполнение крайних этажей
-- Переносим уникальные названия корпусов в таблицу blocks
insert into blocks (name)
select distinct unnest(building_names) as name
from projects
where building_names is not null
on conflict do nothing;

-- Заполняем таблицу маппинга projects_blocks
insert into projects_blocks (project_id, block_id)
select p.id, b.id
from projects p
cross join unnest(p.building_names) as bn(name)
join blocks b on b.name = bn.name
on conflict do nothing;

-- Записываем минимальный и максимальный этажи в проекты
update projects
set bottom_underground_floor = (select min(number) from floors),
    top_ground_floor = (select max(number) from floors)
where bottom_underground_floor is null
   or top_ground_floor is null;
