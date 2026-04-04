/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RouteMarker - Система маркування оптимального маршруту
 * Правильний шлях завжди позначений цепочкою монет
 */

import { SeededRNG } from './LevelSeedSystem';
import { LevelCoin, LevelBonus, BonusType, DEFAULT_BONUS_CONFIG } from './LevelObjectTypes';
import { PassageConfig, PassageGenerator } from './PassageTypes';
import { SequenceResult, ObstacleSequenceGenerator } from './ObstacleSequences';

// Конфігурація маршруту
export interface RouteConfig {
  passageConfig: PassageConfig;
  sequenceResult?: SequenceResult;
  isOptimal: boolean;
  routeId: string;
}

// Результат маркування
export interface RouteMarkingResult {
  coins: LevelCoin[];
  bonuses: LevelBonus[];
  optimalLanes: number[];
  dangerZones: { lane: number; zStart: number; zEnd: number }[];
}

// === СИСТЕМА МАРКУВАННЯ МАРШРУТУ ===

export class RouteMarker {
  private rng: SeededRNG;
  private passageGenerator: PassageGenerator;
  private sequenceGenerator: ObstacleSequenceGenerator;
  private routeCounter: number = 0;

  constructor(rng: SeededRNG) {
    this.rng = rng;
    this.passageGenerator = new PassageGenerator(rng);
    this.sequenceGenerator = new ObstacleSequenceGenerator(rng);
  }

  /**
   * Update RNG reference without creating new instances
   */
  setRNG(rng: SeededRNG): void {
    this.rng = rng;
    this.passageGenerator.setRNG(rng);
    this.sequenceGenerator.setRNG(rng);
  }

  resetRouteCounter(): void {
    this.routeCounter = 0;
  }

  // Генерує маркування для проходу
  markRoute(passageConfig: PassageConfig, sequenceResult?: SequenceResult): RouteMarkingResult {
    const blocked = this.passageGenerator.getBlockedLanes(passageConfig);
    
    // МОНЕТИ - позначають оптимальний маршрут
    const coins = this.generateRouteCoins(passageConfig, blocked.available);
    
    // БОНУСИ - додаткові нагороди на маршруті
    const bonuses = this.generateRouteBonuses(passageConfig, blocked.available);
    
    // ОПТИМАЛЬНІ СМУГИ
    const optimalLanes = blocked.recommended;
    
    // НЕБЕЗПЕЧНІ ЗОНИ
    const dangerZones = this.generateDangerZones(sequenceResult);
    
    return { coins, bonuses, optimalLanes, dangerZones };
  }

  // Генерує ланцюжок монет для оптимального маршруту
  private generateRouteCoins(
    passageConfig: PassageConfig,
    availableLanes: number[]
  ): LevelCoin[] {
    const coins: LevelCoin[] = [];
    const centerLane = passageConfig.position;
    const patternType = this.rng.pick(['line', 'wave', 'arrow', 'column']);
    
    switch (patternType) {
        case 'wave':
            coins.push(...this.generateWavePattern(passageConfig, centerLane));
            break;
        case 'arrow':
            coins.push(...this.generateArrowPattern(passageConfig, centerLane));
            break;
        case 'column':
            coins.push(...this.generateColumnPattern(passageConfig, centerLane));
            break;
        default:
            coins.push(...this.generateLinePattern(passageConfig, centerLane));
    }
    
    // Додаткові напрямні монети на сусідніх смугах для заповнення
    if (passageConfig.width >= 2) {
        const sideLane = centerLane + (this.rng.chance(0.5) ? 1 : -1);
        if (availableLanes.includes(sideLane)) {
            coins.push(...this.generateRainPattern(passageConfig, sideLane));
        }
    }
    
    return coins;
  }

  // паттерн: Лінія
  private generateLinePattern(config: PassageConfig, lane: number): LevelCoin[] {
    const coins: LevelCoin[] = [];
    const spacing = 3;
    const count = Math.floor(config.length / spacing);
    for (let i = 0; i < count; i++) {
        coins.push(this.createRouteCoin(lane, (i + 1) * spacing, true, `line_${this.routeCounter}`));
    }
    return coins;
  }

  // паттерн: Хвиля
  private generateWavePattern(config: PassageConfig, centerLane: number): LevelCoin[] {
    const coins: LevelCoin[] = [];
    const spacing = 2;
    const count = Math.floor(config.length / spacing);
    for (let i = 0; i < count; i++) {
        const z = (i + 1) * spacing;
        const offset = Math.sin(i * 0.5) * (config.width / 2);
        const lane = Math.round(centerLane + offset);
        coins.push(this.createRouteCoin(lane, z, true, `wave_${this.routeCounter}`));
    }
    return coins;
  }

  // паттерн: Стрілка
  private generateArrowPattern(config: PassageConfig, lane: number): LevelCoin[] {
    const coins: LevelCoin[] = [];
    const zBase = config.length / 2;
    // Стрілка вказує вперед
    coins.push(this.createRouteCoin(lane, zBase, true, 'arrow'));
    coins.push(this.createRouteCoin(lane - 1, zBase + 2, false, 'arrow'));
    coins.push(this.createRouteCoin(lane + 1, zBase + 2, false, 'arrow'));
    return coins;
  }

  // паттерн: Стовпчик (одна над одною або щільно)
  private generateColumnPattern(config: PassageConfig, lane: number): LevelCoin[] {
    const coins: LevelCoin[] = [];
    const z = config.length / 2;
    for (let i = 0; i < 3; i++) {
        const coin = this.createRouteCoin(lane, z + i * 0.5, true, 'column');
        coin.position.y = 0.8 + i * 0.8;
        coins.push(coin);
    }
    return coins;
  }

  // паттерн: Дощ (випадково розкидані)
  private generateRainPattern(config: PassageConfig, lane: number): LevelCoin[] {
    const coins: LevelCoin[] = [];
    for (let i = 0; i < 5; i++) {
        const z = this.rng.range(0, config.length);
        coins.push(this.createRouteCoin(lane, z, false, 'rain'));
    }
    return coins;
  }

  // Створює монету маршруту
  private createRouteCoin(
    lane: number,
    zOffset: number,
    isOptimal: boolean,
    routeId: string
  ): LevelCoin {
    const LANE_WIDTH = 2;
    const config = DEFAULT_BONUS_CONFIG[BonusType.COIN];
    
    return {
      id: `coin_route_${routeId}_${lane}_${zOffset}`,
      type: 'coin',
      position: {
        x: lane * LANE_WIDTH,
        y: 0.8, // Стандартна висота монети
        z: -zOffset
      },
      value: 5, // GDD v2.2.0: 1 монета = 5 очок
      isPartOfRoute: isOptimal,
      routeId,
      color: config.color,
      active: true,
      scale: { x: config.scale, y: config.scale, z: config.scale }
    };
  }

  // Генерує бонуси на маршруті
  private generateRouteBonuses(
    passageConfig: PassageConfig,
    availableLanes: number[]
  ): LevelBonus[] {
    const bonuses: LevelBonus[] = [];
    const length = passageConfig.length;
    
    // Ймовірність бонусу на маршруті
    const bonusChance = 0.1 + passageConfig.difficulty * 0.2;
    
    // Розміщуємо бонуси в кінці складних секцій
    const bonusPositions = [
      length * 0.4,
      length * 0.7,
      length
    ];
    
    for (const z of bonusPositions) {
      if (this.rng.chance(bonusChance)) {
        const lane = this.rng.pick(availableLanes);
        const bonusType = this.rng.pick([
          BonusType.GEM,
          BonusType.SHIELD,
          BonusType.MAGNET
        ]);
        
        bonuses.push(this.createBonus(bonusType, lane, z));
      }
    }
    
    return bonuses;
  }

  // Створює бонус
  private createBonus(type: BonusType, lane: number, zOffset: number): LevelBonus {
    const LANE_WIDTH = 2;
    const config = DEFAULT_BONUS_CONFIG[type];
    
    return {
      id: `bonus_${type}_${lane}_${zOffset}`,
      type: 'bonus',
      bonusType: type,
      position: {
        x: lane * LANE_WIDTH,
        y: 1.0,
        z: -zOffset
      },
      value: config.value ?? 10,
      duration: config.duration,
      magnetRadius: config.magnetRadius,
      color: config.color,
      active: true,
      scale: { 
        x: config.scale, 
        y: config.scale, 
        z: config.scale 
      }
    };
  }

  // Генерує небезпечні зони на основі послідовності препятствий
  private generateDangerZones(
    sequenceResult?: SequenceResult
  ): { lane: number; zStart: number; zEnd: number }[] {
    const zones: { lane: number; zStart: number; zEnd: number }[] = [];
    
    if (!sequenceResult) return zones;
    
    // Створюємо зони навколо кожного препятствия
    for (const obstacle of sequenceResult.obstacles) {
      const depth = obstacle.depth || 1;
      
      zones.push({
        lane: Math.round(obstacle.position.x / 2),
        zStart: obstacle.position.z - depth,
        zEnd: obstacle.position.z + depth
      });
    }
    
    return zones;
  }

  // Генерує повний маршрут з проходом і послідовністю
  generateFullRoute(difficulty: number, length: number): {
    route: RouteConfig;
    marking: RouteMarkingResult;
  } {
    this.routeCounter++;
    
    // Генеруємо прохід
    const passageConfig = this.passageGenerator.generateRandomPassage(difficulty);
    passageConfig.length = length;
    
    // Генеруємо послідовність препятствий (30% ймовірність)
    let sequenceResult: SequenceResult | undefined;
    if (this.rng.chance(0.3 + difficulty * 0.3)) {
      sequenceResult = this.sequenceGenerator.generateRandomSequence(difficulty, length);
    }
    
    const route: RouteConfig = {
      passageConfig,
      sequenceResult,
      isOptimal: true,
      routeId: this.routeCounter.toString()
    };
    
    const marking = this.markRoute(passageConfig, sequenceResult);
    
    return { route, marking };
  }

  // Перевіряє, чи є позиція гравця на оптимальному маршруті
  isOnOptimalRoute(
    playerLane: number,
    playerZ: number,
    marking: RouteMarkingResult
  ): boolean {
    // Перевірка чи гравець на оптимальній смузі
    if (!marking.optimalLanes.includes(playerLane)) {
      return false;
    }
    
    // Перевірка чи гравець не в небезпечній зоні
    for (const zone of marking.dangerZones) {
      if (playerLane === zone.lane && 
          playerZ >= zone.zStart && 
          playerZ <= zone.zEnd) {
        return false;
      }
    }
    
    return true;
  }

  // Отримує підказку для гравця (напрямок до оптимального маршруту)
  getRouteHint(
    playerLane: number,
    marking: RouteMarkingResult
  ): 'left' | 'right' | 'stay' | 'none' {
    const optimal = marking.optimalLanes;
    
    if (optimal.length === 0) return 'none';
    
    // Середня оптимальна смуга
    const avgOptimal = optimal.reduce((a, b) => a + b, 0) / optimal.length;
    
    if (playerLane < avgOptimal - 0.5) return 'right';
    if (playerLane > avgOptimal + 0.5) return 'left';
    
    return 'stay';
  }
}

export default RouteMarker;