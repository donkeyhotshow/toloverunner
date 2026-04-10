/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, UISlice } from './storeTypes';
import { GameStatus } from '../types';
import { unifiedAudio } from '../core/audio/UnifiedAudioManager';

export const createUISlice: StateCreator<GameState, [], [], UISlice> = (set, get) => ({
     status: GameStatus.MENU,
     isMusicEnabled: false,
     menuOpen: true,
     shopOpen: false,
     currentModal: null,
     showDebug: false,
     gameSceneReady: false,
     showPopups: true,
     zenMode: true,
     vitalityPulse: 0,


     setStatus: (status) => set({
         status,
         menuOpen: status === GameStatus.MENU,
         shopOpen: status === GameStatus.SHOP || status === GameStatus.SHOWCASE // Keep menu logic simple
     }),

     setGameSceneReady: (value) => set({ gameSceneReady: value }),

     toggleMenu: () => {
         const current = get().status;
         if (current === GameStatus.MENU) {
             // Already in menu
         } else {
             set({ status: GameStatus.MENU, menuOpen: true, shopOpen: false });
         }
     },


     toggleShop: () => {
         const current = get().status;
         if (current === GameStatus.SHOP) {
             set({ status: GameStatus.MENU, shopOpen: false, menuOpen: true });
         } else {
             set({ status: GameStatus.SHOP, shopOpen: true, menuOpen: false });
         }
     },

     openModal: (id) => set({ currentModal: id }),
     closeModal: () => set({ currentModal: null }),

     toggleMusic: (force) => {
         const next = force !== undefined ? force : !get().isMusicEnabled;
         set({ isMusicEnabled: next });
         unifiedAudio.toggleMusic(next);
     },

     toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),

     setShowPopups: (value) => set({ showPopups: value }),
     setZenMode: (value) => set({ zenMode: value }),
     setVitalityPulse: (pulse) => set({ vitalityPulse: pulse }),

     // Legacy/Convenience Actions

     openShop: () => set({ status: GameStatus.SHOP, shopOpen: true, menuOpen: false }),
     closeShop: () => set({ status: GameStatus.MENU, shopOpen: false, menuOpen: true })
 });
