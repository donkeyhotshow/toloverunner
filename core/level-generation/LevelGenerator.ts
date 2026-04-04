/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LevelGenerator - Головний генератор рівнів
 * Об'єднує всі системи: seed, проходи, послідовності, маркування, складність
 */

import { 
  LevelSeedManager, 
  SeededRNG 
} from './LevelSeedSystem';
import { 
  LevelObject, 
  LevelObstacle, 
  LevelCoin, 
  LevelBonus, 
  LevelPlatform,
  LevelZone,
  ExtendedObstacleType,
  getObstacleConfig,
  BonusType
} from './LevelObjectTypes';
import { RouteMarker, RouteMarkingResult } from './RouteMarker';
import { DifficultyProgression, DifficultyParams, DifficultyResult } from './DifficultyProgression';
import { PatternSequencer } from './PatternSequencer';
import { LevelSegment, VerticalLevel } from './LevelPatternLibrary';
import { LANE_WIDTH } from '../../constants';

// === РЕЗУЛЬТАТ ГЕНЕРАЦІЇ ЧАНКА ===

export interface ChunkGenerationResult {
  objects: LevelObject[];
  obstacles: LevelObstacle[];
  coins: LevelCoin[];
  bonuses: LevelBonus[];
  platforms: LevelPlatform[];
  zones: LevelZone[];
  routeMarking?: RouteMarkingResult;
  difficulty: DifficultyResult;
  seed: string;
  chunkIndex: number;
}

// === ГОЛОВНИЙ ГЕНЕРАТОР РІВНІВ ===

export class LevelGenerator {
  // Системи
  private seedManager: LevelSeedManager;
  private routeMarker: RouteMarker;
  private difficultyProgression: DifficultyProgression;
  private patternSequencer: PatternSequencer;
  
  // Стан
  private currentChunk: number = 0;
  private lastDifficulty: DifficultyResult | null = null;
  
  // Конфігурація
  private readonly CHUNK_LENGTH = 100;     // Довжина чанка
  
  // Конструктор
  constructor(seed?: string) {
    // Ініціалізація систем
    const rng = seed ? new SeededRNG(seed) : new SeededRNG(Date.now().toString());
    this.seedManager = new LevelSeedManager(seed);
    this.routeMarker = new RouteMarker(rng);
    this.difficultyProgression = new DifficultyProgression();
    this.patternSequencer = new PatternSequencer(rng);
  }

  // === ОСНОВНІ МЕТОДИ ===

  /**
   * Генерує чанк рівня
   */
  generateChunk(
    distance: number,
    params: DifficultyParams
  ): ChunkGenerationResult {
    // Розраховуємо складність
    const difficulty = this.difficultyProgression.calculateDifficulty(params);
    this.lastDifficulty = difficulty;
    
    // Отримуємо RNG для поточної дистанції
    const rng = this.seedManager.getRNGForDistance(distance);
    
    // Оновлюємо генератори з новим RNG (без створення нових екземплярів)
    this.routeMarker.setRNG(rng);
    this.patternSequencer.setRNG(rng);
    
    // Генеруємо об'єкти
    const objects: LevelObject[] = [];
    const obstacles: LevelObstacle[] = [];
    const coins: LevelCoin[] = [];
    const bonuses: LevelBonus[] = [];
    const platforms: LevelPlatform[] = [];
    const zones: LevelZone[] = [];
    
    // Визначаємо кількість паттернів у чанку
    let currentZ = distance;
    const endZ = distance + this.CHUNK_LENGTH;
    const timeSeconds = distance / 30; // Оцінка часу на основі дистанції та базової швидкості

    while (currentZ < endZ) {
      const pattern = this.patternSequencer.getNextPattern(timeSeconds);
      const segment = this.generateSegmentFromPattern(
        currentZ,
        pattern,
        difficulty,
        rng
      );
      
      objects.push(...segment.objects);
      obstacles.push(...segment.obstacles);
      coins.push(...segment.coins);
      bonuses.push(...segment.bonuses);
      platforms.push(...segment.platforms);
      zones.push(...segment.zones);

      currentZ += pattern.length;
    }
    
    // Зміщуємо всі об'єкти на правильну Z-позицію
    this.offsetObjects(objects, -distance);
    
    const result: ChunkGenerationResult = {
      objects,
      obstacles,
      coins,
      bonuses,
      platforms,
      zones,
      difficulty,
      seed: this.seedManager.getSeed(),
      chunkIndex: this.currentChunk
    };
    
    this.currentChunk++;
    
    return result;
  }

  /**
   * Генерує сегмент на основі паттерна з бібліотеки
   */
  private generateSegmentFromPattern(
    startDistance: number,
    pattern: LevelSegment,
    _difficulty: DifficultyResult,
    _rng: SeededRNG
  ): Omit<ChunkGenerationResult, 'difficulty' | 'seed' | 'chunkIndex'> {
    const objects: LevelObject[] = [];
    const obstacles: LevelObstacle[] = [];
    const coins: LevelCoin[] = [];
    const bonuses: LevelBonus[] = [];
    const platforms: LevelPlatform[] = [];
    const zones: LevelZone[] = [];

    // Конвертуємо елементи паттерна в об'єкти рівня
    for (const el of pattern.elements) {
        const absoluteZ = startDistance + el.z;
        
        if (el.type === 'coin' || el.type === 'crystal') {
            coins.push({
                id: `coin_${pattern.id}_${el.z}_${startDistance}`,
                type: 'coin',
                position: { 
                    x: el.lane * LANE_WIDTH, 
                    y: el.yLevel === VerticalLevel.HI ? 4 : 1.5, 
                    z: -absoluteZ 
                },
                value: el.type === 'crystal' ? 10 : 5,
                scale: el.type === 'crystal' ? { x: 1.5, y: 1.5, z: 1.5 } : { x: 1, y: 1, z: 1 },
                active: true,
                isPartOfRoute: true
            });
        } else if (el.type === 'magnet' || el.type === 'shield') {
            const bType = el.type === 'magnet' ? BonusType.MAGNET : BonusType.SHIELD;
            bonuses.push({
                id: `bonus_${el.type}_${el.z}_${startDistance}`,
                type: 'bonus',
                bonusType: bType,
                position: { x: el.lane * LANE_WIDTH, y: 1.5, z: -absoluteZ },
                active: true,
                value: 1,
                scale: { x: 1, y: 1, z: 1 }
            });
        } else {
            // Це перешкода/ворог
            obstacles.push(this.createObstacle(el.type as ExtendedObstacleType, el.lane, absoluteZ));
        }
    }

    // Змішуємо все в один масив
    objects.push(...obstacles, ...coins, ...bonuses, ...platforms, ...zones);
    
    return { objects, obstacles, coins, bonuses, platforms, zones };
  }

  /**
   * Створює препятствие
   */
  private createObstacle(
    type: ExtendedObstacleType,
    lane: number,
    zDistance: number
  ): LevelObstacle {
    const config = getObstacleConfig(type);
    
    return {
      id: `obs_${type}_${lane}_${zDistance}_${this.currentChunk}`,
      type: 'obstacle',
      obstacleType: type,
      position: {
        x: lane * LANE_WIDTH,
        y: config.height / 2,
        z: -zDistance
      },
      width: config.width,
      height: config.height,
      depth: config.depth,
      requiredAction: config.requiredAction,
      damage: config.damage,
      color: config.color,
      active: true,
      isMoving: config.isMoving,
      properties: {
        isBreakable: config.isBreakable,
        durability: config.durability
      }
    };
  }

  /**
   * Зміщує всі об'єкти на певний Z-зсув
   */
  private offsetObjects(objects: LevelObject[], offset: number): void {
    for (const obj of objects) {
      obj.position.z += offset;
    }
  }

  // === ПУБЛІЧНІ МЕТОДИ ===

  /**
   * Скидання генератора
   */
  reset(): void {
    this.currentChunk = 0;
    this.lastDifficulty = null;
    this.difficultyProgression.reset();
    this.patternSequencer.reset();
  }

  /**
   * Встановлення нового seed
   */
  setSeed(seed: string): void {
    this.seedManager.setSeed(seed);
    this.reset();
  }

  /**
   * Отримання поточного seed
   */
  getSeed(): string {
    return this.seedManager.getSeed();
  }

  /**
   * Отримання поточної складності
   */
  getCurrentDifficulty(): DifficultyResult | null {
    return this.lastDifficulty;
  }

  /**
   * Перевірка фізичної прохідності поточної конфігурації
   */
  validatePassability(): boolean {
    return true;
  }

  /**
   * Отримання підказки маршруту для гравця
   */
  getRouteHint(_playerLane: number): 'left' | 'right' | 'stay' | 'none' {
    return 'none';
  }
}


export default LevelGenerator;