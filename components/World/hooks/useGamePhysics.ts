import React, { useMemo, useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import PhysicsEngine from '../../../core/physics/PhysicsEngine';
import { getPhysicsStabilizer } from '../../../core/physics/PhysicsStabilizer';
import type { CollisionResult } from '../../../core/physics/CollisionSystem';
import { useStore } from '../../../store';
import { LANE_WIDTH, SAFETY_CONFIG, PLAYER_PHYSICS } from '../../../constants';
import { safeDeltaTime } from '../../../utils/safeMath';
import { validateLane } from '../../../utils/laneUtils';
import { GameObject, ObjectType, VirusTypes, WormTypes, BacteriumTypes, ImmuneTypes, MembraneTypes } from '../../../types';
import { gameObjectPool } from '../SharedPool';
// import { getPerformanceManager } from '../../../infrastructure/performance/PerformanceManager'; // Unused
import { eventBus } from '../../../utils/eventBus';

/** GDD: all VirusTypes are lethal obstacles. Pre-built Set for O(1) lookup in hot collision path. */
const VIRUS_TYPE_SET = new Set<string>(VirusTypes);
/** Pre-built Sets for non-pickup enemy types (used in magnet exclusion, fear mechanic, and collision routing). */
const WORM_TYPE_SET_GP      = new Set<string>(WormTypes);
const BACTERIUM_TYPE_SET_GP = new Set<string>(BacteriumTypes);
const IMMUNE_TYPE_SET_GP    = new Set<string>(ImmuneTypes);
const MEMBRANE_TYPE_SET_GP  = new Set<string>(MembraneTypes);

import { useCombatSystem } from '../../Gameplay/Combat/useCombatSystem';

export const useGamePhysics = () => {
    const physicsEngine = useMemo(() => new PhysicsEngine(), []);
    const combat = useCombatSystem(); // ⚔️ Combat System v2.4.0
    /** Tracks whether a dangerous enemy was already close last frame (prevents spamming player:fear). */
    const fearWasCloseRef = useRef(false);

    useEffect(() => {
        // Listen for jump input via eventBus (single event system — no window events)
        const handleJumpInput = () => {
            physicsEngine.jump();
        };

        const handleStopJump = () => {
            physicsEngine.stopJump();
        };

        const unsubJump = eventBus.on('player:jump_input', handleJumpInput);
        const unsubStop = eventBus.on('player:stop_jump', handleStopJump);

        return () => {
            physicsEngine.dispose();
            unsubJump();
            unsubStop();
        };
    }, [physicsEngine]);

    const updatePhysics = (
        delta: number,
        objects: GameObject[],
        totalDistanceRef: React.MutableRefObject<number>,
        _accumulatedScoreDistance: React.MutableRefObject<number>,
        lastLoggedDistanceRef: React.MutableRefObject<number>
    ) => {
        // ... (existing collecting timers logic)
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;
            if (obj.collecting !== undefined && obj.collecting > 0) {
                obj.collecting -= delta;
                if (obj.collecting <= 0) {
                    obj.active = false;
                    gameObjectPool.release(obj);
                    continue;
                }
            }
        }

        const store = useStore.getState();
        const pState = store.localPlayerState;

        if (!pState) return;

        const playerPhysics = physicsEngine.getPlayerPhysics();
        playerPhysics.targetLane = validateLane(pState.lane || 0);

        if (pState.isJumping && !playerPhysics.isJumping && playerPhysics.isGrounded) {
            playerPhysics.requestJump();
        }

        // Handle slide start - only request new slide if not already sliding
        if (pState.isSliding && !playerPhysics.isSliding) {
            playerPhysics.requestSlide();
        }

        // Handle slide stop - if store says not sliding but physics still sliding, stop it
        // This ensures responsive slide ending when key is released
        if (!pState.isSliding && playerPhysics.isSliding) {
            playerPhysics.stopSlide();
        }

        const stabilizer = getPhysicsStabilizer();
        let lastCollision: CollisionResult | null = null;

        const safeDelta = safeDeltaTime(delta, SAFETY_CONFIG.MAX_DELTA_TIME, 0.001);
        if (safeDelta > 0.001) {
            const currentSpeed = store.speed || 30;
            // `speed` from the store already includes SPEED_BOOST_FACTOR via
            // computeEffectiveSpeed — do NOT multiply by boost again here.
            const isDashing = store.isDashing;

            const dashBoost = isDashing ? 2.0 : 1.0;
            const effectiveSpeed = currentSpeed * dashBoost;

            let currentPhysicsDist = totalDistanceRef.current - (safeDelta * effectiveSpeed);

            stabilizer.update(safeDelta, (dt: number) => {
                const stepMoveDist = effectiveSpeed * dt;
                currentPhysicsDist += stepMoveDist;

                const p = physicsEngine.getPlayerPhysics();
                const playerPos: [number, number, number] = [p.position.x, p.position.y, 0]; // Player relative Z is 0

                // ⚔️ COMBAT CHECK: Check attacks BEFORE regular collisions
                if (combat.isAttacking()) {
                    for (let i = 0; i < objects.length; i++) {
                        const obj = objects[i];
                        if (!obj || !obj.active || obj.collecting) continue;

                        // Calculate object relative Z for combat check
                        const objRelZ = obj.position[2] + currentPhysicsDist;

                        if (combat.checkAttackHit(playerPos, obj, objRelZ)) {
                            const destroyed = combat.destroyEnemy(obj);
                            if (destroyed) {
                                // Visual burst for combat kill
                                eventBus.emit('particle:burst', {
                                        position: [obj.position[0], obj.position[1], objRelZ],
                                        color: '#FFFFFF',
                                        type: 'combat-kill',
                                        count: 30
                                    });
                                continue;
                            }
                        }
                    }
                }

                // Update combo timers and game clock — fixed dt ensures determinism
                store.updateCombo(dt);
                store.updateGameTimer(dt);

                const collision = physicsEngine.update(
                    dt,
                    objects, // Raw array (CollisionSystem now handles filtering)
                    currentPhysicsDist,
                    stepMoveDist,
                    true,
                    isDashing
                );

                // ... (rest of the stabilizer logic: haptic, magnet, etc.)
                if (isDashing) {
                    p.currentLanePos = p.targetLane * LANE_WIDTH;
                    if (p.isGrounded) p.velocity.y = 5;
                }

                stabilizer.setCurrentState({
                    position: { x: p.position.x, y: p.position.y, z: p.position.z },
                    velocity: { x: p.velocity.x, y: p.velocity.y, z: p.velocity.z },
                    rotation: 0,
                    isGrounded: p.isGrounded
                });

                // 📊 Stability Metrics (throttled by distance)
                if (Math.abs(currentPhysicsDist - lastLoggedDistanceRef.current) >= 100) { 
                   lastLoggedDistanceRef.current = currentPhysicsDist;
                }

                if (collision && collision.hit) {
                    lastCollision = collision;
                } else if (collision && collision.graze) {
                    store.graze();
                }

                // 2. Magnetic Pull Physics
                if (store.magnetActive) {
                    const magnetRadius = 15;
                    const pullStrength = 50;
                    const px = p.position.x;
                    const py = p.position.y;

                    for (let i = 0; i < objects.length; i++) {
                        const obj = objects[i];
                        if (!obj || !obj.active) continue;

                        const isHarmful =
                            obj.type === ObjectType.OBSTACLE ||
                            obj.type === ObjectType.OBSTACLE_JUMP ||
                            obj.type === ObjectType.OBSTACLE_SLIDE ||
                            obj.type === ObjectType.OBSTACLE_DODGE ||
                            // GDD: viruses, worms, bacteria and immune cells should NOT be pulled toward player
                            VIRUS_TYPE_SET.has(obj.type) ||
                            WORM_TYPE_SET_GP.has(obj.type) ||
                            BACTERIUM_TYPE_SET_GP.has(obj.type) ||
                            IMMUNE_TYPE_SET_GP.has(obj.type);
                        if (isHarmful) continue;

                        const ox = obj.position[0];
                        const oy = obj.position[1];
                        const oz = obj.position[2] + currentPhysicsDist;

                        const dx = px - ox;
                        const dy = py - oy;
                        const dz = 0 - oz;
                        const distSq = dx * dx + dy * dy + dz * dz;

                        if (distSq < magnetRadius * magnetRadius) {
                            const dist = Math.sqrt(distSq);
                            const pull = (1.0 - dist / magnetRadius) * pullStrength * dt;
                            obj.position[0] += dx * pull;
                            obj.position[1] += dy * pull;
                            obj.position[2] += dz * pull;
                        }
                    }
                }
            });
        }

        const finalPlayer = physicsEngine.getPlayerPhysics();
        const pos = finalPlayer.position;
        const vel = finalPlayer.velocity;

        // Update Store - CRITICAL: Force Y=0.5 for stable ground position
        store.setLocalPlayerState({
            position: [pos.x, 0.5, pos.z], // FORCE Y=0.5 STABLE
            velocity: [vel.x, vel.y, vel.z],
            isJumping: finalPlayer.isJumping,
            isDoubleJumping: finalPlayer.isDoubleJumping,
            isSliding: finalPlayer.isSliding,
            isGrounded: finalPlayer.isGrounded
        });

        // Decay momentum/timers — gameClock updated inside the fixed-step callback above

        // 🔍 FEAR MECHANIC: Find nearest obstacle in current lane
        let nearestDist = 999;
        const px = pos.x;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;

            // Use the same pre-built Sets as isObstacleType to guarantee fear is triggered
            // for every enemy family (including membrane variants added in the future).
            const isHarmful =
                obj.type === ObjectType.OBSTACLE ||
                obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE ||
                VIRUS_TYPE_SET.has(obj.type) ||
                WORM_TYPE_SET_GP.has(obj.type) ||
                BACTERIUM_TYPE_SET_GP.has(obj.type) ||
                IMMUNE_TYPE_SET_GP.has(obj.type) ||
                MEMBRANE_TYPE_SET_GP.has(obj.type);

            if (isHarmful) {
                // const objZ = obj.position[2] + totalDistanceRef.current; // Unused

                // const relativeZ = objZ - 0; // Unused

                // In this engine, player is at Z=0 and objects move towards Z positive.
                // Actually obj.position[2] is distance from spawn, totalDistanceRef.current is how far map moved.
                const realObjZ = obj.position[2] + totalDistanceRef.current;

                if (realObjZ > 0 && realObjZ < 15) {
                    const ox = obj.position[0];
                    const dx = Math.abs(px - ox);
                    if (dx < 1.5) {
                        if (realObjZ < nearestDist) nearestDist = realObjZ;
                    }
                }
            }
        }
        store.setNearestEnemyDistance(nearestDist);

        // GDD: emit player:fear on rising edge when a lethal enemy enters FEAR_DISTANCE (rate-limited)
        const enemyIsClose = nearestDist < PLAYER_PHYSICS.FEAR_DISTANCE;
        if (enemyIsClose && !fearWasCloseRef.current) {
            eventBus.emit('player:fear', undefined);
        }
        fearWasCloseRef.current = enemyIsClose;

        // Handle Collisions
        const collision = lastCollision as CollisionResult | null;
        if (collision && collision.hit && collision.object && collision.object.active) {
            const obj = collision.object;
            // All biological enemy families (Worm, Bacterium, Immune, Membrane, Virus) are
            // obstacles that deal damage — they must NOT fall through to the pickup branch.
            // Using the same pre-built Sets as the fear mechanic and magnet exclusion ensures
            // that any new type added to types.ts arrays is automatically covered here too.
            const isObstacleType =
                obj.type === ObjectType.OBSTACLE ||
                obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE ||
                // GDD: всі типи Вірусів — смертельні перешкоди
                VIRUS_TYPE_SET.has(obj.type) ||
                // All remaining biological enemy families:
                WORM_TYPE_SET_GP.has(obj.type) ||
                BACTERIUM_TYPE_SET_GP.has(obj.type) ||
                IMMUNE_TYPE_SET_GP.has(obj.type) ||
                MEMBRANE_TYPE_SET_GP.has(obj.type);

            if (isObstacleType) {
                const {
                    shieldActive,
                    isImmortalityActive,
                    isInvincible,
                    lives
                } = store;

                // GDD: VirusTypes bypass shield → always deal fatal damage.
                // Even if shieldActive, viruses still kill → visual feedback must still play.
                const isVirusHit = VIRUS_TYPE_SET.has(obj.type);
                const willTakeDamage = isVirusHit ||
                    (!isImmortalityActive && !isInvincible && lives > 0 && !shieldActive);

                // Всегда убираем препятствие при столкновении
                obj.active = false;
                gameObjectPool.release(obj);

                if (obj.type === ObjectType.IMMUNE_PATROL && !willTakeDamage) {
                    // Імунна клітина сповільнює, навіть якщо урон не проходит
                    store.slowDown(0.5, 3000);
                }

                // Логика урона и статов остаётся в store
                store.takeDamage(obj);

                if (willTakeDamage) {
                    // Тяжёлый удар: отбрасывание, тряска, красные частицы и звук врага
                    const recoilDir = new Vector3(
                        (pos.x > obj.position[0] ? 1 : -1) * 20,
                        25,
                        -30
                    );
                    finalPlayer.applyRecoil(recoilDir);

                    eventBus.emit('system:screen-shake', { intensity: 0.3, duration: 0.3 });

                    eventBus.emit('system:play-sound', { sound: 'enemy-hit', volume: 0.8 });

                    eventBus.emit('player:hit-vfx', { position: [pos.x, pos.y, pos.z] });

                    eventBus.emit('particle:burst', {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#FF4444',
                            type: 'hit',
                            count: 40
                        });
                } else {
                    // Блок щитом/бессмертием: мягкий эффект без удара по игроку
                    eventBus.emit('particle:burst', {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#66CCFF',
                            type: 'powerup',
                            count: 20
                        });
                    eventBus.emit('system:play-sound', { sound: 'shield', volume: 0.9 });
                }

                if (collision.jumpedOverObject && willTakeDamage) {
                    // Бонус за перепрыгнутую бактерию только при реальном ударе после траектории
                    store.bacteriaJumpBonus();
                }
            } else {
                // 🎯 SPEC: Don't release immediately, start suck-in
                obj.collecting = 0.35;

                const isValuable = (obj.type === ObjectType.GENE || obj.type === ObjectType.DNA_HELIX);
                eventBus.emit('particle:burst', {
                        position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                        color: isValuable ? '#00FFFF' : '#FFD700',
                        type: 'powerup',
                        count: isValuable ? 20 : 10
                    });

                // Batch all collection events
                if (isValuable) {
                    store.collectGene();
                    eventBus.emit('system:play-sound', { sound: 'gene-collect', volume: 0.7 });
                    eventBus.emit('ui:hud-pulse', { element: 'score', intensity: 1.3 });
                } else if (obj.type === ObjectType.COIN) {
                    store.collectCoin(5); // GDD v2.2.0: 5 points per coin
                    eventBus.emit('system:play-sound', { sound: 'coin-collect', volume: 0.6 });
                    eventBus.emit('ui:hud-pulse', { element: 'score', intensity: 1.2 });
                    // ✨ Visual Feedback: Turquoise Burst for Rings
                    eventBus.emit('particle:burst', {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#40E0D0',
                            type: 'powerup',
                            count: 15
                        });
                } else if (obj.type === ObjectType.SHIELD) {
                    store.activateShield();
                    eventBus.emit('system:play-sound', { sound: 'powerup-collect', volume: 0.7 });
                } else if (obj.type === ObjectType.SPEED_BOOST) {
                    store.activateSpeedBoost();
                    eventBus.emit('system:play-sound', { sound: 'powerup-collect', volume: 0.7 });
                } else if (obj.type === ObjectType.MAGNET) {
                    store.activateMagnet();
                    eventBus.emit('system:play-sound', { sound: 'powerup-collect', volume: 0.7 });
                }

                eventBus.emit('player:collect-strong', { position: [pos.x, pos.y, pos.z] });
            }
        }

        // GDD ObstacleType.TRAMPOLINE: WormType contact from above → bounce player upward + BOING!
        if (collision?.trampolineObject) {
            const playerPhysics = physicsEngine.getPlayerPhysics();
            const bounceForce = playerPhysics.config.jumpForce * 1.3;
            playerPhysics.velocity.y = Math.max(playerPhysics.velocity.y, bounceForce);
            playerPhysics.isGrounded = false;
            playerPhysics.isJumping = true;
            playerPhysics.jumpsRemaining = 2; // Restore both jumps after worm trampoline bounce (GDD ObstacleType.TRAMPOLINE)
            eventBus.emit('player:jump', undefined); // Triggers BOING! in ComicPopupSystem
            store.bacteriaJumpBonus(); // Score bonus for worm bounce
        }
    };

    return {
        physicsEngine,
        updatePhysics
    };
};
