// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Базовый тест для проверки настройки Playwright
 */
test('homepage should load successfully', async ({ page }) => {
  // Переходим на главную страницу
  await page.goto('/');

  // Проверяем что страница загрузилась
  await expect(page).toHaveTitle(/Образовательная платформа/);

  // Проверяем что есть основные элементы
  await expect(page.locator('h1')).toBeVisible();
});

test('health endpoint should return ok', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.status).toBe('ok');
});
