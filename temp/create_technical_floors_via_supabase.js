// Скрипт для создания таблицы block_technical_floors через Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTechnicalFloorsTable() {
  console.log('🏗️ Создаю таблицу block_technical_floors...');

  try {
    // SQL для создания таблицы
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.block_technical_floors (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
          floor_number INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(block_id, floor_number)
      );
    `;

    // Выполняем SQL через rpc или raw query
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (error) {
      console.error('❌ Ошибка при создании таблицы:', error);

      // Пробуем альтернативный способ
      console.log('🔄 Пробую альтернативный способ...');

      // Проверим, существует ли таблица
      const { data: existingTables, error: checkError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'block_technical_floors');

      if (checkError) {
        console.error('❌ Не удается проверить существование таблицы:', checkError);
        return false;
      }

      if (existingTables && existingTables.length > 0) {
        console.log('✅ Таблица block_technical_floors уже существует');
        return true;
      } else {
        console.error('❌ Таблица не существует и не может быть создана');
        return false;
      }
    }

    console.log('✅ Таблица block_technical_floors успешно создана');

    // Создаем индексы
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_block_technical_floors_block_id ON public.block_technical_floors(block_id);',
      'CREATE INDEX IF NOT EXISTS idx_block_technical_floors_floor_number ON public.block_technical_floors(floor_number);'
    ];

    for (const indexSQL of createIndexes) {
      console.log('📍 Создаю индекс...');
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql_query: indexSQL
      });

      if (indexError) {
        console.warn('⚠️ Предупреждение при создании индекса:', indexError);
      } else {
        console.log('✅ Индекс создан успешно');
      }
    }

    // Создаем функцию триггера для updated_at
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = timezone('utc'::text, now());
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    console.log('⚙️ Создаю функцию триггера...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql_query: createTriggerFunction
    });

    if (functionError) {
      console.warn('⚠️ Предупреждение при создании функции:', functionError);
    } else {
      console.log('✅ Функция триггера создана успешно');
    }

    // Создаем триггер
    const createTrigger = `
      CREATE TRIGGER update_block_technical_floors_updated_at
          BEFORE UPDATE ON public.block_technical_floors
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    `;

    console.log('🔔 Создаю триггер...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql_query: createTrigger
    });

    if (triggerError) {
      console.warn('⚠️ Предупреждение при создании триггера:', triggerError);
    } else {
      console.log('✅ Триггер создан успешно');
    }

    return true;
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
    return false;
  }
}

// Проверяем структуру созданной таблицы
async function checkTableStructure() {
  console.log('🔍 Проверяю структуру таблицы...');

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'block_technical_floors')
    .order('ordinal_position');

  if (error) {
    console.error('❌ Ошибка при проверке структуры:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 Структура таблицы block_technical_floors:');
    data.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
    });
  } else {
    console.log('❌ Таблица block_technical_floors не найдена');
  }
}

// Основная функция
async function main() {
  console.log('🚀 Начинаю создание таблицы для технических этажей...');

  const success = await createTechnicalFloorsTable();

  if (success) {
    await checkTableStructure();
    console.log('🎉 Процесс завершен успешно!');
  } else {
    console.log('💥 Процесс завершился с ошибками');
  }
}

main().catch(console.error);