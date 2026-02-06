const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Middleware для проверки JWT токена
const authMiddleware = require('../middleware/auth');

// GET /profile — получить данные текущего пользователя
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // req.user содержит данные из JWT тока
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // НИКОГДА не возвращай пароль!
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      birthDate: user.birth_date,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Ошибка при получении профиля:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /profile/password — сменить пароль
router.put('/profile/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Валидация входных данных
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Новый пароль должен быть минимум 4 символов' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Новый пароль должен отличаться от текущего' });
  }

  try {
    // Получаем текущего пользователя с паролем для проверки
    const user = await User.findByIdWithPassword(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем текущий пароль
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    // Хешируем и сохраняем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль в базе данных
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../data/database.db');
    const db = new Database(dbPath);

    db.prepare('UPDATE users SET password = ? WHERE id = ?')
      .run(hashedPassword, req.user.id);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;