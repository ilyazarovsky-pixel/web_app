const express = require('express');
const router = express.Router();
const { all, get } = require('../utils/database');

// Получить курсы с поддержкой фильтрации по категории и поиска
router.get('/courses', async (req, res) => {
  const { category, q, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `
      SELECT c.id, c.title, c.description, c.created_at, cat.name as category_name, cat.slug as category_slug
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE 1=1
    `;
    const params = [];

    // Фильтр по категории
    if (category) {
      query += ' AND cat.slug = ?';
      params.push(category);
    }

    // Поиск по названию или описанию
    if (q) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    query += ' ORDER BY c.created_at DESC';

    // Пагинация
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const courses = await all(query, params);

    // Получаем общее количество для пагинации
    let countQuery = 'SELECT COUNT(*) as total FROM courses c LEFT JOIN categories cat ON c.category_id = cat.id WHERE 1=1';
    const countParams = [];

    if (category) {
      countQuery += ' AND cat.slug = ?';
      countParams.push(category);
    }

    if (q) {
      countQuery += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      countParams.push(`%${q}%`, `%${q}%`);
    }

    const { total } = await get(countQuery, countParams);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Ошибка получения курсов:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретный курс по ID
router.get('/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Некорректный ID курса'
    });
  }

  try {
    const course = await get(
      `SELECT c.id, c.title, c.description, c.created_at, cat.name as category_name, cat.slug as category_slug
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [id]
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Курс не найден'
      });
    }

    res.json(course);
  } catch (err) {
    console.error('Ошибка получения курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
