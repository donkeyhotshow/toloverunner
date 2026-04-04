/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PassageTypes - Система типів проходів
 * Визначає різноманітні типи проходів для цікавого геймплею
 */

import { SeededRNG } from './LevelSeedSystem';

// Діапазон доступних смуг (від -2 до 2 для 5 смуг)
export const LANE_RANGE = { min: -2, max: 2 };

// === ТИПИ ПРОХОДІВ ===

export enum PassageType {
  // Базові проходи
  LEFT_PASSAGE = 'LEFT_PASSAGE',       // Прохід зліва
  RIGHT_PASSAGE = 'RIGHT_PASSAGE',     // Прохід справа
  CENTER_PASSAGE = 'CENTER_PASSAGE',   // Центральний прохід
  
  // Спеціалізовані проходи
  NARROW_CORRIDOR = 'NARROW_CORRIDOR', // Вузький коридор
  SLALOM = 'SLALOM',                   // Слалом між препятствиями
  ZIGZAG = 'ZIGZAG',                   // Зигзаг
  TUNNEL = 'TUNNEL',                   // Тунель
  BRIDGE = 'BRIDGE',                   // Міст між пропастями
  
  // Комбіновані
  SPLIT_PATH = 'SPLIT_PATH',          // Розгалуження шляху
  MERGE_PATH = 'MERGE_PATH',           // Злиття шляху
  CHOICE_PATH = 'CHOICE_PATH',         // Вибір шляху
  
  // 🚀 NEW: Розширені типи проходів
  DOUBLE_OBSTACLE = 'DOUBLE_OBSTACLE', // Подвійне препятствие
  TRIPLE_CHALLENGE = 'TRIPLE_CHALLENGE', // Потрійний виклик
  ESCALATING = 'ESCALATING',           // Наростаюча складність
  WAVE_PATTERN = 'WAVE_PATTERN',       // Хвилеподібний патерн
  SPIRAL_PATH = 'SPIRAL_PATH',         // Спіральний шлях
  RUSH_HOUR = 'RUSH_HOUR',             // Інтенсивний рух
  SANCTUARY = 'SANCTUARY',             // Безпечна зона
}

// Конфігурація проходу
export interface PassageConfig {
  type: PassageType;
  width: number;            // Ширина проходу в смугах
  position: number;        // Центральна позиція проходу (середня смуга)
  length: number;          // Довжина проходу
  difficulty: number;       // Складність (0-1)
  minGap: number;          // Мінімальний зазор між препятствиями
  maxGap: number;          // Максимальний зазор між препятствиями
}

// Опис блокованих смуг для проходу
export interface BlockedLanes {
  blocked: number[];        // Заблоковані смуги
  available: number[];      // Доступні смуги
  recommended: number[];   // Рекомендовані смуги для оптимального маршруту
}

// === ГЕНЕРАТОР ПРОХОДІВ ===

export class PassageGenerator {
  private rng: SeededRNG;

  constructor(rng: SeededRNG) {
    this.rng = rng;
  }

  /**
   * Update RNG reference without creating new instance
   */
  setRNG(rng: SeededRNG): void {
    this.rng = rng;
  }

  // Отримання конфігурації проходу за типом
  getPassageConfig(type: PassageType, difficulty: number): PassageConfig {
    const configs: Record<PassageType, () => PassageConfig> = {
      [PassageType.LEFT_PASSAGE]: () => this.createLeftPassage(difficulty),
      [PassageType.RIGHT_PASSAGE]: () => this.createRightPassage(difficulty),
      [PassageType.CENTER_PASSAGE]: () => this.createCenterPassage(difficulty),
      [PassageType.NARROW_CORRIDOR]: () => this.createNarrowCorridor(difficulty),
      [PassageType.SLALOM]: () => this.createSlalom(difficulty),
      [PassageType.ZIGZAG]: () => this.createZigzag(difficulty),
      [PassageType.TUNNEL]: () => this.createTunnel(difficulty),
      [PassageType.BRIDGE]: () => this.createBridge(difficulty),
      [PassageType.SPLIT_PATH]: () => this.createSplitPath(difficulty),
      [PassageType.MERGE_PATH]: () => this.createMergePath(difficulty),
      [PassageType.CHOICE_PATH]: () => this.createChoicePath(difficulty),
      // 🚀 NEW: Extended passage types
      [PassageType.DOUBLE_OBSTACLE]: () => this.createDoubleObstacle(difficulty),
      [PassageType.TRIPLE_CHALLENGE]: () => this.createTripleChallenge(difficulty),
      [PassageType.ESCALATING]: () => this.createEscalating(difficulty),
      [PassageType.WAVE_PATTERN]: () => this.createWavePattern(difficulty),
      [PassageType.SPIRAL_PATH]: () => this.createSpiralPath(difficulty),
      [PassageType.RUSH_HOUR]: () => this.createRushHour(difficulty),
      [PassageType.SANCTUARY]: () => this.createSanctuary(difficulty),
    };

    return configs[type]();
  }

  // Прохід зліва - доступна лівіша частина
  private createLeftPassage(difficulty: number): PassageConfig {
    const width = this.rng.rangeInt(1, 2); // 1-2 смуги
    const position = this.rng.rangeInt(-2, -1); // -2 або -1
    
    return {
      type: PassageType.LEFT_PASSAGE,
      width,
      position,
      length: this.rng.rangeInt(30, 60),
      difficulty: Math.min(difficulty * 1.2, 1),
      minGap: 8 - difficulty * 3,
      maxGap: 15 - difficulty * 5
    };
  }

  // Прохід справа - доступна права частина
  private createRightPassage(difficulty: number): PassageConfig {
    const width = this.rng.rangeInt(1, 2);
    const position = this.rng.rangeInt(1, 2);
    
    return {
      type: PassageType.RIGHT_PASSAGE,
      width,
      position,
      length: this.rng.rangeInt(30, 60),
      difficulty: Math.min(difficulty * 1.2, 1),
      minGap: 8 - difficulty * 3,
      maxGap: 15 - difficulty * 5
    };
  }

  // Центральний прохід
  private createCenterPassage(difficulty: number): PassageConfig {
    const width = this.rng.rangeInt(1, 3);
    const position = 0;
    
    return {
      type: PassageType.CENTER_PASSAGE,
      width,
      position,
      length: this.rng.rangeInt(25, 50),
      difficulty,
      minGap: 10 - difficulty * 4,
      maxGap: 20 - difficulty * 6
    };
  }

  // Вузький коридор
  private createNarrowCorridor(difficulty: number): PassageConfig {
    const position = this.rng.pick([-1, 0, 1]);
    
    return {
      type: PassageType.NARROW_CORRIDOR,
      width: 1,
      position,
      length: this.rng.rangeInt(20, 40),
      difficulty: Math.min(difficulty * 1.5, 1),
      minGap: 12 - difficulty * 4,
      maxGap: 18 - difficulty * 5
    };
  }

  // Слалом
  private createSlalom(difficulty: number): PassageConfig {
    const positions = [-2, -1, 0, 1, 2];
    this.rng.shuffle(positions);
    const pos = positions[0] ?? 0;
    
    return {
      type: PassageType.SLALOM,
      width: 1,
      position: pos,
      length: this.rng.rangeInt(40, 80),
      difficulty: Math.min(difficulty * 1.3, 1),
      minGap: 8 - difficulty * 2,
      maxGap: 15 - difficulty * 4
    };
  }

  // Зигзаг
  private createZigzag(difficulty: number): PassageConfig {
    return {
      type: PassageType.ZIGZAG,
      width: 1,
      position: 0,
      length: this.rng.rangeInt(50, 100),
      difficulty: Math.min(difficulty * 1.4, 1),
      minGap: 10 - difficulty * 3,
      maxGap: 20 - difficulty * 5
    };
  }

  // Тунель
  private createTunnel(difficulty: number): PassageConfig {
    return {
      type: PassageType.TUNNEL,
      width: 3,
      position: 0,
      length: this.rng.rangeInt(30, 60),
      difficulty: Math.min(difficulty * 1.1, 1),
      minGap: 15 - difficulty * 5,
      maxGap: 25 - difficulty * 8
    };
  }

  // Міст між пропастями
  private createBridge(difficulty: number): PassageConfig {
    const position = this.rng.pick([-1, 0, 1]);
    
    return {
      type: PassageType.BRIDGE,
      width: 1,
      position,
      length: this.rng.rangeInt(15, 30),
      difficulty: Math.min(difficulty * 1.6, 1),
      minGap: 20 - difficulty * 5,
      maxGap: 35 - difficulty * 8
    };
  }

  // Розгалуження шляху
  private createSplitPath(difficulty: number): PassageConfig {
    return {
      type: PassageType.SPLIT_PATH,
      width: 2,
      position: 0,
      length: this.rng.rangeInt(20, 40),
      difficulty: Math.min(difficulty * 1.2, 1),
      minGap: 10 - difficulty * 3,
      maxGap: 18 - difficulty * 5
    };
  }

  // Злиття шляху
  private createMergePath(difficulty: number): PassageConfig {
    return {
      type: PassageType.MERGE_PATH,
      width: 2,
      position: 0,
      length: this.rng.rangeInt(20, 40),
      difficulty: Math.min(difficulty * 1.2, 1),
      minGap: 10 - difficulty * 3,
      maxGap: 18 - difficulty * 5
    };
  }

  // Вибір шляху
  private createChoicePath(difficulty: number): PassageConfig {
    return {
      type: PassageType.CHOICE_PATH,
      width: 2,
      position: 0,
      length: this.rng.rangeInt(25, 45),
      difficulty: Math.min(difficulty * 1.3, 1),
      minGap: 8 - difficulty * 2,
      maxGap: 15 - difficulty * 4
    };
  }

  // 🚀 NEW: Подвійне препятствие
  private createDoubleObstacle(difficulty: number): PassageConfig {
    const positions = [-1, 0, 1];
    const position = this.rng.pick(positions) ?? 0;
    
    return {
      type: PassageType.DOUBLE_OBSTACLE,
      width: 2,
      position,
      length: this.rng.rangeInt(30, 50),
      difficulty: Math.min(difficulty * 1.4, 1),
      minGap: 12 - difficulty * 4,
      maxGap: 20 - difficulty * 6
    };
  }

  // 🚀 NEW: Потрійний виклик
  private createTripleChallenge(difficulty: number): PassageConfig {
    return {
      type: PassageType.TRIPLE_CHALLENGE,
      width: 3,
      position: 0,
      length: this.rng.rangeInt(35, 60),
      difficulty: Math.min(difficulty * 1.5, 1),
      minGap: 15 - difficulty * 5,
      maxGap: 25 - difficulty * 7
    };
  }

  // 🚀 NEW: Наростаюча складність
  private createEscalating(difficulty: number): PassageConfig {
    return {
      type: PassageType.ESCALATING,
      width: 1,
      position: 0,
      length: this.rng.rangeInt(40, 70),
      difficulty: Math.min(difficulty * 1.6, 1),
      minGap: 10 - difficulty * 3,
      maxGap: 18 - difficulty * 5
    };
  }

  // 🚀 NEW: Хвилеподібний патерн
  private createWavePattern(difficulty: number): PassageConfig {
    return {
      type: PassageType.WAVE_PATTERN,
      width: 2,
      position: 0,
      length: this.rng.rangeInt(45, 90),
      difficulty: Math.min(difficulty * 1.4, 1),
      minGap: 8 - difficulty * 2,
      maxGap: 15 - difficulty * 4
    };
  }

  // 🚀 NEW: Спіральний шлях
  private createSpiralPath(difficulty: number): PassageConfig {
    const position = this.rng.pick([-1, 0, 1]) ?? 0;
    return {
      type: PassageType.SPIRAL_PATH,
      width: 1,
      position,
      length: this.rng.rangeInt(30, 55),
      difficulty: Math.min(difficulty * 1.5, 1),
      minGap: 10 - difficulty * 3,
      maxGap: 18 - difficulty * 5
    };
  }

  // 🚀 NEW: Інтенсивний рух
  private createRushHour(difficulty: number): PassageConfig {
    return {
      type: PassageType.RUSH_HOUR,
      width: 3,
      position: 0,
      length: this.rng.rangeInt(25, 45),
      difficulty: Math.min(difficulty * 1.7, 1),
      minGap: 5 - difficulty * 1,
      maxGap: 10 - difficulty * 2
    };
  }

  // 🚀 NEW: Безпечна зона
  private createSanctuary(difficulty: number): PassageConfig {
    return {
      type: PassageType.SANCTUARY,
      width: 5,
      position: 0,
      length: this.rng.rangeInt(20, 40),
      difficulty: Math.max(difficulty * 0.5, 0),
      minGap: 30 - difficulty * 10,
      maxGap: 50 - difficulty * 15
    };
  }

  // Визначення заблокованих смуг на основі проходу
  getBlockedLanes(config: PassageConfig): BlockedLanes {
    const allLanes = [-2, -1, 0, 1, 2];
    const passageStart = config.position - Math.floor(config.width / 2);
    const passageEnd = config.position + Math.ceil(config.width / 2);
    
    const available: number[] = [];
    const blocked: number[] = [];
    
    for (const lane of allLanes) {
      if (lane >= passageStart && lane <= passageEnd) {
        available.push(lane);
      } else {
        blocked.push(lane);
      }
    }
    
    // Рекомендована смуга - центр проходу
    const recommended = [config.position];
    
    return { blocked, available, recommended };
  }

  // Генерація випадкового типу проходу з урахуванням складності
  generateRandomPassage(difficulty: number): PassageConfig {
    // Ймовірності типів проходів залежать від складності
    const passageTypes = this.getWeightedPassageTypes(difficulty);
    const type = this.rng.pick(passageTypes);
    
    return this.getPassageConfig(type, difficulty);
  }

  // Вагові типи проходів для різних складностей
  private getWeightedPassageTypes(difficulty: number): PassageType[] {
    const types: { type: PassageType; weight: number }[] = [
      // Базові проходи - частіше на початку
      { type: PassageType.LEFT_PASSAGE, weight: 1.0 - difficulty * 0.3 },
      { type: PassageType.RIGHT_PASSAGE, weight: 1.0 - difficulty * 0.3 },
      { type: PassageType.CENTER_PASSAGE, weight: 1.2 - difficulty * 0.4 },
      
      // Середня складність
      { type: PassageType.NARROW_CORRIDOR, weight: 0.3 + difficulty * 0.5 },
      { type: PassageType.SLALOM, weight: 0.4 + difficulty * 0.4 },
      { type: PassageType.ZIGZAG, weight: 0.3 + difficulty * 0.5 },
      
      // Висока складність
      { type: PassageType.TUNNEL, weight: difficulty * 0.6 },
      { type: PassageType.BRIDGE, weight: difficulty * 0.4 },
      { type: PassageType.SPLIT_PATH, weight: 0.2 + difficulty * 0.3 },
      { type: PassageType.MERGE_PATH, weight: 0.2 + difficulty * 0.3 },
      { type: PassageType.CHOICE_PATH, weight: 0.3 + difficulty * 0.4 },
    ];
    
    // Фільтруємо за вагою
    const result: PassageType[] = [];
    for (const { type, weight } of types) {
      if (weight > 0) {
        const count = Math.max(1, Math.floor(weight * 5));
        for (let i = 0; i < count; i++) {
          result.push(type);
        }
      }
    }
    
    return result.length > 0 ? result : [PassageType.CENTER_PASSAGE];
  }

  // Перевірка фізичної прохідності проходу
  isPassable(config: PassageConfig): boolean {
    // Мінімальна ширина проходу - 1 смуга
    if (config.width < 1) return false;
    
    // Мінімальна довжина
    if (config.length < 10) return false;
    
    // Максимальна складність
    if (config.difficulty > 1) return false;
    
    // Прохід повинен бути в межах смуг
    const halfWidth = Math.floor(config.width / 2);
    if (config.position - halfWidth < LANE_RANGE.min || 
        config.position + halfWidth > LANE_RANGE.max) {
      return false;
    }
    
    return true;
  }

  // Отримання позицій препятствий для блокування проходу
  getObstaclePositions(config: PassageConfig): { lane: number; zOffset: number }[] {
    const blocked = this.getBlockedLanes(config);
    const obstacles: { lane: number; zOffset: number }[] = [];
    
    // Розміщуємо препятствия на заблокованих смугах
    const spacing = this.rng.range(config.minGap, config.maxGap);
    const obstacleCount = Math.ceil(config.length / spacing);
    
    for (let i = 0; i < obstacleCount; i++) {
      const lane = this.rng.pick(blocked.blocked);
      const zOffset = (i + 1) * spacing;
      
      if (zOffset < config.length) {
        obstacles.push({ lane, zOffset });
      }
    }
    
    return obstacles;
  }
}

export default PassageGenerator;