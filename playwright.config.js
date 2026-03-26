// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './e2e',

  /* Запуск тестов в параллельных воркерах */
  fullyParallel: true,

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

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Webkit опционально (можно включить при необходимости)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
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
