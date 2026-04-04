/**
 * Скрипт для копирования и переименования текстур
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDirs = {
  fonts: path.join(__dirname, '../../FONT'),
  fx: path.join(__dirname, '../../FX'),
  enemies: path.join(__dirname, '../../ENEMIES')
};

const targetDirs = {
  fonts: path.join(__dirname, '../public/assets/fonts'),
  fx: path.join(__dirname, '../public/assets/fx'),
  enemies: path.join(__dirname, '../public/assets/enemies')
};

// Маппинг файлов на новые имена
const fontMapping = [
  { source: 'font_comic.png', target: 'font_comic.png' },
  { source: 'font_bold.png', target: 'font_bold.png' },
  { source: 'font_digital.png', target: 'font_digital.png' },
  { source: 'font_title.png', target: 'font_title.png' },
  { source: 'font_score.png', target: 'font_score.png' },
];

const fxMapping = [
  { source: 'fx_particle.png', target: 'fx_particle.png' },
  { source: 'fx_glow.png', target: 'fx_glow.png' },
  { source: 'fx_sparkle.png', target: 'fx_sparkle.png' },
  { source: 'fx_explosion.png', target: 'fx_explosion.png' },
  { source: 'fx_lightning.png', target: 'fx_lightning.png' },
  { source: 'fx_shield.png', target: 'fx_shield.png' },
  { source: 'fx_speed.png', target: 'fx_speed.png' },
];

const enemyMapping = [
  { source: 'virus_purple.png', target: 'virus_purple.png' },
  { source: 'virus_green.png', target: 'virus_green.png' },
  { source: 'virus_yellow.png', target: 'virus_yellow.png' },
  { source: 'virus_red.png', target: 'virus_red.png' },
  { source: 'bacteria_1.png', target: 'bacteria_1.png' },
  { source: 'bacteria_2.png', target: 'bacteria_2.png' },
  { source: 'bacteria_3.png', target: 'bacteria_3.png' },
  { source: 'virus_special.png', target: 'virus_special.png' },
  { source: 'virus_boss.png', target: 'virus_boss.png' },
];

function copyFile(sourcePath, targetPath) {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️  Source file not found: ${sourcePath}`);
      return false;
    }
    
    // Создаем директорию если не существует
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied: ${path.basename(sourcePath)} -> ${path.basename(targetPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${sourcePath}:`, error.message);
    return false;
  }
}

function processMapping(mapping, sourceDir, targetDir) {
  let success = 0;
  let failed = 0;
  
  mapping.forEach(({ source, target }) => {
    const sourcePath = path.join(sourceDir, source);
    const targetPath = path.join(targetDir, target);
    
    if (copyFile(sourcePath, targetPath)) {
      success++;
    } else {
      failed++;
    }
  });
  
  return { success, failed };
}

console.log('🚀 Starting texture copy process...\n');

// Копируем шрифты
console.log('📝 Copying fonts...');
const fontResult = processMapping(fontMapping, sourceDirs.fonts, targetDirs.fonts);
console.log(`   Success: ${fontResult.success}, Failed: ${fontResult.failed}\n`);

// Копируем эффекты
console.log('✨ Copying FX...');
const fxResult = processMapping(fxMapping, sourceDirs.fx, targetDirs.fx);
console.log(`   Success: ${fxResult.success}, Failed: ${fxResult.failed}\n`);

// Копируем врагов
console.log('🦠 Copying enemies...');
const enemyResult = processMapping(enemyMapping, sourceDirs.enemies, targetDirs.enemies);
console.log(`   Success: ${enemyResult.success}, Failed: ${enemyResult.failed}\n`);

const totalSuccess = fontResult.success + fxResult.success + enemyResult.success;
const totalFailed = fontResult.failed + fxResult.failed + enemyResult.failed;

console.log(`\n📊 Total: ${totalSuccess} copied, ${totalFailed} failed`);
console.log('✅ Texture copy process completed!');

