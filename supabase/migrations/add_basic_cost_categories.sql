-- Добавляем основные категории затрат
insert into cost_categories (id, number, name, description)
values 
  (1, 1, 'Строительные работы', 'Основные строительные работы'),
  (2, 2, 'Монтажные работы', 'Монтажные и установочные работы'),
  (3, 3, 'Материалы', 'Строительные материалы'),
  (4, 4, 'Оборудование', 'Технологическое оборудование'),
  (5, 5, 'Транспорт', 'Транспортные расходы'),
  (99, 99, 'Прочее', 'Прочие расходы')
on conflict (id) do update set
  number = excluded.number,
  name = excluded.name,
  description = excluded.description;