const express = require('express');
const router = express.Router();
const { run, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * /favorites:
 *   post:
 *     tags: [Favorites]
 *     summary: Добавить курс в избранное
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: integer
 *                 description: ID курса
 *     responses:
 *       200:
 *         description: Добавлено в избранное
 *       400:
 *         description: Уже в избранном
 *       401:
 *         description: Неавторизован
 */
// POST /favorites — добавить в избранное
router.post('/favorites', authMiddleware, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;

  if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    await run(
      'INSERT INTO favorites (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    res.json({ message: 'Добавлено в избранное' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Курс уже в избранном' });
    }
    console.error('Ошибка добавления в избранное:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Получить список избранного
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список избранных курсов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       401:
 *         description: Неавторизован
 */
// GET /favorites — список избранного
router.get('/favorites', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const favorites = await all(
      `SELECT c.id, c.title, c.description, c.created_at, f.created_at as added_at
       FROM favorites f
       JOIN courses c ON f.course_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(favorites);
  } catch (err) {
    console.error('Ошибка получения избранного:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /favorites/:courseId — удалить из избранного
router.delete('/favorites/:courseId', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const { changes } = await run(
      'DELETE FROM favorites WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (changes === 0) {
      return res.status(404).json({ error: 'Курс не найден в избранном' });
    }

    res.json({ message: 'Удалено из избранного' });
  } catch (err) {
    console.error('Ошибка удаления из избранного:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
