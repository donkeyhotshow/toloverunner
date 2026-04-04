/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PhysicsEngine - SIMPLIFIED VERSION
 * Убран spatial hash, используется простой массив
 */

import { PlayerPhysics } from './PlayerPhysicsLogic';
import { CollisionSystem } from './CollisionSystem';
import { GameObject } from '../../types';

export interface PhysicsEngineOptions {
    cellSize?: number;
    maxObjects?: number;
}

export class PhysicsEngine {
    private collisionObj: CollisionSystem;
    private playerPhysics: PlayerPhysics;

    constructor(_options?: PhysicsEngineOptions) {
        this.playerPhysics = new PlayerPhysics();
        this.collisionObj = new CollisionSystem();
    }

    /**
     * Упрощенное обновление физики
     * Теперь просто передаем весь массив объектов
     */
    update(dt: number, gameObjects: GameObject[], currentDistance: number, moveDist: number, _incremental: boolean = false, isDashing: boolean = false) {
        // 1) Обновляем физику игрока
        this.playerPhysics.update(dt);

        // 2) Простая проверка коллизий (без spatial hash)
        const px = this.playerPhysics.position.x;
        const py = this.playerPhysics.position.y;

        const previousDistance = currentDistance - moveDist;
        return this.collisionObj.checkSimple(px, py, gameObjects, currentDistance, previousDistance, isDashing, this.playerPhysics.isSliding);
    }

    // Заглушки для совместимости (больше не используются)
    insertObject(_obj: GameObject) { }
    removeObject(_obj: GameObject) { }

    getPlayerPhysics() {
        return this.playerPhysics;
    }

    jump() {
        this.playerPhysics.jump(false);
    }

    stopJump() {
        this.playerPhysics.stopJump();
    }

    dispose() { }
}

export default PhysicsEngine;
