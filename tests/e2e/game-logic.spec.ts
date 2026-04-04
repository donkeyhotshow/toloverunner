import { test, expect } from '@playwright/test';

const getGameState = async (page: any) => {
    return await page.evaluate(() => {
        const store = (window as any).__TOLOVERUNNER_STORE__;
        return store ? store.getState() : null;
    });
};

test.describe('Game Logic (Zustand State)', () => {
    test.beforeEach(async ({ page }) => {
        // Inject flag to expose store
        await page.addInitScript(() => {
            (window as any).__VQA_EXPOSE_STORE__ = '1';
        });
        await page.goto('/');
        await page.waitForSelector('canvas');
        // Ensure store is exposed
        await page.waitForFunction(() => !!(window as any).__TOLOVERUNNER_STORE__);
        await page.screenshot({ path: 'test-results/initial_screen.png' });
    });

    test('Initialization (Smoke)', async ({ page }) => {
        const state = await getGameState(page);
        expect(state).toBeDefined();
        // Status should be MENU or IDLE
        expect(['MENU', 'IDLE']).toContain(state.status);
        // Initial lives should be 3
        expect(state.lives).toBe(3);
    });

    test('Game Start Sequence', async ({ page }) => {
        // Simulate Start Button Click
        const startBtn = page.locator('button:has-text("Start"), button:has-text("ИГРАТЬ"), [data-testid="start-button"]').first();
        if (await startBtn.isVisible()) {
            await startBtn.click();
        } else {
            // Fallback: Trigger via store if UI is different
            await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__.getState().startGame());
        }

        await page.waitForTimeout(1000); // Wait for state transition

        const state = await getGameState(page);
        expect(state.status).toBe('PLAYING');
        // Check if player has a character type assigned
        expect(state.localPlayerState.characterType).toBeDefined();
        await page.screenshot({ path: 'test-results/gameplay_start.png' });
    });

    test('Damage & Game Over', async ({ page }) => {
        // Start game first
        await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__.getState().startGame());

        // Inject damage
        await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__.getState().takeDamage());

        let state = await getGameState(page);
        expect(state.lives).toBe(2);

        // Force Game Over
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__.getState();
            store.takeDamage(); // 1
            store.takeDamage(); // 0 -> Game Over
        });

        state = await getGameState(page);
        expect(state.status).toBe('GAME_OVER');
    });

    test('Lane Switching (Input Simulation)', async ({ page }) => {
        await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__.getState().startGame());
        await page.waitForTimeout(500);

        const initialState = await getGameState(page);
        const initialLane = initialState.localPlayerState.lane;

        // Simulate Swipe Right
        // Center of the screen (approx for mobile)
        const x = 200;
        const y = 400;

        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 100, y, { steps: 10 }); // Swipe Right
        await page.mouse.up();

        await page.waitForTimeout(200); // Wait for input processing

        const newState = await getGameState(page);
        // Lane should change (unless at edge)
        // If we were at 0, we might go to 1. If at max, we stay.
        // Let's just check if position or lane changed OR if we are at edge.
        console.log(`Lane: ${initialLane} -> ${newState.localPlayerState.lane}`);

        // If we were not at the rightmost lane, we should have moved right (lane increased)
        if (initialLane < 2) { // Assuming max lane is 2 or similar
            expect(newState.localPlayerState.lane).toBeGreaterThan(initialLane);
        }
    });
});
