/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DifficultyProgression - Система прогресії складності
 * Складність збільшується залежно від дистанції та очок
 */

import { LevelDifficulty, DIFFICULTY_DISTANCES } from './LevelSeedSystem';
import { PLAYER_PHYSICS } from './PhysicsPassability';

// === ПАРАМЕТРИ ПРОГРЕСІЇ ===

export interface DifficultyParams {
  // Базові параметри
  difficulty: number;          // 0-1 (поточна складність)
  distance: number;             // Поточна дистанція
  score: number;                // Поточний рахунок
  combo: number;                // Поточний комбо
  
  // Додаткові фактори
  averageSpeed: number;         // Середня швидкість
  obstaclesPassed: number;      // Кількість пройдених препятствий
  perfectActions: number;       // Кількість ідеальних дій
  damageTaken: number;          // Отримані пошкодження
  
  // Прогресія
  timePlayed: number;           // Час гри в секундах
  levelCompletions: number;     // Кількість пройдених рівнів
  globalTDIMultiplier?: number; // 🆕 Множник від серверного агрегатора
}

// Результат розрахунку складності
export interface DifficultyResult {
  difficulty: number;           // 0-1
  levelDifficulty: LevelDifficulty;
  params: {
    obstacleDensity: number;    // Щільність препятствий
    obstacleSpeed: number;       // Швидкість препятствий
    routeComplexity: number;     // Складність маршруту
    bonusFrequency: number;      // Частота бонусів
    specialObstacleChance: number; // Шанс specialних препятствий
    sequenceLength: number;      // Довжина послідовностей
    minGap: number;              // Мінімальний зазор
    maxGap: number;              // Максимальний зазор
    // 🆕 GDD Властивості
    currentRunSpeed: number;     // Поточна швидкість бігу
    targetTDI: number;           // Цільовий Threat Density Index
    reactionBudget: number;      // Окно реакції (мс)
  };
  recommendations: string[];
}

// === СИСТЕМА ПРОГРЕСІЇ СКЛАДНОСТІ ===

export class DifficultyProgression {
  // Базові константи (частина використовується в майбутніх розширеннях)
  private readonly MAX_DISTANCE = 5000;         // Максимальна дистанція для розрахунку
  
  // Параметри складності
  private readonly MIN_OBSTACLE_DENSITY = 0.1;
  private readonly MAX_OBSTACLE_DENSITY = 0.8;
  private readonly MIN_GAP = 5;
  private readonly MAX_GAP = 25;
  private readonly MIN_SEQUENCE_LENGTH = 15;
  private readonly MAX_SEQUENCE_LENGTH = 100;
  
  // Історія для згладжування
  private difficultyHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;
  
  // Конструктор
  constructor() {
    this.difficultyHistory = [];
  }

  // Основний метод розрахунку складності
  calculateDifficulty(params: DifficultyParams): DifficultyResult {
    // Розрахунок базової складності
    const baseDifficulty = this.calculateBaseDifficulty(params);
    
    // Застосування модифікаторів
    const modifiers = this.calculateModifiers(params);
    
    // Фінальна складність з урахуванням модифікаторів
    let finalDifficulty = baseDifficulty * modifiers.combined;
    
    // Згладжування через історію
    finalDifficulty = this.smoothDifficulty(finalDifficulty);
    
    // Обмеження діапазону
    finalDifficulty = Math.max(0, Math.min(1, finalDifficulty));
    
    // Визначення рівня складності
    const levelDifficulty = this.getLevelDifficulty(finalDifficulty);
    
    // Розрахунок параметрів генерації
    const generationParams = this.calculateGenerationParams(finalDifficulty, params);
    
    // Рекомендації
    const recommendations = this.generateRecommendations(finalDifficulty, params);
    
    return {
      difficulty: finalDifficulty,
      levelDifficulty,
      params: generationParams,
      recommendations
    };
  }

  // Розрахунок базової складності на основі дистанції
  private calculateBaseDifficulty(params: DistanceMetrics): number {
    // Нормалізація дистанції (0-1)
    const normalizedDistance = Math.min(params.distance / this.MAX_DISTANCE, 1);
    
    // Крива складності - спочатку повільно, потім швидше
    // Використовуємо sigmoid-подібну функцію
    const difficultyCurve = this.applyDifficultyCurve(normalizedDistance);
    
    return difficultyCurve;
  }

  // Застосовує криву складності
  private applyDifficultyCurve(normalizedValue: number): number {
    // Sigmoid-подібна крива з контрольованою крутістю
    const steepness = 4; // Крутість кривої
    const midpoint = 0.4; // Середина кривої
    
    // Логарифмічна шкала для плавного старту
    if (normalizedValue < 0.3) {
      return normalizedValue * 1.5; // Повільний старт
    }
    
    // Експоненційне зростання
    const expValue = Math.pow((normalizedValue - midpoint) * steepness, 2);
    return 0.3 + (1 - 0.3) * (1 - Math.exp(-expValue));
  }

  // Розрахунок модифікаторів
  private calculateModifiers(params: DifficultyParams): {
    combined: number;
    speed: number;
    performance: number;
    combo: number;
  } {
    // Модифікатор швидкості
    const speedModifier = this.calculateSpeedModifier(params.averageSpeed);
    
    // Модифікатор продуктивності
    const performanceModifier = this.calculatePerformanceModifier(
      params.obstaclesPassed,
      params.perfectActions,
      params.damageTaken
    );
    
    // Модифікатор комбо
    const comboModifier = this.calculateComboModifier(params.combo);
    
    // Комбінований модифікатор
    const combined = speedModifier * performanceModifier * comboModifier;
    
    return {
      combined: Math.max(0.5, Math.min(1.5, combined)),
      speed: speedModifier,
      performance: performanceModifier,
      combo: comboModifier
    };
  }

  // Модифікатор швидкості
  private calculateSpeedModifier(averageSpeed: number): number {
    // Оптимальна швидкість = 15-20 одиниць
    const optimalSpeed = 17;
    const deviation = Math.abs(averageSpeed - optimalSpeed);
    
    // Чим ближче до оптимальної, тим менше модифікатор
    if (deviation < 3) return 1.0;
    if (deviation < 6) return 1.1;
    if (deviation < 10) return 1.2;
    return 1.3;
  }

  // Модифікатор продуктивності
  private calculatePerformanceModifier(
    obstaclesPassed: number,
    perfectActions: number,
    damageTaken: number
  ): number {
    // Відсоток ідеальних дій
    const perfectRatio = obstaclesPassed > 0 
      ? perfectActions / obstaclesPassed 
      : 0;
    
    // Штраф за пошкодження
    const damagePenalty = 1 + (damageTaken * 0.1);
    
    // Нагорода за ідеальні дії
    const perfectBonus = 1 - (perfectRatio * 0.3);
    
    return damagePenalty * perfectBonus;
  }

  // Модифікатор комбо
  private calculateComboModifier(combo: number): number {
    // Збільшуємо складність при високому комбо
    if (combo < 5) return 1.0;
    if (combo < 15) return 1.1;
    if (combo < 30) return 1.2;
    if (combo < 50) return 1.3;
    return 1.4;
  }

  // Згладжування складності
  private smoothDifficulty(difficulty: number): number {
    this.difficultyHistory.push(difficulty);
    
    if (this.difficultyHistory.length > this.HISTORY_SIZE) {
      this.difficultyHistory.shift();
    }
    
    // Середнє арифметичне
    const sum = this.difficultyHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.difficultyHistory.length;
    
    // Змішуємо поточне значення з середнім
    return difficulty * 0.7 + avg * 0.3;
  }

  // Визначення рівня складності
  private getLevelDifficulty(difficulty: number): LevelDifficulty {
    if (difficulty < 0.15) return LevelDifficulty.TUTORIAL;
    if (difficulty < 0.35) return LevelDifficulty.EASY;
    if (difficulty < 0.55) return LevelDifficulty.MEDIUM;
    if (difficulty < 0.75) return LevelDifficulty.HARD;
    if (difficulty < 0.9) return LevelDifficulty.EXPERT;
    return LevelDifficulty.INSANE;
  }

  // Розрахунок параметрів генерації
  private calculateGenerationParams(
    difficulty: number,
    params: DifficultyParams
  ): DifficultyResult['params'] {
    // 🆕 Розрахунок за GDD
    // Швидкість зростає на 0.15 кожні 30с
    const currentRunSpeed = Math.min(
      PLAYER_PHYSICS.BASE_SPEED + Math.floor(params.timePlayed / 30) * PLAYER_PHYSICS.SPEED_GROWTH_PER_30S,
      difficulty > 0.8 ? PLAYER_PHYSICS.MAX_HARDCORE_SPEED : PLAYER_PHYSICS.MAX_SPEED
    );

    const reactionBudget = difficulty < 0.35 ? PLAYER_PHYSICS.REACTION_TIME_EASY : 
                          difficulty < 0.75 ? PLAYER_PHYSICS.REACTION_TIME_STANDARD : 
                          PLAYER_PHYSICS.REACTION_TIME_HARD;

    // Target TDI (Легко: <=18, Стандарт: 18-26, Хард: 26-35)
    const targetTDI = this.lerp(10, 35, difficulty);

    // 🆕 MULTIPLAYER TDI HOOK
    // Use an external global modifier if available (from Server Aggregator)
    // Default to 1.0 if not provided
    const globalTDIMultiplier = params.globalTDIMultiplier ?? 1.0;

    // Щільність препятствий з урахуванням TDI
    // TDI = (Угрозы * Скорость) / Реакция -> Угрозы = (TDI * Реакция) / Скорость
    // obstacleDensity маппіться відносно кількості загроз
    let obstacleDensity = this.lerp(
      this.MIN_OBSTACLE_DENSITY,
      this.MAX_OBSTACLE_DENSITY,
      difficulty
    ) * globalTDIMultiplier;
    
    // Нормалізація щільності шоб уникнути перевищення TDI 35
    if (targetTDI > 35 || (targetTDI * globalTDIMultiplier) > 35) {
       obstacleDensity *= 0.8; // Знижуємо щільність як запобіжник фрустрації
    }
    
    // Швидкість препятствий (множник)
    const obstacleSpeed = 1 + difficulty * 0.5;
    
    // Складність маршруту
    const routeComplexity = difficulty;
    
    // Частота бонусів (зменшується зі складністю)
    const bonusFrequency = 0.3 - difficulty * 0.2;
    
    // Шанс specialних препятствий
    const specialObstacleChance = difficulty * 0.4;
    
    // Довжина послідовностей
    const sequenceLength = this.lerp(
      this.MIN_SEQUENCE_LENGTH,
      this.MAX_SEQUENCE_LENGTH,
      difficulty
    );
    
    // Зазори
    const minGap = this.lerp(this.MAX_GAP, this.MIN_GAP, difficulty);
    const maxGap = this.lerp(this.MAX_GAP * 2, this.MIN_GAP * 1.5, difficulty);
    
    return {
      obstacleDensity,
      obstacleSpeed,
      routeComplexity,
      bonusFrequency: Math.max(0.05, bonusFrequency),
      specialObstacleChance,
      sequenceLength,
      minGap,
      maxGap,
      currentRunSpeed,
      targetTDI,
      reactionBudget
    };
  }

  // Лінійна інтерполяція
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // Генерація рекомендацій
  private generateRecommendations(
    difficulty: number,
    params: DifficultyParams
  ): string[] {
    const recommendations: string[] = [];
    
    if (difficulty < 0.3) {
      recommendations.push('Чудово для початку! Використовуй цей час для вивчення механіки.');
    } else if (difficulty < 0.6) {
      recommendations.push('Середня складність. Зосередься на комбо для додаткових очок.');
    } else if (difficulty < 0.85) {
      recommendations.push('Висока складність! Будь обережний з последовательностями.');
    } else {
      recommendations.push('Експертна складність! Максимальна концентрація необхідна.');
    }
    
    // Додаткові рекомендації
    if (params.damageTaken > 5) {
      recommendations.push('Рекомендується використати щит перед складними секціями.');
    }
    
    if (params.combo > 20) {
      recommendations.push('Чудовий комбо! Продовжуй в тому ж дусі.');
    }
    
    return recommendations;
  }

  // Отримання дистанції для кожного рівня складності
  getDistanceForDifficulty(level: LevelDifficulty): { min: number; max: number } {
    return DIFFICULTY_DISTANCES[level];
  }

  // Розрахунок очікуваної складності на дистанції
  getExpectedDifficulty(distance: number): number {
    const normalized = Math.min(distance / this.MAX_DISTANCE, 1);
    return this.applyDifficultyCurve(normalized);
  }

  // Скидання історії
  reset(): void {
    this.difficultyHistory = [];
  }

  // Серіалізація стану
  serialize(): string {
    return JSON.stringify({
      history: this.difficultyHistory
    });
  }

  // Десеріалізація стану
  deserialize(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.history) {
        this.difficultyHistory = parsed.history;
        return true;
      }
    } catch (e) {
      console.error('Failed to deserialize difficulty progression:', e);
    }
    return false;
  }
}

// Допоміжний інтерфейс для внутрішніх розрахунків
interface DistanceMetrics {
  distance: number;
  score: number;
  combo: number;
  averageSpeed: number;
  obstaclesPassed: number;
  perfectActions: number;
  damageTaken: number;
  timePlayed: number;
  levelCompletions: number;
}

export default DifficultyProgression;