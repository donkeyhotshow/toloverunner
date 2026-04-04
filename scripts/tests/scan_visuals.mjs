import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function scan() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    const log = [];
    page.on('console', m => { if (m.type() === 'error') log.push(m.text()); });

    try {
        console.log('Opening game...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 40000 });

        await page.waitForTimeout(5000);

        // Screenshot 1: Main Menu
        const s1 = path.join(__dirname, '../../screenshots/scan_menu.png');
        await page.screenshot({ path: s1, timeout: 60000 });
        console.log('📸 Menu screenshot:', s1);

        // Try to start game
        const btn = await page.$('text=ПОЧАТИ ГРУ') || await page.$('text=START GAME') || await page.$('button');
        if (btn) {
            await btn.click();
            console.log('Clicked start button');


            await page.waitForTimeout(4000);

            const s2 = path.join(__dirname, '../../screenshots/scan_gameplay1.png');
            await page.screenshot({ path: s2, timeout: 60000 });
            console.log('📸 Gameplay 1:', s2);

            await page.waitForTimeout(3000);
            const s3 = path.join(__dirname, '../../screenshots/scan_gameplay2.png');
            await page.screenshot({ path: s3, timeout: 60000 });
            console.log('📸 Gameplay 2:', s3);
        }

        if (log.length > 0) {
            console.log('\n❌ CONSOLE ERRORS:');
            log.forEach(e => console.log(' -', e));
        } else {
            console.log('\n✅ No console errors');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

scan();
