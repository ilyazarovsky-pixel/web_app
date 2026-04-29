const express = require('express');
const router = express.Router();
const { run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { invalidateCache } = require('../middleware/cache');

// Middleware для защиты админ-маршрутов
const requireAdmin = [authMiddleware, requireRole('admin')];

// GET /api/course-pages/:courseId - получить все страницы курса
router.get('/course-pages/:courseId', async (req, res) => {
  const courseId = parseInt(req.params.courseId);

  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID курса' });
  }

  try {
    const pages = await all(
      `SELECT id, title, content, page_type, video_url, diagram_data, page_order, created_at
       FROM course_pages
       WHERE course_id = ?
       ORDER BY page_order ASC`,
      [courseId]
    );

    // Добавляем диаграммы, если они есть
    const pagesWithDiagrams = pages.map(page => ({
      ...page,
      diagramData: page.diagram_data ? JSON.parse(page.diagram_data) : null
    }));

    res.json(pagesWithDiagrams);
  } catch (err) {
    console.error('Ошибка получения страниц курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/course-pages - создать новую страницу курса (только для администраторов)
router.post('/course-pages', requireAdmin, async (req, res) => {
  const { courseId, title, content, type, videoUrl, diagramData, order } = req.body;

  if (!courseId || !title) {
    return res.status(400).json({ error: 'Необходимо указать courseId и title' });
  }

  try {
    // Проверяем, существует ли курс
    const course = await get('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const diagramStr = diagramData ? JSON.stringify(diagramData) : null;

    const { lastID } = await run(
      `INSERT INTO course_pages (course_id, title, content, page_type, video_url, diagram_data, page_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [courseId, title, content || null, type || 'text', videoUrl || null, diagramStr, order || 0]
    );

    const page = await get(
      `SELECT id, title, content, page_type, video_url, diagram_data, page_order, created_at
       FROM course_pages
       WHERE id = ?`,
      [lastID]
    );

    res.status(201).json({
      message: 'Страница курса создана',
      page: {
        ...page,
        diagramData: page.diagram_data ? JSON.parse(page.diagram_data) : null
      }
    });

    // Инвалидируем кэш курса, чтобы обновить страницы
    await invalidateCache(`courses:detail*`);
    await invalidateCache(`course-pages:*`);
  } catch (err) {
    console.error('Ошибка создания страницы курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/course-pages/:id - обновить страницу курса (только для администраторов)
router.put('/course-pages/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { courseId, title, content, type, videoUrl, diagramData, order } = req.body;

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID страницы' });
  }

  if (!title) {
    return res.status(400).json({ error: 'Необходимо указать title' });
  }

  try {
    // Проверяем, существует ли страница
    const existingPage = await get('SELECT id FROM course_pages WHERE id = ?', [id]);
    if (!existingPage) {
      return res.status(404).json({ error: 'Страница курса не найдена' });
    }

    const diagramStr = diagramData ? JSON.stringify(diagramData) : null;

    await run(
      `UPDATE course_pages 
       SET course_id = ?, title = ?, content = ?, page_type = ?, video_url = ?, diagram_data = ?, page_order = ?
       WHERE id = ?`,
      [courseId, title, content || null, type || 'text', videoUrl || null, diagramStr, order || 0, id]
    );

    const updatedPage = await get(
      `SELECT id, title, content, page_type, video_url, diagram_data, page_order, created_at
       FROM course_pages
       WHERE id = ?`,
      [id]
    );

    res.json({
      message: 'Страница курса обновлена',
      page: {
        ...updatedPage,
        diagramData: updatedPage.diagram_data ? JSON.parse(updatedPage.diagram_data) : null
      }
    });

    // Инвалидируем кэш курса, чтобы обновить страницы
    await invalidateCache(`courses:detail*`);
    await invalidateCache(`course-pages:*`);
  } catch (err) {
    console.error('Ошибка обновления страницы курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/course-pages/:id - удалить страницу курса (только для администраторов)
router.delete('/course-pages/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID страницы' });
  }

  try {
    // Проверяем, существует ли страница
    const existingPage = await get('SELECT id FROM course_pages WHERE id = ?', [id]);
    if (!existingPage) {
      return res.status(404).json({ error: 'Страница курса не найдена' });
    }

    await run('DELETE FROM course_pages WHERE id = ?', [id]);

    res.json({ message: 'Страница курса удалена' });

    // Инвалидируем кэш курса, чтобы обновить страницы
    await invalidateCache(`courses:detail*`);
    await invalidateCache(`course-pages:*`);
  } catch (err) {
    console.error('Ошибка удаления страницы курса:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;