/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LevelSeedSystem - Система насіння для відтворюваних рівнів
 * Забезпечує детерміновану генерацію рівнів на основі seed
 */

// Типи для рівня складності
export enum LevelDifficulty {
  TUTORIAL = 0,  // 0-100m
  EASY = 1,      // 100-500m  
  MEDIUM = 2,    // 500-1000m
  HARD = 3,      // 1000-2000m
  EXPERT = 4,    // 2000-3000m
  INSANE = 5     // 3000m+
}

// Конфігурація дистанцій для кожної складності
export const DIFFICULTY_DISTANCES = {
  [LevelDifficulty.TUTORIAL]: { min: 0, max: 100 },
  [LevelDifficulty.EASY]: { min: 100, max: 500 },
  [LevelDifficulty.MEDIUM]: { min: 500, max: 1000 },
  [LevelDifficulty.HARD]: { min: 1000, max: 2000 },
  [LevelDifficulty.EXPERT]: { min: 2000, max: 3000 },
  [LevelDifficulty.INSANE]: { min: 3000, max: Infinity }
};

// Параметри генерації
export interface SeedConfig {
  seed: string;
  playerId?: string;
  levelId?: string;
  initialDifficulty?: LevelDifficulty;
}

// Розширений генератор випадкових чисел з підтримкою множинних потоків
export class SeededRNG {
  private seed: number;
  private readonly MOD = 2147483647; // 2^31 - 1
  private readonly MULT = 16807; // Порядковий множник

  constructor(seed: string | number, streamId: number = 0) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
    this.advance(streamId * 10); // Пропускаємо значення для інших потоків
  }

  // Хешування рядка в число
  private hashString(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Пропуск значень для встановлення потоку
  private advance(count: number): void {
    for (let i = 0; i < count; i++) {
      this.nextInternal();
    }
  }

  // Внутрішня генерація наступного числа
  private nextInternal(): number {
    this.seed = (this.seed * this.MULT) % this.MOD;
    return this.seed;
  }

  // Повертає випадкове число від 0 до 1
  random(): number {
    return this.nextInternal() / this.MOD;
  }

  // Повертає випадкове число в діапазоні [min, max)
  range(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  // Повертає випадкове ціле число в діапазоні [min, max]
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Повертає випадковий елемент масиву
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    return array[this.rangeInt(0, array.length - 1)]!;
  }

  // Перемішує масив (повертає копію)
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.rangeInt(0, i);
      const temp = result[i];
      result[i] = result[j]!;
      result[j] = temp!;
    }
    return result;
  }

  // Повертає булеве значення з заданою ймовірністю
  chance(probability: number): boolean {
    return this.random() < probability;
  }

  // Повертає нормально розподілене число (розподіл Гауса)
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Повертає значення з ваговим вибором
  weightedPick<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let random = this.random() * totalWeight;
    
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1]!.item;
  }

  // Створює незалежний потік RNG з тієї жseed
  fork(stream: number): SeededRNG {
    return new SeededRNG(this.seed, stream);
  }

  // Повертає поточний seed для серіалізації
  getSeed(): number {
    return this.seed;
  }

  // Скидає RNG до початкового стану
  reset(): void {
    // Неможливо скинути внутрішній стан без збереження початкового значення
    // Тому використовуємо fork для створення незалежних потоків
  }
}

// Менеджер насіння рівня
export class LevelSeedManager {
  private readonly _seeds: Map<string, SeededRNG> = new Map();
  private globalSeed: SeededRNG;
  private levelSeed: string;
  private lastGeneratedDistance: number = 0;

  /** Number of cached seed streams (for debugging/metrics). */
  get seedsCacheSize(): number {
    return this._seeds.size;
  }

  constructor(seed?: string) {
    this.levelSeed = seed || this.generateRandomSeed();
    this.globalSeed = new SeededRNG(this.levelSeed);
  }

  // Генерація випадкового seed
  private generateRandomSeed(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  // Отримання RNG для конкретної дистанції
  getRNGForDistance(distance: number): SeededRNG {
    // Створюємо стабільний потік на основі дистанції
    const segment = Math.floor(distance / 50); // Кожні 50 одиниць - новий сегмент
    return this.globalSeed.fork(segment);
  }

  // Отримання RNG для конкретної категорії об'єктів
  getRNGForCategory(category: 'obstacles' | 'coins' | 'platforms' | 'bonuses'): SeededRNG {
    const categoryMap = {
      obstacles: 1,
      coins: 2,
      platforms: 3,
      bonuses: 4
    };
    return this.globalSeed.fork(categoryMap[category]);
  }

  // Отримання поточної дистанції генерації
  getLastGeneratedDistance(): number {
    return this.lastGeneratedDistance;
  }

  // Встановлення дистанції генерації
  setGeneratedDistance(distance: number): void {
    this.lastGeneratedDistance = distance;
  }

  // Отримання поточного seed
  getSeed(): string {
    return this.levelSeed;
  }

  // Встановлення нового seed
  setSeed(seed: string): void {
    this.levelSeed = seed;
    this.globalSeed = new SeededRNG(seed);
    this.lastGeneratedDistance = 0;
  }

  // Генерація hash для перевірки
  generateHash(data: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // Перевірка валідності seed
  isValidSeed(seed: string): boolean {
    return /^[a-z0-9]{4,16}$/i.test(seed);
  }

  // Серіалізація стану для збереження
  serialize(): string {
    return JSON.stringify({
      seed: this.levelSeed,
      lastDistance: this.lastGeneratedDistance
    });
  }

  // Десеріалізація стану
  deserialize(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.seed) {
        this.setSeed(parsed.seed);
        this.lastGeneratedDistance = parsed.lastDistance || 0;
        return true;
      }
    } catch (e) {
      console.error('Failed to deserialize seed:', e);
    }
    return false;
  }
}

export default LevelSeedManager;