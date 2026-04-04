/* eslint-disable react-hooks/rules-of-hooks */
import { test, expect } from '@playwright/test';
// import { toMatchImageSnapshot } from 'jest-image-snapshot';

// // Расширяем expect для визуальных тестов
// expect.extend({ toMatchImageSnapshot });

export const visualTest = test.extend({
    // Настройка для скриншотов
    screenshot: async ({ page }: { page: any }, use: any) => {
        await use(async (name: string, options?: any) => {
            const screenshot = await page.screenshot({
                fullPage: true,
                animations: 'disabled',
                ...options
            });

            expect(screenshot).toMatchImageSnapshot({
                customSnapshotsDir: '__snapshots__/visual',
                customDiffDir: '__diffs__',
                failureThreshold: 0.01,
                failureThresholdType: 'percent',
                customSnapshotIdentifier: name
            });
        });
    },

    // Настройка игрового движка
    gameEngine: async ({ page }: { page: any }, use: any) => {
        await use(async () => {
            return await page.evaluate(() => {
                return (window as any).gameEngine;
            });
        });
    },
});

// Утилиты для тестирования
export class TestUtils {
    static async waitForGameLoad(page: any) {
        await page.waitForFunction(() => {
            return (window as any).gameEngine && (window as any).gameEngine.initialized;
        }, { timeout: 10000 });
    }

    static async forceGameState(page: any, state: string) {
        await page.evaluate((gameState: any) => {
            const engine = (window as any).gameEngine;
            if (engine) {
                engine.setState(gameState);
            }
        }, state);
    }

    static async spawnEntity(page: any, type: string, x: number, y: number) {
        await page.evaluate(({ entityType, posX, posY }: any) => {
            const engine = (window as any).gameEngine;
            if (engine) {
                engine.spawnEntity(entityType, posX, posY);
            }
        }, { entityType: type, posX: x, posY: y });
    }

    static async getPlayerStats(page: any) {
        return await page.evaluate(() => {
            const engine = (window as any).gameEngine;
            return engine?.player ? {
                x: engine.player.x,
                y: engine.player.y,
                hp: engine.player.hp,
                speed: engine.player.currentSpeed,
                godMode: engine.player.godMode
            } : null;
        });
    }
}
