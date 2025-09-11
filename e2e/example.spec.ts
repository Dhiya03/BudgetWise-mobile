import { test, expect } from '@playwright/test';
import en from '../public/i18n/en.json' with { type: 'json' };

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/BudgetWise/);
});

test('app starts on the lock screen', async ({ page }) => {
  // Set a dummy password hash in localStorage to ensure the lock screen is shown.
  // This is the SHA256 hash of "1234".
  await page.addInitScript(() => {
    window.localStorage.setItem('appPasswordHash_v2', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: en['lockScreen.button'] })).toBeVisible();
});