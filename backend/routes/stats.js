const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { get } = require('../utils/database');

// GET /stats — базовая статистика платформы
// Защищён авторизацией
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Собираем статистику из нескольких таблиц
    const usersResult = await get('SELECT COUNT(*) as count FROM users');
    const stats = { totalUsers: usersResult.count };

    const coursesResult = await get('SELECT COUNT(*) as count FROM courses');
    stats.totalCourses = coursesResult.count;

    // Новые пользователи за последние 7 дней
    const recentResult = await get('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime(\'now\', \'-7 days\')');
    stats.newUsersLast7Days = recentResult ? recentResult.count : 0;

    stats.timestamp = new Date().toISOString();
    res.json(stats);
  } catch (err) {
    console.error('Ошибка при получении статистики:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
