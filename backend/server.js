const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const app = express();
const PORT = process.env.PORT || 3000;

// Общий лимит: 100 запросов за 15 минут с одного IP
// В тестовой среде отключаем ограничение
const generalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1 : 15 * 60 * 1000,  // 1ms in test mode = no effective limit
  max: process.env.NODE_ENV === 'test' ? Number.MAX_SAFE_INTEGER : 100,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий лимит для авторизации: 5 попыток за 15 минут
// В тестовой среде отключаем ограничение
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1 : 15 * 60 * 1000,  // 1ms in test mode = no effective limit
  max: process.env.NODE_ENV === 'test' ? Number.MAX_SAFE_INTEGER : 5,
  message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Устанавливает безопасные HTTP-заголовки:
// X-Content-Type-Options, X-Frame-Options, CSP и другие
app.use(helmet());

// Включаем gzip-сжатие для всех ответов
// Браузер автоматически распаковывает сжатые данные
app.use(compression({
  // Сжимаем ответы больше 1KB
  threshold: 1024,
  // Уровень сжатия (1-9, где 6 — баланс скорости и размера)
  level: 6
}));

// Создаём папку для логов
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Ротация логов: новый файл каждый день, хранить 14 дней
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',    // новый файл каждый день
  path: logDirectory,
  maxFiles: 14        // хранить 14 файлов
});

if (process.env.NODE_ENV === 'production') {
  // Production: подробный формат в файл
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  // Development: короткий формат в консоль
  app.use(morgan('dev'));
}

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

// Читаем список из переменной окружения
// Формат: CORS_ORIGINS=http://localhost:3000,http://localhost:5000
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5000'];

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

// Применяем общий лимит ко всем маршрутам
app.use(generalLimiter);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Сервим фронтенд

// Применяем строгий лимит только к авторизации
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Маршрут для favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use(require('./routes/profile'));
app.use(require('./routes/courses'));
app.use(require('./routes/stats'));

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

// Корректное завершение работы
function gracefulShutdown(server, signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed.');
    // Здесь можно закрыть соединение с БД:
    // db.close(() => { console.log('Database closed.'); process.exit(0); });
    process.exit(0);
  });

  // Если за 10 секунд не завершились — принудительно
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

// Экспортируем app для тестирования
module.exports = app;

// Запускаем сервер только если файл запускается напрямую
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Бэкенд запущен на http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
}