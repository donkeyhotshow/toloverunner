/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorldCullingSystem - Система culling и recycling объектов
 *
 * Ответственность:
 * - Удаление объектов за пределами видимости
 * - Возврат объектов в пул
 * - Оптимизация массивов объектов
 */

import type { GameObject } from '../../types';
import { ObjectType } from '../../types';
import type { CullingConfig, CullingResult, IWorldCullingSystem } from './types';

/**
 * Callback для обработки удалённых объектов
 */
export type OnObjectCulledCallback = (obj: GameObject) => void;

/**
 * Система culling объектов мира
 */
export class WorldCullingSystem implements IWorldCullingSystem {
    private onObjectCulled: OnObjectCulledCallback | null = null;

    constructor(onCulled?: OnObjectCulledCallback) {
        this.onObjectCulled = onCulled ?? null;
    }

    /**
     * Установка callback для удалённых объектов
     */
    setOnObjectCulled(callback: OnObjectCulledCallback | null): void {
        this.onObjectCulled = callback;
    }

    /**
     * Выполнение culling для массива объектов
     * Модифицирует массив in-place для производительности
     */
    performCulling(
        objects: GameObject[],
        totalDistance: number,
        config: CullingConfig
    ): CullingResult {
        const cullBehind = -(config.drawDistance + config.cullBehindOffset);
        const cullAhead = config.cullAheadOffset;

        let writeIndex = 0;
        let culledCount = 0;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];

            if (!obj?.active) {
                culledCount++;
                continue;
            }

            const worldZ = obj.position[2] + totalDistance;

            // Объект за пределами видимости
            if (worldZ < cullBehind || worldZ > cullAhead) {
                obj.active = false;
                culledCount++;

                // Уведомляем о culling для возврата в пул и удаления из spatial hash
                if (this.onObjectCulled) {
                    this.onObjectCulled(obj);
                }
                continue;
            }

            // Сохраняем активный объект
            if (writeIndex !== i) {
                objects[writeIndex] = obj;
            }
            writeIndex++;
        }

        // Обрезаем массив до актуального размера
        if (objects.length !== writeIndex) {
            objects.length = writeIndex;
        }

        return {
            activeCount: writeIndex,
            culledCount,
        };
    }

    /**
     * Culling для отдельных массивов (obstacles, pickups)
     * Фильтрует только по флагу active (предполагается, что основной culling уже выполнен)
     */
    cullInactiveFromArray(objects: GameObject[]): number {
        let writeIndex = 0;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (obj && obj.active) {
                if (writeIndex !== i) {
                    objects[writeIndex] = obj;
                }
                writeIndex++;
            }
        }

        if (objects.length !== writeIndex) {
            objects.length = writeIndex;
        }

        return writeIndex;
    }

    /**
     * Разделение объектов на obstacles и pickups
     */
    categorizeObjects(
        objects: GameObject[],
        obstacles: GameObject[],
        pickups: GameObject[]
    ): void {
        // Очищаем массивы
        obstacles.length = 0;
        pickups.length = 0;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;

            if (obj.type === ObjectType.OBSTACLE) {
                obstacles.push(obj);
            } else {
                pickups.push(obj);
            }
        }
    }

    /**
     * Проверка, находится ли объект в зоне видимости
     */
    isInViewDistance(
        obj: GameObject,
        totalDistance: number,
        config: CullingConfig
    ): boolean {
        const worldZ = obj.position[2] + totalDistance;
        const cullBehind = -(config.drawDistance + config.cullBehindOffset);
        const cullAhead = config.cullAheadOffset;

        return worldZ >= cullBehind && worldZ <= cullAhead;
    }

    /**
     * Получение объектов в определённом диапазоне Z
     */
    getObjectsInRange(
        objects: GameObject[],
        totalDistance: number,
        minZ: number,
        maxZ: number
    ): GameObject[] {
        const result: GameObject[] = [];

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;

            const worldZ = obj.position[2] + totalDistance;
            if (worldZ >= minZ && worldZ <= maxZ) {
                result.push(obj);
            }
        }

        return result;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.onObjectCulled = null;
    }
}

export default WorldCullingSystem;
