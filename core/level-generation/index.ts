/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Level Generation System - Експорт всіх модулів
 */

// Система Seed
export {
  LevelSeedManager,
  LevelDifficulty,
  SeededRNG,
  DIFFICULTY_DISTANCES,
} from './LevelSeedSystem';
export type { SeedConfig } from './LevelSeedSystem';

// Типи об'єктів
export {
  ExtendedObstacleType,
  PlatformType,
  BonusType,
  DEFAULT_OBSTACLE_CONFIG,
  DEFAULT_BONUS_CONFIG,
  OBJECT_TYPE_MAPPING,
} from './LevelObjectTypes';
export type {
  LevelObject,
  LevelObstacle,
  LevelPlatform,
  LevelBonus,
  LevelCoin,
  LevelZone,
  MovePattern,
  ObjectGenerationConfig,
} from './LevelObjectTypes';

// Типи проходів
export { PassageType, PassageGenerator, LANE_RANGE } from './PassageTypes';
export type { PassageConfig, BlockedLanes } from './PassageTypes';

// Послідовності препятствий
export { SequenceType, ObstacleSequenceGenerator } from './ObstacleSequences';
export type { SequenceConfig, SequenceResult } from './ObstacleSequences';

// Маркування маршруту
export { RouteMarker } from './RouteMarker';
export type { RouteConfig, RouteMarkingResult } from './RouteMarker';

// Прогресія складності
export { DifficultyProgression } from './DifficultyProgression';
export type { DifficultyParams, DifficultyResult } from './DifficultyProgression';

// Фізична прохідність
export { PLAYER_PHYSICS, PhysicsPassabilityValidator } from './PhysicsPassability';
export type { PassabilityResult, PassabilityIssue } from './PhysicsPassability';

// Головний генератор
export { LevelGenerator } from './LevelGenerator';
export type { ChunkGenerationResult } from './LevelGenerator';

import { LevelSeedManager } from './LevelSeedSystem';
import { LevelDifficulty, SeededRNG } from './LevelSeedSystem';
import { LevelGenerator } from './LevelGenerator';
import { DifficultyProgression } from './DifficultyProgression';
import { RouteMarker } from './RouteMarker';
import { ObstacleSequenceGenerator } from './ObstacleSequences';
import { PassageGenerator } from './PassageTypes';

export default {
  LevelSeedManager,
  LevelDifficulty,
  SeededRNG,
  LevelGenerator,
  DifficultyProgression,
  RouteMarker,
  ObstacleSequenceGenerator,
  PassageGenerator,
};