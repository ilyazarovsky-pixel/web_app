const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// GET /stats — базовая статистика платформы
// Защищён авторизацией
router.get('/stats', authMiddleware, (req, res) => {
  const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../data/database.db');
const db = new Database(dbPath);

  try {
    // Собираем статистику из нескольких таблиц
    const usersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const usersResult = usersStmt.get();
    const stats = { totalUsers: usersResult.count };

    const coursesStmt = db.prepare('SELECT COUNT(*) as count FROM courses');
    const coursesResult = coursesStmt.get();
    stats.totalCourses = coursesResult.count;

    // Новые пользователи за последние 7 дней
    const recentStmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime(\'now\', \'-7 days\')');
    const recentResult = recentStmt.get();
    stats.newUsersLast7Days = recentResult ? recentResult.count : 0;

    stats.timestamp = new Date().toISOString();
    res.json(stats);
  } catch (err) {
    console.error('Ошибка при получении статистики:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;