/**
 * Запускает игру на localhost:3000, входит в геймплей и делает 15 скриншотов.
 * Требует: dev-сервер уже запущен (npm run dev).
 * Запуск: node scripts/capture-gameplay-screenshots.mjs
 * Для порта 3001: BASE_URL=http://localhost:3001 node scripts/capture-gameplay-screenshots.mjs
 */

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'screenshots', 'gameplay');
const COUNT = 15;
const DELAY_MS = 2000;
const TIMEOUT_MS = 20000;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });
  context.setDefaultTimeout(TIMEOUT_MS);

  const page = await context.newPage();

  await page.route('**/*.{woff,woff2,ttf,otf}', (route) => route.abort());
  await page.route('**/*font*', (route) => {
    const url = route.request().url();
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) return route.abort();
    return route.continue();
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(6000);

    const startBtn = page.getByRole('button', { name: /START RUN/i });
    await startBtn.click({ noWaitAfter: true });

    await page.waitForSelector('text=SCORE', { timeout: 25000 }).catch(() => null);
    await page.waitForTimeout(5000);

    for (let i = 1; i <= COUNT; i++) {
      const file = path.join(OUT_DIR, `gameplay-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({
        path: file,
        type: 'png',
        timeout: 60000,
      }).catch((err) => {
        console.error(`Screenshot ${i} failed:`, err.message);
      });
      if (i < COUNT) await page.waitForTimeout(DELAY_MS);
    }

    console.log(`Done. Saved ${COUNT} screenshots to ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
