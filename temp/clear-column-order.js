// Скрипт для очистки сохраненного порядка столбцов в localStorage
// Запустите этот скрипт в консоли браузера на странице Шахматки

console.log('Текущий порядок столбцов:', localStorage.getItem('chessboard-column-order'));
localStorage.removeItem('chessboard-column-order');
console.log('Порядок столбцов очищен. Перезагрузите страницу для применения нового порядка по умолчанию.');
