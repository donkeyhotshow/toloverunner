/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Speed, distance, and slow-down actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 *
 * ARCHITECTURE (v2.5):
 *   `baseSpeed`  — progression speed driven by time/distance; never modified by powerups.
 *   `slowEffects`— array of active slow modifiers with expiry timestamps.
 *   `speed`      — derived value: baseSpeed × boostFactor × min(slowFactors).
 *
 *   This prevents the two classic race conditions:
 *   1. Overlapping slowDown() calls restoring to the wrong speed.
 *   2. Speed-boost expiry dropping speed below current progression level.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GAMEPLAY_CONFIG, SPEED_BOOST_FACTOR } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp, safeNumber } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

type RegisterTimeout = (id: ReturnType<typeof setTimeout>) => void;

/** Compute the final `speed` from `baseSpeed` + active modifiers. Pure function, no side-effects. */
export function computeEffectiveSpeed(
    baseSpeed: number,
    boostActive: boolean,
    slows: ReadonlyArray<{ factor: number; expiresAt: number }>
): number {
    const now = performance.now();
    const boostFactor = boostActive ? SPEED_BOOST_FACTOR : 1;
    const slowFactor = slows
        .filter(e => e.expiresAt > now)
        .reduce((min, s) => Math.min(min, s.factor), 1);
    return safeClamp(
        baseSpeed * boostFactor * slowFactor,
        GAMEPLAY_CONFIG.MIN_SPEED,
        GAMEPLAY_CONFIG.MAX_SPEED,
        baseSpeed
    );
}

export function createSpeedActions(set: Set, get: Get, _registerGameplayTimeout: RegisterTimeout) {
    return {
        addDistance: (meters: number) => {
            const safeMeters = safeNumber(meters, 0);
            set(s => ({
                distance: safeClamp(s.distance + safeMeters, 0, Number.MAX_SAFE_INTEGER, s.distance),
                score: safeClamp(s.score + Math.floor(safeMeters), 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score)
            }));
        },

        /**
         * Apply a temporary speed-reduction modifier.
         * Uses a timestamp-based expiry system to handle overlapping slow effects
         * correctly — no race conditions from nested setTimeout callbacks.
         */
        slowDown: (factor = 0.5, duration = 2000) => {
            const now = performance.now();
            const expiresAt = now + duration;
            set(s => {
                const active = s.slowEffects.filter(e => e.expiresAt > now);
                const next = [...active, { factor, expiresAt }];
                return {
                    slowEffects: next,
                    speed: computeEffectiveSpeed(s.baseSpeed, s.speedBoostActive, next),
                };
            });
        },

        /**
         * Remove expired slow effects and recompute speed.
         * Should be called once per game tick from the game loop.
         */
        updateSlowEffects: () => {
            const { slowEffects } = get();
            if (!slowEffects.length) return;
            const now = performance.now();
            const active = slowEffects.filter(e => e.expiresAt > now);
            if (active.length !== slowEffects.length) {
                set(s => ({
                    slowEffects: active,
                    speed: computeEffectiveSpeed(s.baseSpeed, s.speedBoostActive, active),
                }));
            }
        },

        /**
         * Activate the speed-boost powerup using a multiplier on baseSpeed
         * instead of a hardcoded additive value (+15).  When the boost expires,
         * speed is restored to baseSpeed × slowFactor — never below progression.
         */
        activateSpeedBoost: () => {
            set(s => ({
                isSpeedBoostActive: true,
                speedBoostActive: true,
                speedBoostTimer: 5,
                isImmortalityActive: true,
                speed: computeEffectiveSpeed(s.baseSpeed, true, s.slowEffects),
            }));
            eventBus.emit('player:boost', undefined);
        },

        updateSpeedBoostTimer: (delta: number) => {
            const { speedBoostTimer, speedBoostActive } = get();
            if (!speedBoostActive) return;
            const newTimer = Math.max(0, speedBoostTimer - delta);
            if (newTimer === 0) {
                set(s => ({
                    speedBoostTimer: 0,
                    speedBoostActive: false,
                    isSpeedBoostActive: false,
                    isImmortalityActive: s.shieldActive,
                    speed: computeEffectiveSpeed(s.baseSpeed, false, s.slowEffects),
                }));
            } else {
                set({ speedBoostTimer: newTimer });
            }
        },

        collectCoin: (points = 5) => {
            const state = get();
            const now = performance.now();
            const timeSinceLastCollect = now - state.lastCollectTime;

            let bonus = 0;
            let perfectTiming = false;
            if (timeSinceLastCollect < 500 && timeSinceLastCollect > 0 && state.lastCollectTime > 0) {
                bonus = 50;
                perfectTiming = true;
            }

            const newCombo = state.combo + 1;
            const newMultiplier = Math.floor(newCombo / 5) + 1;
            const finalPoints = (points + bonus) * newMultiplier;

            get().addScore(finalPoints);

            // Coin collection nudges baseSpeed by a tiny fixed amount (not speed directly).
            const newBaseSpeed = Math.min(GAMEPLAY_CONFIG.MAX_SPEED, state.baseSpeed + 0.012);
            const momentumIncrement = Math.min(2.0, state.momentum + 0.012);

            set((s) => ({
                genesCollected: s.genesCollected + 5,
                combo: newCombo,
                maxCombo: Math.max(s.maxCombo, newCombo),
                multiplier: newMultiplier,
                lastCollectTime: now,
                perfectTimingBonus: perfectTiming ? bonus : 0,
                baseSpeed: newBaseSpeed,
                speed: computeEffectiveSpeed(newBaseSpeed, s.speedBoostActive, s.slowEffects),
                momentum: momentumIncrement,
            }));

            eventBus.emit('player:collect', { type: 'coin', points: finalPoints, color: perfectTiming ? '#FFD700' : '#ffffff' });

            if (perfectTiming) {
                eventBus.emit('player:perfect', { bonus });
            }
        },

        bacteriaJumpBonus: () => {
            get().addScore(10);
            eventBus.emit('player:collect', { type: 'bonus', points: 10, color: '#00FF00' });
        },
    };
}
