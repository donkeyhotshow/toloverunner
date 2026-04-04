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
            eventBus.emit('player:collect', { type: 'shield' });
        },

        activateMagnet: () => {
            set({
                magnetActive: true,
                magnetTimer: 10
            });
            eventBus.emit('player:collect', { type: 'magnet' });
        },

        updateShieldTimer: (delta: number) => {
            const { shieldTimer, shieldActive } = get();
            if (!shieldActive) return;
            const newTimer = Math.max(0, shieldTimer - delta);
            if (newTimer === 0) {
                set({ shieldTimer: 0, shieldActive: false, isImmortalityActive: get().speedBoostActive });
            } else {
                set({ shieldTimer: newTimer });
            }
        },

        updateMagnetTimer: (delta: number) => {
            const { magnetTimer, magnetActive } = get();
            if (!magnetActive) return;
            const newTimer = Math.max(0, magnetTimer - delta);
            set({ magnetTimer: newTimer, magnetActive: newTimer > 0 });
        },
    };
}
