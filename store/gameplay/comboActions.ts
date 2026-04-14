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

export function createComboActions(set: Set, get: Get) {
    return {
        graze: () => {
            const now = performance.now();
            const state = get();
            // Use a separate graze timer so coin collection doesn't suppress graze scoring
            if (now - state.lastGrazeTime < 100) return;

            set(s => ({
                score: safeClamp(s.score + 50, 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score),
                combo: safeClamp(s.combo + 1, 0, Number.MAX_SAFE_INTEGER, s.combo),
                lastGrazeTime: now,
                momentum: Math.min(2.0, s.momentum + 0.05)
            }));
            eventBus.emit('player:graze', { distance: state.distance });
        },

        incrementCombo: () => {
            const current = get().combo;
            const newCount = current + 1;
            const newMultiplier = 1 + Math.floor(newCount / 10) * 0.5; // +0.5x every 10 hits

            set({
                combo: newCount,
                multiplier: newMultiplier,
                comboTimer: 3.5,
                speedLinesActive: newCount >= 10
            });

            if (newCount % 10 === 0) {
                eventBus.emit('combat:combo_milestone', { combo: newCount });
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
            const state = get();
            const hasComboTimer = state.comboTimer > 0;
            const hasAttackTimer = state.attackTimer > 0;
            if (!hasComboTimer && !hasAttackTimer) return;

            const newComboTimer = hasComboTimer ? Math.max(0, state.comboTimer - delta) : state.comboTimer;
            const newAttackTimer = hasAttackTimer ? Math.max(0, state.attackTimer - delta) : state.attackTimer;

            const comboExpired = hasComboTimer && newComboTimer === 0 && state.combo > 0;
            const attackExpired = hasAttackTimer && newAttackTimer === 0;

            // Single atomic set — was up to 4 separate set() calls (one per branch + resetCombo).
            set({
                comboTimer: newComboTimer,
                attackTimer: newAttackTimer,
                ...(attackExpired ? { attackState: 'none' } : {}),
                ...(comboExpired ? { combo: 0, multiplier: 1, speedLinesActive: false } : {}),
            });

            if (comboExpired) {
                eventBus.emit('combat:combo_reset', undefined);
            }
        },

        setAttack: (attackState: 'none' | 'up' | 'down') => {
            set({
                attackState,
                attackTimer: attackState !== 'none' ? 0.4 : 0
            });
            if (attackState !== 'none') {
                if (attackState === 'up') {
                    eventBus.emit('combat:attack_up', undefined);
                } else if (attackState === 'down') {
                    eventBus.emit('combat:attack_down', undefined);
                }
            }
        },
    };
}
