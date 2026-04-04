/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LevelObjectTypes - Типи об'єктів рівня для генерації
 * Визначає всі об'єкти: монетки, препятствия, платформи, бонуси
 */

import { ObjectType, ObstacleType } from '../../types';

// === РОЗШИРЕНІ ТИПИ ОБ'ЄКТІВ ===

// Базові типи препятствий
export enum ExtendedObstacleType {
  // 🪱 ГЛИСТИ (КЛАС «ГЕЛЬМІНТИ»)
  GLOBUS_VULGARIS = 'GLOBUS_VULGARIS',   // Звичайний
  GLOBUS_IRRITATUS = 'GLOBUS_IRRITATUS', // Злий (вібрує)
  GLOBUS_MAXIMUS = 'GLOBUS_MAXIMUS',     // Boss (2 доріжки)
  VERMIS_ELECTRICUS = 'VERMIS_ELECTRICUS', // Електричний
  VERMIS_OSCILLANS = 'VERMIS_OSCILLANS',   // Зигзаг
  
  // 🦠 БАКТЕРІЇ (КЛАС «ПРОКАРІОТИ»)
  COCCUS_SIMPLEX = 'COCCUS_SIMPLEX',     // Простий кок
  BACILLUS_MAGNUS = 'BACILLUS_MAGNUS',   // Великий (нахиляється)
  STREPTOCOCCUS_CHAIN = 'STREPTOCOCCUS_CHAIN', // Ланцюжок
  BACTERIUM_FELIX = 'BACTERIUM_FELIX',   // Щасливий (вибухає)
  BACTERIUM_SPORE = 'BACTERIUM_SPORE',   // Спора (пастка)
  BACTERIUM_FLAGELLUM = 'BACTERIUM_FLAGELLUM', // З джгутиками
  
  // 🔴 ВІРУСИ (КЛАС «ПАТОГЕНИ»)
  VIRUS_CORONA = 'VIRUS_CORONA',         // Базовий (смерть)
  VIRUS_MOBILIS = 'VIRUS_MOBILIS',       // Рухомий
  VIRUS_GIGANTUS = 'VIRUS_GIGANTUS',     // Гігант (шипи)
  VIRUS_INVISIBLE = 'VIRUS_INVISIBLE',   // Невидимий
  
  // ⚪ ІМУННІ КЛІТИНИ (КЛАС «ЗАХИСНИКИ»)
  LEUKOCYTE_PATROL = 'LEUKOCYTE_PATROL', // Патрульний
  NEUTROPHIL_AGGRESSIVE = 'NEUTROPHIL_AGGRESSIVE', // Агресивний
  MACROPHAGE_GIANT = 'MACROPHAGE_GIANT', // Макрофаг-гігант
  MAST_CELL = 'MAST_CELL',               // Тучна клітина
  
  // 🔵 МЕМБРАНИ (КЛАС «СТРУКТУРИ»)
  MEMBRANA_SIMPLEX = 'MEMBRANA_SIMPLEX', // Проста
  MEMBRANA_GLUTINOSA = 'MEMBRANA_GLUTINOSA', // Клейка
  MEMBRANA_ROTANS = 'MEMBRANA_ROTANS',   // Обертова
  MEMBRANA_OBSCURA = 'MEMBRANA_OBSCURA', // Темна
  
  // Legacy aliases (v2.1/v2.2 docs) — зведені до нових типів
  GLOBUS_WORM = 'GLOBUS_VULGARIS',
  BACTERIA_BLOCKER = 'BACILLUS_MAGNUS',
  VIRUS_KILLER = 'VIRUS_CORONA',
  IMMUNE_CELL = 'LEUKOCYTE_PATROL',
  CELL_MEMBRANE = 'MEMBRANA_SIMPLEX',
  
  // Старі/технічні типи
  JUMP_ONLY = 'JUMP_ONLY',
  DODGE_ONLY = 'DODGE_ONLY',
  SLIDE_ONLY = 'SLIDE_ONLY',
  SPIKES = 'SPIKES',
  MOVING_PLATFORM = 'MOVING_PLATFORM',
  BREAKABLE_BLOCK = 'BREAKABLE_BLOCK',
}

// Типи платформ
export enum PlatformType {
  STANDARD = 'STANDARD',          // Стандартна платформа
  MOVING = 'MOVING',              // Рухома платформа
  BREAKING = 'BREAKING',          // Пластина, що ламається
  BOOSTING = 'BOOSTING',          // Прискорювальна платформа
  ONE_WAY = 'ONE_WAY',           // Одностороння платформа
  SPRING = 'SPRING',             // Пружина
}

// Типи бонусів
export enum BonusType {
  COIN = 'COIN',                 // Монета
  GEM = 'GEM',                   // Драгоцінний камінь
  SHIELD = 'SHIELD',             // Щит
  SPEED_BOOST = 'SPEED_BOOST',   // Прискорення
  MAGNET = 'MAGNET',             // Магніт
  INVINCIBILITY = 'INVINCIBILITY', // Невидимість
  DOUBLE_POINTS = 'DOUBLE_POINTS', // Подвійні бали
  LIFE = 'LIFE',                 // Додаткове життя
  KEY = 'KEY',                   // Ключ
  TOKEN = 'TOKEN',               // Жетон
}

// === ІНТЕРФЕЙСИ ОБ'ЄКТІВ ===

// Базовий інтерфейс для всіх об'єктів рівня
export interface LevelObject {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
  active: boolean;
}

// Препятствие
export interface LevelObstacle extends LevelObject {
  obstacleType: ExtendedObstacleType | ObstacleType;
  width: number;
  height: number;
  depth: number;
  requiredAction?: 'jump' | 'slide' | 'dodge' | 'none';
  damage?: number;
  isMoving?: boolean;
  movePattern?: MovePattern;
  properties?: Record<string, unknown>;
}

// Платформа
export interface LevelPlatform extends LevelObject {
  platformType: PlatformType;
  width: number;
  height: number;
  depth: number;
  isMoving?: boolean;
  movePattern?: MovePattern;
  durability?: number;
  springForce?: number;
  boostMultiplier?: number;
  properties?: Record<string, unknown>;
}

// Бонус
export interface LevelBonus extends LevelObject {
  bonusType: BonusType;
  value: number;
  duration?: number; // Для тимчасових бонусів
  magnetRadius?: number;
  properties?: Record<string, unknown>;
}

// Монета (для маркування маршруту)
export interface LevelCoin extends LevelObject {
  value: number;
  isPartOfRoute: boolean; // Чи є частиною оптимального маршруту
  routeId?: string;
}

// Зона (швидкості, телепортації)
export interface LevelZone extends LevelObject {
  zoneType: 'speed' | 'slow' | 'teleport' | 'jump' | 'slide' | 'damage';
  width: number;
  height: number;
  depth: number;
  effectValue: number;
  targetPosition?: { x: number; y: number; z: number };
  properties?: Record<string, unknown>;
}

// === ПАТЕРНИ РУХУ ===

export interface MovePattern {
  type: 'horizontal' | 'vertical' | 'circular' | 'zigzag' | 'random';
  amplitude: number;     // Амплітуда руху
  frequency: number;     // Частота коливань
  speed: number;         // Швидкість руху
  offset?: number;       // Початковий зсув фази
}

// === КОНФІГУРАЦІЯ ГЕНЕРАЦІЇ ===

export interface ObjectGenerationConfig {
  laneCount: number;
  laneWidth: number;
  minGap: number;        // Мінімальна відстань між об'єктами
  maxGap: number;        // Максимальна відстань між об'єктами
  density: number;       // Щільність об'єктів (0-1)
  allowOverlaps: boolean;
}

// === ФАБРИКИ ОБ'ЄКТІВ ===

/** Один элемент конфігурації препятствия (для типізованого доступу) */
export interface ObstacleConfigEntry {
    width: number;
    height: number;
    depth: number;
    requiredAction?: 'jump' | 'slide' | 'dodge' | 'none';
    damage?: number;
    color: string;
    isMoving?: boolean;
    isBreakable?: boolean;
    durability?: number;
    properties?: Record<string, unknown>;
}

// Конфігурація препятствия за замовчуванням
export const DEFAULT_OBSTACLE_CONFIG: Record<string, ObstacleConfigEntry> = {
  // 🪱 ГЛИСТИ
  [ExtendedObstacleType.GLOBUS_VULGARIS]: {
    width: 2.2, height: 1.5, depth: 8.0, 
    requiredAction: 'jump', damage: 1, color: '#FFB6C1', 
    properties: { displayName: 'Globus Vulgaris', canBeRidden: true }
  },
  [ExtendedObstacleType.GLOBUS_IRRITATUS]: {
    width: 2.4, height: 1.6, depth: 9.0, 
    requiredAction: 'jump', damage: 1, color: '#FF69B4',
    isMoving: true,
    properties: { displayName: 'Globus Irritatus', vibrates: true, leavesAcid: true }
  },
  [ExtendedObstacleType.GLOBUS_MAXIMUS]: {
    width: 4.5, height: 2.0, depth: 12.0, 
    requiredAction: 'jump', damage: 2, color: '#DB7093',
    properties: { displayName: 'Globus Maximus', isBoss: true, lanes: 2 }
  },
  [ExtendedObstacleType.VERMIS_ELECTRICUS]: {
    width: 1.8, height: 1.2, depth: 3.0, 
    requiredAction: 'dodge', damage: 2, color: '#00FFFF',
    properties: { isElectric: true, rewardType: 'MAGNET' }
  },
  [ExtendedObstacleType.VERMIS_OSCILLANS]: {
    width: 1.5, height: 1.2, depth: 6.0, 
    requiredAction: 'dodge', damage: 1, color: '#20B2AA',
    isMoving: true,
    properties: { moveType: 'zigzag' }
  },

  // 🦠 БАКТЕРІЇ
  [ExtendedObstacleType.COCCUS_SIMPLEX]: {
    width: 1.8, height: 1.2, depth: 1.8, 
    requiredAction: 'jump', damage: 1, color: '#7CFC00',
    properties: { hasFace: true }
  },
  [ExtendedObstacleType.BACILLUS_MAGNUS]: {
    width: 2.0, height: 3.0, depth: 2.0, 
    requiredAction: 'dodge', damage: 1, color: '#32CD32',
    properties: { leans: true }
  },
  [ExtendedObstacleType.STREPTOCOCCUS_CHAIN]: {
    width: 1.8, height: 1.2, depth: 10.0, 
    requiredAction: 'jump', damage: 1, color: '#ADFF2F',
    properties: { isChain: true }
  },
  [ExtendedObstacleType.BACTERIUM_FELIX]: {
    width: 1.8, height: 1.2, depth: 1.8, 
    requiredAction: 'jump', damage: 1, color: '#FFD700',
    properties: { explosive: true }
  },
  [ExtendedObstacleType.BACTERIUM_SPORE]: {
    width: 0.5, height: 0.5, depth: 0.5, 
    requiredAction: 'none', damage: 1, color: '#2F4F4F',
    properties: { isTrap: true, visibility: 0.2 }
  },
  [ExtendedObstacleType.BACTERIUM_FLAGELLUM]: {
    width: 2.0, height: 2.0, depth: 2.0, 
    requiredAction: 'jump', damage: 1, color: '#556B2F',
    properties: { hasFlagella: true, canBoost: true }
  },

  // 🔴 ВІРУСИ
  [ExtendedObstacleType.VIRUS_CORONA]: {
    width: 2.0, height: 2.0, depth: 2.0, 
    requiredAction: 'dodge', damage: 9999, color: '#FF0000',
    properties: { isLethal: true, ignoresShield: true }
  },
  [ExtendedObstacleType.VIRUS_MOBILIS]: {
    width: 2.0, height: 2.0, depth: 2.0, 
    requiredAction: 'dodge', damage: 9999, color: '#FF4500',
    isMoving: true,
    properties: { isLethal: true, toxicTrail: true }
  },
  [ExtendedObstacleType.VIRUS_GIGANTUS]: {
    width: 4.0, height: 4.0, depth: 4.0, 
    requiredAction: 'dodge', damage: 9999, color: '#8B0000',
    properties: { isLethal: true, rotatingSpines: true }
  },
  [ExtendedObstacleType.VIRUS_INVISIBLE]: {
    width: 2.0, height: 2.0, depth: 2.0, 
    requiredAction: 'dodge', damage: 9999, color: '#4B0082',
    properties: { isLethal: true, isInvisible: true }
  },

  // ⚪ ІМУННІ КЛІТИНИ
  [ExtendedObstacleType.LEUKOCYTE_PATROL]: {
    width: 2.5, height: 2.5, depth: 2.5, 
    requiredAction: 'dodge', damage: 0, color: '#F0F8FF',
    isMoving: true,
    properties: { passThroughMouth: true, rewardPoints: 200 }
  },
  [ExtendedObstacleType.NEUTROPHIL_AGGRESSIVE]: {
    width: 2.0, height: 2.0, depth: 2.0, 
    requiredAction: 'dodge', damage: 1, color: '#FAFAD2',
    isMoving: true,
    properties: { isTracker: true }
  },
  [ExtendedObstacleType.MACROPHAGE_GIANT]: {
    width: 5.0, height: 5.0, depth: 5.0, 
    requiredAction: 'dodge', damage: 0.5, color: '#FFFFFF',
    isMoving: true,
    properties: { eatsBacteria: true }
  },
  [ExtendedObstacleType.MAST_CELL]: {
    width: 2.5, height: 2.5, depth: 2.5, 
    requiredAction: 'jump', damage: 1, color: '#FFFFE0',
    properties: { isMine: true, explosionRadius: 1.5 }
  },

  // 🔵 МЕМБРАНИ
  [ExtendedObstacleType.MEMBRANA_SIMPLEX]: {
    width: 1.8, height: 4.0, depth: 0.2, 
    requiredAction: 'dodge', damage: 99, color: '#00BFFF',
    properties: { isWall: true }
  },
  [ExtendedObstacleType.MEMBRANA_GLUTINOSA]: {
    width: 1.8, height: 4.0, depth: 0.2, 
    requiredAction: 'dodge', damage: 0, color: '#FFD700',
    properties: { isSticky: true, stickDuration: 1.0 }
  },
  [ExtendedObstacleType.MEMBRANA_ROTANS]: {
    width: 3.5, height: 4.0, depth: 0.2, 
    requiredAction: 'dodge', damage: 99, color: '#1E90FF',
    properties: { hasHole: true, rotating: true }
  },
  [ExtendedObstacleType.MEMBRANA_OBSCURA]: {
    width: 6.0, height: 5.0, depth: 0.5, 
    requiredAction: 'dodge', damage: 0, color: '#000000',
    properties: { isOpaque: true }
  },

  [ExtendedObstacleType.SPIKES]: {
    width: 1.5,
    height: 0.3,
    depth: 1.5,
    requiredAction: 'jump',
    damage: 1,
    color: '#8B0000'
  },
  [ExtendedObstacleType.JUMP_ONLY]: {
    width: 1.8,
    height: 0.8,
    depth: 0.5,
    requiredAction: 'jump',
    damage: 1,
    color: '#FF6B35'
  },
  [ExtendedObstacleType.DODGE_ONLY]: {
    width: 1.8,
    height: 2.5,
    depth: 0.8,
    requiredAction: 'dodge',
    damage: 1,
    color: '#8B0000'
  },
  [ExtendedObstacleType.SLIDE_ONLY]: {
    width: 1.8,
    height: 1.2,
    depth: 0.5,
    requiredAction: 'slide',
    damage: 1,
    color: '#4ECDC4'
  },
  [ExtendedObstacleType.BREAKABLE_BLOCK]: {
    width: 1.8,
    height: 1.8,
    depth: 1.8,
    requiredAction: 'jump',
    damage: 0,
    isBreakable: true,
    durability: 1,
    color: '#A0522D'
  },
  [ExtendedObstacleType.MOVING_PLATFORM]: {
    width: 2.5,
    height: 0.3,
    depth: 3,
    isMoving: true,
    color: '#6B5B95'
  }
};

/** Повертає конфіг препятствия з fallback на JUMP_ONLY */
export function getObstacleConfig(type: ExtendedObstacleType): ObstacleConfigEntry {
  const key = type as keyof typeof DEFAULT_OBSTACLE_CONFIG;
  const fallback = DEFAULT_OBSTACLE_CONFIG[ExtendedObstacleType.JUMP_ONLY] as ObstacleConfigEntry;
  return (DEFAULT_OBSTACLE_CONFIG[key] ?? fallback) as ObstacleConfigEntry;
}

// Конфігурація бонусів за замовчуванням
export const DEFAULT_BONUS_CONFIG: Record<BonusType, { value?: number; duration?: number; color: string; scale: number; effectValue?: number; magnetRadius?: number }> = {
  [BonusType.COIN]: {
    value: 10,
    color: '#FFD700',
    scale: 0.5
  },
  [BonusType.GEM]: {
    value: 50,
    color: '#E91E63',
    scale: 0.6
  },
  [BonusType.SHIELD]: {
    duration: 5,
    color: '#2196F3',
    scale: 0.7
  },
  [BonusType.SPEED_BOOST]: {
    duration: 3,
    effectValue: 1.5,
    color: '#FFEB3B',
    scale: 0.6
  },
  [BonusType.MAGNET]: {
    duration: 8,
    magnetRadius: 5,
    color: '#FF00FF',
    scale: 0.6
  },
  [BonusType.INVINCIBILITY]: {
    duration: 5,
    color: '#FFFFFF',
    scale: 0.7
  },
  [BonusType.DOUBLE_POINTS]: {
    duration: 10,
    color: '#00FF00',
    scale: 0.5
  },
  [BonusType.LIFE]: {
    value: 1,
    color: '#FF0000',
    scale: 0.7
  },
  [BonusType.KEY]: {
    value: 1,
    color: '#FFD700',
    scale: 0.8
  },
  [BonusType.TOKEN]: {
    value: 1,
    color: '#C0C0C0',
    scale: 0.8
  }
};

// Маппінг між нашими типами та існуючими типами гри
export const OBJECT_TYPE_MAPPING: Record<ExtendedObstacleType | BonusType | PlatformType, ObjectType | null> = {
  // 🪱 ГЕЛЬМІНТИ
  [ExtendedObstacleType.GLOBUS_VULGARIS]: ObjectType.GLOBUS_VULGARIS,
  [ExtendedObstacleType.GLOBUS_IRRITATUS]: ObjectType.GLOBUS_IRRITATUS,
  [ExtendedObstacleType.GLOBUS_MAXIMUS]: ObjectType.GLOBUS_MAXIMUS,
  [ExtendedObstacleType.VERMIS_ELECTRICUS]: ObjectType.VERMIS_ELECTRICUS,
  [ExtendedObstacleType.VERMIS_OSCILLANS]: ObjectType.VERMIS_OSCILLANS,

  // 🦠 ПРОКАРІОТИ
  [ExtendedObstacleType.COCCUS_SIMPLEX]: ObjectType.COCCUS_SIMPLEX,
  [ExtendedObstacleType.BACILLUS_MAGNUS]: ObjectType.BACILLUS_MAGNUS,
  [ExtendedObstacleType.STREPTOCOCCUS_CHAIN]: ObjectType.STREPTOCOCCUS_CHAIN,
  [ExtendedObstacleType.BACTERIUM_FELIX]: ObjectType.BACTERIUM_FELIX,
  [ExtendedObstacleType.BACTERIUM_SPORE]: ObjectType.BACTERIUM_SPORE,
  [ExtendedObstacleType.BACTERIUM_FLAGELLUM]: ObjectType.BACTERIUM_FLAGELLUM,

  // 🔴 ПАТОГЕНИ
  [ExtendedObstacleType.VIRUS_CORONA]: ObjectType.VIRUS_CORONA,
  [ExtendedObstacleType.VIRUS_MOBILIS]: ObjectType.VIRUS_MOBILIS,
  [ExtendedObstacleType.VIRUS_GIGANTUS]: ObjectType.VIRUS_GIGANTUS,
  [ExtendedObstacleType.VIRUS_INVISIBLE]: ObjectType.VIRUS_INVISIBLE,

  // ⚪ ЗАХИСНИКИ
  [ExtendedObstacleType.LEUKOCYTE_PATROL]: ObjectType.LEUKOCYTE_PATROL,
  [ExtendedObstacleType.NEUTROPHIL_AGGRESSIVE]: ObjectType.NEUTROPHIL_AGGRESSIVE,
  [ExtendedObstacleType.MACROPHAGE_GIANT]: ObjectType.MACROPHAGE_GIANT,
  [ExtendedObstacleType.MAST_CELL]: ObjectType.MAST_CELL,

  // 🔵 СТРУКТУРИ
  [ExtendedObstacleType.MEMBRANA_SIMPLEX]: ObjectType.MEMBRANA_SIMPLEX,
  [ExtendedObstacleType.MEMBRANA_GLUTINOSA]: ObjectType.MEMBRANA_GLUTINOSA,
  [ExtendedObstacleType.MEMBRANA_ROTANS]: ObjectType.MEMBRANA_ROTANS,
  [ExtendedObstacleType.MEMBRANA_OBSCURA]: ObjectType.MEMBRANA_OBSCURA,

  // Extended Obstacle Types -> ObjectType
  [ExtendedObstacleType.JUMP_ONLY]: ObjectType.OBSTACLE_JUMP,
  [ExtendedObstacleType.DODGE_ONLY]: ObjectType.OBSTACLE_DODGE,
  [ExtendedObstacleType.SLIDE_ONLY]: ObjectType.OBSTACLE_SLIDE,
  [ExtendedObstacleType.SPIKES]: ObjectType.OBSTACLE,
  [ExtendedObstacleType.MOVING_PLATFORM]: ObjectType.OBSTACLE,
  [ExtendedObstacleType.BREAKABLE_BLOCK]: ObjectType.OBSTACLE,
  
  // Bonus Types -> ObjectType
  [BonusType.COIN]: ObjectType.COIN,
  [BonusType.GEM]: ObjectType.GENE,
  [BonusType.SHIELD]: ObjectType.SHIELD,
  [BonusType.SPEED_BOOST]: ObjectType.SPEED_BOOST,
  [BonusType.MAGNET]: ObjectType.MAGNET,
  [BonusType.INVINCIBILITY]: ObjectType.SHIELD,
  [BonusType.DOUBLE_POINTS]: ObjectType.GENE,
  [BonusType.LIFE]: ObjectType.SHIELD,
  [BonusType.KEY]: ObjectType.GENE,
  [BonusType.TOKEN]: ObjectType.GENE,
  
  // Platform Types - немає маппінгу
  [PlatformType.STANDARD]: null,
  [PlatformType.MOVING]: null,
  [PlatformType.BREAKING]: null,
  [PlatformType.BOOSTING]: null,
  [PlatformType.ONE_WAY]: null,
  [PlatformType.SPRING]: null
};

// End of file