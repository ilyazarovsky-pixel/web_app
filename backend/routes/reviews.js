const express = require('express');
const router = express.Router();
const { run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * /courses/{id}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Оставить отзыв о курсе
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID курса
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Оценка от 1 до 5
 *               comment:
 *                 type: string
 *                 description: Текст отзыва
 *     responses:
 *       200:
 *         description: Отзыв добавлен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Неавторизован
 */
// POST /courses/:id/reviews — оставить отзыв
router.post('/courses/:id/reviews', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.id);
  const userId = req.user.id;
  const { rating, comment } = req.body;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
  }

  try {
    await run(
      `INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, course_id) DO UPDATE SET
       rating = excluded.rating,
       comment = excluded.comment,
       updated_at = CURRENT_TIMESTAMP`,
      [userId, courseId, rating, comment || null]
    );

    res.json({ message: 'Отзыв добавлен' });
  } catch (err) {
    console.error('Ошибка добавления отзыва:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /courses/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Получить отзывы курса
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID курса
 *     responses:
 *       200:
 *         description: Список отзывов и средний рейтинг
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courseId:
 *                   type: integer
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 averageRating:
 *                   type: number
 *                 totalReviews:
 *                   type: integer
 *       400:
 *         description: Ошибка валидации
 *       500:
 *         description: Ошибка сервера
 */
// GET /courses/:id/reviews — отзывы курса
router.get('/courses/:id/reviews', async (req, res) => {
  const courseId = parseInt(req.params.id);

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const reviews = await all(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              u.name as user_name, u.avatar as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.course_id = ?
       ORDER BY r.created_at DESC`,
      [courseId]
    );

    // Получаем средний рейтинг
    const avgRating = await get(
      'SELECT AVG(rating) as average, COUNT(*) as count FROM reviews WHERE course_id = ?',
      [courseId]
    );

    res.json({
      courseId,
      reviews,
      averageRating: avgRating?.average ? parseFloat(avgRating.average.toFixed(1)) : 0,
      totalReviews: avgRating?.count || 0
    });
  } catch (err) {
    console.error('Ошибка получения отзывов:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /courses/:id/reviews — удалить свой отзыв
router.delete('/courses/:id/reviews', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.id);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const { changes } = await run(
      'DELETE FROM reviews WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (changes === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json({ message: 'Отзыв удалён' });
  } catch (err) {
    console.error('Ошибка удаления отзыва:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
