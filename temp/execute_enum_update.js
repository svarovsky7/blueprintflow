import { createClient } from '@supabase/supabase-js';

// Подключение к Supabase
const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeEnumUpdate() {
  console.log('🔄 Добавляем новое значение в ENUM type_blocks...');

  try {
    // Выполняем ALTER TYPE команду
    const { data: alterResult, error: alterError } = await supabase.rpc('execute_sql', {
      sql: `ALTER TYPE public.type_blocks ADD VALUE 'Типовой корпус.Тех.этаж';`
    });

    if (alterError) {
      console.error('❌ Ошибка при добавлении значения в ENUM:', alterError);

      // Попробуем альтернативный способ через прямой SQL запрос
      const { data: directResult, error: directError } = await supabase
        .from('pg_enum')
        .select('*')
        .limit(1);

      if (directError) {
        console.error('❌ Также не удается получить доступ к системным таблицам:', directError);
        console.log('💡 Необходимо выполнить команду напрямую в базе данных через админ-панель Supabase');
        return;
      }
    } else {
      console.log('✅ Значение успешно добавлено в ENUM type_blocks');
    }

    // Проверяем добавленное значение
    console.log('🔍 Проверяем текущие значения ENUM type_blocks...');

    const { data: checkResult, error: checkError } = await supabase.rpc('get_enum_values', {
      enum_name: 'type_blocks'
    });

    if (checkError) {
      console.log('⚠️  Не удается получить значения ENUM через RPC, попробуем другой способ');

      // Альтернативная проверка - попробуем создать запись с новым значением
      const testData = {
        name: 'test_block_technical',
        type_blocks: 'Типовой корпус.Тех.этаж'
      };

      const { data: testResult, error: testError } = await supabase
        .from('blocks')
        .insert(testData)
        .select();

      if (testError) {
        console.error('❌ Тестовая вставка не удалась:', testError);
        console.log('Возможно, значение еще не добавлено или есть проблемы с правами доступа');
      } else {
        console.log('✅ Тестовая вставка успешна! Новое значение ENUM работает');

        // Удаляем тестовую запись
        await supabase
          .from('blocks')
          .delete()
          .eq('name', 'test_block_technical');

        console.log('🧹 Тестовая запись удалена');
      }

    } else {
      console.log('✅ Текущие значения ENUM type_blocks:', checkResult);
    }

  } catch (error) {
    console.error('💥 Произошла ошибка:', error.message);
  }
}

executeEnumUpdate().then(() => {
  console.log('🏁 Скрипт завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});