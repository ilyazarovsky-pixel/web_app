const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./utils/swagger');
const http = require('http');
const { initRedis, closeRedis, getRedis, isRedisAvailable } = require('./utils/redis');
const { initDb } = require('./utils/database');

// Import logger, request ID middleware and metrics
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middleware/requestId');
const { metricsMiddleware } = require('./routes/metrics');

// Import Sentry
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // Enable Profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    profilesSampleRate: 1.0, // Profile 100% of the transactions
  });
}

// Инициализируем БД при запуске сервера
initDb();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

/**
 * Создать store для rate limiting
 * Если Redis недоступен — используется memory store
 */
function createRateLimitStore() {
  if (isRedisAvailable()) {
    return new RedisStore({
      sendCommand: (...args) => getRedis().call(...args),
    });
  }
  return null; // Fallback на memory store
}

// Общий лимит: 100 запросов за 15 минут с одного IP
// В тестовой среде отключаем ограничение
const generalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? Number.MAX_SAFE_INTEGER : 100,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV !== 'test' ? createRateLimitStore() : undefined,
});

// Строгий лимит для авторизации: 5 попыток за 15 минут
// В тестовой среде отключаем ограничение
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? Number.MAX_SAFE_INTEGER : 5,
  message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV !== 'test' ? createRateLimitStore() : undefined,
});

// Устанавливает безопасные HTTP-заголовки:
// X-Content-Type-Options, X-Frame-Options, CSP и другие
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrcAttr: ['\'self\'', '\'unsafe-inline\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdnjs.cloudflare.com'],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\''],
      fontSrc: ['\'self\'', 'https://cdnjs.cloudflare.com'],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\'']
    }
  }
}));

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

// Add request ID middleware
app.use(requestIdMiddleware);

// Use metrics middleware
app.use(metricsMiddleware);

// Add Sentry request handler if Sentry is initialized
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracing());
}

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.requestId
  });
});

// Ready check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check if database is available
    const { get } = require('./utils/database');
    await get('SELECT 1');
    
    // Check if Redis is available
    if (isRedisAvailable()) {
      await getRedis().ping();
    }
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    logger.error({ error: error.message, requestId: req.requestId }, 'Service not ready');
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      requestId: req.requestId
    });
  }
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Сервим загруженные файлы

// Применяем строгий лимит только к авторизации
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Маршрут для favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api')); // Основной API курсов (/api/courses, /api/courses/:id)
app.use('/api', require('./routes/courses')); // Поиск курсов /api/courses/search
app.use('/api', require('./routes/categories'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/course-pages')); // Страницы курсов /api/course-pages
app.use(require('./routes/profile'));
app.use(require('./routes/stats'));
app.use(require('./routes/enrollments'));
app.use('/api', require('./routes/progress')); // Прогресс /api/progress
app.use(require('./routes/favorites'));
app.use(require('./routes/reviews'));
app.use(require('./routes/notifications'));

// Metrics endpoint
app.use('/metrics', require('./routes/metrics').router);

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'LearnHub API Docs'
}));

// Инициализация WebSocket сервера
if (process.env.NODE_ENV !== 'test') {
  const { initWebSocket } = require('./websocket');
  initWebSocket(server);

  // Инициализация Redis
  initRedis();
}

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
// КРИТИЧНО: Express требует РОВНО 4 параметра для error middleware!
// Даже если _next не используется — он должен быть в сигнатуре
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Логируем ошибку с помощью pino
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId,
    statusCode: res.statusCode
  }, 'Unhandled error occurred');

  // Capture error with Sentry
  Sentry.captureException(err);

  // Определяем статус ответа
  const statusCode = err.status || err.statusCode || 500;

  // В production не показываем детали ошибки
  const message = process.env.NODE_ENV === 'production'
    ? 'Внутренняя ошибка сервера'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      status: statusCode,
      requestId: req.requestId
    }
  });
});

// Capture errors with Sentry if it's configured
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Корректное завершение работы
function gracefulShutdown(server, signal) {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
  
  server.close(() => {
    logger.info('HTTP server closed');
    // Закрываем соединение с Redis
    closeRedis().then(() => {
      logger.info('Database closed');
      process.exit(0);
    });
  });

  // Если за 10 секунд не завершились — принудительно
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Экспортируем app для тестирования
module.exports = app;

// Запускаем сервер только если файл запускается напрямую
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`✅ Бэкенд запущен на http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
}