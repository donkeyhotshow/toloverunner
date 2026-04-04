import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runStressTest() {
    console.log('🚀 Starting STABILITY STRESS TEST...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set a long timeout for the test (12 minutes)
    page.setDefaultTimeout(720000);

    const logFile = path.join(__dirname, '../../test-results/stress_test_log.txt');
    fs.writeFileSync(logFile, '--- STRESS TEST LOG ---\n');

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[STABILITY]')) {
            fs.appendFileSync(logFile, `${new Date().toISOString()} ${text}\n`);
            if (text.includes('Dist: 10')) {
                 console.log(`✅ Milestone reached: ${text}`);
            }
        }
    });

    try {
        await page.goto('http://localhost:3002');
        console.log('Game loaded. Starting...');
        
        // Wait for start button and click
        console.log('⏳ Waiting for .menu-btn-primary...');
        await page.waitForSelector('.menu-btn-primary', { timeout: 15000 });
        console.log('🖱️ Clicking .menu-btn-primary');
        await page.click('.menu-btn-primary');

        console.log('🏃 Running Quick Check. Monitoring logs...');
        
        // Let it run with progress shots
        for (let i = 1; i <= 3; i++) {
            await page.waitForTimeout(20000);
            const screenshotPath = path.join(__dirname, `../../test-results/progress_${i}.png`);
            await page.screenshot({ path: screenshotPath });
            console.log(`📸 Progress screenshot saved: ${screenshotPath}`);
        }

        console.log('🏁 Stress test period completed.');
        
        const finalScreenshotPath = path.join(__dirname, '../../test-results/stress_test_final.png');
        await page.screenshot({ path: finalScreenshotPath });
        console.log(`📸 Final screenshot saved: ${finalScreenshotPath}`);

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await browser.close();
        console.log(`Test finished. Check ${logFile} for results.`);
    }
}

runStressTest();
