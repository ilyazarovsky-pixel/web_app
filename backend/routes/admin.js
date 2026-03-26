const express = require('express');
const router = express.Router();
const { run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { invalidateCache } = require('../middleware/cache');

// Middleware для защиты админ-маршрутов
const requireAdmin = [authMiddleware, requireRole('admin')];

// GET /admin/courses — список всех курсов (админ)
router.get('/admin/courses', requireAdmin, async (req, res) => {
  try {
    const courses = await all(
      `SELECT c.id, c.title, c.description, c.category_id, c.created_at,
              cat.name as category_name, cat.slug as category_slug
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       ORDER BY c.created_at DESC`
    );

    res.json(courses);
  } catch (err) {
    console.error('Ошибка получения курсов:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /admin/courses — создать курс (админ)
router.post('/admin/courses', requireAdmin, async (req, res) => {
  const { title, description, categoryId } = req.body;

  if (!title || typeof title !== 'string' || title.length < 1) {
    return res.status(400).json({ error: 'Название курса обязательно' });
  }

  try {
    const { lastID } = await run(
      'INSERT INTO courses (title, description, category_id) VALUES (?, ?, ?)',
      [title, description || null, categoryId || null]
    );

    const course = await get(
      `SELECT c.id, c.title, c.description, c.category_id, c.created_at,
              cat.name as category_name, cat.slug as category_slug
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [lastID]
    );

    res.status(201).json({
      message: 'Курс создан',
      course
    });

    // Инвалидируем кэш курсов
    invalidateCache('courses:*');
  } catch (err) {
    console.error('Ошибка создания курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /admin/courses/:id — обновить курс (админ)
router.put('/admin/courses/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, categoryId } = req.body;

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  if (!title || typeof title !== 'string' || title.length < 1) {
    return res.status(400).json({ error: 'Название курса обязательно' });
  }

  try {
    // Проверяем существование курса
    const existing = await get('SELECT id FROM courses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    await run(
      'UPDATE courses SET title = ?, description = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description || null, categoryId || null, id]
    );

    const course = await get(
      `SELECT c.id, c.title, c.description, c.category_id, c.created_at,
              cat.name as category_name, cat.slug as category_slug
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [id]
    );

    res.json({
      message: 'Курс обновлён',
      course
    });

    // Инвалидируем кэш курсов
    invalidateCache('courses:*');
  } catch (err) {
    console.error('Ошибка обновления курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /admin/courses/:id — удалить курс (админ)
router.delete('/admin/courses/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    // Проверяем существование курса
    const existing = await get('SELECT id FROM courses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    // Удаляем связанные отзывы и прогресс
    await run('DELETE FROM reviews WHERE course_id = ?', [id]);
    await run('DELETE FROM progress WHERE course_id = ?', [id]);
    await run('DELETE FROM favorites WHERE course_id = ?', [id]);
    await run('DELETE FROM enrollments WHERE course_id = ?', [id]);

    // Удаляем курс
    await run('DELETE FROM courses WHERE id = ?', [id]);

    res.json({ message: 'Курс удалён' });

    // Инвалидируем кэш курсов
    invalidateCache('courses:*');
  } catch (err) {
    console.error('Ошибка удаления курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /admin/users — список всех пользователей (админ)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await all(
      'SELECT id, name, email, birth_date, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    // Не возвращаем пароли
    res.json(users.map(({ id, name, email, birth_date, role, created_at, updated_at }) => ({
      id,
      name,
      email,
      birthDate: birth_date,
      role,
      createdAt: created_at,
      updatedAt: updated_at
    })));
  } catch (err) {
    console.error('Ошибка получения пользователей:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /admin/users/:id/role — изменить роль пользователя (админ)
router.put('/admin/users/:id/role', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID пользователя' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Роль должна быть "user" или "admin"' });
  }

  try {
    // Проверяем существование пользователя
    const existing = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, id]);

    res.json({ message: 'Роль обновлена' });
  } catch (err) {
    console.error('Ошибка обновления роли:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
