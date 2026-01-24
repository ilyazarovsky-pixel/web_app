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