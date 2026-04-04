import React, { useMemo, useEffect } from 'react';
import { Vector3 } from 'three';
import PhysicsEngine from '../../../core/physics/PhysicsEngine';
import { getPhysicsStabilizer } from '../../../core/physics/PhysicsStabilizer';
import type { CollisionResult } from '../../../core/physics/CollisionSystem';
import { useStore } from '../../../store';
import { LANE_WIDTH, SAFETY_CONFIG } from '../../../constants';
import { safeDeltaTime } from '../../../utils/safeMath';
import { validateLane } from '../../../utils/laneUtils';
import { GameObject, ObjectType } from '../../../types';
import { gameObjectPool } from '../SharedPool';
// import { getPerformanceManager } from '../../../infrastructure/performance/PerformanceManager'; // Unused


import { useCombatSystem } from '../../Gameplay/Combat/useCombatSystem';

export const useGamePhysics = () => {
    const physicsEngine = useMemo(() => new PhysicsEngine(), []);
    const combat = useCombatSystem(); // ⚔️ Combat System v2.4.0

    useEffect(() => {
        // Listen for jump input from store
        const handleJumpInput = () => {
            physicsEngine.jump();
        };

        const handleStopJump = () => {
            physicsEngine.stopJump();
        };

        window.addEventListener('player:jump_input', handleJumpInput);
        window.addEventListener('player:stop_jump', handleStopJump);

        return () => {
            physicsEngine.dispose();
            window.removeEventListener('player:jump_input', handleJumpInput);
            window.removeEventListener('player:stop_jump', handleStopJump);
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
            const boost = store.speedBoostActive ? 2 : 1;
            const isDashing = store.isDashing;

            const dashBoost = isDashing ? 2.0 : 1.0;
            const effectiveSpeed = currentSpeed * boost * dashBoost;

            let currentPhysicsDist = totalDistanceRef.current - (safeDelta * effectiveSpeed);

            stabilizer.update(delta, (dt: number) => {
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
                                window.dispatchEvent(new CustomEvent('particle-burst', {
                                    detail: {
                                        position: [obj.position[0], obj.position[1], objRelZ],
                                        color: '#FFFFFF',
                                        type: 'combat-kill',
                                        count: 30
                                    }
                                }));
                                continue;
                            }
                        }
                    }
                }

                // Update combo timers
                store.updateCombo(dt);

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
                   console.log(`[STABILITY] Dist: ${currentPhysicsDist.toFixed(2)} | Modulo: ${(currentPhysicsDist % 1000).toFixed(4)} | Y: ${p.position.y.toFixed(6)}`);
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
                            obj.type === ObjectType.OBSTACLE_DODGE;
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

        // Decay momentum/timers
        store.updateGameTimer(delta);

        // 🔍 FEAR MECHANIC: Find nearest obstacle in current lane
        let nearestDist = 999;
        const px = pos.x;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;

            const isHarmful = obj.type === ObjectType.OBSTACLE ||
                obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE ||
                obj.type === ObjectType.GLOBUS_NORMAL ||
                obj.type === ObjectType.GLOBUS_ANGRY ||
                obj.type === ObjectType.GLOBUS_BOSS ||
                obj.type === ObjectType.BACTERIA_LOW ||
                obj.type === ObjectType.BACTERIA_MID ||
                obj.type === ObjectType.BACTERIA_WALL ||
                obj.type === ObjectType.BACTERIA_HAPPY ||
                obj.type === ObjectType.VIRUS_KILLER_LOW ||
                obj.type === ObjectType.VIRUS_KILLER_HIGH ||
                obj.type === ObjectType.IMMUNE_PATROL ||
                obj.type === ObjectType.MEMBRANE_WALL;

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

        // Handle Collisions
        const collision = lastCollision as CollisionResult | null;
        if (collision && collision.hit && collision.object && collision.object.active) {
            const obj = collision.object;
            const isObstacleType =
                obj.type === ObjectType.OBSTACLE ||
                obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE ||
                obj.type === ObjectType.GLOBUS_NORMAL ||
                obj.type === ObjectType.GLOBUS_ANGRY ||
                obj.type === ObjectType.GLOBUS_BOSS ||
                obj.type === ObjectType.BACTERIA_LOW ||
                obj.type === ObjectType.BACTERIA_MID ||
                obj.type === ObjectType.BACTERIA_WALL ||
                obj.type === ObjectType.BACTERIA_HAPPY ||
                obj.type === ObjectType.VIRUS_KILLER_LOW ||
                obj.type === ObjectType.VIRUS_KILLER_HIGH ||
                obj.type === ObjectType.IMMUNE_PATROL ||
                obj.type === ObjectType.MEMBRANE_WALL;

            if (isObstacleType) {
                const {
                    shieldActive,
                    isImmortalityActive,
                    isInvincible,
                    lives
                } = store;

                const willTakeDamage = !isImmortalityActive && !isInvincible && lives > 0 && !shieldActive;

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

                    window.dispatchEvent(new CustomEvent('screen-shake', {
                        detail: { intensity: 0.3, duration: 0.3 }
                    }));

                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'enemy-hit', volume: 0.8 }
                    }));

                    window.dispatchEvent(new CustomEvent('player-hit', {
                        detail: { position: [pos.x, pos.y, pos.z] }
                    }));

                    window.dispatchEvent(new CustomEvent('particle-burst', {
                        detail: {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#FF4444',
                            type: 'hit',
                            count: 40
                        }
                    }));
                } else {
                    // Блок щитом/бессмертием: мягкий эффект без удара по игроку
                    window.dispatchEvent(new CustomEvent('particle-burst', {
                        detail: {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#66CCFF',
                            type: 'shield-block',
                            count: 20
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'shield', volume: 0.9 }
                    }));
                }

                if (collision.jumpedOverObject && willTakeDamage) {
                    // Бонус за перепрыгнутую бактерию только при реальном ударе после траектории
                    store.bacteriaJumpBonus();
                }
            } else {
                // 🎯 SPEC: Don't release immediately, start suck-in
                obj.collecting = 0.35;

                const isValuable = (obj.type === ObjectType.GENE || obj.type === ObjectType.DNA_HELIX);
                window.dispatchEvent(new CustomEvent('particle-burst', {
                    detail: {
                        position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                        color: isValuable ? '#00FFFF' : '#FFD700',
                        type: 'powerup',
                        count: isValuable ? 20 : 10
                    }
                }));

                // Batch all collection events
                if (isValuable) {
                    store.collectGene();
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'gene-collect', volume: 0.7 }
                    }));
                    window.dispatchEvent(new CustomEvent('hud-pulse', {
                        detail: { element: 'score', intensity: 1.3 }
                    }));
                } else if (obj.type === ObjectType.COIN) {
                    store.collectCoin(5); // GDD v2.2.0: 5 points per coin
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'coin-collect', volume: 0.6 }
                    }));
                    window.dispatchEvent(new CustomEvent('hud-pulse', {
                        detail: { element: 'score', intensity: 1.2 }
                    }));
                    // ✨ Visual Feedback: Turquoise Burst for Rings
                    window.dispatchEvent(new CustomEvent('particle-burst', {
                        detail: {
                            position: [obj.position[0], obj.position[1], obj.position[2] + totalDistanceRef.current],
                            color: '#40E0D0',
                            type: 'powerup',
                            count: 15
                        }
                    }));
                } else if (obj.type === ObjectType.SHIELD) {
                    store.activateShield();
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'powerup-collect', volume: 0.7 }
                    }));
                } else if (obj.type === ObjectType.SPEED_BOOST) {
                    store.activateSpeedBoost();
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'powerup-collect', volume: 0.7 }
                    }));
                } else if (obj.type === ObjectType.MAGNET) {
                    store.activateMagnet();
                    window.dispatchEvent(new CustomEvent('play-sound', {
                        detail: { sound: 'powerup-collect', volume: 0.7 }
                    }));
                }

                window.dispatchEvent(new CustomEvent('player-collect-strong', {
                    detail: { position: [pos.x, pos.y, pos.z] }
                }));
            }
        }
    };

    return {
        physicsEngine,
        updatePhysics
    };
};
