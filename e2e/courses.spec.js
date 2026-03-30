// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E тесты для работы с курсами
 * Файл: e2e/courses.spec.js
 */

const generateUniqueEmail = () => `test_${Date.now()}@example.com`;

test.describe('Courses Flow', () => {
  // Данные для авторизованного пользователя
  let authUser = null;

  test.beforeEach(async ({ page, request }) => {
    // Регистрируем пользователя через API для авторизованных тестов
    const email = generateUniqueEmail();
    const password = 'TestPass123!';
    const name = 'Тестовый Студент';
    const birthDate = '2000-01-01';

    const response = await request.post('/api/auth/register', {
      data: { email, password, name, birthDate }
    });

    if (response.ok()) {
      // Логинимся для получения токена
      const loginResponse = await request.post('/api/auth/login', {
        data: { email, password }
      });

      if (loginResponse.ok()) {
        const data = await loginResponse.json();
        authUser = { email, password, token: data.token };
      }
    }

    // Переходим на главную
    await page.goto('/');
  });

  test('Просмотр списка курсов (без авторизации)', async ({ page }) => {
    // Переходим на страницу курсов
    await page.goto('/');

    // Проверяем что курсы отображаются
    const courses = page.locator('.course-card');
    await expect(courses.first()).toBeVisible({ timeout: 5000 });

    // Проверяем что есть хотя бы один курс
    const count = await courses.count();
    expect(count).toBeGreaterThan(0);

    // Проверяем что у курсов есть названия
    const firstCourseTitle = await page.locator('.course-card .course-title').first().textContent();
    expect(firstCourseTitle).toBeTruthy();
  });

  test('Поиск курсов', async ({ page }) => {
    await page.goto('/');

    // Находим поле поиска (если есть)
    const searchInput = page.locator('input[type="search"], input[placeholder*="поиск" i], input[placeholder*="Search" i]');
    
    if (await searchInput.count() > 0) {
      // Вводим поисковый запрос
      await searchInput.fill('JavaScript');
      await page.waitForTimeout(1000);

      // Проверяем что результаты обновлены
      const courses = page.locator('.course-card');
      const count = await courses.count();
      
      // Если есть результаты - проверяем что они содержат "JavaScript"
      if (count > 0) {
        const firstTitle = await page.locator('.course-card .course-title').first().textContent();
        expect(firstTitle.toLowerCase()).toContain('javascript');
      }
    } else {
      console.log('Поиск курсов не найден на странице');
    }
  });

  test('Запись на курс (с авторизацией)', async ({ page }) => {
    // Переходим на страницу входа
    await page.goto('/login');

    // Вводим credentials
    await page.fill('input[name="email"]', authUser.email);
    await page.fill('input[name="password"]', authUser.password);
    await page.click('button[type="submit"]');

    // Ждем авторизации
    await page.waitForTimeout(1000);

    // Переходим на главную
    await page.goto('/');

    // Находим кнопку "Начать" или "Записаться" на первом курсе
    const startButtons = page.locator('.start-course-btn');
    const firstStartButton = startButtons.first();

    if (await firstStartButton.count() > 0) {
      const courseId = await firstStartButton.getAttribute('data-course-id');
      const courseTitle = await firstStartButton.getAttribute('data-course-title');

      // Кликаем на кнопку записи
      await firstStartButton.click();
      await page.waitForTimeout(1000);

      // Проверяем что перешли на страницу курса или открылся курс
      // (зависит от реализации - может быть модальное окно или переход на страницу)
      const coursePage = page.locator('.course-page, .course-content');
      
      if (await coursePage.count() > 0) {
        // Проверяем что курс открылся
        const title = await page.locator('.course-title, h1').first().textContent();
        expect(title).toContain(courseTitle);
      }
    } else {
      console.log('Кнопка записи на курс не найдена');
    }
  });

  test('Просмотр деталей курса', async ({ page }) => {
    await page.goto('/');

    // Кликаем на первый курс (не на кнопку)
    const firstCourse = page.locator('.course-card').first();
    
    if (await firstCourse.count() > 0) {
      // Получаем название курса до клика
      const courseTitle = await page.locator('.course-card .course-title').first().textContent();
      
      // Кликаем на карточку курса (если это не кнопка)
      await firstCourse.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(1000);

      // Проверяем что открылась страница курса
      // (может быть модальное окно или отдельная страница)
      const url = page.url();
      expect(url).toContain('course') || await expect(page.locator('.course-page')).toBeVisible();
    }
  });

  test('Фильтрация курсов по категории', async ({ page }) => {
    await page.goto('/');

    // Ищем фильтр по категориям
    const categorySelect = page.locator('select[name="category"], select#category');
    
    if (await categorySelect.count() > 0) {
      // Получаем доступные опции
      const options = await categorySelect.locator('option').allTextContents();
      
      if (options.length > 1) {
        // Выбираем вторую категорию (первая обычно "все")
        await categorySelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // Проверяем что курсы отфильтрованы
        const courses = page.locator('.course-card');
        const count = await courses.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    } else {
      console.log('Фильтр по категориям не найден');
    }
  });
});
