/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Damage, death, invincibility, and dash actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GameStatus, VirusTypes } from '../../types';
import { GAMEPLAY_CONFIG } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

/** GDD: all VirusTypes cause instant death and bypass MEMBRANE_SHIELD. */
const VIRUS_TYPE_SET = new Set<string | number>(VirusTypes);

type RegisterTimeout = (id: ReturnType<typeof setTimeout>) => void;

export function createDamageActions(set: Set, get: Get, registerGameplayTimeout: RegisterTimeout) {
    return {
        takeDamage: (obj?: { type?: string | number }) => {
            const { isImmortalityActive, isInvincible, shieldActive } = get();

            // GDD: Viruses bypass shield — instant death
            const ignoresShield = !!obj?.type && VIRUS_TYPE_SET.has(obj.type);

            if (shieldActive && !ignoresShield) {
                // Use state callback so speedBoostActive is read from the same snapshot
                // as the write — concurrent updateSpeedBoostTimer() could change it.
                set(s => ({
                    shieldActive: false,
                    shieldTimer: 0,
                    isImmortalityActive: s.speedBoostActive,
                }));
                eventBus.emit('player:membrane_pop', undefined as void);
                eventBus.emit('system:play-sound', { sound: 'membrane_pop', volume: 0.8 });
                return;
            }

            if (!ignoresShield && (isImmortalityActive || isInvincible)) return;

            // Capture outcome flags for post-set side-effects — keeps the updater pure.
            // A sentinel of -1 means the updater bailed out (lives was already 0).
            let hitLives = -1;
            let willDie = false;

            // finalLives and maxLives are computed INSIDE set(s => ...) from the same
            // snapshot to prevent a double-damage race when two collisions fire in the
            // same render frame (both would see the pre-damage `lives` value otherwise).
            set(s => {
                if (s.lives <= 0) return {};
                const finalLives = ignoresShield ? 0 : Math.max(0, s.lives - 1);
                const dying = finalLives <= 0;

                // Capture for post-set emission (no side-effects inside updater).
                hitLives = finalLives;
                willDie = dying;

                return {
                    lives: safeClamp(finalLives, 0, s.maxLives, 0),
                    combo: 0,
                    multiplier: 1,
                    speed: safeClamp(
                        Math.max(GAMEPLAY_CONFIG.MIN_SPEED, s.speed * 0.75),
                        GAMEPLAY_CONFIG.MIN_SPEED,
                        GAMEPLAY_CONFIG.MAX_SPEED,
                        GAMEPLAY_CONFIG.MIN_SPEED
                    ),
                    // Invincibility frames only when the player survives the hit
                    isInvincible: !dying,
                    invincibilityTimer: dying ? 0 : 2.5,
                    nearestEnemyDistance: 999,
                    ...(dying ? { deathTimer: 1.0 } : {}),
                };
            });

            // Guard: updater returned {} because lives was already 0 — no events to fire.
            if (hitLives < 0) return;

            eventBus.emit('player:hit', { lives: hitLives, damage: 1 });
            if (willDie) {
                eventBus.emit('player:death', { score: get().score, distance: get().distance });
            }
        },

        jump: () => {
            eventBus.emit('player:jump_input', undefined);
        },

        stopJump: () => {
            eventBus.emit('player:stop_jump', undefined);
        },

        dash: () => {
            const state = get();
            if (state.dashCooldown <= 0 && !state.isDashing) {
                // Use gameClock (seconds) instead of performance.now() — deterministic
                const gameClock = state.gameClock;
                let newChain = 1;
                // Dash chain window: 1.0 second
                if (state.lastDashTime !== undefined && (gameClock - state.lastDashTime) < 1.0) {
                    newChain = (state.dashChainCount || 0) + 1;
                }

                set({
                    isDashing: true,
                    isInvincible: true,
                    dashCooldown: 2.0,
                    lastDashTime: gameClock,
                    dashChainCount: newChain
                });

                eventBus.emit('player:dash', { chain: newChain });
                if (newChain > 1) {
                    eventBus.emit('player:dash-chain', undefined);
                }

                // t1 ends the dash state. t2 clears dash-based invincibility — but only if
                // no hit-based invincibility frames are still running (invincibilityTimer > 0).
                // Using state callbacks prevents these timeouts from overwriting concurrent
                // state changes (e.g. a virus hit granting 2.5s of invincibility).
                const t1 = setTimeout(() => set(() => ({ isDashing: false })), 400);
                const t2 = setTimeout(() => set(s => ({
                    isInvincible: s.invincibilityTimer > 0 || s.isDashing,
                })), 600);
                registerGameplayTimeout(t1);
                registerGameplayTimeout(t2);
            }
        },

        updateDashCooldown: (delta: number) => {
            set((state) => ({
                dashCooldown: Math.max(0, state.dashCooldown - delta)
            }));
        },

        updateInvincibilityTimer: (delta: number) => {
            const { invincibilityTimer, isInvincible } = get();
            if (invincibilityTimer <= 0 && !isInvincible) return;
            // Compute newTimer inside set(s => ...) so a concurrent revive() that sets
            // invincibilityTimer:2.0 cannot be overwritten by a stale pre-computed value.
            set(s => {
                if (s.invincibilityTimer <= 0 && !s.isInvincible) return {};
                const newTimer = Math.max(0, s.invincibilityTimer - delta);
                return {
                    invincibilityTimer: newTimer,
                    isInvincible: newTimer > 0 || s.isDashing,
                };
            });
        },

        updateDeathTimer: (delta: number) => {
            const { deathTimer } = get();
            if (deathTimer <= 0) return;
            // Atomic: merge the timer decrement and the status transition into one set(s => ...)
            // so (a) we never have an intermediate frame where deathTimer=0 but status=PLAYING,
            // and (b) a concurrent revive() that resets deathTimer:0 is not overwritten.
            set(s => {
                if (s.deathTimer <= 0) return {};
                const newTimer = Math.max(0, s.deathTimer - delta);
                return newTimer === 0
                    ? { deathTimer: 0, status: GameStatus.GAME_OVER }
                    : { deathTimer: newTimer };
            });
        },
    };
}
