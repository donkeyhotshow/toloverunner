import { test, expect } from '@playwright/test';

test('Smoke Test', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for loading to finish - "GENDER RACE" should appear
    await page.waitForSelector('text=GENDER RACE', { timeout: 60000 });
    await page.screenshot({ path: 'smoke_menu.png' });
    console.log('Screenshot taken: smoke_menu.png');
});
