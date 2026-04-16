/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Shield, magnet, and invincibility powerup actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { eventBus } from '../../utils/eventBus';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

export function createPowerupActions(set: Set, get: Get) {
    return {
        activateShield: () => {
            set({
                isImmortalityActive: true,
                shieldActive: true,
                shieldTimer: 10
            });
            eventBus.emit('player:collect', { type: 'shield', points: 0 });
        },

        activateMagnet: () => {
            set({
                magnetActive: true,
                magnetTimer: 10
            });
            eventBus.emit('player:collect', { type: 'magnet', points: 0 });
        },

        updateShieldTimer: (delta: number) => {
            if (!get().shieldActive) return;
            // Compute newTimer inside set(s => ...) to prevent concurrent activateShield()
            // calls from being silently overwritten by a stale pre-computed value.
            set(s => {
                if (!s.shieldActive) return {};
                const newTimer = Math.max(0, s.shieldTimer - delta);
                if (newTimer === 0) {
                    return { shieldTimer: 0, shieldActive: false, isImmortalityActive: s.speedBoostActive };
                }
                return { shieldTimer: newTimer };
            });
        },

        updateMagnetTimer: (delta: number) => {
            if (!get().magnetActive) return;
            set(s => {
                if (!s.magnetActive) return {};
                const newTimer = Math.max(0, s.magnetTimer - delta);
                return { magnetTimer: newTimer, magnetActive: newTimer > 0 };
            });
        },
    };
}
