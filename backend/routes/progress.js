const express = require('express');
const router = express.Router();
const { run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * /progress:
 *   post:
 *     tags: [Progress]
 *     summary: Отметить урок как пройденный
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
 *               pageIndex:
 *                 type: integer
 *                 description: Индекс урока
 *     responses:
 *       200:
 *         description: Прогресс сохранён
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Неавторизован
 */
// POST /progress — отметить урок как пройденный
router.post('/progress', authMiddleware, async (req, res) => {
  const { courseId, pageIndex } = req.body;
  const userId = req.user.id;

  if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  if (pageIndex === undefined || typeof pageIndex !== 'number' || pageIndex < 0) {
    return res.status(400).json({ error: 'Некорректный индекс страницы' });
  }

  try {
    await run(
      `INSERT INTO progress (user_id, course_id, page_index) VALUES (?, ?, ?)
       ON CONFLICT(user_id, course_id, page_index) DO UPDATE SET completed_at = CURRENT_TIMESTAMP`,
      [userId, courseId, pageIndex]
    );

    res.json({ message: 'Прогресс сохранён' });
  } catch (err) {
    console.error('Ошибка сохранения прогресса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /progress/{courseId}:
 *   get:
 *     tags: [Progress]
 *     summary: Получить прогресс по курсу
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID курса
 *     responses:
 *       200:
 *         description: Прогресс по курсу
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Progress'
 *       401:
 *         description: Неавторизован
 */
// GET /progress/:courseId — получить прогресс по курсу
router.get('/progress/:courseId', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const progress = await all(
      'SELECT page_index, completed_at FROM progress WHERE user_id = ? AND course_id = ? ORDER BY page_index',
      [userId, courseId]
    );

    // Получаем общую информацию о прогрессе
    const stats = await get(
      `SELECT COUNT(*) as completed,
              (SELECT MAX(page_index) FROM progress WHERE user_id = ? AND course_id = ?) + 1 as current_page
       FROM progress
       WHERE user_id = ? AND course_id = ?`,
      [userId, courseId, userId, courseId]
    );

    res.json({
      courseId,
      completedLessons: progress.map(p => p.page_index),
      totalCompleted: stats?.completed || 0,
      currentPage: stats?.current_page || 0
    });
  } catch (err) {
    console.error('Ошибка получения прогресса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /progress/:courseId — сбросить прогресс по курсу
router.delete('/progress/:courseId', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    await run('DELETE FROM progress WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    res.json({ message: 'Прогресс сброшен' });
  } catch (err) {
    console.error('Ошибка сброса прогресса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
