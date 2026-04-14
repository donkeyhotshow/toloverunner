/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, SessionSlice } from './storeTypes';
import { GameStatus, GameMode, BiomeType } from '../types';
import { ProceduralSystem } from '../components/System/Procedural';
import { RUN_SPEED_BASE, GAMEPLAY_CONFIG, INITIAL_LIVES } from '../constants';
import { unifiedAudio } from '../core/audio/UnifiedAudioManager';
import { debugLog } from '../utils/debug';
import { safeClamp, safeNumber } from '../utils/safeMath';
import { computeEffectiveSpeed } from './gameplay/speedActions';

export const createSessionSlice: StateCreator<GameState, [], [], SessionSlice> = (set, get) => {
    const initialSeed = Math.random().toString(36).substring(2, 15);
    const procGen = new ProceduralSystem(initialSeed);

    return {
        score: 0,
        lives: INITIAL_LIVES,
        maxLives: INITIAL_LIVES,
        speed: RUN_SPEED_BASE,
        distance: 0,
        status: GameStatus.MENU,

        seed: initialSeed,
        procGen,
        biome: BiomeType.FALLOPIAN_TUBE,
        laneCount: 5,

        sessionStartTime: 0,
        timePlayed: 0,
        gameClock: 0,
        nearestEnemyDistance: 999,
        difficultyMultiplier: 1,

        // 🆕 TDI
        tdi: 0,
        visibleObstacles: 0,

        initGame: () => {
            get().loadData();
        },

        startGame: (mode = GameMode.ENDLESS) => {
            debugLog("Starting countdown sequence...");
            unifiedAudio.init();
            set({
                status: GameStatus.COUNTDOWN,
                gameMode: mode,
                lives: get().maxLives,
                score: 0,
                distance: 0
            });
        },

        setGameMode: (mode: GameMode) => set({ gameMode: mode }),

        startGameplay: () => {
            debugLog("⭐ startGameplay() CALLED");
            get().clearPendingGameplayTimeouts?.();
            const { maxLives, characterType } = get();
            const newSeed = Math.random().toString(36).substring(2, 15);

            get().procGen.init(newSeed);

            set({
                status: GameStatus.PLAYING,
                score: 0,
                lives: maxLives,
                speed: RUN_SPEED_BASE,
                baseSpeed: RUN_SPEED_BASE,   // reset progression speed
                slowEffects: [],              // clear all slow effects
                distance: 0,
                sessionStartTime: Date.now(),
                timePlayed: 0,
                gameClock: 0,
                seed: newSeed,
                localPlayerState: { ...get().localPlayerState, characterType },
                // Reset gameplay flags
                isImmortalityActive: false,
                isSpeedBoostActive: false,
                shieldActive: false,
                shieldTimer: 0,
                magnetActive: false,
                magnetTimer: 0,
                speedBoostActive: false,
                speedBoostTimer: 0,
                lastCollectTime: 0,
                lastGrazeTime: 0,
                lastDashTime: undefined,
                perfectTimingBonus: 0,
                combo: 0,
                multiplier: 1,
                dashCooldown: 0,
                isDashing: false,
                isInvincible: false,
                invincibilityTimer: 0,
                deathTimer: 0,          // Guard: prevent updateDeathTimer from triggering GAME_OVER on rapid restart
                nearestEnemyDistance: 999,
                // Reset TDI
                tdi: 0,
                visibleObstacles: 0
            });
        },

        resetGame: () => {
            get().clearPendingGameplayTimeouts?.();
            set({
                score: 0,
                lives: get().maxLives,
                distance: 0,
                status: GameStatus.MENU
            });
        },

        restartGame: () => {
            get().startGame(get().gameMode);
        },

        revive: () => {
            const { gems, status } = get();
            if (status === GameStatus.GAME_OVER && gems >= 1) {
                set({
                    status: GameStatus.PLAYING,
                    lives: 1,
                    gems: gems - 1,
                    // Use the timer system — NOT a raw setTimeout — so updateInvincibilityTimer
                    // doesn't immediately cancel it on the next frame (when invincibilityTimer=0).
                    isInvincible: true,
                    invincibilityTimer: 2.0,
                    // Ensure deathTimer is cleared so updateDeathTimer doesn't re-trigger GAME_OVER.
                    deathTimer: 0,
                });
                return true;
            }
            return false;
        },

        /**
         * Advance game distance by `delta` meters and progression by `dt` seconds.
         * Both values must come from the game loop — no internal performance.now() calls.
         * `dt` is the fixed timestep (1/60) or accumulated safeDelta for the sync interval.
         */
        increaseDistance: (delta, dt) => {
            const safeDelta = safeNumber(delta, 0);
            const safeDt = safeNumber(dt, 0);
            if (safeDelta <= 0) return;
            set((state) => {
                const timePlayed = state.timePlayed + safeDt;

                // SPERN RUNNER 2.2.0: Швидкість(t) = 10 м/с × (1 + 0.01 × t)
                // t = 0 -> 10, t = 60 -> 16, t = 120 -> 22
                const targetBaseSpeed = RUN_SPEED_BASE * (1 + 0.01 * timePlayed);

                // Smoothly lerp baseSpeed toward target (progression-only, no powerup modifiers)
                const newBaseSpeed = safeClamp(
                    state.baseSpeed + (targetBaseSpeed - state.baseSpeed) * 0.05,
                    GAMEPLAY_CONFIG.MIN_SPEED,
                    GAMEPLAY_CONFIG.MAX_SPEED,
                    state.baseSpeed
                );

                // SPERN RUNNER 2.2.0: x2 score multiplier after ~90 seconds
                const timeMultiplier = timePlayed >= 90 ? 2 : 1;
                const earnedPoints = safeDelta * timeMultiplier;

                const progress = Math.min(1.0, (state.distance + safeDelta) / 5000);
                const expProgress = Math.pow(progress, 1.5);
                const obstacleCurve = Math.pow(progress, 2.0);
                const spawnRate = 1 + expProgress * 2.0;
                const obstacleDensity = 0.25 + (obstacleCurve * 0.55);
                const difficultyMultiplier = (spawnRate + obstacleDensity) / 2;

                return {
                    distance: safeClamp(state.distance + safeDelta, 0, Number.MAX_SAFE_INTEGER, state.distance),
                    score: safeClamp(state.score + Math.floor(earnedPoints), 0, GAMEPLAY_CONFIG.MAX_SCORE, state.score),
                    baseSpeed: newBaseSpeed,
                    // Recompute derived speed, preserving any active powerup modifiers
                    speed: computeEffectiveSpeed(newBaseSpeed, state.speedBoostActive, state.slowEffects),
                    timePlayed,
                    difficultyMultiplier
                };
            });
        },

        setDistance: (dist) => set((s) => ({ distance: safeClamp(safeNumber(dist, 0), 0, Number.MAX_SAFE_INTEGER, s.distance) })),

        updateGameTimer: (dt) => {
            // Momentum decays toward 0 over time, clamped to [0, 2.0]
            // gameClock accumulates fixed-dt ticks — used as game-clock for all gameplay timing.
            set(s => ({
                momentum: safeClamp(s.momentum - dt * 0.05, 0, 2.0, 1.0),
                gameClock: s.gameClock + dt,
            }));
        },

        addScore: (amount) => set(s => ({
            score: safeClamp(s.score + safeNumber(amount, 0), 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score)
        })),

        useLife: () => set(s => ({ lives: safeClamp(s.lives - 1, 0, s.maxLives, 0) })),

        setNearestEnemyDistance: (distance: number) => set({ nearestEnemyDistance: distance }),

        // 🆕 TDI Logic
        setVisibleObstacles: (n: number) => set({ visibleObstacles: n }),
        computeTDI: (fps: number) => set(state => {
            // Load factor depends on visible obstacles
            const loadFactor = Math.min(1, state.visibleObstacles / 20);
            
            // If FPS is dropping below target (e.g. 55), we artificially increase TDI 
            // to signal generators to back off.
            const perfFactor = fps < 55 ? 1.2 : 1.0;
            
            // Speed factor: faster speed = higher perceived density
            const speedFactor = Math.min(1.5, state.speed / RUN_SPEED_BASE);
            
            const newTdi = Math.min(1, loadFactor * perfFactor * speedFactor);
            return { tdi: newTdi };
        }),

        getDifficulty: () => {
            const state = get();
            const progress = Math.min(1.0, state.distance / 5000);
            const exponentialProgress = Math.pow(progress, 1.5);
            const obstacleDensityCurve = Math.pow(progress, 2.0);
            return {
                spawnRate: 1 + exponentialProgress * 2.0,
                virusSpeed: 1 + exponentialProgress * 0.5,
                coinRarity: Math.max(0.6, 1 - progress * 0.3),
                obstacleDensity: 0.25 + (obstacleDensityCurve * 0.55)
            };
        }
    };
};
