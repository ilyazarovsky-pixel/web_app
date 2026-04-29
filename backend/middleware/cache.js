const { getRedis, isRedisAvailable } = require('../utils/redis');

// TTL для кэша в секундах
const DEFAULT_TTL = 300; // 5 минут

/**
 * Нормализует объект query параметров в строку ключа
 * @param {object} queryParams - Объект query параметров
 * @param {string[]} allowedParams - Белый список разрешенных параметров
 * @returns {string} - Нормализованный ключ
 */
function normalizeQueryParams(queryParams, allowedParams = []) {
  if (!queryParams || typeof queryParams !== 'object') {
    return '';
  }

  // Фильтруем параметры по белому списку, если он предоставлен
  const filteredParams = allowedParams.length > 0
    ? Object.keys(queryParams).reduce((acc, key) => {
        if (allowedParams.includes(key)) {
          acc[key] = queryParams[key];
        }
        return acc;
      }, {})
    : queryParams;

  // Сортируем ключи для консистентности
  const sortedKeys = Object.keys(filteredParams).sort();
  const paramStr = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filteredParams[key])}`)
    .join('&');

  return paramStr;
}

/**
 * Middleware для кэширования ответов в Redis
 * @param {string} keyPrefix - Префикс для ключа кэша
 * @param {number} ttl - Время жизни кэша в секундах
 * @param {string[]} allowedQueryParams - Белый список разрешенных query параметров
 */
function cacheMiddleware(keyPrefix, ttl = DEFAULT_TTL, allowedQueryParams = []) {
  return async (req, res, next) => {
    // Если Redis не доступен — пропускаем запрос без кэша
    if (!isRedisAvailable()) {
      return next();
    }

    const redis = getRedis();
    
    // Генерируем ключ кэша из пути и нормализованных query параметров
    const queryString = normalizeQueryParams(req.query, allowedQueryParams);
    const cacheKey = queryString 
      ? `${keyPrefix}:${req.path}?${queryString}` 
      : `${keyPrefix}:${req.path}`;

    // Ограничиваем длину ключа, если она слишком большая
    const finalCacheKey = cacheKey.length > 250 
      ? cacheKey.substring(0, 250) + '_' + require('crypto').createHash('md5').update(cacheKey).digest('hex').substring(0, 10)
      : cacheKey;

    try {
      // Пытаемся получить данные из кэша
      const cachedData = await redis.get(finalCacheKey);

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Добавляем заголовок X-Cache: HIT
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', finalCacheKey);
        return res.json(parsed);
      }

      // Кэша нет — сохраняем оригинальный json метод
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', finalCacheKey);
      
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Сохраняем в кэш только успешные ответы
        if (res.statusCode === 200) {
          redis.setex(finalCacheKey, ttl, JSON.stringify(data)).catch(err => {
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
    // Используем SCAN вместо KEYS для избежания блокировки Redis
    const stream = redis.scanStream({
      match: pattern
    });
    
    const keys = [];
    stream.on('data', (resultKeys) => {
      keys.push(...resultKeys);
    });
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
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
  DEFAULT_TTL,
  normalizeQueryParams
};