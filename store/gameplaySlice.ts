/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Gameplay slice — assembles sub-action modules without changing the external GameplaySlice API.
 *
 * Sub-modules (all in store/gameplay/):
 *   speedActions   — collectCoin, addDistance, slowDown, updateSlowEffects, speed-boost, bacteriaJumpBonus
 *   comboActions   — graze, incrementCombo, resetCombo, updateCombo, setAttack
 *   powerupActions — activateShield, activateMagnet, updateShieldTimer, updateMagnetTimer
 *   damageActions  — takeDamage, jump, stopJump, dash, invincibility, death timers
 */

import { StateCreator } from 'zustand';
import { GameState, GameplaySlice } from './storeTypes';
import { GameMode, DNACard } from '../types';
import { RUN_SPEED_BASE, GAMEPLAY_CONFIG } from '../constants';
import { eventBus } from '../utils/eventBus';
import { debugLog } from '../utils/debug';

import { createSpeedActions } from './gameplay/speedActions';
import { createComboActions } from './gameplay/comboActions';
import { createPowerupActions } from './gameplay/powerupActions';
import { createDamageActions } from './gameplay/damageActions';

export const createGameplaySlice: StateCreator<GameState, [], [], GameplaySlice> = (set, get) => {
    // Instance-scoped timeout tracking — NOT module-level so test isolation is guaranteed.
    const pendingGameplayTimeouts: ReturnType<typeof setTimeout>[] = [];

    function registerGameplayTimeout(id: ReturnType<typeof setTimeout>): void {
        pendingGameplayTimeouts.push(id);
    }

    function clearPendingGameplayTimeoutsLocal(): void {
        pendingGameplayTimeouts.forEach(clearTimeout);
        pendingGameplayTimeouts.length = 0;
    }

    const speedActions = createSpeedActions(set, get, registerGameplayTimeout);
    const comboActions = createComboActions(set, get);
    const powerupActions = createPowerupActions(set, get);
    const damageActions = createDamageActions(set, get, registerGameplayTimeout);

    return {
        // ── Initial State ──────────────────────────────────────────────────────────
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
        lastGrazeTime: 0,
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

        // Speed modifier system (v2.5)
        baseSpeed: RUN_SPEED_BASE,
        slowEffects: [],

        // DNA Card Collection v2.4.0
        dnaCards: [],

        // Combat System v2.4.0
        attackState: 'none',
        attackTimer: 0,
        speedLinesActive: false,

        // ── Speed / Distance (→ speedActions) ─────────────────────────────────────
        ...speedActions,

        // ── Combo / Combat (→ comboActions) ───────────────────────────────────────
        ...comboActions,

        // ── Powerups (→ powerupActions) ────────────────────────────────────────────
        ...powerupActions,

        // ── Damage / Death / Dash (→ damageActions) ───────────────────────────────
        ...damageActions,

        // ── Collect Gene (shared — reads from both score and persistence) ──────────
        collectGene: () => {
            // Single atomic set — was addScore (set #1) + separate set (set #2).
            set((s) => ({
                score: Math.min(GAMEPLAY_CONFIG.MAX_SCORE, s.score + 500),
                genesCollected: s.genesCollected + 1,
                gems: s.gems + 1,
                momentum: Math.min(2.0, s.momentum + 0.1)
            }));
            get().saveData();
        },

        // ── DNA Card Collection v2.4.0 ─────────────────────────────────────────────
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

        // ── Timeout Management ─────────────────────────────────────────────────────
        clearPendingGameplayTimeouts: clearPendingGameplayTimeoutsLocal,
        registerGameplayTimeout,
    };
};
