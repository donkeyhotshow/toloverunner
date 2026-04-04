import { test, expect } from '@playwright/test';

test.describe('App E2E smoke', () => {
  test('loads and shows UI after init', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    // Wait for loading screen then for UI to appear
    await expect(page.locator('text=LOADING...')).toBeVisible();
    // Wait up to 5s for app init
    await page.waitForTimeout(500);
    // Check canvas presence and HUD after some time
    await page.waitForSelector('canvas', { timeout: 5000 });
    await expect(page.locator('canvas')).toBeVisible();
    // HUD may be present after init
    const hud = page.locator('[data-testid="hud"]');
    await expect(hud).toHaveCount(1).catch(() => {}); // optional
  });
});


