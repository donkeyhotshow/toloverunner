import { test, expect } from '@playwright/test';

const getGameState = async (page: any) => {
    return await page.evaluate(() => {
        const store = (window as any).__TOLOVERUNNER_STORE__;
        return store ? store.getState() : null;
    });
};

test.describe('Lobby UI & Gameplay Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__VQA_EXPOSE_STORE__ = '1';
        });
        await page.goto('/');
        // Wait for the game to load and the store to be available
        await page.waitForSelector('canvas', { timeout: 30000 });
        await page.waitForFunction(() => !!(window as any).__TOLOVERUNNER_STORE__, { timeout: 30000 });
    });

    test('Full Flow: Menu -> Lobby -> Gameplay', async ({ page }) => {
        console.log('Step 1: Verifying Menu Screen');
        // Look for "S P E R M RUNNER" title instead of "GENDER RACE"
        await page.waitForSelector('text=S P E R M', { timeout: 20000 });
        await expect(page.locator('h1')).toContainText('S P E R M');
        await page.screenshot({ path: 'test-results/lobby_menu.png' });

        console.log('Step 2: Selecting Character (Girl)');
        await page.waitForTimeout(2000); // Wait for animations to settle

        // Try to find the girl selector by text and click it
        const girlSelector = page.locator('div').filter({ hasText: /^GIRL \(XX\)$/ }).first();
        await expect(girlSelector).toBeVisible();
        await girlSelector.click();

        await page.waitForTimeout(1000);
        let state = await getGameState(page);
        console.log('Current characterType:', state?.characterType);
        expect(state.characterType).toBe('Y');
        await page.screenshot({ path: 'test-results/lobby_character_selected.png' });

        console.log('Step 3: Creating Room');
        const createRoomBtn = page.getByRole('button', { name: 'CREATE ROOM' });
        await expect(createRoomBtn).toBeVisible();
        await createRoomBtn.click();

        console.log('Step 4: Verifying Lobby Screen');
        await page.waitForSelector('text=WAITING FOR PLAYER 2', { timeout: 20000 });
        await expect(page.locator('h2')).toContainText('WAITING FOR PLAYER 2');
        await page.screenshot({ path: 'test-results/lobby_waiting.png' });

        console.log('Step 5: Starting Race (as host)');
        // Force the game to start via the store since we don't have a second player
        await page.evaluate(() => (window as any).__TOLOVERUNNER_STORE__.getState().startGame());

        console.log('Step 6: Verifying Gameplay');
        await page.waitForTimeout(2000);
        state = await getGameState(page);
        console.log('Current game status:', state?.status);
        expect(state.status).toBe('PLAYING');
        await page.screenshot({ path: 'test-results/lobby_gameplay_start.png' });

        console.log('Step 7: Testing Movement');
        const initialLane = state.localPlayerState.lane;
        console.log('Initial lane:', initialLane);

        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(1000);
        const movedState = await getGameState(page);
        console.log('Lane after ArrowRight:', movedState.localPlayerState.lane);

        // If we were not at the rightmost lane, we should have moved right
        if (initialLane < 2) {
            expect(movedState.localPlayerState.lane).toBeGreaterThan(initialLane);
        }
        await page.screenshot({ path: 'test-results/lobby_gameplay_moved.png' });
    });
});
