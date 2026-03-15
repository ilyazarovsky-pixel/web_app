const express = require('express');
const router = express.Router();
const { all, get } = require('../utils/database');

// GET /categories — список всех категорий
router.get('/categories', async (req, res) => {
  try {
    const categories = await all('SELECT id, name, slug FROM categories ORDER BY id');
    res.json(categories);
  } catch (err) {
    console.error('Ошибка получения категорий:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /categories/:slug — курсы конкретной категории
router.get('/categories/:slug/courses', async (req, res) => {
  const { slug } = req.params;

  try {
    const category = await get('SELECT id, name, slug FROM categories WHERE slug = ?', [slug]);

    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    const courses = await all(
      `SELECT c.id, c.title, c.description, c.created_at
       FROM courses c
       WHERE c.category_id = ?
       ORDER BY c.created_at DESC`,
      [category.id]
    );

    res.json({
      category,
      courses
    });
  } catch (err) {
    console.error('Ошибка получения курсов категории:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
