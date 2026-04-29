const express = require('express');
const router = express.Router();
const { run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');
const { sendNotificationToUser } = require('../websocket');

/**
 * @swagger
 * /enrollments:
 *   post:
 *     tags: [Enrollments]
 *     summary: Записаться на курс
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
 *         description: Успешная запись на курс
 *       400:
 *         description: Ошибка валидации или уже записан
 *       404:
 *         description: Курс не найден
 *       401:
 *         description: Неавторизован
 */
// POST /enrollments — записаться на курс
router.post('/enrollments', authMiddleware, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;

  if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    // Проверяем существование курса
    const course = await get('SELECT id, title, author_id FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    // Получаем имя студента для уведомления
    const student = await get('SELECT name FROM users WHERE id = ?', [userId]);

    // Выполняем операцию в транзакции
    await run('BEGIN TRANSACTION');

    await run(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    await run('COMMIT');

    // Отправляем уведомление автору курса если он существует и это не сам студент
    if (course.author_id && course.author_id !== userId) {
      const notificationData = {
        type: 'new_enrollment',
        courseId,
        courseTitle: course.title,
        studentName: student?.name || 'Пользователь',
        timestamp: new Date().toISOString()
      };

      // Отправляем WebSocket уведомление
      sendNotificationToUser(course.author_id, notificationData);
    }

    res.json({ message: 'Вы записались на курс' });
  } catch (err) {
    // Откатываем транзакцию в случае ошибки
    try {
      await run('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Ошибка отката транзакции:', rollbackErr.message);
    }

    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Вы уже записаны на этот курс' });
    }
    console.error('Ошибка записи на курс:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /enrollments:
 *   get:
 *     tags: [Enrollments]
 *     summary: Получить мои курсы
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список курсов пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Неавторизован
 */
// GET /enrollments — мои курсы
router.get('/enrollments', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const enrollments = await all(
      `SELECT c.id, c.title, c.description, c.created_at, e.enrolled_at, e.completed_at
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    res.json(enrollments);
  } catch (err) {
    console.error('Ошибка получения курсов:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /enrollments/{courseId}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Отписаться от курса
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
 *         description: Успешная отписка от курса
 *       404:
 *         description: Не записаны на этот курс
 *       401:
 *         description: Неавторизован
 */
// DELETE /enrollments/:courseId — отписаться от курса
router.delete('/enrollments/:courseId', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    // Проверяем существование курса и что пользователь действительно записан на него
    const enrollmentCheck = await get(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (!enrollmentCheck) {
      return res.status(404).json({ error: 'Вы не записаны на этот курс' });
    }

    const { changes } = await run(
      'DELETE FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (changes === 0) {
      return res.status(404).json({ error: 'Вы не записаны на этот курс' });
    }

    res.json({ message: 'Вы отписались от курса' });
  } catch (err) {
    console.error('Ошибка отписки от курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /enrollments/:courseId/complete — отметить курс как завершённый
router.put('/enrollments/:courseId/complete', authMiddleware, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const result = await run(
      'UPDATE enrollments SET completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Вы не записаны на этот курс' });
    }

    res.json({ message: 'Курс завершён' });
  } catch (err) {
    console.error('Ошибка завершения курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
