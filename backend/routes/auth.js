const express = require('express');
const User = require('../models/User');
const {
  validateEmail,
  validatePassword,
  validateName,
  validateBirthDate,
  validateAge
} = require('../utils/validation');
const { generateTokens } = require('../middleware/auth');
const { run, get } = require('../utils/database');
const router = express.Router();

// Обновлённый обработчик регистрации
router.post('/register', async (req, res) => {
  const { name, email, password, birthDate } = req.body;

  // Валидация данных
  if (!validateName(name)) {
    return res.status(400).json({
      success: false,
      message: 'Имя должно быть строкой и содержать хотя бы 1 символ'
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Некорректный формат email'
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры'
    });
  }

  if (!validateBirthDate(birthDate)) {
    return res.status(400).json({
      success: false,
      message: 'Некорректная дата рождения'
    });
  }

  if (!validateAge(birthDate)) {
    return res.status(400).json({
      success: false,
      message: 'Вам должно быть не менее 16 лет для регистрации'
    });
  }

  try {
    const newUser = await User.create({
      name,
      email,
      password,
      birthDate
    });

    res.json({
      success: true,
      message: 'Регистрация успешна',
      user: { id: newUser.id, name: newUser.name }
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err.message, err.stack);
    if (err.message.includes('уже существует')) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации'
    });
  }
});

// Обновлённый обработчик входа
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Валидация данных
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Некорректный формат email'
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры'
    });
  }

  try {
    const user = await User.validatePassword(email, password);

    if (user) {
      // Получаем token_version пользователя
      const userData = await get('SELECT token_version FROM users WHERE id = ?', [user.id]);
      const tokenVersion = userData?.token_version || 0;

      // Генерируем пару токенов
      const tokens = generateTokens(user.id, tokenVersion);

      res.json({
        success: true,
        message: 'Вход выполнен',
        ...tokens,
        token: tokens.accessToken, // Для обратной совместимости с фронтендом
        user: { id: user.id, name: user.name }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }
  } catch (err) {
    console.error('Ошибка при входе:', err.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при входе'
    });
  }
});

// POST /auth/refresh — обновить пару токенов
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token не предоставлен'
    });
  }

  const jwt = require('jsonwebtoken');
  const SECRET = process.env.JWT_SECRET || 'dev-only-unsafe-key';

  try {
    const decoded = jwt.verify(refreshToken, SECRET);

    // Проверяем тип токена — должен быть refresh
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Неверный тип токена' });
    }

    // Получаем текущую версию токена пользователя
    const userData = await get('SELECT token_version FROM users WHERE id = ?', [decoded.id]);

    if (!userData) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем версию токена (защита от replay attacks)
    if (decoded.version !== userData.token_version) {
      return res.status(401).json({ error: 'Токен устарел. Войдите заново' });
    }

    // Генерируем новую пару токенов
    const tokens = generateTokens(decoded.id, userData.token_version);

    res.json({
      success: true,
      ...tokens
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token истёк' });
    }
    return res.status(401).json({ error: 'Недействительный refresh token' });
  }
});

// POST /auth/logout — выход с инвалидацией токена
router.post('/logout', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId не предоставлен'
    });
  }

  try {
    // Увеличиваем token_version, что делает все старые токены недействительными
    await run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  } catch (err) {
    console.error('Ошибка при выходе:', err.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при выходе'
    });
  }
});

module.exports = router;
