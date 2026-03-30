const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis = null;
let redisErrorLogged = false;

/**
 * Инициализация Redis подключения
 * @returns {Redis|null} Redis клиент или null если не доступен
 */
function initRedis() {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFail: 1000,
      connectTimeout: 5000,
      lazyConnect: true
    });

    redis.on('connect', () => {
      console.log('✅ Redis подключен');
      redisErrorLogged = false;
    });

    redis.on('error', (err) => {
      // Логируем только первую ошибку, чтобы не спамить
      if (!redisErrorLogged) {
        console.warn('⚠️  Redis не доступен, работа без кэша:', err.message);
        redisErrorLogged = true;
      }
    });

    redis.on('close', () => {
      if (!redisErrorLogged) {
        console.warn('⚠️  Redis отключен');
      }
    });

    return redis;
  } catch (err) {
    console.warn('⚠️  Redis не доступен, работа без кэша:', err.message);
    return null;
  }
}

/**
 * Получить Redis клиент
 * @returns {Redis|null}
 */
function getRedis() {
  return redis;
}

/**
 * Проверка доступности Redis
 * @returns {boolean}
 */
function isRedisAvailable() {
  return redis !== null && redis.status === 'ready';
}

/**
 * Graceful shutdown для Redis
 */
async function closeRedis() {
  if (redis) {
    console.log('🔄 Закрытие соединения с Redis...');
    try {
      await redis.quit();
      console.log('✅ Redis соединение закрыто');
    } catch (err) {
      console.error('Ошибка закрытия Redis:', err.message);
      redis.forceClose();
    }
  }
}

module.exports = {
  initRedis,
  getRedis,
  isRedisAvailable,
  closeRedis
};
