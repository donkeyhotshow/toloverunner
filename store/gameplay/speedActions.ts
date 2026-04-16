/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Speed, distance, and slow-down actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 *
 * ARCHITECTURE (v2.6 — deterministic):
 *   `baseSpeed`   — progression speed driven by distance/time; never modified by powerups.
 *   `slowEffects` — array of active slow modifiers with `remainingTime` (seconds).
 *                   No wall-clock timestamps — fully deterministic with fixed dt.
 *   `speed`       — derived: baseSpeed × boostFactor × min(slowFactors).
 *
 *   Key invariants:
 *   1. computeEffectiveSpeed is a pure function — no side-effects, no time dependency.
 *   2. All timing uses gameClock (accumulated fixed-dt ticks), never performance.now().
 *   3. updateSlowEffects(dt) decrements remainingTime and recomputes speed deterministically.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GAMEPLAY_CONFIG, SPEED_BOOST_FACTOR } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp, safeNumber } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

type RegisterTimeout = (id: ReturnType<typeof setTimeout>) => void;

/**
 * Compute the final `speed` from `baseSpeed` + active modifiers.
 *
 * Pure function — no side-effects, no wall-clock time dependency.
 * Filters slow effects by `remainingTime > 0` (deterministic countdown).
 */
export function computeEffectiveSpeed(
    baseSpeed: number,
    boostActive: boolean,
    slows: ReadonlyArray<{ factor: number; remainingTime: number }>
): number {
    const boostFactor = boostActive ? SPEED_BOOST_FACTOR : 1;
    const slowFactor = slows
        .filter(e => e.remainingTime > 0)
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
         * Duration is in milliseconds (API-compatible) but stored as seconds internally.
         * No performance.now() — remainingTime is decremented by fixed dt each tick.
         */
        slowDown: (factor = 0.5, duration = 2000) => {
            // Guard: factor must be in (0, 1] — values > 1 would speed up, < 0 are nonsensical.
            const safeFactor = Math.max(0.01, Math.min(1, factor));
            // Guard: duration must be positive (at least 1ms); convert ms → seconds for internal storage.
            const safeDurationSec = Math.max(0.001, duration / 1000);
            set(s => {
                const active = s.slowEffects.filter(e => e.remainingTime > 0);
                const next = [...active, { factor: safeFactor, remainingTime: safeDurationSec }];
                return {
                    slowEffects: next,
                    speed: computeEffectiveSpeed(s.baseSpeed, s.speedBoostActive, next),
                };
            });
        },

        /**
         * Decrement remainingTime on all active slow effects by dt (seconds).
         * Removes expired effects and recomputes speed.
         * Called once per fixed tick — deterministic, no wall-clock dependency.
         *
         * Fully inside set(s => ...) to avoid stale closures when slowDown() is
         * called concurrently (e.g. two slows applied in the same render frame).
         */
        updateSlowEffects: (dt: number) => {
            if (!get().slowEffects.length) return;
            set(s => {
                if (!s.slowEffects.length) return {};
                const updated = s.slowEffects.map(e => ({ ...e, remainingTime: e.remainingTime - dt }));
                const active = updated.filter(e => e.remainingTime > 0);
                if (active.length !== s.slowEffects.length) {
                    return {
                        slowEffects: active,
                        speed: computeEffectiveSpeed(s.baseSpeed, s.speedBoostActive, active),
                    };
                }
                // All still active — just update remainingTime values (no speed recompute needed)
                return { slowEffects: updated };
            });
        },

        /**
         * Activate the speed-boost powerup using a multiplier on baseSpeed.
         * When the boost expires, speed is restored to baseSpeed × slowFactor.
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
            if (!get().speedBoostActive) return;
            // Compute newTimer inside set() so concurrent activateSpeedBoost() resets are
            // never overwritten by a stale value read before the set() call.
            set(s => {
                if (!s.speedBoostActive) return {};
                const newTimer = Math.max(0, s.speedBoostTimer - delta);
                if (newTimer === 0) {
                    return {
                        speedBoostTimer: 0,
                        speedBoostActive: false,
                        isSpeedBoostActive: false,
                        isImmortalityActive: s.shieldActive,
                        speed: computeEffectiveSpeed(s.baseSpeed, false, s.slowEffects),
                    };
                }
                return { speedBoostTimer: newTimer };
            });
        },

        collectCoin: (points = 5) => {
            // Capture gameClock once — it's monotonically increasing and safe to read
            // outside set() because it only grows and is never reset mid-frame.
            const gameClock = get().gameClock;

            // Compute side-effect values before set() so the updater stays a pure function.
            // Zustand (and React 18 Strict Mode) may call updaters more than once for validation;
            // emitting events inside the updater would double-fire particles/sounds/score.
            let emitPerfect = false;
            let emitCollectPoints = 0;
            let emitCollectColor = '#ffffff';

            set((s) => {
                const timeSinceLastCollect = gameClock - s.lastCollectTime;
                // Perfect timing window: 0.5 seconds
                const perfectTiming =
                    timeSinceLastCollect < 0.5 && timeSinceLastCollect > 0 && s.lastCollectTime > 0;
                const bonus = perfectTiming ? 50 : 0;

                const newCombo = s.combo + 1;
                const newMultiplier = Math.floor(newCombo / 5) + 1;
                const finalPoints = (points + bonus) * newMultiplier;

                // Coin collection nudges baseSpeed by a tiny fixed amount (not speed directly).
                const newBaseSpeed = Math.min(GAMEPLAY_CONFIG.MAX_SPEED, s.baseSpeed + 0.012);
                const newMomentum = Math.min(2.0, s.momentum + 0.012);

                // Capture event payload for post-set emission (no side-effects in updater).
                emitPerfect = perfectTiming;
                emitCollectPoints = finalPoints;
                emitCollectColor = perfectTiming ? '#FFD700' : '#ffffff';

                return {
                    score: safeClamp(s.score + finalPoints, 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score),
                    genesCollected: s.genesCollected + 5,
                    combo: newCombo,
                    maxCombo: Math.max(s.maxCombo, newCombo),
                    multiplier: newMultiplier,
                    lastCollectTime: gameClock,
                    perfectTimingBonus: perfectTiming ? bonus : 0,
                    baseSpeed: newBaseSpeed,
                    speed: computeEffectiveSpeed(newBaseSpeed, s.speedBoostActive, s.slowEffects),
                    momentum: newMomentum,
                };
            });

            // Emit after set() has resolved — guaranteed single emission per collectCoin() call.
            if (emitPerfect) {
                eventBus.emit('player:perfect', { bonus: 50 });
            }
            eventBus.emit('player:collect', {
                type: 'coin',
                points: emitCollectPoints,
                color: emitCollectColor,
            });
        },

        bacteriaJumpBonus: () => {
            get().addScore(10);
            eventBus.emit('player:collect', { type: 'bonus', points: 10, color: '#00FF00' });
        },
    };
}

