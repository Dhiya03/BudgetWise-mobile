import { test, expect } from '@playwright/test';
import en from '../public/i18n/en.json' with { type: 'json' };
import hi from '../public/i18n/hi.json' with { type: 'json' };
import ta from '../public/i18n/ta.json' with { type: 'json' };
import te from '../public/i18n/te.json' with { type: 'json' };
import kn from '../public/i18n/kn.json' with { type: 'json' };
import ml from '../public/i18n/ml.json' with { type: 'json' };

// Define the languages to test against. These should match your i18n files.
const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml'];

const translations = { en, hi, ta, te, kn, ml };

test.describe('Visual Regression: Core Components', () => {
  for (const lang of supportedLanguages) {
    // Group tests by language for better organization
    test.describe(`for language: ${lang}`, () => {
      // A helper function to get translated strings for the current language
      const t = (key: keyof typeof en) => {
        // Fallback to English if a key is missing in another language
        return translations[lang][key] || translations['en'][key];
      };

      test.beforeEach(async ({ page }) => {
        // Use addInitScript to set localStorage BEFORE the page loads.
        await page.addInitScript(language => {
          window.localStorage.setItem('budgetwise_user_language', language);
          // This is the SHA256 hash of "1234", which we use to unlock the app.
          window.localStorage.setItem('appPasswordHash_v2', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
        }, lang);

        // Navigate to the app and unlock it.
        await page.goto('/');
        await page.getByPlaceholder(t('lockScreen.placeholder')).fill('1234');
        await page.getByRole('button', { name: t('lockScreen.button') }).click();
        // Wait for the main app content to be visible before running tests.
        await expect(page.getByRole('heading', { name: t('addTransaction.title') })).toBeVisible();
      });

      test('BottomNavigation should match snapshot', async ({ page }) => {
        const bottomNav = page.locator('.fixed.bottom-0');
        await expect(bottomNav).toBeVisible();
        // A small delay can help ensure fonts and styles are fully rendered.
        await page.waitForTimeout(500);

        // Take a screenshot and compare it to the baseline.
        await expect(bottomNav).toHaveScreenshot('bottom-navigation.png');
      });
    });
  }
});
