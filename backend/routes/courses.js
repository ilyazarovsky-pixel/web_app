const express = require('express');
const router = express.Router();
const { get, all } = require('../utils/database');

// GET /courses/search?q=javascript&page=1&limit=10
router.get('/courses/search', async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  // Валидация
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Запрос должен быть минимум 2 символа' });
  }

  const searchTerm = `%${q.trim()}%`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const pageLimit = Math.min(parseInt(limit), 50); // максимум 50 на страницу

  try {
    // Сначала получаем общее количество результатов
    const countResult = await get(
      'SELECT COUNT(*) as total FROM courses WHERE title LIKE ? OR description LIKE ?',
      [searchTerm, searchTerm]
    );

    // Затем получаем результаты с пагинацией
    const courses = await all(
      'SELECT id, title, description FROM courses WHERE title LIKE ? OR description LIKE ? LIMIT ? OFFSET ?',
      [searchTerm, searchTerm, pageLimit, offset]
    );

    res.json({
      courses: courses,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageLimit)
      }
    });
  } catch (err) {
    console.error('Ошибка при поиске курсов:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
