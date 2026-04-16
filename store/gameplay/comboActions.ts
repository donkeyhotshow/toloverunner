/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Combo, multiplier, and combat actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GAMEPLAY_CONFIG } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

/** UP attack animation is 300ms (0.3s); DOWN is 400ms (0.4s). */
const ATTACK_TIMER_BY_DIRECTION: Readonly<Record<string, number>> = { up: 0.3, down: 0.4 };

export function createComboActions(set: Set, get: Get) {
    return {
        graze: () => {
            const state = get();
            // Use gameClock (seconds) instead of performance.now() — deterministic
            const gameClock = state.gameClock;
            // Graze debounce: 0.1 seconds (was 100ms)
            if (gameClock - state.lastGrazeTime < 0.1) return;

            set(s => ({
                score: safeClamp(s.score + 50, 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score),
                combo: safeClamp(s.combo + 1, 0, Number.MAX_SAFE_INTEGER, s.combo),
                lastGrazeTime: gameClock,
                momentum: Math.min(2.0, s.momentum + 0.05)
            }));
            eventBus.emit('player:graze', { distance: state.distance });
        },

        incrementCombo: () => {
            // Use set(s => ...) to avoid stale snapshot when resetCombo() fires concurrently
            // (e.g. player dies in the same frame a combat kill is scored).
            // Capture milestone flag outside set() so eventBus.emit stays a pure side-effect.
            let milestoneCombo = 0;
            set(s => {
                const newCount = s.combo + 1;
                const newMultiplier = 1 + Math.floor(newCount / 10) * 0.5; // +0.5x every 10 hits
                if (newCount % 10 === 0) milestoneCombo = newCount;
                return {
                    combo: newCount,
                    multiplier: newMultiplier,
                    comboTimer: 3.5,
                    speedLinesActive: newCount >= 10,
                };
            });
            if (milestoneCombo > 0) {
                eventBus.emit('combat:combo_milestone', { combo: milestoneCombo });
            }
        },

        resetCombo: () => {
            set({
                combo: 0,
                multiplier: 1,
                comboTimer: 0,
                speedLinesActive: false
            });
            eventBus.emit('combat:combo_reset', undefined);
        },

        updateCombo: (delta: number) => {
            // Read state inside set(s => ...) to prevent stale values when setAttack() or
            // resetCombo() runs concurrently within the same render frame.
            // Capture comboExpired flag outside so eventBus.emit stays a pure side-effect.
            let didComboExpire = false;
            set(s => {
                const hasComboTimer = s.comboTimer > 0;
                const hasAttackTimer = s.attackTimer > 0;
                if (!hasComboTimer && !hasAttackTimer) return {};

                const newComboTimer = hasComboTimer ? Math.max(0, s.comboTimer - delta) : s.comboTimer;
                const newAttackTimer = hasAttackTimer ? Math.max(0, s.attackTimer - delta) : s.attackTimer;

                const comboExpired = hasComboTimer && newComboTimer === 0 && s.combo > 0;
                const attackExpired = hasAttackTimer && newAttackTimer === 0;

                if (comboExpired) didComboExpire = true;

                return {
                    comboTimer: newComboTimer,
                    attackTimer: newAttackTimer,
                    ...(attackExpired ? { attackState: 'none' } : {}),
                    ...(comboExpired ? { combo: 0, multiplier: 1, speedLinesActive: false } : {}),
                };
            });
            if (didComboExpire) {
                eventBus.emit('combat:combo_reset', undefined);
            }
        },

        setAttack: (attackState: 'none' | 'up' | 'down') => {
            // UP attack animation is 300ms (0.3s); DOWN is 400ms (0.4s).
            // ATTACK_TIMER_BY_DIRECTION is defined outside this function to avoid re-allocation
            // on every setAttack() call in the hot combat path.
            set({
                attackState,
                attackTimer: ATTACK_TIMER_BY_DIRECTION[attackState] ?? 0,
            });
            if (attackState === 'up') {
                eventBus.emit('combat:attack_up', undefined);
            } else if (attackState === 'down') {
                eventBus.emit('combat:attack_down', undefined);
            }
        },
    };
}
