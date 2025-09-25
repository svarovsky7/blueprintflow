import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllEnumValues() {
  try {
    console.log('✅ Подключение к Supabase');

    // Получим все уникальные значения type_blocks из существующих записей
    console.log('\n🔍 Проверка всех существующих значений type_blocks в таблице blocks:');

    const { data: uniqueTypes, error: typesError } = await supabase
      .from('blocks')
      .select('type_blocks')
      .not('type_blocks', 'is', null);

    if (typesError) {
      console.error('❌ Ошибка получения типов:', typesError);
      return;
    }

    // Получаем уникальные значения
    const uniqueValues = [...new Set(uniqueTypes.map(item => item.type_blocks))].sort();

    console.log('✅ Найденные уникальные значения type_blocks:');
    uniqueValues.forEach((value, index) => {
      console.log(`${index + 1}. "${value}"`);
    });

    // Проверяем наличие нового значения
    const hasTargetValue = uniqueValues.includes('Типовой корпус.Тех.этаж');
    console.log(`\n✓ Значение 'Типовой корпус.Тех.этаж' ${hasTargetValue ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО'} в существующих записях`);

    // Проверим также общее количество записей
    const { count, error: countError } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nℹ️ Общее количество записей в таблице blocks: ${count}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

getAllEnumValues();