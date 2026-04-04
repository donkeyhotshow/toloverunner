/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * World Systems Types - Общие типы для систем мира
 */

import type { GameObject, BiomeType, PlayerState } from '../../types';

/**
 * Конфигурация генерации чанка
 */
export interface ChunkGenerationConfig {
    startZ: number;
    chunkSize: number;
    laneCount: number;
    biome: BiomeType;
}

/**
 * Результат генерации чанка
 */
export interface ChunkGenerationResult {
    objects: GameObject[];
    nextSpawnZ: number;
}

/**
 * Конфигурация culling системы
 */
export interface CullingConfig {
    drawDistance: number;
    cullBehindOffset: number;
    cullAheadOffset: number;
}

/**
 * Результат culling операции
 */
export interface CullingResult {
    /** Количество активных объектов после culling */
    activeCount: number;
    /** Количество удалённых объектов */
    culledCount: number;
}

/**
 * Конфигурация collision системы
 */
export interface CollisionConfig {
    /** Минимальная дистанция для активации коллизий */
    minActiveDistance: number;
}

/**
 * Результат проверки коллизий
 */
export interface CollisionCheckResult {
    /** Была ли коллизия */
    hasCollision: boolean;
    /** Объект коллизии (если есть) */
    collidedObject: GameObject | null;
    /** Обновлённое сост игрока */
    updatedPlayerState: Partial<PlayerState> | null;
}

/**
 * Интерфейс для World Generation System
 */
export interface IWorldGenerationSystem {
    requestChunk(_config: ChunkGenerationConfig): void;
    setCallback(_callback: ((data: Float32Array) => void) | null): void;
    reset(): void;
}

/**
 * Интерфейс для World Culling System
 */
export interface IWorldCullingSystem {
    performCulling(
        _objects: GameObject[],
        _totalDistance: number,
        _config: CullingConfig
    ): CullingResult;
    dispose(): void;
}

/**
 * Интерфейс для World Collision System
 */
export interface IWorldCollisionSystem {
    checkCollisions(
        _playerState: PlayerState,
        _objects: GameObject[],
        _currentDistance: number,
        _previousDistance: number,
        _deltaTime: number
    ): CollisionCheckResult;
    insertObject(_obj: GameObject): void;
    removeObject(_obj: GameObject): void;
    reset(): void;
    dispose(): void;
}

/**
 * Зависимости для World Systems
 */
export interface WorldSystemsDeps {
    onObjectCulled?: (_obj: GameObject) => void;
    onCollision?: (_obj: GameObject, _type: 'obstacle' | 'pickup') => void;
}
