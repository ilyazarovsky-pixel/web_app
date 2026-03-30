// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Запуск тестов в параллельных воркерах */
  fullyParallel: true,

  /* Увеличенный таймаут для тестов */
  timeout: 60000,

  /* Запретить повторное использование тестов */
  forbidOnly: !!process.env.CI,

  /* Повторы тестов на CI для стабильности */
  retries: process.env.CI ? 2 : 0,

  /* Оптимальное количество воркеров */
  workers: process.env.CI ? 1 : undefined,

  /* Репортеры */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  /* Общие настройки для тестов */
  use: {
    /* Базовый URL для всех тестов */
    baseURL: 'http://localhost:3000',

    /* Собирать trace при падении тестов */
    trace: 'on-first-retry',

    /* Скриншоты при падениях */
    screenshot: 'only-on-failure',

    /* Видео при падениях */
    video: 'retain-on-failure',
  },

  /* Конфигурация проектов для разных браузеров */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox и Webkit отключены для ускорения CI/CD
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  /* Запуск локального сервера для тестов */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
