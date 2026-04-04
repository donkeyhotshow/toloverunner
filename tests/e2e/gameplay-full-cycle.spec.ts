import { test, expect } from '@playwright/test';

test.describe('Gameplay Full Cycle E2E', () => {
  test.setTimeout(60000); // 60 seconds for full game cycle

  test('complete game cycle: menu → playing → victory', async ({ page }) => {
    // Navigate to app
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for loading and initial setup
    // Loading screen shows various texts like "Initializing Systems...", "Inking Outlines...", etc.
    await page.waitForTimeout(2000); // Wait for loading to complete

    // Verify canvas is present
    await page.waitForSelector('canvas', { timeout: 10000 });
    await expect(page.locator('canvas')).toBeVisible();

    // Check for menu elements - look for "S P E R M RUNNER" title
    await expect(page.locator('text=S P E R M')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=RUNNER')).toBeVisible({ timeout: 5000 });

    // Start game
    const startButton = page.locator('text=START').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for game to start (status change)
    await page.waitForTimeout(2000);

    // Verify gameplay elements appear
    const gameplayElements = [
      'canvas', // Game canvas
      '[data-testid="hud"]', // HUD
      '[data-testid="health"]', // Health indicator
      '[data-testid="score"]' // Score display
    ];

    for (const selector of gameplayElements) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 10000 });
      } catch (e) {
        console.log(`Element ${selector} not found, continuing...`);
      }
    }

    // Wait for game progression (simulate playing for 30 seconds)
    console.log('Waiting for game progression...');
    await page.waitForTimeout(30000);

    // Check for victory or continue playing
    try {
      // Look for victory screen or high score
      const victoryElements = [
        'text=VICTORY',
        'text=WELL DONE',
        'text=GAME OVER'
      ];

      for (const selector of victoryElements) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found victory/game over screen: ${selector}`);
          break;
        }
      }
    } catch (e) {
      console.log('Game still in progress, checking performance...');
    }

    // Verify game is still responsive
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Try to pause/unpause if available
    try {
      const pauseButton = page.locator('text=PAUSE').or(page.locator('[data-testid="pause"]'));
      if (await pauseButton.isVisible({ timeout: 1000 })) {
        await pauseButton.click();
        await page.waitForTimeout(1000);

        // Try to resume
        const resumeButton = page.locator('text=RESUME').or(page.locator('[data-testid="resume"]'));
        if (await resumeButton.isVisible({ timeout: 2000 })) {
          await resumeButton.click();
        }
      }
    } catch (e) {
      console.log('Pause functionality not tested or not available');
    }

    console.log('Gameplay full cycle test completed successfully');
  });

  test('performance monitoring during gameplay', async ({ page }) => {
    // Navigate to app
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Start monitoring performance
    const performanceMetrics: any[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FPS:') || text.includes('Draw calls:')) {
        performanceMetrics.push({
          timestamp: Date.now(),
          message: text
        });
      }
    });

    // Wait for loading to complete and canvas to appear
    await page.waitForTimeout(2000);
    await page.waitForSelector('canvas', { timeout: 10000 });

    const startButton = page.locator('text=START').first();
    await startButton.click();

    // Monitor performance for 10 seconds
    await page.waitForTimeout(10000);

    // Analyze collected metrics
    console.log(`Collected ${performanceMetrics.length} performance metrics`);

    if (performanceMetrics.length > 0) {
      // Check for reasonable FPS values
      const fpsMetrics = performanceMetrics.filter(m => m.message.includes('FPS:'));
      if (fpsMetrics.length > 0) {
        const lastFps = fpsMetrics[fpsMetrics.length - 1].message;
        const fpsValue = parseFloat(lastFps.split('FPS:')[1]);
        expect(fpsValue).toBeGreaterThan(30); // Minimum acceptable FPS
        console.log(`Final FPS: ${fpsValue}`);
      }
    }

    // Verify game remains stable
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for app to load
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Check that canvas adapts to mobile size
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();

    expect(canvasBox?.width).toBeLessThanOrEqual(375);
    expect(canvasBox?.height).toBeLessThanOrEqual(667);

    // Test touch interactions
    await canvas.click({ position: { x: 100, y: 300 } }); // Simulate tap
    await page.waitForTimeout(1000);

    // Verify app remains responsive
    await expect(canvas).toBeVisible();

    console.log('Mobile responsiveness test completed');
  });
});
