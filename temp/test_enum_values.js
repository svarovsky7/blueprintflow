import { createClient } from '@supabase/supabase-js';

// Подключение к Supabase
const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEnumValues() {
  console.log('🔍 Проверяем текущие значения ENUM type_blocks...');

  try {
    // Получаем все существующие блоки для проверки возможных значений ENUM
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, name, type_blocks')
      .limit(10);

    if (blocksError) {
      console.error('❌ Ошибка при получении блоков:', blocksError);
      return;
    }

    console.log('✅ Текущие блоки и их типы:');
    blocks.forEach(block => {
      console.log(`  - ${block.name}: ${block.type_blocks}`);
    });

    // Пробуем создать тестовый блок с новым значением ENUM
    console.log('\n🧪 Тестируем возможность использования нового значения ENUM...');

    const testBlock = {
      name: `test_technical_floor_${Date.now()}`,
      type_blocks: 'Типовой корпус.Тех.этаж'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('blocks')
      .insert(testBlock)
      .select();

    if (insertError) {
      console.error('❌ Не удается вставить блок с новым типом:', insertError);
      console.log('💡 Это означает, что значение еще не добавлено в ENUM type_blocks');

      // Покажем возможные значения из ошибки
      if (insertError.message.includes('invalid input value')) {
        console.log('📋 Для добавления нового значения необходимо выполнить SQL команду:');
        console.log("   ALTER TYPE public.type_blocks ADD VALUE 'Типовой корпус.Тех.этаж';");
        console.log('   через админ-панель Supabase или psql');
      }
    } else {
      console.log('✅ Тестовый блок успешно создан!', insertResult);
      console.log('🎉 Новое значение ENUM уже работает!');

      // Удаляем тестовый блок
      const { error: deleteError } = await supabase
        .from('blocks')
        .delete()
        .eq('id', insertResult[0].id);

      if (!deleteError) {
        console.log('🧹 Тестовый блок удален');
      }
    }

    // Также проверяем block_floor_mapping
    console.log('\n🏢 Проверяем поддержку в block_floor_mapping...');

    const testMapping = {
      block_id: blocks[0]?.id, // Используем существующий блок
      floor_number: -99, // Уникальный номер для теста
      type_blocks: 'Типовой корпус.Тех.этаж'
    };

    const { data: mappingResult, error: mappingError } = await supabase
      .from('block_floor_mapping')
      .insert(testMapping)
      .select();

    if (mappingError) {
      console.error('❌ Не удается добавить mapping с новым типом:', mappingError);
    } else {
      console.log('✅ Mapping с новым типом создан!', mappingResult);

      // Удаляем тестовый mapping
      await supabase
        .from('block_floor_mapping')
        .delete()
        .eq('id', mappingResult[0].id);
      console.log('🧹 Тестовый mapping удален');
    }

  } catch (error) {
    console.error('💥 Произошла ошибка:', error.message);
  }
}

testEnumValues().then(() => {
  console.log('\n🏁 Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});