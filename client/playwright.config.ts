import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E (Playwright) - correm num browser real contra a aplicação a
 * funcionar: cliente em :4200 e API em :3000.
 *
 * - Arranca o cliente automaticamente se não estiver a correr (reutiliza o que
 *   já estiver). A API deve estar a correr (`npm run dev` em api/) ou usa-se a
 *   stack Docker (`docker compose up`).
 * - Correr com:  npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
