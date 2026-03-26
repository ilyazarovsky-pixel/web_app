const { getRedis, isRedisAvailable } = require('../utils/redis');

// TTL для кэша в секундах
const DEFAULT_TTL = 300; // 5 минут

/**
 * Middleware для кэширования ответов в Redis
 * @param {string} keyPrefix - Префикс для ключа кэша
 * @param {number} ttl - Время жизни кэша в секундах
 */
function cacheMiddleware(keyPrefix, ttl = DEFAULT_TTL) {
  return async (req, res, next) => {
    // Если Redis не доступен — пропускаем запрос без кэша
    if (!isRedisAvailable()) {
      return next();
    }

    const redis = getRedis();
    
    // Генерируем ключ кэша из URL и query параметров
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      // Пытаемся получить данные из кэша
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Добавляем заголовок X-Cache: HIT
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(parsed);
      }

      // Кэша нет — сохраняем оригинальный json метод
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Сохраняем в кэш только успешные ответы
        if (res.statusCode === 200) {
          redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
            console.error('Ошибка сохранения в кэш Redis:', err.message);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Ошибка кэширования Redis:', err.message);
      // При ошибке кэша — пропускаем запрос без кэша
      next();
    }
  };
}

/**
 * Инвалидировать кэш по паттерну ключа
 * @param {string} pattern - Паттерн ключа (например, "courses:*")
 */
async function invalidateCache(pattern) {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Инвалидировано ${keys.length} ключей кэша по паттерну ${pattern}`);
    }
  } catch (err) {
    console.error('Ошибка инвалидации кэша:', err.message);
  }
}

/**
 * Очистить весь кэш
 */
async function clearAllCache() {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  try {
    await redis.flushdb();
    console.log('🗑️  Весь кэш очищен');
  } catch (err) {
    console.error('Ошибка очистки кэша:', err.message);
  }
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearAllCache,
  DEFAULT_TTL
};
