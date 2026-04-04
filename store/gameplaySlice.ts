/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, GameplaySlice } from './storeTypes';
import { GameMode, GameStatus, DNACard } from '../types';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../constants';
import { eventBus } from '../utils/eventBus';
import { safeClamp, safeNumber } from '../utils/safeMath';
import { debugLog } from '../utils/debug';

const pendingGameplayTimeouts: ReturnType<typeof setTimeout>[] = [];

function registerGameplayTimeout(id: ReturnType<typeof setTimeout>): void {
    pendingGameplayTimeouts.push(id);
}

export function clearPendingGameplayTimeouts(): void {
    pendingGameplayTimeouts.forEach(clearTimeout);
    pendingGameplayTimeouts.length = 0;
}

export const createGameplaySlice: StateCreator<GameState, [], [], GameplaySlice> = (set, get) => {
    // Note: Timeout management can be moved to a helper or kept local to the slice if needed
    // For now, mirroring the logic from monolithic gameSlice

    return {
        gameMode: GameMode.ENDLESS,
        timeLeft: 0,
        momentum: 1.0,

        hasDoubleJump: false,
        hasImmortality: false,
        luckLevel: 0,

        combo: 0,
        comboTimer: 0,
        multiplier: 1.0,
        maxCombo: 0,
        lastCollectTime: 0,
        perfectTimingBonus: 0,

        dashCooldown: 0,
        isDashing: false,
        isInvincible: false,
        invincibilityTimer: 0,
        deathTimer: 0,

        magnetActive: false,
        magnetTimer: 0,
        magnetLevel: 0,
        shieldActive: false,
        shieldTimer: 0,
        speedBoostActive: false,
        speedBoostTimer: 0,
        isSpeedBoostActive: false,
        isImmortalityActive: false,

        // === DNA CARD COLLECTION v2.4.0 ===
        dnaCards: [],

        // Combat System v2.4.0 - Initial state
        attackState: 'none',
        attackTimer: 0,
        speedLinesActive: false,

        collectCoin: (points = 5) => {
            const state = get();
            const now = performance.now();
            const timeSinceLastCollect = now - state.lastCollectTime;

            let bonus = 0;
            let perfectTiming = false;
            if (timeSinceLastCollect < 500 && timeSinceLastCollect > 0 && state.lastCollectTime > 0) {
                bonus = 50; // Зменшено з 100, бо базова цінність монети тепер 5
                perfectTiming = true;
            }

            const newCombo = state.combo + 1;
            const newMultiplier = Math.floor(newCombo / 5) + 1;
            const finalPoints = (points + bonus) * newMultiplier;

            get().addScore(finalPoints);

            // Use fixed-point math to avoid floating point precision issues over time
            // Convert to integer (x1000), add increment, convert back
            const speedIncrement = (Math.round(state.speed * 1000) + 12) / 1000;
            const momentumIncrement = (Math.round(state.momentum * 1000) + 12) / 1000;

            set((s) => ({
                genesCollected: s.genesCollected + 5,
                combo: newCombo,
                maxCombo: Math.max(s.maxCombo, newCombo),
                multiplier: newMultiplier,
                lastCollectTime: now,
                perfectTimingBonus: perfectTiming ? bonus : 0,
                // Harmonious speed increase: slower build-up for longer sustain
                speed: Math.min(GAMEPLAY_CONFIG.MAX_SPEED, speedIncrement),
                momentum: Math.min(2.0, momentumIncrement)
            }));

            // Trigger EventBus
            eventBus.emit('player:collect', { type: 'coin', points: finalPoints, color: perfectTiming ? '#FFD700' : '#ffffff' });

            if (perfectTiming) {
                window.dispatchEvent(new CustomEvent('perfect-timing', { detail: { bonus } }));
            }
        },

        addDistance: (meters: number) => {
            const safeMeters = safeNumber(meters, 0);
            set(s => ({
                distance: safeClamp(s.distance + safeMeters, 0, Number.MAX_SAFE_INTEGER, s.distance),
                score: safeClamp(s.score + Math.floor(safeMeters), 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score)
            }));
        },

        bacteriaJumpBonus: () => {
            get().addScore(10);
            eventBus.emit('player:collect', { type: 'bonus', points: 10, color: '#00FF00' });
        },

        collectGene: () => {
            get().addScore(500);
            set((s) => ({
                genesCollected: s.genesCollected + 1,
                gems: s.gems + 1,
                momentum: Math.min(2.0, s.momentum + 0.1)
            }));
            get().saveData();
        },

        graze: () => {
            const now = performance.now();
            const state = get();
            if (now - state.lastCollectTime < 100) return;

            set(s => ({
                score: safeClamp(s.score + 50, 0, GAMEPLAY_CONFIG.MAX_SCORE, s.score),
                combo: safeClamp(s.combo + 1, 0, Number.MAX_SAFE_INTEGER, s.combo),
                lastCollectTime: now,
                momentum: Math.min(2.0, s.momentum + 0.05)
            }));
            eventBus.emit('player:graze', { distance: state.distance });
        },

        takeDamage: (obj?: { type?: string | number }) => {
            const { isImmortalityActive, isInvincible, lives, shieldActive } = get();

            // SPERN RUNNER 2.2.0: Вирусы убивают сразу, игнорируя базовые щиты 
            const ignoresShield = obj?.type === 'VIRUS_KILLER_LOW' || obj?.type === 'VIRUS_KILLER_HIGH' || obj?.type === 'VIRUS_KILLER' || obj?.type === 13;

            // Если активен щит (Hoverboard), он защищает от 1 удара и лопается
            if (shieldActive && !ignoresShield) {
                set({
                    shieldActive: false,
                    shieldTimer: 0,
                    isImmortalityActive: get().speedBoostActive
                });
                eventBus.emit('player:membrane_pop', undefined as void);
                window.dispatchEvent(new CustomEvent('play-sound', { detail: { sound: 'membrane_pop', volume: 0.8 } }));
                return;
            }

            // Проверка неуязвимости (но не для вирусов-убийц)
            if (!ignoresShield && (isImmortalityActive || isInvincible)) {
                return;
            }

            // Если жизней уже нет, не обрабатываем урон повторно
            if (lives <= 0) {
                return;
            }

            // Урон проходит
            const newHearts = ignoresShield ? 0 : lives - 1;
            const slowedSpeed = Math.max(GAMEPLAY_CONFIG.MIN_SPEED, get().speed * 0.75);

            set({
                lives: safeClamp(newHearts, 0, get().maxLives, 0),
                combo: 0,
                multiplier: 1,
                speed: safeClamp(slowedSpeed, GAMEPLAY_CONFIG.MIN_SPEED, GAMEPLAY_CONFIG.MAX_SPEED, slowedSpeed),
                isInvincible: true,
                invincibilityTimer: 2.5, // 🚀 Frame-based timer
                nearestEnemyDistance: 999
            });

            eventBus.emit('player:hit', { lives: Math.max(0, newHearts), damage: 1 });

            if (newHearts <= 0 || ignoresShield) {
                const finalHearts = ignoresShield ? 0 : Math.max(0, newHearts);
                set({ 
                    lives: finalHearts,
                    deathTimer: 1.0 // 🚀 Frame-based timer for Game Over
                });

                eventBus.emit('player:death', { score: get().score, distance: get().distance });
            }
        },

        jump: () => {
            eventBus.emit('player:jump_input', undefined);
            window.dispatchEvent(new CustomEvent('player:jump_input'));
        },

        stopJump: () => {
            eventBus.emit('player:stop_jump', undefined);
            window.dispatchEvent(new CustomEvent('player:stop_jump'));
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

        dash: () => {
            const state = get();
            if (state.dashCooldown <= 0 && !state.isDashing) {
                const now = performance.now();
                let newChain = 1;
                if (state.lastDashTime && (now - state.lastDashTime) < 1000) {
                    newChain = (state.dashChainCount || 0) + 1;
                }

                set({
                    isDashing: true,
                    isInvincible: true,
                    dashCooldown: 2.0,
                    lastDashTime: now,
                    dashChainCount: newChain
                });

                eventBus.emit('player:dash', { chain: newChain });

                const t1 = setTimeout(() => set({ isDashing: false }), 400);
                const t2 = setTimeout(() => set({ isInvincible: false }), 600);
                registerGameplayTimeout(t1);
                registerGameplayTimeout(t2);
            }
        },

        // === COMBAT & COMBO v2.4.0 ===
        setAttack: (attackState) => {
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

        incrementCombo: () => {
            const current = get().combo;
            const newCount = current + 1;
            const newMultiplier = 1 + Math.floor(newCount / 10) * 0.5; // +0.5x every 10 hits

            set({
                combo: newCount,
                multiplier: newMultiplier,
                comboTimer: 3.5, // 3.5 seconds to maintain combo
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
            if (state.comboTimer > 0) {
                const newTimer = Math.max(0, state.comboTimer - delta);
                set({ comboTimer: newTimer });
                if (newTimer === 0 && state.combo > 0) {
                    get().resetCombo();
                }
            }

            if (state.attackTimer > 0) {
                const newAttackTimer = Math.max(0, state.attackTimer - delta);
                set({ attackTimer: newAttackTimer });
                if (newAttackTimer === 0) {
                    set({ attackState: 'none' });
                }
            }
        },

        // === DNA CARD COLLECTION v2.4.0 ===
        collectDNACard: (card: { id: string; name: string; rarity: string; color: string; effect: { type: string; value: number }; starLevel: number }) => {
            const normalized: DNACard = {
                id: card.id,
                name: card.name,
                rarity: card.rarity as DNACard['rarity'],
                color: card.color,
                effect: { type: card.effect.type as DNACard['effect']['type'], value: card.effect.value },
                starLevel: card.starLevel,
                owned: true,
            };

            set(s => ({
                dnaCards: [...(s.dnaCards || []), normalized]
            }));
            eventBus.emit('dna_card_collected', { cardId: card.id, rarity: card.rarity });
            debugLog('[Store] DNA Card collected:', card.name, card.rarity);
        },

        updateDashCooldown: (delta) => {
            set((state) => ({
                dashCooldown: Math.max(0, state.dashCooldown - delta)
            }));
        },

        activateShield: () => {
            set({
                isImmortalityActive: true,
                shieldActive: true,
                shieldTimer: 10
            });
        },

        activateMagnet: () => {
            set({
                magnetActive: true,
                magnetTimer: 10
            });
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

        updateShieldTimer: (delta) => {
            const { shieldTimer, shieldActive } = get();
            if (!shieldActive) return;
            const newTimer = Math.max(0, shieldTimer - delta);
            if (newTimer === 0) {
                set({ shieldTimer: 0, shieldActive: false, isImmortalityActive: get().speedBoostActive });
            } else {
                set({ shieldTimer: newTimer });
            }
        },

        updateMagnetTimer: (delta) => {
            const { magnetTimer, magnetActive } = get();
            if (!magnetActive) return;
            const newTimer = Math.max(0, magnetTimer - delta);
            set({ magnetTimer: newTimer, magnetActive: newTimer > 0 });
        },

        updateSpeedBoostTimer: (delta) => {
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

        updateInvincibilityTimer: (delta) => {
            const { invincibilityTimer, isInvincible } = get();
            if (invincibilityTimer <= 0 && !isInvincible) return;
            
            const newTimer = Math.max(0, invincibilityTimer - delta);
            set({ 
                invincibilityTimer: newTimer,
                isInvincible: newTimer > 0 || get().isDashing // Dash also grants invincibility
            });
        },

        updateDeathTimer: (delta) => {
            const { deathTimer } = get();
            if (deathTimer <= 0) return;
            
            const newTimer = Math.max(0, deathTimer - delta);
            set({ deathTimer: newTimer });
            
            if (newTimer === 0) {
                set({ status: GameStatus.GAME_OVER });
            }
        },

        clearPendingGameplayTimeouts,
        registerGameplayTimeout
    };
};
