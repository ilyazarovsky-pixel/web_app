const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Включаем gzip-сжатие для всех ответов
// Браузер автоматически распаковывает сжатые данные
app.use(compression({
  // Сжимаем ответы больше 1KB
  threshold: 1024,
  // Уровень сжатия (1-9, где 6 — баланс скорости и размера)
  level: 6
}));

// Логируем все HTTP-запросы
// Формат 'dev' показывает: метод, URL, статус, время ответа
app.use(morgan('dev'));

// Убедимся, что папка data существует
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Папка data создана');
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Список разрешённых доменов
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  // Добавь сюда production URL когда задеплоишь
];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Запрос заблокирован политикой CORS'));
    }
  },
  credentials: true // Разрешаем отправку cookies
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Сервим фронтенд

// Маршрут для favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Главная страница (перенаправление на авторизацию)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Обработчик для несуществующих маршрутов
// Должен быть после всех остальных маршрутов, но перед глобальным обработчиком ошибок
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// Глобальный обработчик ошибок
// Ловит все необработанные ошибки и возвращает понятный ответ
app.use((err, req, res, next) => {
  // Логируем ошибку для разработчика
  console.error('Ошибка:', err.message);
  console.error('Stack:', err.stack);

  // Определяем статус ответа
  const statusCode = err.status || 500;

  // В production не показываем детали ошибки
  const message = process.env.NODE_ENV === 'production'
    ? 'Внутренняя ошибка сервера'
    : err.message;

  res.status(statusCode).json({
    error: {
      message: message,
      status: statusCode
    }
  });
});

// Экспортируем app для тестирования
module.exports = app;

// Запускаем сервер только если файл запускается напрямую
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Бэкенд запущен на http://localhost:${PORT}`);
  });
}