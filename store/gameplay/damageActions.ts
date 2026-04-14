/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Damage, death, invincibility, and dash actions extracted from gameplaySlice.
 * Receives `set`/`get` from the parent slice creator — external API unchanged.
 */

import { StateCreator } from 'zustand';
import { GameState } from '../storeTypes';
import { GameStatus, VirusTypes } from '../../types';
import { GAMEPLAY_CONFIG } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { safeClamp } from '../../utils/safeMath';

type Set = Parameters<StateCreator<GameState>>[0];
type Get = Parameters<StateCreator<GameState>>[1];

/** GDD: all VirusTypes cause instant death and bypass MEMBRANE_SHIELD. */
const VIRUS_TYPE_SET = new Set<string | number>(VirusTypes);

type RegisterTimeout = (id: ReturnType<typeof setTimeout>) => void;

export function createDamageActions(set: Set, get: Get, registerGameplayTimeout: RegisterTimeout) {
    return {
        takeDamage: (obj?: { type?: string | number }) => {
            const { isImmortalityActive, isInvincible, lives, shieldActive, speedBoostActive, maxLives, speed } = get();

            // GDD: Viruses bypass shield — instant death
            const ignoresShield = !!obj?.type && VIRUS_TYPE_SET.has(obj.type);

            if (shieldActive && !ignoresShield) {
                set({
                    shieldActive: false,
                    shieldTimer: 0,
                    isImmortalityActive: speedBoostActive
                });
                eventBus.emit('player:membrane_pop', undefined as void);
                window.dispatchEvent(new CustomEvent('play-sound', { detail: { sound: 'membrane_pop', volume: 0.8 } }));
                return;
            }

            if (!ignoresShield && (isImmortalityActive || isInvincible)) return;
            if (lives <= 0) return;

            const finalLives = ignoresShield ? 0 : Math.max(0, lives - 1);
            const willDie = finalLives <= 0;
            const slowedSpeed = Math.max(GAMEPLAY_CONFIG.MIN_SPEED, speed * 0.75);

            // Single atomic set — no intermediate state where the player is
            // simultaneously "about to die" AND "invincible".
            set({
                lives: safeClamp(finalLives, 0, maxLives, 0),
                combo: 0,
                multiplier: 1,
                speed: safeClamp(slowedSpeed, GAMEPLAY_CONFIG.MIN_SPEED, GAMEPLAY_CONFIG.MAX_SPEED, slowedSpeed),
                // Invincibility frames only when the player survives the hit
                isInvincible: !willDie,
                invincibilityTimer: willDie ? 0 : 2.5,
                nearestEnemyDistance: 999,
                ...(willDie ? { deathTimer: 1.0 } : {}),
            });

            eventBus.emit('player:hit', { lives: finalLives, damage: 1 });
            if (willDie) {
                eventBus.emit('player:death', { score: get().score, distance: get().distance });
            }
        },

        jump: () => {
            eventBus.emit('player:jump_input', undefined);
        },

        stopJump: () => {
            eventBus.emit('player:stop_jump', undefined);
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

        updateDashCooldown: (delta: number) => {
            set((state) => ({
                dashCooldown: Math.max(0, state.dashCooldown - delta)
            }));
        },

        updateInvincibilityTimer: (delta: number) => {
            const { invincibilityTimer, isInvincible } = get();
            if (invincibilityTimer <= 0 && !isInvincible) return;
            const newTimer = Math.max(0, invincibilityTimer - delta);
            set({
                invincibilityTimer: newTimer,
                isInvincible: newTimer > 0 || get().isDashing
            });
        },

        updateDeathTimer: (delta: number) => {
            const { deathTimer } = get();
            if (deathTimer <= 0) return;
            const newTimer = Math.max(0, deathTimer - delta);
            set({ deathTimer: newTimer });
            if (newTimer === 0) {
                set({ status: GameStatus.GAME_OVER });
            }
        },
    };
}
