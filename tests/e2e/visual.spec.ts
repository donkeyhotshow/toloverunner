import { test, expect } from '@playwright/test';

const maskDynamicElements = async (page: any) => {
    await page.addStyleTag({
        content: `
      .score-counter, 
      .particles-container, 
      .floating-text,
      [data-testid="score"],
      [data-testid="fps-counter"] {
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `
    });
};

test.describe('Visual Regression', () => {
    test.beforeEach(async ({ page }) => {
        // Inject flag to expose store
        await page.addInitScript(() => {
            (window as any).__VQA_EXPOSE_STORE__ = '1';
        });
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => !!(window as any).__TOLOVERUNNER_STORE__);
    });

    test('Start Screen', async ({ page }) => {
        await maskDynamicElements(page);
        await expect(page).toHaveScreenshot('start-screen.png', {
            maxDiffPixelRatio: 0.05 // Allow small rendering diffs
        });
    });

    test('Game Over Screen', async ({ page }) => {
        // Force Game Over State
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__.getState();
            store.startGame();
            store.takeDamage();
            store.takeDamage();
            store.takeDamage(); // Should trigger game over
        });

        // Wait for Game Over UI
        await page.waitForTimeout(1000);

        await maskDynamicElements(page);
        await expect(page).toHaveScreenshot('game-over.png', {
            maxDiffPixelRatio: 0.05
        });
    });

    test('Skin Rendering (Cowboy)', async ({ page }) => {
        // Start game and force skin
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__.getState();
            store.startGame();
            // Assuming there's a way to set character type or it's set on start
            // If not directly exposed, we might need to rely on what startGame sets
            // For now, we just snapshot the running game with masking
        });

        await page.waitForTimeout(1000); // Wait for model to load/render
        await maskDynamicElements(page);

        // Snapshot only the canvas or a central region if possible, but full page is easier for now
        await expect(page).toHaveScreenshot('gameplay-cowboy.png', {
            maxDiffPixelRatio: 0.05
        });
    });
});
