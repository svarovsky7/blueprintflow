import { createClient } from '@supabase/supabase-js';

// Подключение к Supabase
const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEnumUpdate() {
  console.log('🔍 Проверяем успешность добавления нового значения в ENUM type_blocks...\n');

  try {
    // Тест 1: Создание блока с новым типом
    console.log('📝 Тест 1: Создание блока с типом "Типовой корпус.Тех.этаж"');

    const testBlock = {
      name: `test_tech_floor_${Date.now()}`,
      type_blocks: 'Типовой корпус.Тех.этаж'
    };

    const { data: blockResult, error: blockError } = await supabase
      .from('blocks')
      .insert(testBlock)
      .select();

    if (blockError) {
      console.error('❌ FAILED: Не удается создать блок с новым типом');
      console.error('   Ошибка:', blockError.message);
      console.log('💡 Вероятно, значение еще не добавлено в ENUM\n');
    } else {
      console.log('✅ SUCCESS: Блок успешно создан с новым типом!');
      console.log('   ID блока:', blockResult[0].id);

      // Удаляем тестовый блок
      await supabase
        .from('blocks')
        .delete()
        .eq('id', blockResult[0].id);
      console.log('🧹 Тестовый блок удален\n');
    }

    // Тест 2: Создание записи в block_floor_mapping
    console.log('📝 Тест 2: Создание записи в block_floor_mapping с новым типом');

    // Получаем любой существующий блок
    const { data: existingBlocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id')
      .limit(1);

    if (blocksError || !existingBlocks.length) {
      console.log('⚠️  SKIP: Нет доступных блоков для теста mapping');
    } else {
      const testMapping = {
        block_id: existingBlocks[0].id,
        floor_number: -888, // Уникальный номер для теста
        type_blocks: 'Типовой корпус.Тех.этаж'
      };

      const { data: mappingResult, error: mappingError } = await supabase
        .from('block_floor_mapping')
        .insert(testMapping)
        .select();

      if (mappingError) {
        console.error('❌ FAILED: Не удается создать mapping с новым типом');
        console.error('   Ошибка:', mappingError.message);
      } else {
        console.log('✅ SUCCESS: Mapping успешно создан с новым типом!');
        console.log('   ID mapping:', mappingResult[0].id);

        // Удаляем тестовый mapping
        await supabase
          .from('block_floor_mapping')
          .delete()
          .eq('id', mappingResult[0].id);
        console.log('🧹 Тестовый mapping удален');
      }
    }

    console.log('\n📊 Результат проверки:');

    if (!blockError && (!existingBlocks.length || !mappingError)) {
      console.log('🎉 ENUM type_blocks успешно обновлен!');
      console.log('✅ Значение "Типовой корпус.Тех.этаж" теперь доступно');
      console.log('📝 Можно использовать в коде приложения');

      // Показываем пример использования
      console.log('\n💡 Пример использования в коде:');
      console.log('const blockData = {');
      console.log('  name: "Технический этаж",');
      console.log('  type_blocks: "Типовой корпус.Тех.этаж"');
      console.log('};');

    } else {
      console.log('❌ ENUM type_blocks НЕ обновлен');
      console.log('📋 Необходимо выполнить SQL команду:');
      console.log('   ALTER TYPE public.type_blocks ADD VALUE \'Типовой корпус.Тех.этаж\';');
      console.log('📖 См. подробности в temp/ENUM_UPDATE_INSTRUCTIONS.md');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка при проверке:', error.message);
  }
}

verifyEnumUpdate().then(() => {
  console.log('\n🏁 Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка выполнения:', error);
  process.exit(1);
});