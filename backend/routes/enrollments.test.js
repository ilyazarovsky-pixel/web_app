const request = require('supertest');
const express = require('express');
const { initDb, run, get, all } = require('../utils/database');
const authMiddleware = require('../middleware/auth');
const router = require('./enrollments');

// Создаем тестовое приложение
const app = express();
app.use(express.json());
// Добавляем аутентификацию мок для тестирования
app.use('/test-enrollments', (req, res, next) => {
  // Мокаем пользователя для тестов
  req.user = { id: 1 };
  next();
}, router);

// Используем in-memory базу данных для тестов
beforeEach(async () => {
  // Переопределяем переменную окружения для использования in-memory базы
  process.env.DATABASE_FILE = ':memory:';
  
  // Инициализируем базу данных
  await initDb();
  
  // Создаем тестового пользователя и курс
  await run('INSERT INTO users (name, email, password, birth_date) VALUES (?, ?, ?, ?)', 
    ['Test User', 'test@example.com', 'hashed_password', '1990-01-01']);
  
  await run('INSERT INTO courses (title, description) VALUES (?, ?)', 
    ['Test Course', 'Test Description']);
});

describe('Enrollments Routes', () => {
  test('POST /enrollments should create a new enrollment', async () => {
    const response = await request(app)
      .post('/test-enrollments/enrollments')
      .send({ courseId: 1 })
      .expect(200);

    expect(response.body.message).toBe('Вы записались на курс');
    
    // Проверяем, что запись действительно создана
    const enrollment = await get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [1, 1]);
    expect(enrollment).toBeDefined();
  });

  test('GET /enrollments should return user enrollments', async () => {
    // Сначала создаем запись
    await run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [1, 1]);
    
    const response = await request(app)
      .get('/test-enrollments/enrollments')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('DELETE /enrollments/:courseId should remove an enrollment', async () => {
    // Сначала создаем запись
    await run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [1, 1]);
    
    const response = await request(app)
      .delete('/test-enrollments/enrollments/1')
      .expect(200);

    expect(response.body.message).toBe('Вы отписались от курса');
    
    // Проверяем, что запись удалена
    const enrollment = await get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [1, 1]);
    expect(enrollment).toBeUndefined();
  });

  test('PUT /enrollments/:courseId/complete should mark course as completed', async () => {
    // Сначала создаем запись
    await run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [1, 1]);
    
    const response = await request(app)
      .put('/test-enrollments/enrollments/1/complete')
      .expect(200);

    expect(response.body.message).toBe('Курс завершён');
    
    // Проверяем, что курс отмечен как завершен
    const enrollment = await get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? AND completed_at IS NOT NULL', [1, 1]);
    expect(enrollment).toBeDefined();
  });
});
