const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { validateName, validateBirthDate, validateAge } = require('../utils/validation');
const { upload, handleUploadError } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

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

// PUT /profile — обновить профиль
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, bio, birthDate } = req.body;
  const userId = req.user.id;

  // Собираем поля для обновления
  const updates = [];
  const values = [];

  if (name !== undefined) {
    if (!validateName(name)) {
      return res.status(400).json({ error: 'Имя должно быть от 1 до 100 символов' });
    }
    updates.push('name = ?');
    values.push(name);
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.length > 500) {
      return res.status(400).json({ error: 'Bio должно быть до 500 символов' });
    }
    updates.push('bio = ?');
    values.push(bio);
  }

  if (birthDate !== undefined) {
    if (!validateBirthDate(birthDate)) {
      return res.status(400).json({ error: 'Некорректная дата рождения' });
    }
    if (!validateAge(birthDate, 16)) {
      return res.status(400).json({ error: 'Возраст должен быть не менее 16 лет' });
    }
    updates.push('birth_date = ?');
    values.push(birthDate);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }

  // Добавляем updated_at
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  try {
    const { run } = require('../utils/database');
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Возвращаем обновлённый профиль
    const user = await User.findById(userId);
    res.json({
      message: 'Профиль обновлён',
      user
    });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err.message);
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

  // Проверка сложности пароля: минимум 8 символов, буквы и цифры
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Новый пароль должен содержать минимум 8 символов' });
  }

  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Пароль должен содержать буквы и цифры' });
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
    const { run } = require('../utils/database');
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /profile — удалить аккаунт
router.delete('/profile', authMiddleware, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  if (!password) {
    return res.status(400).json({ error: 'Введите пароль для подтверждения' });
  }

  try {
    const user = await User.findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const { run } = require('../utils/database');

    // Удаляем связанные данные (когда добавишь эти таблицы)
    // await run('DELETE FROM enrollments WHERE user_id = ?', [userId]);
    // await run('DELETE FROM progress WHERE user_id = ?', [userId]);
    // await run('DELETE FROM favorites WHERE user_id = ?', [userId]);

    // Удаляем пользователя
    await run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Аккаунт удалён' });
  } catch (err) {
    console.error('Ошибка удаления:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /profile/avatar — загрузить аватар
router.post('/profile/avatar', authMiddleware, upload.single('avatar'), handleUploadError, async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  try {
    // Получаем текущего пользователя для удаления старого аватара
    const user = await User.findById(userId);
    if (user && user.avatar) {
      // Удаляем старый файл аватара
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Сохраняем путь к новому аватару
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const { run } = require('../utils/database');
    await run('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, userId]);

    res.json({
      message: 'Аватар загружен',
      avatar: avatarUrl
    });
  } catch (err) {
    console.error('Ошибка загрузки аватара:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /profile/avatar — удалить аватар
router.delete('/profile/avatar', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (user && user.avatar) {
      // Удаляем файл аватара
      const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    const { run } = require('../utils/database');
    await run('UPDATE users SET avatar = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);

    res.json({ message: 'Аватар удалён' });
  } catch (err) {
    console.error('Ошибка удаления аватара:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
