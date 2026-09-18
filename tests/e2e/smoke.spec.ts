import { test, expect } from '@playwright/test';

test.describe('runtime stability', () => {
  test('captures startup and rejects browser/runtime errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas[data-testid="game-canvas"]', { timeout: 60000 });
    await expect(page.locator('canvas[data-testid="game-canvas"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/gameplay-startup.png', animations: 'disabled' });

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    expect(consoleErrors.filter((message) => /webgl|shader|context lost|three/i.test(message))).toEqual([]);
  });

  test('survives a 30 second gameplay smoke run and keeps bundle bounded', async ({ page }) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean((window as any).__TOLOVERUNNER_STORE__));
    await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__?.startGame?.());
    await page.waitForTimeout(30000);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-testid="game-canvas"]');
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsBytes = resources
        .filter((entry) => entry.name.endsWith('.js'))
        .reduce((total, entry) => total + (entry.transferSize || entry.encodedBodySize || 0), 0);
      return {
        canvasReady: Boolean(canvas && canvas.width > 0 && canvas.height > 0),
        jsBytes,
        drawCalls: (window as any).__TOLOVERUNNER_RENDERER__?.info?.render?.calls ?? null,
      };
    });

    await page.screenshot({ path: 'test-results/gameplay-after-30s.png', animations: 'disabled' });
    expect(result.canvasReady).toBe(true);
    expect(result.jsBytes).toBeLessThan(5_000_000);
    expect(consoleErrors.filter((message) => /webgl|shader|context lost|three/i.test(message))).toEqual([]);
  });
});
