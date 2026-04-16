/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, PlayerSlice } from './storeTypes';
import { CharacterType } from '../types';

export const initialPlayerState = {
    lane: 0,
    isJumping: false,
    isDoubleJumping: false,
    isGrounded: true,
    isDead: false,
    isInvincible: false,
    isSliding: false,
    rotation: 0,
    position: [0, 0.5, 0] as const, // CRITICAL: Y=0.5 for stable ground
    velocity: [0, 0, 0] as const,
    characterType: CharacterType.X
};

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set, get) => ({
    localPlayerState: initialPlayerState,
    characterType: CharacterType.X,

    ownedSkins: ['default'],
    currentSkin: 'default',
    gems: 0,
    genesCollected: 0,

    particlesActive: false,
    emitPos: [0, 0, 0],

    setLocalPlayerState: (update) => set((state) => ({
        localPlayerState: { ...state.localPlayerState, ...update }
    })),

    setCharacterType: (t) => set({ characterType: t }),

    purchaseSkin: (skinId, cost) => {
        // Fast pre-check to avoid entering set() unnecessarily.
        if (get().gems < cost || get().ownedSkins.includes(skinId)) return false;

        // Re-check inside set(s => ...) so a concurrent purchaseSkin() or buyItem() call
        // in the same frame cannot double-spend gems. A `bought` flag captures whether
        // the inner guard passed so we can return the correct value and skip saveData().
        let bought = false;
        set(s => {
            if (s.gems < cost || s.ownedSkins.includes(skinId)) return {};
            bought = true;
            return {
                gems: s.gems - cost,
                ownedSkins: [...s.ownedSkins, skinId]
            };
        });
        if (!bought) return false;
        get().saveData();
        return true;
    },

    equipSkin: (skinId) => {
        const { ownedSkins } = get();
        if (ownedSkins.includes(skinId)) {
            set({ currentSkin: skinId });
            get().saveData();
        }
    },

    setParticlesActive: (active, pos) => {
        set({ particlesActive: active, ...(pos ? { emitPos: pos } : {}) });
    }
});
