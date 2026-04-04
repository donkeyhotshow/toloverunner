/**
 * @license
 * SPDX-License-Identifier:
 *
 * WorldCollisionSystem - Ð¡Ð¸ÑÑ‚ÐµÐ¼Ð° Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ¸ ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹
 *
 * ÐžÑ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ:
 * - Ð˜Ð½Ñ‚ÐµÐ³Ñ€Ð°Ñ†Ð¸Ñ Ñ PhysicsEngine
 * - ÐžÐ±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð¾Ð² ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹
 * - Ð£Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ spatial hash Ð´Ð»Ñ Ð¾Ð±ÑŠÐµÐºÑ‚Ð¾Ð²
 */

import type { GameObject, PlayerState } from '../../types';
import { ObjectType } from '../../types';
import type { CollisionCheckResult, IWorldCollisionSystem } from './types';
import PhysicsEngine from '../physics/PhysicsEngine';
import { validateLane } from '../../utils/laneUtils';
import { SAFETY_CONFIG } from '../../constants';

/**
 * Ð¢Ð¸Ð¿ ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¸ Ð´Ð»Ñ callback
 */
export type CollisionType = 'obstacle' | 'gene' | 'coin' | 'shield' | 'speedBoost' | 'unknown';

/**
 * Callback Ð´Ð»Ñ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ¸ ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹
 */
export interface CollisionCallbacks {
    onObstacleHit?: (_obj: GameObject, _playerPos: { x: number; y: number; z: number }) => void;
    onGeneCollected?: (_obj: GameObject, _playerPos: { x: number; y: number; z: number }) => void;
    onCoinCollected?: (_obj: GameObject, _playerPos: { x: number; y: number; z: number }) => void;
    onShieldCollected?: (_obj: GameObject, _playerPos: { x: number; y: number; z: number }) => void;
    onSpeedBoostCollected?: (_obj: GameObject, _playerPos: { x: number; y: number; z: number }) => void;
}

/**
 * Ð¡Ð¸ÑÑ‚ÐµÐ¼Ð° ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹ Ð¼Ð¸Ñ€Ð°
 */
export class WorldCollisionSystem implements IWorldCollisionSystem {
    private physicsEngine: PhysicsEngine;
    private callbacks: CollisionCallbacks = {};
    private fixedStep: number;

    constructor(options?: { cellSize?: number; maxObjects?: number; fixedStep?: number }) {
        this.physicsEngine = new PhysicsEngine({
            cellSize: options?.cellSize ?? 4,
            maxObjects: options?.maxObjects ?? SAFETY_CONFIG.MAX_OBJECTS,
        });
        this.fixedStep = options?.fixedStep ?? 1 / 30;
    }

    /**
     * Ð£ÑÑ‚Ð°Ð½Ð¾Ð²ÐºÐ° callbacks Ð´Ð»Ñ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ¸ ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹
     */
    setCallbacks(callbacks: CollisionCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ° ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¹ Ð¸ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ñ„Ð¸Ð·Ð¸ÐºÐ¸ Ð¸Ð³Ñ€Ð¾ÐºÐ°
     */
    checkCollisions(
        playerState: PlayerState,
        objects: GameObject[],
        currentDistance: number,
        previousDistance: number,
        deltaTime: number
    ): CollisionCheckResult {
        const playerPhysics = this.physicsEngine.getPlayerPhysics();

        // Ð¡Ð¸Ð½Ñ…Ñ€Ð¾Ð½Ð¸Ð·Ð°Ñ†Ð¸Ñ Ð²Ñ…Ð¾Ð´Ð½Ñ‹Ñ… Ð´Ð°Ð½Ð½Ñ‹Ñ… Ñ Ñ„Ð¸Ð·Ð¸Ñ‡ÐµÑÐºÐ¸Ð¼ Ð´Ð²Ð¸Ð¶ÐºÐ¾Ð¼
        playerPhysics.targetLane = validateLane(playerState.lane || 0);

        if (playerState.isJumping && !playerPhysics.isJumping && playerPhysics.isGrounded) {
            playerPhysics.requestJump();
        }

        // ÐžÐ±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ñ„Ð¸Ð·Ð¸ÐºÐ¸ Ñ ÑƒÑ‡Ñ‘Ñ‚Ð¾Ð¼ Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ñ Ð¼Ð¸Ñ€Ð°
        const collision = this.physicsEngine.update(
            deltaTime,
            objects,
            currentDistance,
            previousDistance,
            true // incremental spatial hash
        );

        // Ð¤Ð¾Ñ€Ð¼Ð¸Ñ€ÑƒÐµÐ¼ Ð¾Ð±Ð½Ð¾Ð²Ð»Ñ‘Ð½Ð½Ð¾Ðµ ÑÐ¾ÑÑ‚Ð¾ÑÐ½Ð¸Ðµ Ð¸Ð³Ñ€Ð¾ÐºÐ°
        const pos = playerPhysics.position;
        const vel = playerPhysics.velocity;

        const updatedPlayerState: Partial<PlayerState> = {
            position: [pos.x, pos.y, pos.z] as const,
            velocity: [vel.x, vel.y, vel.z] as const,
            isJumping: playerPhysics.isJumping,
            isDoubleJumping: playerPhysics.isDoubleJumping,
            isGrounded: playerPhysics.isGrounded,
        };

        // ÐžÐ±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¸
        if (collision?.hit && collision.object?.active) {
            const obj = collision.object;
            obj.active = false;

            const playerPos = { x: pos.x, y: pos.y, z: pos.z };

            // Ð’Ñ‹Ð·Ñ‹Ð²Ð°ÐµÐ¼ ÑÐ¾Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ð¹ callback
            this.handleCollisionCallback(obj, playerPos);

            return {
                hasCollision: true,
                collidedObject: obj,
                updatedPlayerState,
            };
        }

        return {
            hasCollision: false,
            collidedObject: null,
            updatedPlayerState,
        };
    }

    /**
     * ÐžÐ±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° callback Ð² Ð·Ð°Ð²Ð¸ÑÐ¸Ð¼Ð¾ÑÑ‚Ð¸ Ð¾Ñ‚ Ñ‚Ð¸Ð¿Ð° Ð¾Ð±ÑŠÐµÐºÑ‚Ð°
     */
    private handleCollisionCallback(
        obj: GameObject,
        playerPos: { x: number; y: number; z: number }
    ): void {
        switch (obj.type) {
            case ObjectType.OBSTACLE:
            case ObjectType.VIRUS_KILLER:
            case ObjectType.CELL_MEMBRANE:
            case ObjectType.BACTERIA_BLOCKER:
            // ⚔️ Combat v2.4.0 - Нові типи перешкод
            case ObjectType.LOW:
            case ObjectType.HIGH:
            case ObjectType.COMBAT:
                this.callbacks.onObstacleHit?.(obj, playerPos);
                break;
            
            case ObjectType.IMMUNE_CELL:
                // Ð¡Ð¿ÐµÑ†Ñ–Ð°Ð»ÑŒÐ½Ð° Ð¾Ð±Ñ€Ð¾Ð±ÐºÐ° Ð´Ð»Ñ Ñ–Ð¼ÑƒÐ½Ð½Ð¾Ñ— ÐºÐ»Ñ–Ñ‚Ð¸Ð½Ð¸ - ÑƒÐ¿Ð¾Ð²Ñ–Ð»ÑŒÐ½ÐµÐ½Ð½Ñ
                // ÐœÐ¸ Ð¼Ð¾Ð¶ÐµÐ¼Ð¾ Ð²Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð¾Ð²ÑƒÐ²Ð°Ñ‚Ð¸ Ñ–ÑÐ½ÑƒÑŽÑ‡Ð¸Ð¹ callback Ð°Ð±Ð¾ Ð´Ð¾Ð´Ð°Ñ‚Ð¸ Ð½Ð¾Ð²Ð¸Ð¹
                this.callbacks.onObstacleHit?.(obj, playerPos); // Ð¢ÐµÐ¶ Ð²Ð¸ÐºÐ»Ð¸Ñ‡Ðµ Ð¿Ð¾ÑˆÐºÐ¾Ð´Ð¶ÐµÐ½Ð½Ñ
                break;
            
            case ObjectType.GLOBUS_WORM:
                // Ð“Ð»Ð¸ÑÑ‚Ð° Ð¼Ð¾Ð¶Ð½Ð° Ð²Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð¾Ð²ÑƒÐ²Ð°Ñ‚Ð¸ ÑÐº Ð¿Ð»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ñƒ, Ð°Ð»Ðµ ÑÐºÑ‰Ð¾ Ð²Ñ€Ñ–Ð·Ð°Ñ‚Ð¸ÑÑ Ð·Ð±Ð¾ÐºÑƒ - Ñ†Ðµ Ð¿ÐµÑ€ÐµÑˆÐºÐ¾Ð´Ð°
                this.callbacks.onObstacleHit?.(obj, playerPos);
                break;

            case ObjectType.GENE:
            case ObjectType.DNA_HELIX:
                this.callbacks.onGeneCollected?.(obj, playerPos);
                break;

            case ObjectType.COIN:
                this.callbacks.onCoinCollected?.(obj, playerPos);
                break;

            case ObjectType.SHIELD:
                this.callbacks.onShieldCollected?.(obj, playerPos);
                break;

            case ObjectType.SPEED_BOOST:
                this.callbacks.onSpeedBoostCollected?.(obj, playerPos);
                break;
        }
    }

    /**
     * ÐžÐ¿Ñ€ÐµÐ´ÐµÐ»ÐµÐ½Ð¸Ðµ Ñ‚Ð¸Ð¿Ð° ÐºÐ¾Ð»Ð»Ð¸Ð·Ð¸Ð¸
     */
    getCollisionType(obj: GameObject): CollisionType {
        switch (obj.type) {
            case ObjectType.GENE:
            case ObjectType.DNA_HELIX:
                return 'gene';
            case ObjectType.COIN:
                return 'coin';
            case ObjectType.SHIELD:
                return 'shield';
            case ObjectType.SPEED_BOOST:
                return 'speedBoost';
            default:
                // Obstacles like GLOBUS, VIRUS, etc fall here
                return 'obstacle';
        }
    }

    /**
     * Ð”Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¾Ð±ÑŠÐµÐºÑ‚Ð° Ð² spatial hash
     */
    insertObject(obj: GameObject): void {
        this.physicsEngine.insertObject(obj);
    }

    /**
     * Ð£Ð´Ð°Ð»ÐµÐ½Ð¸Ðµ Ð¾Ð±ÑŠÐµÐºÑ‚Ð° Ð¸Ð· spatial hash
     */
    removeObject(obj: GameObject): void {
        this.physicsEngine.removeObject(obj);
    }

    /**
     * ÐŸÐ¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ðµ Ñ„Ð¸Ð·Ð¸ÐºÐ¸ Ð¸Ð³Ñ€Ð¾ÐºÐ° Ð´Ð»Ñ Ð²Ð½ÐµÑˆÐ½ÐµÐ³Ð¾ Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð°
     */
    getPlayerPhysics() {
        return this.physicsEngine.getPlayerPhysics();
    }

    /**
     * ÐŸÐ¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ðµ fixed step Ð´Ð»Ñ Ñ„Ð¸Ð·Ð¸ÐºÐ¸
     */
    getFixedStep(): number {
        return this.fixedStep;
    }

    /**
     * Ð¡Ð±Ñ€Ð¾Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ñ‹
     */
    reset(): void {
        this.physicsEngine.dispose();
    }

    /**
     * ÐžÑ‡Ð¸ÑÑ‚ÐºÐ° Ñ€ÐµÑÑƒÑ€ÑÐ¾Ð²
     */
    dispose(): void {
        this.physicsEngine.dispose();
        this.callbacks = {};
    }
}

export default WorldCollisionSystem;


