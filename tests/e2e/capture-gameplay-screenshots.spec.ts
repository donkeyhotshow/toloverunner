/**
 * Снимает 15 скриншотов геймплея в screenshots/gameplay/.
 * Запуск (dev-сервер уже запущен):
 *   npx playwright test capture-gameplay-screenshots --project="Desktop Chrome"
 * Порт 3001: BASE_URL=http://localhost:3001 npx playwright test capture-gameplay-screenshots --project="Desktop Chrome"
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'screenshots', 'gameplay');
const COUNT = 15;
const DELAY_MS = 1500;

test.describe('Capture gameplay screenshots', () => {
  test('take 15 gameplay screenshots', async ({ page }) => {
    test.setTimeout(180000);

    await fs.promises.mkdir(OUT_DIR, { recursive: true });

    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(5000);

    await page.evaluate(() => {
      const store = (window as unknown as { __TOLOVERUNNER_STORE__?: { getState: () => { startGame: () => void } } }).__TOLOVERUNNER_STORE__;
      if (store?.getState().startGame) store.getState().startGame();
    });

    await page.waitForSelector('text=SCORE', { timeout: 20000 }).catch(() => null);
    await page.waitForTimeout(4000);

    const canvas = page.locator('canvas').first();
    for (let i = 1; i <= COUNT; i++) {
      const file = path.join(OUT_DIR, `gameplay-${String(i).padStart(2, '0')}.png`);
      try {
        await canvas.screenshot({ path: file, timeout: 60000 });
      } catch (err) {
        await page.screenshot({ path: file, timeout: 60000 }).catch((e) => {
          console.error(`Screenshot ${i} failed:`, (e as Error).message);
        });
      }
      if (i < COUNT) await page.waitForTimeout(DELAY_MS);
    }

    console.log(`Saved up to ${COUNT} screenshots to ${OUT_DIR}`);
  });
});
