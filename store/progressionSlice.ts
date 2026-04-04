import { StateCreator } from 'zustand';
import { GameState } from './storeTypes';
import { ProgressionSystem } from '../core/progression/ProgressionSystem';
import { debugLog } from '../utils/debug';

export interface ProgressionSlice {
    level: number;
    currentXP: number;
    maxXP: number;
    addXP: (amount: number) => void;
    syncProgression: () => void;
}

const sys = ProgressionSystem.getInstance();

export const createProgressionSlice: StateCreator<GameState, [], [], ProgressionSlice> = (set) => ({
    level: sys.getState().level,
    currentXP: sys.getState().currentXP,
    maxXP: sys.getXPForNextLevel(sys.getState().level),

    addXP: (amount: number) => {
        const result = sys.addXP(amount);
        const newState = sys.getState();

        set({
            level: newState.level,
            currentXP: newState.currentXP,
            maxXP: sys.getXPForNextLevel(newState.level)
        });

        if (result.leveledUp) {
            debugLog('🎉 LEVEL UP!', newState.level);
        }
    },

    syncProgression: () => {
        const state = sys.getState();
        set({
            level: state.level,
            currentXP: state.currentXP,
            maxXP: sys.getXPForNextLevel(state.level)
        });
    }
});
