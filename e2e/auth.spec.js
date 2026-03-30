// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E тесты для аутентификации
 * Файл: e2e/auth.spec.js
 */

// Генерация уникального email для тестов
const generateUniqueEmail = () => `test_${Date.now()}@example.com`;

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную перед каждым тестом
    await page.goto('/');
  });

  test('Регистрация нового пользователя', async ({ page }) => {
    const uniqueEmail = generateUniqueEmail();
    const password = 'TestPass123!';
    const name = 'Тестовый Пользователь';
    const birthDate = '2000-01-01';

    // Переходим на страницу регистрации через URL
    await page.goto('/register');

    // Заполняем форму регистрации
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="birthDate"]', birthDate);

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что регистрация успешна
    await page.waitForTimeout(1000);

    // Проверяем что пользователь вошел
    const userMenu = page.locator('#user-profile-btn');
    await expect(userMenu).toBeVisible();
  });

  test('Вход существующего пользователя', async ({ page, request }) => {
    // Сначала регистрируем пользователя через API
    const email = generateUniqueEmail();
    const password = 'TestPass123!';
    const name = 'Существующий Пользователь';
    const birthDate = '2000-01-01';

    // Регистрируем через API
    await request.post('/api/auth/register', {
      data: {
        email,
        password,
        name,
        birthDate
      }
    });

    // Переходим на страницу входа через URL
    await page.goto('/login');

    // Вводим credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что вошли
    await page.waitForTimeout(1000);
    const userMenu = page.locator('#user-profile-btn');
    await expect(userMenu).toBeVisible();
  });

  test('Вход с неверным паролем', async ({ page, request }) => {
    // Регистрируем пользователя через API
    const email = generateUniqueEmail();
    const password = 'TestPass123!';
    const name = 'Пользователь для теста';
    const birthDate = '2000-01-01';

    await request.post('/api/auth/register', {
      data: {
        email,
        password,
        name,
        birthDate
      }
    });

    // Переходим на страницу входа через URL
    await page.goto('/login');

    // Вводим неверный пароль
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'WrongPassword123');

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что показывается ошибка
    await page.waitForTimeout(500);
    const errorMessage = page.locator('.form-error, .error, text=неверный пароль, text=ошибка');
    await expect(errorMessage).toBeVisible();
  });

  test('Валидация формы регистрации - пустой email', async ({ page }) => {
    // Переходим на страницу регистрации через URL
    await page.goto('/register');

    // Заполняем форму без email
    await page.fill('input[name="name"]', 'Тест');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="birthDate"]', '2000-01-01');

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что есть ошибка валидации
    await page.waitForTimeout(500);
    const errorMessage = page.locator('.form-error, .error, text=обязательно, text=required');
    await expect(errorMessage).toBeVisible();
  });

  test('Валидация формы регистрации - короткий пароль', async ({ page }) => {
    // Переходим на страницу регистрации через URL
    await page.goto('/register');

    // Заполняем форму с коротким паролем
    await page.fill('input[name="name"]', 'Тест');
    await page.fill('input[name="email"]', generateUniqueEmail());
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="birthDate"]', '2000-01-01');

    // Отправляем форму
    await page.click('button[type="submit"]');

    // Проверяем что есть ошибка валидации
    await page.waitForTimeout(500);
    const errorMessage = page.locator('.error-message, .alert, text=8 символов, text=минимум');
    await expect(errorMessage).toBeVisible();
  });
});
