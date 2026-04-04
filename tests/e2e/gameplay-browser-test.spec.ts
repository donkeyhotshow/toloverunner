/**
 * ToLOVERunner - Comprehensive Gameplay Browser Test
 */

import { test, expect, Page } from '@playwright/test';

const GAME_URL = 'http://localhost:3000';

// Wait for game to load
async function waitForGameLoad(page: Page, timeout = 30000): Promise<boolean> {
  try {
    await page.waitForSelector('canvas', { timeout });
    const ready = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const check = () => {
          if ((window as any).__TOLOVERUNNER_RENDERER__) resolve(true);
          else setTimeout(check, 100);
        };
        check();
        setTimeout(() => resolve(false), 15000);
      });
    });
    return ready;
  } catch { return false; }
}

// Get game metrics
async function getMetrics(page: Page) {
  return await page.evaluate(() => {
    const m: any = {};
    const perf = (window as any).__TOLOVERUNNER_PERFORMANCE__;
    if (perf) m.fps = perf.currentFPS || 0;
    if ((performance as any).memory) {
      m.memory = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    const r = (window as any).__TOLOVERUNNER_RENDERER__;
    if (r?.info) m.drawCalls = r.info.render?.calls || 0;
    const s = (window as any).__TOLOVERUNNER_STORE__;
    if (s?.getState) {
      const st = s.getState();
      m.status = st.status;
      m.score = st.score || 0;
      m.distance = st.distance || 0;
    }
    return m;
  });
}

test.describe('ToLOVERunner Gameplay', () => {
  test.setTimeout(120000);

  test('1. Game Loading', async ({ page }) => {
    console.log('🎮 Loading game...');
    await page.goto(GAME_URL);
    const loaded = await waitForGameLoad(page);
    expect(loaded).toBe(true);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await page.screenshot({ path: 'test-results/01-loaded.png' });
    console.log('✅ Game loaded');
  });

  test('2. Start Game', async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGameLoad(page);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/02-menu.png' });
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    const m = await getMetrics(page);
    console.log(`📍 Status: ${m.status}`);
    await page.screenshot({ path: 'test-results/02-started.png' });
  });

  test('3. Performance (30s)', async ({ page }) => {
    const fps: number[] = [];
    await page.goto(GAME_URL);
    await waitForGameLoad(page);
    await page.waitForTimeout(2000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    console.log('🎮 30s performance test...');
    const start = Date.now();
    while (Date.now() - start < 30000) {
      const actions = ['ArrowLeft', 'ArrowRight', 'ArrowUp'];
      await page.keyboard.press(actions[Math.floor(Math.random() * 3)]);
      const m = await getMetrics(page);
      if (m.fps) fps.push(m.fps);
      await page.waitForTimeout(500);
    }

    const avg = fps.length ? Math.round(fps.reduce((a, b) => a + b, 0) / fps.length) : 0;
    console.log(`📊 FPS: avg=${avg}, min=${Math.min(...fps)}, max=${Math.max(...fps)}`);
    await page.screenshot({ path: 'test-results/03-perf.png' });
    expect(avg).toBeGreaterThan(30);
  });

  test('4. Controls', async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGameLoad(page);
    await page.waitForTimeout(2000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);

    console.log('🎮 Testing controls...');
    for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200); }
    await page.screenshot({ path: 'test-results/04-left.png' });

    for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); }
    await page.screenshot({ path: 'test-results/04-right.png' });

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/04-jump.png' });
    console.log('✅ Controls OK');
  });

  test('5. Pause System', async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGameLoad(page);
    await page.waitForTimeout(2000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    let m = await getMetrics(page);
    console.log(`📍 After Escape: ${m.status}`);
    await page.screenshot({ path: 'test-results/05-paused.png' });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    m = await getMetrics(page);
    console.log(`📍 After resume: ${m.status}`);
  });

  test('6. Extended Session (60s)', async ({ page }) => {
    const fps: number[] = [];
    await page.goto(GAME_URL);
    await waitForGameLoad(page);
    await page.waitForTimeout(2000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    console.log('🎮 60s gamre?    rOsion...');
    const start = Date.now();
    let shots = 0;

    while (Date.now() - start < 60000) {
      const actions = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowUp'];
      await page.keyboard.press(actions[Math.floor(Math.random() * 4)]);

      const m = await getMetrics(page);
      if (m.fps) fps.push(m.fps);

      if (shots < 4 && Date.now() - start > shots * 15000) {
        await page.screenshot({ path: `test-results/06-session-${++shots}.png` });
      }

      if (m.status === 'GAME_OVER') {
        console.log('   Game Over - restart');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Space');
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(200);
    }

    const avg = fps.length ? Math.round(fps.reduce((a, b) => a + b, 0) / fps.length) : 0;
    console.log(`📊 Session FPS: ${avg}`);
    await page.screenshot({ path: 'test-results/06-end.png' });
    expect(avg).toBeGreaterThan(25);
  });
});
