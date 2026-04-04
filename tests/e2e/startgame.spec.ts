import { test, expect } from '@playwright/test';

test('call startGame on store and validate world generation', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // call store.startGame to ensure procGen init and generation
  await page.evaluate(() => {
    const store = (window as any).__TOLOVERUNNER_STORE__;
    if (store?.startGame) store.startGame();
  });
  // wait for procgen and generation callbacks
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    const out: any = {};
    out.procgenSamples = (window as any).__PROCGEN_RAW_SAMPLES__ || null;
    const s = (window as any).__TOLOVERUNNER_SCENE__;
    const meshes: any[] = [];
    if (s) {
      s.traverse((obj: any) => {
        if (obj.isMesh) meshes.push({ name: obj.name || null, visible: !!obj.visible, materialType: obj.material?.type || null });
      });
    }
    out.meshCount = meshes.length;
    out.meshSample = meshes.slice(0, 8);
    const r = (window as any).__TOLOVERUNNER_RENDERER__;
    out.drawCalls = r?.info?.render?.calls ?? null;
    return out;
  });

  console.log('STARTGAME INFO:', JSON.stringify(info, null, 2));
  expect(info.procgenSamples).not.toBeNull();
});


