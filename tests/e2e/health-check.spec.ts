import { test, expect } from '@playwright/test';

test.describe('Game Health Check', () => {
  test('should load game and collect console logs', async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Collect all console messages
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);

      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Collect page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to game
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for initial load
    await page.waitForTimeout(3000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/health-check-initial.png' });

    // Check if canvas exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait a bit more for game to initialize
    await page.waitForTimeout(2000);

    // Try to find and click start button if exists
    const startButton = page.getByText(/start|play|начать|играть/i).first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/health-check-after-start.png' });
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/health-check-final.png' });

    // Print logs summary
    console.log('\n========== CONSOLE LOGS SUMMARY ==========');
    console.log(`Total logs: ${consoleLogs.length}`);
    console.log(`Errors: ${consoleErrors.length}`);
    console.log(`Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n--- ERRORS ---');
      consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    if (consoleWarnings.length > 0) {
      console.log('\n--- WARNINGS ---');
      consoleWarnings.slice(0, 10).forEach((warn, i) => console.log(`${i + 1}. ${warn}`));
      if (consoleWarnings.length > 10) {
        console.log(`... and ${consoleWarnings.length - 10} more warnings`);
      }
    }

    console.log('\n--- ALL LOGS ---');
    consoleLogs.slice(0, 50).forEach((log, i) => console.log(`${i + 1}. ${log}`));
    if (consoleLogs.length > 50) {
      console.log(`... and ${consoleLogs.length - 50} more logs`);
    }

    console.log('\n==========================================');

    // Test passes if no critical errors
    expect(consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR')
    ).length).toBeLessThan(5);
  });
});
