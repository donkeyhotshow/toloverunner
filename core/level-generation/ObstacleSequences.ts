/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ObstacleSequences - Система послідовностей препятствий
 * Створює цікаві послідовності: 3 прыжка підряд, ряди шипів, слалом
 */

import { SeededRNG } from './LevelSeedSystem';
import { ExtendedObstacleType, LevelObstacle, getObstacleConfig } from './LevelObjectTypes';
import { PassageType, PassageGenerator, PassageConfig } from './PassageTypes';

// === ТИПИ ПОСЛІДОВНОСТЕЙ ===

export enum SequenceType {
  // Базові послідовності
  JUMP_SERIES = 'JUMP_SERIES',           // Серія прыжків
  SLIDE_SERIES = 'SLIDE_SERIES',         // Серія слайдів
  DODGE_SERIES = 'DODGE_SERIES',         // Серія ухилянь
  
  // Комбіновані
  JUMP_SLIDE_COMBO = 'JUMP_SLIDE_COMBO', // Прыжок + слайд
  SLALOM_OBSTACLES = 'SLALOM_OBSTACLES', // Слалом між препятствиями
  SPIKE_ROW = 'SPIKE_ROW',               // Ряд шипів
  WALL_CHAIN = 'WALL_CHAIN',             // Ланцюжок стін
  
  // Спеціалізовані
  GAUNTLET = 'GAUNTLET',                 // Випробування
  RHYTHM_JUMPS = 'RHYTHM_JUMPS',         // Ритмічні прыжки
  SPEED_DODGE = 'SPEED_DODGE',           // Швидкі ухиляння
  PRECISION_GAP = 'PRECISION_GAP',       // Точні проходи

  // 🐛 GDD v2.2.0: Biologic Patterns
  BIOLOGIC_ZIGZAG = 'BIOLOGIC_ZIGZAG',   // Зигзаг з бактерій
  WORM_TUNNEL = 'WORM_TUNNEL',           // Тунель з глистів
  IMMUNE_WAVE = 'IMMUNE_WAVE',           // Хвиля імунних клітин
}

// Конфігурація послідовності
export interface SequenceConfig {
  type: SequenceType;
  length: number;
  obstacleCount: number;
  difficulty: number;
  spacing: number;           // Відстань між препятствиями
  laneDistribution: number[]; // Смуги для препятствий
  actionRequired: ('jump' | 'slide' | 'dodge')[];
}

// Результат генерації послідовності
export interface SequenceResult {
  obstacles: LevelObstacle[];
  passageConfig?: PassageConfig;
  description: string;
  actionRequired: ('jump' | 'slide' | 'dodge')[];
}

// === ГЕНЕРАТОР ПОСЛІДОВНОСТЕЙ ===

export class ObstacleSequenceGenerator {
  private rng: SeededRNG;
  private passageGenerator: PassageGenerator;

  constructor(rng: SeededRNG) {
    this.rng = rng;
    this.passageGenerator = new PassageGenerator(rng);
  }

  /**
   * Update RNG reference without creating new instance
   */
  setRNG(rng: SeededRNG): void {
    this.rng = rng;
    this.passageGenerator.setRNG(rng);
  }

  // Генерує випадкову послідовність
  generateRandomSequence(difficulty: number, length: number): SequenceResult {
    const types = this.getWeightedSequenceTypes(difficulty);
    const type = this.rng.pick(types);
    
    return this.generateSequence(type, difficulty, length);
  }

  // Генерація конкретної послідовності
  generateSequence(type: SequenceType, difficulty: number, length: number): SequenceResult {
    switch (type) {
      case SequenceType.JUMP_SERIES:
        return this.generateJumpSeries(difficulty, length);
      case SequenceType.SLIDE_SERIES:
        return this.generateSlideSeries(difficulty, length);
      case SequenceType.DODGE_SERIES:
        return this.generateDodgeSeries(difficulty, length);
      case SequenceType.JUMP_SLIDE_COMBO:
        return this.generateJumpSlideCombo(difficulty, length);
      case SequenceType.SLALOM_OBSTACLES:
        return this.generateSlalom(difficulty, length);
      case SequenceType.SPIKE_ROW:
        return this.generateSpikeRow(difficulty, length);
      case SequenceType.WALL_CHAIN:
        return this.generateWallChain(difficulty, length);
      case SequenceType.GAUNTLET:
        return this.generateGauntlet(difficulty, length);
      case SequenceType.RHYTHM_JUMPS:
        return this.generateRhythmJumps(difficulty, length);
      case SequenceType.SPEED_DODGE:
        return this.generateSpeedDodge(difficulty, length);
      case SequenceType.PRECISION_GAP:
        return this.generatePrecisionGap(difficulty, length);
      case SequenceType.BIOLOGIC_ZIGZAG:
        return this.generateBiologicZigzag(difficulty, length);
      case SequenceType.WORM_TUNNEL:
        return this.generateWormTunnel(difficulty, length);
      case SequenceType.IMMUNE_WAVE:
        return this.generateImmuneWave(difficulty, length);
      default:
        return this.generateJumpSeries(difficulty, length);
    }
  }

  // === КОНКРЕТНІ ПОСЛІДОВНОСТІ ===

  // 3+ прыжка підряд по центру
  private generateJumpSeries(difficulty: number, length: number): SequenceResult {
    const count = this.rng.rangeInt(3, Math.floor(3 + difficulty * 4)); // 3-7 прыжків
    const spacing = 8 - difficulty * 2; // Зменшуємо відстань з складністю
    const lane = this.rng.pick([-1, 0, 1]); // Центральні смуги
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.JUMP_ONLY,
        lane,
        zOffset
      ));
      actions.push('jump');
    }
    
    return {
      obstacles,
      description: `Серія з ${count} прыжків на смузі ${lane}`,
      actionRequired: actions
    };
  }

  // Серія слайдів
  private generateSlideSeries(difficulty: number, length: number): SequenceResult {
    const count = this.rng.rangeInt(2, Math.floor(2 + difficulty * 3));
    const spacing = 10 - difficulty * 2;
    const lanes = [-2, -1, 0, 1, 2];
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    // Різні смуги для кожного слайду
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      const lane = this.rng.pick(lanes);
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.SLIDE_ONLY,
        lane,
        zOffset
      ));
      actions.push('slide');
    }
    
    return {
      obstacles,
      description: `Серія з ${count} слайдів`,
      actionRequired: actions
    };
  }

  // Серія ухилянь (високі стіни)
  private generateDodgeSeries(difficulty: number, length: number): SequenceResult {
    const count = this.rng.rangeInt(3, Math.floor(3 + difficulty * 3));
    const spacing = 12 - difficulty * 3;
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      // Змінюємо смугу кожного разу
      const lane = i % 2 === 0 ? -1 : 1;
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.DODGE_ONLY,
        lane,
        zOffset
      ));
      actions.push('dodge');
    }
    
    return {
      obstacles,
      description: `Серія з ${count} ухилянь`,
      actionRequired: actions
    };
  }

  // Комбо прыжок + слайд
  private generateJumpSlideCombo(_difficulty: number, length: number): SequenceResult {
    const count = Math.floor(length / 15);
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    const lane = 0;
    
    for (let i = 0; i < count; i++) {
      const zOffset = (i * 2 + 1) * 7;
      if (zOffset > length) break;
      
      // Чергуємо прыжок і слайд
      if (i % 2 === 0) {
        obstacles.push(this.createObstacle(
          ExtendedObstacleType.JUMP_ONLY,
          lane,
          zOffset
        ));
        actions.push('jump');
      } else {
        obstacles.push(this.createObstacle(
          ExtendedObstacleType.SLIDE_ONLY,
          lane,
          zOffset
        ));
        actions.push('slide');
      }
    }
    
    return {
      obstacles,
      description: `Комбо прыжок-слайд: ${Math.floor(count / 2)} разів`,
      actionRequired: actions
    };
  }

  // Слалом між препятствиями
  private generateSlalom(difficulty: number, length: number): SequenceResult {
    const passageConfig = this.passageGenerator.generateRandomPassage(difficulty);
    const blocked = this.passageGenerator.getBlockedLanes(passageConfig);
    
    const spacing = passageConfig.minGap;
    const count = Math.floor(length / spacing);
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    // Розміщуємо препятствия на заблокованих смугах
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      const lane = this.rng.pick(blocked.blocked);
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.DODGE_ONLY,
        lane,
        zOffset
      ));
      actions.push('dodge');
    }
    
    return {
      obstacles,
      passageConfig,
      description: `Слалом через ${count} препятствий`,
      actionRequired: actions
    };
  }

  // Ряд шипів
  private generateSpikeRow(difficulty: number, length: number): SequenceResult {
    const rows = this.rng.rangeInt(2, Math.floor(2 + difficulty * 3));
    const spacing = 6 - difficulty; // Шипи ближче один до одного
    const lane = 0; // Центр
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let i = 0; i < rows; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.SPIKES,
        lane,
        zOffset
      ));
      actions.push('jump');
    }
    
    return {
      obstacles,
      description: `Ряд з ${rows} шипів`,
      actionRequired: actions
    };
  }

  // Ланцюжок стін
  private generateWallChain(difficulty: number, length: number): SequenceResult {
    const walls = this.rng.rangeInt(2, Math.floor(2 + difficulty * 2));
    const spacing = 15 - difficulty * 3;
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let i = 0; i < walls; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      // Блокуємо 2-3 смуги, залишаючи 1-2 проходи
      const blockedLanes = this.rng.shuffle([-2, -1, 0, 1, 2]).slice(0, 3);
      
      for (const lane of blockedLanes) {
        obstacles.push(this.createObstacle(
          ExtendedObstacleType.DODGE_ONLY,
          lane,
          zOffset
        ));
      }
      actions.push('dodge');
    }
    
    return {
      obstacles,
      description: `Ланцюжок з ${walls} стін`,
      actionRequired: actions
    };
  }

  // Випробування - складна комбінація
  private generateGauntlet(difficulty: number, length: number): SequenceResult {
    const sections = 3;
    const sectionLength = length / sections;
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let s = 0; s < sections; s++) {
      const startZ = s * sectionLength;
      const type = this.rng.pick([
        SequenceType.JUMP_SERIES,
        SequenceType.SLIDE_SERIES,
        SequenceType.SPIKE_ROW
      ]);
      
      const result = this.generateSequence(type, Math.min(difficulty + 0.2, 1), sectionLength);
      // Зміщуємо z-координати
      for (const obs of result.obstacles) {
        obs.position.z += startZ;
        obstacles.push(obs);
      }
      actions.push(...result.actionRequired);
    }
    
    return {
      obstacles,
      description: 'Випробування з 3 секцій',
      actionRequired: actions
    };
  }

  // Ритмічні прыжки
  private generateRhythmJumps(_difficulty: number, length: number): SequenceResult {
    const rhythm = this.rng.rangeInt(2, 4); // 2-4 удари ритму
    const spacing = 5; // Фіксований інтервал
    const lane = 0;
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    let count = 0;
    
    // Створюємо ритмічний патерн
    for (let z = spacing; z < length; z += spacing) {
      if (count % rhythm !== 0) {
        // Прыжок на сильну долю
        obstacles.push(this.createObstacle(
          ExtendedObstacleType.JUMP_ONLY,
          lane,
          z
        ));
        actions.push('jump');
      }
      count++;
    }
    
    return {
      obstacles,
      description: `Ритмічні прыжки з ритмом ${rhythm}`,
      actionRequired: actions
    };
  }

  // Швидкі ухиляння
  private generateSpeedDodge(difficulty: number, length: number): SequenceResult {
    const count = this.rng.rangeInt(4, Math.floor(4 + difficulty * 5));
    const spacing = 6 - difficulty * 2; // Дуже швидко
    
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      // Швидка зміна смуг
      const lane = i % 2 === 0 ? -2 : 2;
      obstacles.push(this.createObstacle(
        ExtendedObstacleType.DODGE_ONLY,
        lane,
        zOffset
      ));
      actions.push('dodge');
    }
    
    return {
      obstacles,
      description: `Швидкі ухиляння: ${count} разів`,
      actionRequired: actions
    };
  }

  // Точні проходи
  private generatePrecisionGap(difficulty: number, length: number): SequenceResult {
    const passageConfig = this.passageGenerator.getPassageConfig(
      PassageType.NARROW_CORRIDOR,
      difficulty
    );
    
    const spacing = passageConfig.minGap;
    const count = Math.floor(length / spacing);
    const obstacles: LevelObstacle[] = [];
    const actions: ('jump' | 'slide' | 'dodge')[] = [];
    const blocked = this.passageGenerator.getBlockedLanes(passageConfig);
    
    for (let i = 0; i < count; i++) {
      const zOffset = (i + 1) * spacing;
      if (zOffset > length) break;
      
      // Препятствия з обох боків вузького проходу
      for (const lane of blocked.blocked) {
        obstacles.push(this.createObstacle(
          ExtendedObstacleType.DODGE_ONLY,
          lane,
          zOffset
        ));
      }
      actions.push('dodge');
    }
    
    return {
      obstacles,
      passageConfig,
      description: `Точні проходи: ${count} вузьких місць`,
      actionRequired: actions
    };
  }

  // 🐛 GDD v2.2.0: Паттерн А (Зигзаг)
  private generateBiologicZigzag(difficulty: number, length: number): SequenceResult {
    const spacing = 12 - difficulty * 4;
    const count = Math.floor(length / spacing);
    const obstacles: LevelObstacle[] = [];
    
    for (let i = 0; i < count; i++) {
        const zOffset = (i + 1) * spacing;
        if (zOffset > length) break;
        
        // Шахматка: чергуємо смуги -1 та 1
        const lane = i % 2 === 0 ? -1 : 1;
        obstacles.push(this.createObstacle(
            ExtendedObstacleType.BACTERIA_BLOCKER,
            lane,
            zOffset
        ));
    }
    
    return {
        obstacles,
        description: "Біологічний зигзаг (Бактерії)",
        actionRequired: new Array(count).fill('dodge') as ('jump' | 'slide' | 'dodge')[]
    };
  }

  // 🐛 GDD v2.2.0: Паттерн Б (Тунель з Глистів)
  private generateWormTunnel(_difficulty: number, length: number): SequenceResult {
    const obstacles: LevelObstacle[] = [];
    const mainLane = this.rng.pick([-1, 0, 1]); // Вільна смуга в центрі
    
    // Глисти по боках (як вагони потяга)
    const leftLane = mainLane - 1;
    const rightLane = mainLane + 1;
    
    if (leftLane >= -2) {
        obstacles.push(this.createObstacle(ExtendedObstacleType.GLOBUS_WORM, leftLane, length / 2));
    }
    if (rightLane <= 2) {
        obstacles.push(this.createObstacle(ExtendedObstacleType.GLOBUS_WORM, rightLane, length / 2));
    }
    
    return {
        obstacles,
        description: `Тунель з глистів (вільна смуга ${mainLane})`,
        actionRequired: ['jump']
    };
  }

  // 🐛 GDD v2.2.0: Паттерн Д (Імунна Хвиля)
  private generateImmuneWave(difficulty: number, length: number): SequenceResult {
    const obstacles: LevelObstacle[] = [];
    const count = 3 + Math.floor(difficulty * 3);
    const spacing = length / count;
    
    for (let i = 0; i < count; i++) {
        const z = (i + 0.5) * spacing;
        const type = this.rng.chance(0.5) ? ExtendedObstacleType.VIRUS_KILLER : ExtendedObstacleType.IMMUNE_CELL;
        const lane = this.rng.rangeInt(-2, 2);
        
        obstacles.push(this.createObstacle(type, lane, z));
    }
    
    return {
        obstacles,
        description: "Імунна хвиля (Віруси та Клітини)",
        actionRequired: new Array(count).fill('dodge') as ('jump' | 'slide' | 'dodge')[]
    };
  }

  // === ДОПОМІЖНІ МЕТОДИ ===

  private createObstacle(
    type: ExtendedObstacleType,
    lane: number,
    zOffset: number
  ): LevelObstacle {
    const config = getObstacleConfig(type);
    const LANE_WIDTH = 2;
    
    return {
      id: `obs_${type}_${lane}_${zOffset}`,
      type: 'obstacle',
      obstacleType: type,
      position: {
        x: lane * LANE_WIDTH,
        y: (config.height || 1) / 2,
        z: -zOffset // Від'ємний Z для напрямку руху
      },
      width: config.width || 1,
      height: config.height || 1,
      depth: config.depth || 1,
      requiredAction: config.requiredAction || 'jump',
      damage: config.damage !== undefined ? config.damage : 1,
      color: config.color,
      active: true,
      properties: {
        isBreakable: (config as { isBreakable?: boolean }).isBreakable,
        durability: (config as { durability?: number }).durability
      }
    };
  }

  // Вагові типи послідовностей для різних складностей
  private getWeightedSequenceTypes(difficulty: number): SequenceType[] {
    const types: { type: SequenceType; weight: number }[] = [
      { type: SequenceType.JUMP_SERIES, weight: 1.2 - difficulty * 0.3 },
      { type: SequenceType.SLIDE_SERIES, weight: 0.8 - difficulty * 0.2 },
      { type: SequenceType.DODGE_SERIES, weight: 0.8 - difficulty * 0.2 },
      { type: SequenceType.JUMP_SLIDE_COMBO, weight: 0.6 + difficulty * 0.3 },
      { type: SequenceType.SLALOM_OBSTACLES, weight: 0.5 + difficulty * 0.5 },
      { type: SequenceType.SPIKE_ROW, weight: 0.4 + difficulty * 0.4 },
      { type: SequenceType.WALL_CHAIN, weight: 0.3 + difficulty * 0.5 },
      { type: SequenceType.GAUNTLET, weight: difficulty * 0.8 },
      { type: SequenceType.RHYTHM_JUMPS, weight: 0.3 + difficulty * 0.3 },
      { type: SequenceType.SPEED_DODGE, weight: difficulty * 0.6 },
      { type: SequenceType.PRECISION_GAP, weight: difficulty * 0.5 },
      { type: SequenceType.BIOLOGIC_ZIGZAG, weight: 0.7 + difficulty * 0.3 },
      { type: SequenceType.WORM_TUNNEL, weight: 0.5 + difficulty * 0.5 },
      { type: SequenceType.IMMUNE_WAVE, weight: difficulty * 0.8 },
    ];
    
    const result: SequenceType[] = [];
    for (const { type, weight } of types) {
      if (weight > 0) {
        const count = Math.max(1, Math.floor(weight * 5));
        for (let i = 0; i < count; i++) {
          result.push(type);
        }
      }
    }
    
    return result.length > 0 ? result : [SequenceType.JUMP_SERIES];
  }
}

export default ObstacleSequenceGenerator;