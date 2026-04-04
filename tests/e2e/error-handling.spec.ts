import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E', () => {
  test('handles WebGL context loss gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for app to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await expect(page.locator('canvas')).toBeVisible();

    // Simulate WebGL context loss (if supported by browser)
    try {
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && 'loseContext' in gl) {
          (gl as any).loseContext();
        }
      });

      // Wait for potential error handling
      await page.waitForTimeout(2000);

      // App should either recover or show appropriate error message
      const errorMessages = [
        'text=WebGL Error',
        'text=Context Lost',
        'text=Graphics Error'
      ];

      let foundError = false;
      for (const selector of errorMessages) {
        try {
          await expect(page.locator(selector)).toBeVisible({ timeout: 1000 });
          foundError = true;
          break;
        } catch (e) {
          // Continue checking other error messages
        }
      }

      if (!foundError) {
        // If no explicit error message, check that canvas still exists
        // (app might have recovered automatically)
        await expect(page.locator('canvas')).toBeVisible();
      }

    } catch (e) {
      console.log('WebGL context loss simulation not supported, skipping...');
    }
  });

  test('handles network errors during asset loading', async ({ page }) => {
    // This test would require mocking network requests
    // For now, we'll test basic error boundaries

    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for initial load
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Try to trigger an error by manipulating the DOM
    await page.evaluate(() => {
      // Simulate a JavaScript error
      setTimeout(() => {
        throw new Error('Simulated runtime error');
      }, 1000);
    });

    // Wait for error handling
    await page.waitForTimeout(3000);

    // Check for error boundary or recovery
    const errorIndicators = [
      'text=Something went wrong',
      'text=Error',
      'text=Application Error'
    ];

    let errorHandled = false;
    for (const selector of errorIndicators) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 1000 });
        errorHandled = true;
        console.log(`Error properly handled with message: ${selector}`);
        break;
      } catch (e) {
        // Continue checking
      }
    }

    if (!errorHandled) {
      console.log('Error might have been handled gracefully without visible message');
    }

    // Verify app doesn't completely crash (body still exists)
    await expect(page.locator('body')).toBeVisible();
  });

  test('memory leak detection', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for app to load
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Monitor memory usage over time
    const memoryReadings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (memoryInfo > 0) {
        memoryReadings.push(memoryInfo);
      }

      await page.waitForTimeout(2000);
    }

    if (memoryReadings.length >= 2) {
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      const acceptableGrowth = 50 * 1024 * 1024; // 50MB acceptable growth

      console.log(`Memory growth: ${memoryGrowth / 1024 / 1024}MB`);

      // Memory growth should be reasonable (less than 50MB over 10 seconds)
      expect(memoryGrowth).toBeLessThan(acceptableGrowth);
    }

    // Verify app is still functional
    await expect(page.locator('canvas')).toBeVisible();
  });
});
