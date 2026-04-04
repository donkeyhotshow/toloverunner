/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, PersistenceSlice } from './storeTypes';
import { PLAYER_COLORS } from '../constants';
import { saveManager } from '../core/persistence/SaveManager';
import { debugLog, debugWarn } from '../utils/debug';

export const createPersistenceSlice: StateCreator<GameState, [], [], PersistenceSlice> = (set, get) => {
    return {
        stats: {
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            bestScore: 0,
            totalScore: 0,
            totalPlayTime: 0
        },
        playerColor: PLAYER_COLORS[0] || 'default',

        loadData: () => {
            try {
                // Используем новый SaveManager с версионированием и миграцией
                const data = saveManager.load();

                set({
                    hasDoubleJump: data.upgrades.hasDoubleJump,
                    hasImmortality: data.upgrades.hasImmortality,
                    maxLives: data.upgrades.maxLives,
                    magnetLevel: data.upgrades.magnetLevel,
                    luckLevel: data.upgrades.luckLevel,
                    stats: {
                        wins: data.stats.wins,
                        losses: data.stats.losses,
                        gamesPlayed: data.stats.gamesPlayed,
                        bestScore: data.stats.bestScore,
                        totalScore: data.stats.totalScore,
                        totalPlayTime: data.stats.totalPlayTime
                    },
                    playerColor: data.preferences.playerColor || 'default',
                    genesCollected: data.genesCollected,
                    seed: data.seed,
                    characterType: data.preferences.characterType,
                    showPopups: data.preferences.showPopups ?? true
                });

                debugLog(`📦 Loaded save data v${data.version}`);
            } catch (e) {
                debugWarn('Failed to load save data', e);
            }
        },

        endGameSession: (finalScore: number, durationMs: number) => {
            const stats = { ...get().stats };
            stats.gamesPlayed += 1;
            stats.totalScore += finalScore;
            stats.totalPlayTime += durationMs;

            const isNewRecord = finalScore > stats.bestScore;
            if (isNewRecord) {
                stats.bestScore = finalScore;
            }

            set({ stats });

            // Используем новый SaveManager
            saveManager.updateStats({
                gamesPlayed: stats.gamesPlayed,
                totalScore: stats.totalScore,
                totalPlayTime: stats.totalPlayTime,
                bestScore: stats.bestScore
            });

            get().saveData(true);
        },

        saveData: (force = false) => {
            const state = get();

            // Сохраняем через новый SaveManager с версионированием
            saveManager.save({
                stats: {
                    ...state.stats,
                    totalCoinsCollected: 0,
                    totalEnemiesAvoided: 0,
                    longestCombo: 0,
                    perfectTimings: 0
                },
                upgrades: {
                    hasDoubleJump: state.hasDoubleJump,
                    hasImmortality: state.hasImmortality,
                    magnetLevel: state.magnetLevel,
                    luckLevel: state.luckLevel,
                    maxLives: state.maxLives
                },
                preferences: {
                    playerColor: state.playerColor,
                    characterType: state.characterType,
                    musicVolume: 0.5,
                    sfxVolume: 0.8,
                    hapticEnabled: true,
                    language: 'en',
                    showPopups: state.showPopups
                },
                genesCollected: state.genesCollected,
                seed: state.seed
            }, force);
        },

        clearData: () => {
            saveManager.clear();
            window.location.reload();
        },

        setPlayerColor: (color) => {
            set({ playerColor: color });
            saveManager.updatePreferences({ playerColor: color });
        },

        buyItem: (id, cost) => {
            const { genesCollected } = get();
            if (genesCollected >= cost) {
                set({ genesCollected: genesCollected - cost });

                if (id === 'DOUBLE_JUMP') {
                    set({ hasDoubleJump: true });
                    saveManager.updateUpgrades({ hasDoubleJump: true });
                }
                if (id === 'MAGNET_UP') {
                    set(s => ({ magnetLevel: Math.min(5, s.magnetLevel + 1) }));
                    saveManager.updateUpgrades({ magnetLevel: Math.min(5, get().magnetLevel) });
                }
                if (id === 'LUCK_UP') {
                    set(s => ({ luckLevel: Math.min(3, s.luckLevel + 1) }));
                    saveManager.updateUpgrades({ luckLevel: Math.min(3, get().luckLevel) });
                }
                if (id === 'MAX_LIFE') {
                    set(s => ({ maxLives: s.maxLives + 1, lives: s.lives + 1 }));
                    saveManager.updateUpgrades({ maxLives: get().maxLives });
                }
                if (id === 'HEAL') {
                    set(s => ({ lives: Math.min(s.maxLives, s.lives + 1) }));
                }

                get().saveData(true);
            }
        },
    };
};
