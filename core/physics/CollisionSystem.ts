/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CollisionSystem - REFINED CCD VERSION
 * Solves "Ghost Hits" and "Pass Through" bugs using Sweep logic.
 */

import { GameObject, ObjectType, WormTypes, BacteriumTypes, VirusTypes, ImmuneTypes, MembraneTypes } from '../../types';

import { COLLISION_CONFIG } from '../../constants/physicsConfig';

/** Module-level Sets for O(1) type lookups in hot collision path (GDD alignment) */
const WORM_TYPE_SET = new Set<string>([...WormTypes]);
const BACTERIUM_TYPE_SET = new Set<string>([...BacteriumTypes]);
const VIRUS_COL_SET = new Set<string>([...VirusTypes]);
const IMMUNE_TYPE_SET = new Set<string>([...ImmuneTypes]);
const MEMBRANE_TYPE_SET = new Set<string>([...MembraneTypes]);

/** Y above which player bounces off worm (trampoline zone) instead of taking a hit */
const TRAMPOLINE_MIN_Y = 0.3;

export interface CollisionResult {
    hit: boolean;
    graze: boolean;
    object: GameObject | null;
    jumpedOverObject?: GameObject | null;
    /** GDD: WormType (TRAMPOLINE) that the player landed on top of — triggers bounce. */
    trampolineObject?: GameObject | null;
}

export class CollisionSystem {
    // 🎯 REFINED HITBOXES - Per-type and config-driven
    private static readonly PLAYER_RADIUS = COLLISION_CONFIG.PLAYER_RADIUS;
    private static readonly OBSTACLE_RADIUS = COLLISION_CONFIG.OBSTACLE_RADIUS;
    private static readonly PICKUP_RADIUS = COLLISION_CONFIG.PICKUP_RADIUS;
    private static readonly GRAZE_RADIUS = COLLISION_CONFIG.GRAZE_RADIUS;
    private static readonly JUMP_CLEAR_HEIGHT = COLLISION_CONFIG.JUMP_CLEAR_HEIGHT;
    private static readonly OBSTACLE_JUMP_HEIGHT = COLLISION_CONFIG.OBSTACLE_JUMP_HEIGHT;
    private static readonly OBSTACLE_DEPTH_Z: number = COLLISION_CONFIG.OBSTACLE_DEPTH_Z as number;
    private static readonly OBSTACLE_SPECIAL_DEPTH_Z: number = COLLISION_CONFIG.OBSTACLE_SPECIAL_DEPTH_Z as number;

    /**
     * ПРОСУНУТА CCD (Continuous Collision Detection)
     * Використовує raycast/sweep test для швидких об'єктів
     * Мінімальна швидкість для активації CCD: 10 одиниць/секунду
     */
    private static readonly CCD_VELOCITY_THRESHOLD = 10;
    // Adaptive: steps = ceil(travelDistance / (playerRadius * 0.5)), capped here
    private static readonly MAX_RAY_STEPS = 32;

    /**
     * Raycast CCD для швидких об'єктів
     * Перевіряє зіткнення на всьому шляху руху
     */
    private static checkRayCCD(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        objX: number,
        objY: number,
        objRadiusX: number,
        objRadiusY: number,
        playerRadius: number
    ): boolean {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.001) {
            const dist = Math.sqrt((startX - objX) ** 2 + (startY - objY) ** 2);
            return dist < objRadiusX + playerRadius;
        }
        
        const steps = Math.min(
            Math.ceil(distance / (playerRadius * 0.5)),
            this.MAX_RAY_STEPS
        );
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const checkX = startX + dx * t;
            const checkY = startY + dy * t;
            
            const inX = Math.abs(checkX - objX) < objRadiusX + playerRadius;
            const inY = Math.abs(checkY - objY) < objRadiusY + playerRadius;
            
            if (inX && inY) return true;
        }
        
        return false;
    }

    /**
     * ПРОСУНУТА ПЕРЕВІРКА КОЛІЗІЙ З CCD
     * При швидкості вище CCD_VELOCITY_THRESHOLD виконує sweep по траєкторії,
     * щоб уникнути "ghost hits" та "pass through" на великих швидкостях.
     */
    static checkWithCCD(
        playerX: number,
        playerY: number,
        prevPlayerX: number,
        prevPlayerY: number,
        playerVelocity: number,
        objects: GameObject[],
        currentDistance: number,
        previousDistance: number = currentDistance,
        isDashing: boolean = false,
        isSliding: boolean = false
    ): CollisionResult {
        const useCCD = Math.abs(playerVelocity) >= CollisionSystem.CCD_VELOCITY_THRESHOLD ||
                       Math.abs(currentDistance - previousDistance) > CollisionSystem.PLAYER_RADIUS;

        if (!useCCD) {
            // Low speed — simple single-point check is sufficient
            const system = new CollisionSystem();
            return system.checkSimple(playerX, playerY, objects, currentDistance, previousDistance, isDashing, isSliding);
        }

        // CCD sweep: interpolate player position across sub-steps
        const dx = playerX - prevPlayerX;
        const dy = playerY - prevPlayerY;
        const dz = currentDistance - previousDistance;
        const travelXY = Math.sqrt(dx * dx + dy * dy);
        const playerRadius = isDashing ? CollisionSystem.PLAYER_RADIUS * 0.5 : CollisionSystem.PLAYER_RADIUS;

        const steps = Math.min(
            Math.max(2, Math.ceil(travelXY / (playerRadius * 0.5))),
            CollisionSystem.MAX_RAY_STEPS
        );

        const system = new CollisionSystem();
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const sweepX = prevPlayerX + dx * t;
            const sweepY = prevPlayerY + dy * t;
            const sweepDist = previousDistance + dz * t;
            const sweepPrevDist = previousDistance + dz * (i - 1) / steps;

            const result = system.checkSimple(sweepX, sweepY, objects, sweepDist, sweepPrevDist, isDashing, isSliding);
            if (result.hit) return result;
            // Propagate graze/trampoline/jumpedOver from last step
            if (i === steps) return result;
        }

        // Fallback (should not reach here)
        return system.checkSimple(playerX, playerY, objects, currentDistance, previousDistance, isDashing, isSliding);
    }

    /**
     * PRECISE CONTINUOUS COLLISION DETECTION (CCD)
     * Solves "Ghost Hits" and "Pass Through" bugs.
     */
    public checkSimple(
        playerX: number,
        playerY: number,
        objects: GameObject[],
        currentDistance: number,
        previousDistance: number = currentDistance,
        isDashing: boolean = false,
        isSliding: boolean = false
    ): CollisionResult {
        const result = { hit: false, graze: false, object: null, jumpedOverObject: null, trampolineObject: null } as CollisionResult;
        result.hit = false;
        result.graze = false;
        result.object = null;
        result.jumpedOverObject = null;

        const count = objects.length;
        if (count === 0) return result;

        const playerRadius = isDashing ? CollisionSystem.PLAYER_RADIUS * 0.5 : CollisionSystem.PLAYER_RADIUS;

        // Ensure zTravel assumes forward movement (distance increases)
        // If game loops or resets, handle appropriately (though usually distance increases)

        for (let i = 0; i < count; i++) {
            const obj = objects[i];
            if (!obj || !obj.active || obj.collecting) continue;

            const isObstacle = obj.type === ObjectType.OBSTACLE || 
                             obj.type === ObjectType.VIRUS_KILLER || 
                             obj.type === ObjectType.IMMUNE_CELL ||
                             // GDD: all VirusTypes and ImmuneTypes are lethal obstacles with correct (narrow) hitbox
                             VIRUS_COL_SET.has(obj.type) ||
                             IMMUNE_TYPE_SET.has(obj.type);
            const isSpecialObstacle = obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE ||
                obj.type === ObjectType.GLOBUS_WORM ||
                obj.type === ObjectType.BACTERIA_BLOCKER ||
                obj.type === ObjectType.CELL_MEMBRANE ||
                obj.type === ObjectType.LOW ||
                obj.type === ObjectType.HIGH ||
                obj.type === ObjectType.COMBAT ||
                // GDD: WormTypes are TRAMPOLINE obstacles, BacteriumTypes are jumpable, MembraneTypes are walls
                WORM_TYPE_SET.has(obj.type) ||
                BACTERIUM_TYPE_SET.has(obj.type) ||
                MEMBRANE_TYPE_SET.has(obj.type);

            // Глубина по Z в зависимости от типа (для стабильного CCD)
            let objDepth = CollisionSystem.OBSTACLE_DEPTH_Z;
            if (isSpecialObstacle) {
                objDepth = CollisionSystem.OBSTACLE_SPECIAL_DEPTH_Z;
            }

            // 1. Z-AXIS SWEEP (CCD)
            // Calculate object's Z relative to player (Player is at Z=0)
            // objWorldZ = obj.z + totalDistance

            // At START of frame (previousDistance):
            const zStart = obj.position[2] + previousDistance;
            // At END of frame (currentDistance):
            const zEnd = obj.position[2] + currentDistance;

            // Collision Depth is combined radii (per-type depth)
            const collisionDepth = playerRadius + objDepth;

            // Check if the Z-interval [zStart, zEnd] overlaps with [-collisionDepth, collisionDepth]
            // We use min/max because during a frame, the relative Z changes.
            // Z usually goes from Negative (far) to Positive (behind).
            // Example: Start -0.5, End +0.5. Crosses 0.

            const minZ = Math.min(zStart, zEnd);
            const maxZ = Math.max(zStart, zEnd);

            const zOverlap = (minZ <= collisionDepth && maxZ >= -collisionDepth);

            if (!zOverlap) {
                // Not in Z range this frame.
                // Optimization: If very far, skip XY check.
                if (minZ > 20 || maxZ < -5) continue;
                // Skip collision but check graze if strictly close? 
                // No, graze also requires Z alignment.
                continue;
            }

            // 2. Y-AXIS (HEIGHT) CHECK
            const objY = obj.position[1];
            const obstacleHeight = (obj.height != null && obj.height > 0) ? obj.height : 1.0;

            // 🛑 OBSTACLE_SLIDE / HIGH: Must slide under (Player Height Check)
            if (obj.type === ObjectType.OBSTACLE_SLIDE || obj.type === ObjectType.HIGH) {
                if (isDashing) {
                    continue; // Dash passes under
                }
                if (isSliding) {
                    continue; // Pass safely under
                }
                // Else: HIT (Head bangs on it) — визуально барьер висит высоко
            }
            // 🛑 OBSTACLE_JUMP / GLOBUS_WORM / WormTypes / BacteriumTypes / VirusTypes / ImmuneTypes / LOW / COMBAT: Must jump over
            else if (obj.type === ObjectType.OBSTACLE_JUMP || obj.type === ObjectType.OBSTACLE || 
                     obj.type === ObjectType.GLOBUS_WORM || obj.type === ObjectType.VIRUS_KILLER || 
                     obj.type === ObjectType.IMMUNE_CELL || obj.type === ObjectType.BACTERIA_BLOCKER ||
                     obj.type === ObjectType.LOW || obj.type === ObjectType.COMBAT ||
                     WORM_TYPE_SET.has(obj.type) || BACTERIUM_TYPE_SET.has(obj.type) ||
                     VIRUS_COL_SET.has(obj.type) || IMMUNE_TYPE_SET.has(obj.type)) {
                const isJumpable = obj.type === ObjectType.OBSTACLE_JUMP ||
                    obj.type === ObjectType.GLOBUS_WORM || obj.type === ObjectType.BACTERIA_BLOCKER ||
                    obj.type === ObjectType.LOW || obj.type === ObjectType.COMBAT ||
                    WORM_TYPE_SET.has(obj.type) || BACTERIUM_TYPE_SET.has(obj.type);
                const clearHeight = (isJumpable ? CollisionSystem.OBSTACLE_JUMP_HEIGHT : CollisionSystem.JUMP_CLEAR_HEIGHT) * obstacleHeight;
                if (playerY > objY + clearHeight) {
                    if (obj.type === ObjectType.BACTERIA_BLOCKER) {
                        result.jumpedOverObject = obj;
                    }
                    continue; // Jumped over safely
                }
                // GDD ObstacleType.TRAMPOLINE: WormTypes in landing zone → bounce, no damage
                if (WORM_TYPE_SET.has(obj.type) && playerY > objY + TRAMPOLINE_MIN_Y) {
                    result.trampolineObject = obj;
                    continue; // Trampoline bounce, no hit
                }
            }
            // 🛑 OBSTACLE_DODGE / CELL_MEMBRANE / BACILLUS / MembraneTypes: Tall Wall (Cannot Jump Over)
            else if (obj.type === ObjectType.OBSTACLE_DODGE || obj.type === ObjectType.CELL_MEMBRANE ||
                     (obj.type as ObjectType) === ObjectType.BACILLUS_MAGNUS ||
                     MEMBRANE_TYPE_SET.has(obj.type)) {
                // No Y escape — only lane dodge
            }

            // 3. X-AXIS (LANE) CHECK — для DODGE можно чуть расширить ширину столкновения
            const objX = obj.position[0];
            const dx = Math.abs(objX - playerX);
            const isPickup = !isObstacle && !isSpecialObstacle;

            let hitDistX = !isPickup ? (CollisionSystem.OBSTACLE_RADIUS + playerRadius) : (CollisionSystem.PICKUP_RADIUS + playerRadius);
            const isWide = obj.type === ObjectType.OBSTACLE_DODGE ||
                          obj.type === ObjectType.CELL_MEMBRANE ||
                          (obj.type as ObjectType) === ObjectType.BACILLUS_MAGNUS;
            if (isWide && (obj.width != null && obj.width > 0)) {
                hitDistX = obj.width * 0.5 + playerRadius;
            }
            if (dx < hitDistX) {
                // HIT CONFIRMED
                result.hit = true;
                result.object = obj;

                if (!isPickup) return result;
            } else if (!isPickup) {
                // Перевірка graze тільки при правильному Z
                const grazeDistance = CollisionSystem.GRAZE_RADIUS + playerRadius;
                if (dx < grazeDistance && Math.abs(zEnd) < 1.0) {
                    result.graze = true;
                    result.object = obj;
                }
            }
        }

        return result;
    }
}
