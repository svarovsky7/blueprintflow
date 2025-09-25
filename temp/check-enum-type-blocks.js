import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnumTypeBlocks() {
  try {
    console.log('✅ Подключение к Supabase');

    // Сначала проверим существующие данные в таблице blocks
    console.log('\n🔍 Проверка структуры таблицы blocks...');
    const { data: blocksData, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .limit(3);

    if (blocksError) {
      console.error('❌ Ошибка получения данных из blocks:', blocksError);
      return;
    }

    if (blocksData && blocksData.length > 0) {
      console.log('✅ Найдены записи в таблице blocks:');
      console.log('Колонки в таблице:', Object.keys(blocksData[0]));
      console.log('\nПримеры записей:');
      blocksData.forEach((block, index) => {
        console.log(`${index + 1}.`, block);
      });
    } else {
      console.log('ℹ️ Таблица blocks пуста');
    }

    // Попробуем вставить с правильным именем колонки
    await testBlockInsertion();

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали:', error);
  }
}

async function testBlockInsertion() {
  console.log('\n🧪 Тестирование вставки записи с новым типом...');

  try {
    // Тестовая вставка с правильным именем колонки
    const { data: insertData, error: insertError } = await supabase
      .from('blocks')
      .insert([{
        name: 'Тестовый блок для проверки ENUM',
        type_blocks: 'Типовой корпус.Тех.этаж'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Ошибка вставки:', insertError);
      return;
    }

    console.log('✅ Тестовая вставка успешна:');
    console.log(insertData);

    // Удаление тестовой записи
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.error('❌ Ошибка удаления:', deleteError);
    } else {
      console.log('✅ Тестовая запись удалена');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

checkEnumTypeBlocks();