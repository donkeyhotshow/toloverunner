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
    private playerPhysics: PlayerPhysics;

    constructor(_options?: PhysicsEngineOptions) {
        this.playerPhysics = new PlayerPhysics();
    }

    /**
     * Physics update with CCD-based collision detection.
     * Uses sweep-based collision (checkWithCCD) to prevent tunneling at high speeds.
     */
    update(dt: number, gameObjects: GameObject[], currentDistance: number, moveDist: number, _incremental: boolean = false, isDashing: boolean = false) {
        // 1) Save previous position for CCD sweep
        const prevX = this.playerPhysics.previousPosition.x;
        const prevY = this.playerPhysics.previousPosition.y;

        // 2) Update player physics (sets this.playerPhysics.position)
        this.playerPhysics.update(dt);

        const px = this.playerPhysics.position.x;
        const py = this.playerPhysics.position.y;
        const previousDistance = currentDistance - moveDist;

        // 3) CCD sweep — prevents pass-through at MAX_SPEED (45 u/s)
        return CollisionSystem.checkWithCCD(
            px, py,
            prevX, prevY,
            moveDist / Math.max(dt, 0.001), // instantaneous velocity magnitude
            gameObjects,
            currentDistance,
            previousDistance,
            isDashing,
            this.playerPhysics.isSliding
        );
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
