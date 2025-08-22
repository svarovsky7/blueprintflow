# Documentation Files Storage

Эта папка содержит локально загруженные файлы документации.

## Структура папок:
```
Documentation/
├── {project-uuid}/
│   └── {documentation-uuid}/
│       ├── file1.pdf
│       ├── file2.xlsx
│       └── file3.dwg
```

## Поддерживаемые форматы:
- **Excel**: .xlsx, .xls
- **Word**: .docx, .doc  
- **PDF**: .pdf
- **AutoCAD**: .dwg

## Процесс загрузки:
1. Файл загружается через веб-интерфейс
2. Создается Blob URL для доступа в текущей сессии
3. Путь к файлу сохраняется в базе данных
4. Файл доступен для скачивания и открытия

## Техническая реализация:
- Файлы хранятся в sessionStorage как Blob URLs
- Пути сохраняются в поле `local_files` таблицы `documentation_versions`
- Интеграция с системой управления документацией BlueprintFlow