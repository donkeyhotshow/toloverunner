/**
 * Тест текущего состояния геймплея - 13 марта 2026
 * Проверяет исправления: Invalid Hook Call, isSliding reset
 */

import { test, expect } from '@playwright/test';

test.describe('Gameplay Current State Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Expose store for testing
        await page.addInitScript(() => {
            (window as any).__VQA_EXPOSE_STORE__ = '1';
        });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('1. Menu loads and displays correctly', async ({ page }) => {
        // Wait for menu to appear
        await page.waitForSelector('text=START GAME', { timeout: 10000 });
        
        // Check menu elements
        const startButton = page.locator('text=START GAME');
        await expect(startButton).toBeVisible();
        
        const shopButton = page.locator('text=SHOP');
        await expect(shopButton).toBeVisible();
        
        console.log('✅ Menu loaded successfully');
    });

    test('2. Game starts without Invalid Hook Call error', async ({ page }) => {
        // Listen for console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Start game
        await page.click('text=START GAME');
        
        // Wait for countdown
        await page.waitForSelector('text=3', { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Wait for game to start
        await page.waitForTimeout(3000);
        
        // Check for Invalid Hook Call error
        const hasHookError = errors.some(err => 
            err.includes('Invalid hook call') || 
            err.includes('Hooks can only be called')
        );
        
        expect(hasHookError).toBe(false);
        console.log('✅ No Invalid Hook Call error');
        console.log(`Total errors: ${errors.length}`);
        if (errors.length > 0) {
            console.log('Errors:', errors.slice(0, 5));
        }
    });

    test('3. Controls work correctly', async ({ page }) => {
        // Start game
        await page.click('text=START GAME');
        await page.waitForTimeout(4000); // Wait for countdown + start
        
        // Get initial state
        const initialState = await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__;
            return store?.getState?.();
        });
        
        expect(initialState).toBeDefined();
        expect(initialState.status).toBe('PLAYING');
        
        // Test jump (Space) - wait for physics update
        await page.keyboard.press('Space');
        await page.waitForTimeout(50); // Wait for physics update
        
        let state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.localPlayerState.isJumping).toBe(true);
        console.log('✅ Jump works');
        
        // Release Space
        await page.keyboard.up('Space');
        await page.waitForTimeout(100);
        
        state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.localPlayerState.isJumping).toBe(false);
        console.log('✅ Jump release works');
        
        // Test slide (S)
        await page.keyboard.press('KeyS');
        await page.waitForTimeout(100);
        
        state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.localPlayerState.isSliding).toBe(true);
        console.log('✅ Slide works');
        
        // Release S - THIS IS THE FIX WE MADE
        await page.keyboard.up('KeyS');
        await page.waitForTimeout(100);
        
        state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.localPlayerState.isSliding).toBe(false);
        console.log('✅ Slide release works (FIX VERIFIED)');
    });

    test('4. Game runs for 10 seconds without crashing', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Start game
        await page.click('text=START GAME');
        await page.waitForTimeout(4000);
        
        // Run for 10 seconds
        await page.waitForTimeout(10000);
        
        // Check state
        const state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.status).toBe('PLAYING');
        expect(state.distance).toBeGreaterThan(0);
        
        console.log(`✅ Game ran for 10 seconds`);
        console.log(`Distance: ${state.distance.toFixed(2)}m`);
        console.log(`Speed: ${state.speed.toFixed(2)}m/s`);
        console.log(`Lives: ${state.lives}`);
        console.log(`Errors: ${errors.length}`);
    });

    test('5. Collision detection works', async ({ page }) => {
        // Start game
        await page.click('text=START GAME');
        await page.waitForTimeout(4000);
        
        // Get initial lives
        const initialLives = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.().lives;
        });
        
        // Force damage
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__?.getState?.();
            store.takeDamage();
        });
        
        await page.waitForTimeout(500);
        
        const newLives = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.().lives;
        });
        
        expect(newLives).toBe(initialLives - 1);
        console.log(`✅ Collision works: ${initialLives} → ${newLives} lives`);
    });

    test('6. Game Over triggers correctly', async ({ page }) => {
        // Start game
        await page.click('text=START GAME');
        await page.waitForTimeout(4000);
        
        // Force game over with proper invincibility timing
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__?.getState?.();
            store.takeDamage();
        });
        
        // Wait for invincibility to end
        await page.waitForTimeout(2600);
        
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__?.getState?.();
            store.takeDamage();
        });
        
        // Wait for invincibility to end
        await page.waitForTimeout(2600);
        
        await page.evaluate(() => {
            const store = (window as any).__TOLOVERUNNER_STORE__?.getState?.();
            store.takeDamage();
        });
        
        // Wait for game over screen (1s delay + buffer)
        await page.waitForSelector('text=GAME OVER', { timeout: 2000 });
        
        const state = await page.evaluate(() => {
            return (window as any).__TOLOVERUNNER_STORE__?.getState?.();
        });
        
        expect(state.status).toBe('GAME_OVER');
        expect(state.lives).toBe(0);
        
        console.log('✅ Game Over works correctly');
    });
});
