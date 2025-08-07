import 'dotenv/config';                // подхватит .env.local и .env.local по умолчанию
// или: import 'dotenv/config?path=.env.local'

const t = process.env.VITE_SUPABASE_ANON_KEY;

if (!t) {
    console.error('Переменная VITE_SUPABASE_ANON_KEY не найдена');
    process.exit(1);
}

if (!t.includes('.')) {                // publishable-key, в нём нет exp
    console.log('Publishable-key → exp отсутствует, ключ действует ~10 лет');
    process.exit(0);
}

const { exp } = JSON.parse(Buffer.from(t.split('.')[1], 'base64'));
console.log('exp:', exp, '→', new Date(exp * 1000));
console.log('now:', Date.now() / 1000);
