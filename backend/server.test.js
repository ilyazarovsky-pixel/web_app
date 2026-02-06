const request = require('supertest');
const app = require('./server');

describe('Health check endpoint', () => {

  test('GET /health возвращает статус 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  test('GET /health возвращает status: ok', async () => {
    const response = await request(app).get('/health');
    expect(response.body.status).toBe('ok');
  });

  test('GET /health содержит timestamp', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('timestamp');
  });

});

describe('404 handling', () => {

  test('Несуществующий маршрут возвращает 404', async () => {
    const response = await request(app).get('/nonexistent-route');
    expect(response.status).toBe(404);
  });

});

describe('POST /api/auth/register', () => {

  test('Регистрация с корректными данными — 200', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`; // уникальный email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
        birthDate: '2000-01-01'
      });
    expect(response.status).toBe(200);
  });

  test('Регистрация без email — 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'password123',
        name: 'Test User',
        birthDate: '2000-01-01'
      });
    expect(response.status).toBe(400);
  });

  test('Регистрация с коротким паролем — 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `short_${Date.now()}@example.com`,
        password: '123',
        name: 'Test User',
        birthDate: '2000-01-01'
      });
    expect(response.status).toBe(400);
  });

});

describe('POST /api/auth/login', () => {

  test('Вход с неверным паролем — 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
    expect(response.status).toBe(401);
  });

  test('Вход без пароля — 400', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com'
      });
    expect([400, 401]).toContain(response.status);
  });

});

describe('PUT /profile/password', () => {
  test('Смена пароля без токена — 401', async () => {
    const response = await request(app)
      .put('/profile/password')
      .send({
        currentPassword: 'any_password',
        newPassword: 'newpassword123'
      });
    expect(response.status).toBe(401);
  });

  test('Смена пароля с неверным текущим паролем — 401', async () => {
    const testEmail = `pwd_wrongpass_${Date.now()}@example.com`;
    const testPassword = 'oldpassword123';
    const newPassword = 'newpassword123';

    // Регистрация
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Wrong Password Test User',
        birthDate: '1990-01-01'
      });

    // Логин для получения токена
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const authToken = loginRes.body.token;

    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'wrongpassword',
        newPassword: newPassword
      });
    expect(response.status).toBe(401);
  });

  test('Смена пароля на слишком короткий — 400', async () => {
    const testEmail = `pwd_short_${Date.now()}@example.com`;
    const testPassword = 'oldpassword123';
    const newPassword = '123';

    // Регистрация
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Short Password Test User',
        birthDate: '1990-01-01'
      });

    // Логин для получения токена
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const authToken = loginRes.body.token;

    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: newPassword
      });
    expect(response.status).toBe(400);
  });

  test('Успешная смена пароля — 200', async () => {
    const testEmail = `pwd_success_${Date.now()}@example.com`;
    const testPassword = 'oldpassword123';
    const newPassword = 'newpassword123';

    // Регистрация
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Success Password Test User',
        birthDate: '1990-01-01'
      });

    // Логин для получения токена
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const authToken = loginRes.body.token;

    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: newPassword
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });
});