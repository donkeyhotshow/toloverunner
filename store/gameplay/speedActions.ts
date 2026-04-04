/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Speed, distance, and slow-down actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp, safeNumber } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

/** Registers a timeout so it can be cancelled on reset. Passed in from parent slice. */
type RegisterTimeout = (id: ReturnType<typeof setTimeout>) => void;

export function createSpeedActions(set: Set, get: Get, registerGameplayTimeout: RegisterTimeout) {
    return {
        addDistance: (meters: number) => {
            const safeMeters = safeNumber(meters, 0);
            set(s => ({
                distance: safeClamp(s.distance + safeMeters, 0, Number.MAX_SAFE_INTEGER, s.distance),
                score: safeClamp(s.score + Math.floor(safeMeters), 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score)
            }));
        },

        slowDown: (factor = 0.5, duration = 2000) => {
            const state = get();
            const originalSpeed = state.speed;
            set({ speed: originalSpeed * factor });

            const t = setTimeout(() => {
                set(s => ({ speed: Math.max(s.speed, originalSpeed) }));
            }, duration);
            registerGameplayTimeout(t);
        },

        activateSpeedBoost: () => {
            set({
                speed: RUN_SPEED_BASE + 15,
                isSpeedBoostActive: true,
                speedBoostActive: true,
                speedBoostTimer: 5,
                isImmortalityActive: true
            });
        },

        updateSpeedBoostTimer: (delta: number) => {
            const { speedBoostTimer, speedBoostActive, speed } = get();
            if (!speedBoostActive) return;
            const newTimer = Math.max(0, speedBoostTimer - delta);
            if (newTimer === 0) {
                set({
                    speed: Math.max(RUN_SPEED_BASE, speed - 15),
                    speedBoostTimer: 0,
                    speedBoostActive: false,
                    isSpeedBoostActive: false,
                    isImmortalityActive: get().shieldActive
                });
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
                // Perfect-timing bonus: 50pts (halved from original 100 — base coin value is 5, not 10)
                bonus = 50;
                perfectTiming = true;
            }

            const newCombo = state.combo + 1;
            const newMultiplier = Math.floor(newCombo / 5) + 1;
            const finalPoints = (points + bonus) * newMultiplier;

            get().addScore(finalPoints);

            // Fixed-point math to avoid floating point drift over long sessions
            const speedIncrement = (Math.round(state.speed * 1000) + 12) / 1000;
            const momentumIncrement = (Math.round(state.momentum * 1000) + 12) / 1000;

            set((s) => ({
                genesCollected: s.genesCollected + 5,
                combo: newCombo,
                maxCombo: Math.max(s.maxCombo, newCombo),
                multiplier: newMultiplier,
                lastCollectTime: now,
                perfectTimingBonus: perfectTiming ? bonus : 0,
                speed: Math.min(GAMEPLAY_CONFIG.MAX_SPEED, speedIncrement),
                momentum: Math.min(2.0, momentumIncrement)
            }));

            eventBus.emit('player:collect', { type: 'coin', points: finalPoints, color: perfectTiming ? '#FFD700' : '#ffffff' });

            if (perfectTiming) {
                window.dispatchEvent(new CustomEvent('perfect-timing', { detail: { bonus } }));
            }
        },

        bacteriaJumpBonus: () => {
            get().addScore(10);
            eventBus.emit('player:collect', { type: 'bonus', points: 10, color: '#00FF00' });
        },
    };
}
