// Используем встроенный fetch (Node.js 18+)

// Конфигурация Supabase
const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc';

async function executeDirectSQL() {
  console.log('🔧 Попытка выполнения SQL команды напрямую через Supabase REST API...');

  try {
    // Попытка выполнить SQL через RPC endpoint
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/exec`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: "ALTER TYPE public.type_blocks ADD VALUE 'Типовой корпус.Тех.этаж';"
      })
    });

    console.log('📡 Response status:', response.status);
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.ok) {
      console.log('✅ SQL команда выполнена успешно!');

      // Проверяем результат
      const checkResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'type_blocks') ORDER BY enumsortorder;`
        })
      });

      const checkResult = await checkResponse.text();
      console.log('🔍 Проверка значений ENUM:', checkResult);

    } else {
      console.log('❌ Не удалось выполнить SQL команду');
      console.log('💡 Возможные причины:');
      console.log('   - Недостаточно прав доступа');
      console.log('   - RPC функция не существует');
      console.log('   - Необходимы права суперпользователя для ALTER TYPE');
    }

  } catch (error) {
    console.error('💥 Ошибка при выполнении запроса:', error.message);
  }
}

// Альтернативный подход - проверим доступные RPC функции
async function listRPCFunctions() {
  console.log('\n🔍 Проверяем доступные RPC функции...');

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });

    const functions = await response.text();
    console.log('📋 Доступные RPC функции:', functions);

  } catch (error) {
    console.error('❌ Не удалось получить список RPC функций:', error.message);
  }
}

async function main() {
  await executeDirectSQL();
  await listRPCFunctions();

  console.log('\n📖 Рекомендации:');
  console.log('1. Используйте Supabase Dashboard -> SQL Editor');
  console.log('2. Выполните команду: ALTER TYPE public.type_blocks ADD VALUE \'Типовой корпус.Тех.этаж\';');
  console.log('3. Проверьте результат командой из sql/add_technical_floor_enum.sql');
  console.log('4. Запустите node temp/verify_enum_update.js для финальной проверки');
}

main().then(() => {
  console.log('\n🏁 Выполнение завершено');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});