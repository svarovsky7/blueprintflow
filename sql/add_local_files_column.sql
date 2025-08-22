-- Добавление столбца local_files в таблицу documentation_versions
-- Дата: 2025-01-22
-- Описание: Добавляет возможность хранения локальных файлов для версий документации

-- Добавляем столбец для хранения локальных файлов в формате JSON
ALTER TABLE public.documentation_versions 
ADD COLUMN local_files jsonb DEFAULT '[]'::jsonb;

-- Добавляем комментарий к столбцу для документирования
COMMENT ON COLUMN public.documentation_versions.local_files IS 'Локальные файлы версии документации в формате JSON';

-- Создаем индекс для быстрого поиска по содержимому JSON
CREATE INDEX idx_documentation_versions_local_files 
ON public.documentation_versions USING gin(local_files);

-- Опционально: добавляем ограничение для валидации структуры JSON
ALTER TABLE public.documentation_versions 
ADD CONSTRAINT local_files_is_array 
CHECK (jsonb_typeof(local_files) = 'array');

/*
Структура данных, которая будет храниться в столбце local_files:
[
  {
    "name": "example.pdf",
    "path": "\\Documentation\\project-uuid\\doc-uuid\\example.pdf",
    "size": 1024000,
    "type": "application/pdf",
    "extension": "pdf",
    "uploadedAt": "2025-01-22T10:30:00.000Z"
  }
]

Поддерживаемые типы файлов:
- Excel: .xlsx, .xls
- Word: .docx, .doc
- PDF: .pdf
- AutoCAD: .dwg
*/