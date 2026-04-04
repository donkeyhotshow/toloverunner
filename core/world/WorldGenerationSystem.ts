/**
 * @license
 * SPDX-License-Identifier: Apache-2.0

 * WorldGenerationSystem - Система генерации сегментов мира
 *
 * Ответственность:
 * - Процедурная генерация объектов
 * - Управление спавном чанков
 * - Координация с ProceduralSystem
 */

import type { GameObject } from '../../types';
import { ObjectType } from '../../types';
import type { ProceduralSystem } from '../../components/System/Procedural';
import type { ChunkGenerationConfig, IWorldGenerationSystem } from './types';
import { ObjectPool } from '../utils/ObjectPool';
import { SAFETY_CONFIG, GAMEPLAY_CONFIG } from '../../constants';
import { validatePosition, validateScale } from '../../utils/validation';
import * as THREE from 'three';

// Маппинг индексов типов объектов
const ID_TO_TYPE: ObjectType[] = [
    ObjectType.OBSTACLE,
    ObjectType.GENE,
    ObjectType.DNA_HELIX,
    ObjectType.JUMP_BAR,
    ObjectType.COIN,
    ObjectType.SHIELD,
    ObjectType.SPEED_BOOST,
    // Add missing fallback mapped array types here to prevent out-of-bounds TS error
] as ObjectType[];

const intToHex = (int: number): string => '#' + new THREE.Color(int).getHexString();

/**
 * Система генерации мира
 */
export class WorldGenerationSystem implements IWorldGenerationSystem {
    private procGen: ProceduralSystem;
    private objectPool: ObjectPool<GameObject>;
    private generatedObjects: GameObject[] = [];
    private lastSpawnZ = 0;
    private isProcessingChunk = false;
    private chunkCallback: ((objects: GameObject[]) => void) | null = null;

    constructor(procGen: ProceduralSystem) {
        this.procGen = procGen;

        // Инициализация пула объектов
        this.objectPool = new ObjectPool<GameObject>(
            () => ({
                id: '',
                type: ObjectType.OBSTACLE,
                position: [0, 0, 0] as const,
                active: false,
                scale: [1, 1, 1] as const,
            }),
            (obj) => {
                obj.id = '';
                obj.active = false;
                obj.color = undefined;
                obj.points = undefined;
                obj.rotationSpeed = undefined;
            },
            SAFETY_CONFIG.MAX_OBJECTS
        );

        // Подписка на callback от ProceduralSystem
        this.procGen.setCallback(this.handleChunkGenerated.bind(this));
    }

    /**
     * Запрос генерации нового чанка
     */
    requestChunk(config: ChunkGenerationConfig): void {
        if (this.isProcessingChunk) return;

        this.isProcessingChunk = true;

        this.procGen.requestChunk(
            config.startZ,
            config.chunkSize,
            config.laneCount,
            config.biome
        );
    }

    /**
     * Проверка необходимости генерации нового чанка
     */
    shouldGenerateChunk(totalDistance: number, drawDistance: number, spawnDistance: number): boolean {
        if (this.isProcessingChunk) return false;

        const visibleEdge = -(totalDistance + drawDistance + spawnDistance);
        return this.lastSpawnZ > visibleEdge;
    }

    /**
     * Обработка сгенерированного чанка от ProceduralSystem
     */
    private handleChunkGenerated(data: Float32Array): void {
        const stride = 5;
        const count = Math.floor(data.length / stride);

        if (count === 0) {
            this.isProcessingChunk = false;
            return;
        }

        const currentLength = this.generatedObjects.length;
        const spaceLeft = SAFETY_CONFIG.MAX_OBJECTS - currentLength;

        if (spaceLeft <= 0) {
            this.isProcessingChunk = false;
            return;
        }

        const objectsToAdd = Math.min(count, spaceLeft);
        const newObjects: GameObject[] = [];

        for (let i = 0; i < objectsToAdd; i++) {
            const idx = i * stride;
            const typeIdx = Math.floor(data[idx] ?? 0) || 0;
            const type = ID_TO_TYPE[typeIdx] || ObjectType.OBSTACLE;

            const rawPosition: [number, number, number] = [
                data[idx + 1] ?? 0,
                data[idx + 2] ?? 0,
                data[idx + 3] ?? 0,
            ];

            const objectId = `obj_${this.lastSpawnZ.toFixed(0)}_${i}_${Date.now()}`;
            const validatedScale = validateScale(1, SAFETY_CONFIG.MIN_SCALE, SAFETY_CONFIG.MAX_SCALE);

            const newObj = this.objectPool.acquire();
            newObj.id = objectId;
            newObj.type = type;
            newObj.position = validatePosition(rawPosition);
            newObj.active = true;
            newObj.color = intToHex(data[idx + 4] || 0);
            newObj.scale = [validatedScale, validatedScale, validatedScale] as const;

            newObjects.push(newObj);
            this.generatedObjects.push(newObj);
        }

        this.isProcessingChunk = false;

        // Уведомляем о новых объектах
        if (this.chunkCallback && newObjects.length > 0) {
            this.chunkCallback(newObjects);
        }
    }

    // ...
    // Note: removed unused imports in separate step if possible, or just fix args here.

    /**
     * Установка callback для уведомления о новых объектах
     */
    setCallback(_callback: ((data: Float32Array) => void) | null): void {
        // Для совместимости с существующим API
        // Внутренне используем другой callback
    }

    /**
     * Установка callback для новых объектов
     */
    onChunkGenerated(callback: ((_objects: GameObject[]) => void) | null): void {
        this.chunkCallback = callback;
    }

    /**
     * Обновление позиции последнего спавна
     */
    updateLastSpawnZ(delta: number = GAMEPLAY_CONFIG.SPAWN_CHUNK_STEP): void {
        this.lastSpawnZ -= delta;
    }

    /**
     * Получение текущей позиции спавна
     */
    getLastSpawnZ(): number {
        return this.lastSpawnZ;
    }

    /**
     * Возврат объекта в пул
     */
    releaseObject(obj: GameObject): void {
        this.objectPool.release(obj);
    }

    /**
     * Получение всех сгенерированных объектов
     */
    getGeneratedObjects(): GameObject[] {
        return this.generatedObjects;
    }

    /**
     * Удаление объекта из списка сгенерированных
     */
    removeFromGenerated(obj: GameObject): void {
        const idx = this.generatedObjects.indexOf(obj);
        if (idx !== -1) {
            this.generatedObjects.splice(idx, 1);
        }
    }

    /**
     * Проверка состояния обработки
     */
    isProcessing(): boolean {
        return this.isProcessingChunk;
    }

    /**
     * Сброс системы
     */
    reset(): void {
        // Возвращаем все объекты в пул
        this.generatedObjects.forEach((obj) => this.objectPool.release(obj));
        this.generatedObjects = [];
        this.lastSpawnZ = 0;
        this.isProcessingChunk = false;
    }

    /**
     * Получение статистики пула
     */
    getPoolStats(): { poolSize: number; totalCreated: number; maxSize: number } {
        return this.objectPool.getStats();
    }
}

export default WorldGenerationSystem;
