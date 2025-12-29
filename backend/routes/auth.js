const express = require('express');
const User = require('../models/User');
const {
  validateEmail,
  validatePassword,
  validateName,
  validateBirthDate,
  validateAge
} = require('../utils/validation');
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
      message: 'Пароль должен содержать не менее 4 символов'
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
  } catch (error) {
    if (error.message.includes('уже существует')) {
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

const { generateToken } = require('../middleware/auth');

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
      message: 'Пароль должен содержать не менее 4 символов'
    });
  }

  try {
    const user = await User.validatePassword(email, password);

    if (user) {
      // Генерируем JWT токен
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Вход выполнен',
        token,
        user: { id: user.id, name: user.name }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при входе'
    });
  }
});

module.exports = router;