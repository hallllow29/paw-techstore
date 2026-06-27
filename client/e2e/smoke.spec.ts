import { test, expect } from '@playwright/test';

/**
 * Smoke E2E do percurso essencial: a SPA serve, a API responde e a
 * autenticação funciona ponta-a-ponta num browser real.
 */

test('a loja abre e mostra a marca (SPA a servir)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/ElSirc/i).first()).toBeVisible();
});

test('cliente autentica-se (API + auth ponta-a-ponta)', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('ana@paw.pt');
  await page.locator('input[type="password"]').fill('demo1234');
  await page.getByRole('button', { name: /Entrar/i }).click();
  // login bem-sucedido encaminha para fora da página de login
  await expect(page).not.toHaveURL(/\/login/);
});
