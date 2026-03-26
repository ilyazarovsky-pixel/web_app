const express = require('express');
const router = express.Router();
const { get, all, run } = require('../utils/database');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Получить список уведомлений текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   data:
 *                     type: object
 *                   read:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *       401:
 *         description: Неавторизован
 */
// GET /notifications — список уведомлений текущего пользователя
router.get('/notifications', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await all(
      `SELECT id, type, data, read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Парсим JSON данные
    const parsedNotifications = notifications.map(n => ({
      id: n.id,
      type: n.type,
      data: n.data ? JSON.parse(n.data) : {},
      read: !!n.read,
      createdAt: n.created_at
    }));

    res.json(parsedNotifications);
  } catch (err) {
    console.error('Ошибка получения уведомлений:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Получить количество непрочитанных уведомлений
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Количество непрочитанных уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       401:
 *         description: Неавторизован
 */
// GET /notifications/unread-count — количество непрочитанных уведомлений
router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [userId]
    );

    res.json({ count: result?.count || 0 });
  } catch (err) {
    console.error('Ошибка получения количества непрочитанных уведомлений:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Отметить уведомление как прочитанное
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление отмечено как прочитанное
 *       404:
 *         description: Уведомление не найдено
 *       401:
 *         description: Неавторизован
 */
// PUT /notifications/:id/read — отметить уведомление как прочитанное
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  const notificationId = parseInt(req.params.id);
  const userId = req.user.id;

  if (isNaN(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID уведомления' });
  }

  try {
    // Проверяем что уведомление принадлежит пользователю
    const notification = await get(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    await run(
      'UPDATE notifications SET read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (err) {
    console.error('Ошибка обновления уведомления:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Отметить все уведомления как прочитанные
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Все уведомления отмечены как прочитанные
 *       401:
 *         description: Неавторизован
 */
// PUT /notifications/read-all — отметить все уведомления как прочитанные
router.put('/notifications/read-all', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    await run(
      'UPDATE notifications SET read = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read = 0',
      [userId]
    );

    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (err) {
    console.error('Ошибка обновления всех уведомлений:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Удалить уведомление
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление удалено
 *       404:
 *         description: Уведомление не найдено
 *       401:
 *         description: Неавторизован
 */
// DELETE /notifications/:id — удалить уведомление
router.delete('/notifications/:id', authMiddleware, async (req, res) => {
  const notificationId = parseInt(req.params.id);
  const userId = req.user.id;

  if (isNaN(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID уведомления' });
  }

  try {
    // Проверяем что уведомление принадлежит пользователю
    const notification = await get(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    await run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);

    res.json({ message: 'Уведомление удалено' });
  } catch (err) {
    console.error('Ошибка удаления уведомления:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
