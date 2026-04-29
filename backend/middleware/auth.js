const jwt = require('jsonwebtoken');
const { get } = require('../utils/database');  // Добавляем импорт функции получения данных

// Загружаем секрет при старте модуля
const JWT_SECRET = process.env.JWT_SECRET;

// Проверка при запуске
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не установлен!');
    console.error('   Сервер НЕ МОЖЕТ работать без секретного ключа.');
    console.error('   ');
    console.error('   Решение:');
    console.error('   1. Создайте файл .env в корне проекта');
    console.error('   2. Добавьте строку: JWT_SECRET=ваш-секретный-ключ');
    console.error('   ');
    console.error('   Сгенерировать ключ:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
  } else {
    console.warn('⚠️  JWT_SECRET не задан. Используется небезопасный ключ для разработки.');
  }
}

// Используем безопасный fallback только в development
const SECRET = JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-unsafe-key' : null);

// Access token: 15 минут
const ACCESS_TOKEN_EXPIRES = '15m';
// Refresh token: 7 дней
const REFRESH_TOKEN_EXPIRES = '7d';

function generateTokens(userId, tokenVersion = 0) {
  if (!SECRET) {
    throw new Error('JWT_SECRET не настроен');
  }

  const accessToken = jwt.sign(
    {
      id: userId,
      type: 'access',
      version: tokenVersion
    },
    SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );

  const refreshToken = jwt.sign(
    {
      id: userId,
      type: 'refresh',
      version: tokenVersion
    },
    SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 минут в секундах
  };
}

function generateToken(userId) {
  // Для обратной совместимости
  const { accessToken } = generateTokens(userId);
  return accessToken;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Проверяем тип токена — должен быть access
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Неверный тип токена' });
    }

    // Проверяем token_version с базой данных
    const userData = await get('SELECT token_version FROM users WHERE id = ?', [decoded.id]);

    if (!userData) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Сравниваем версию токена из токена с версией в базе данных
    if (decoded.version !== userData.token_version) {
      return res.status(401).json({ error: 'Токен устарел. Войдите заново' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истёк' });
    }
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Export the middleware function as default and named export
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.generateToken = generateToken;
module.exports.generateTokens = generateTokens;
module.exports.ACCESS_TOKEN_EXPIRES = ACCESS_TOKEN_EXPIRES;
module.exports.REFRESH_TOKEN_EXPIRES = REFRESH_TOKEN_EXPIRES;