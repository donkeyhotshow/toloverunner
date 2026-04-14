/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * EventBus - A lightweight, typed event emitter for decoupling game systems.
 */

type GameEvents = {
    // Player events
    'player:collect': { type: string; points: number; color?: string };
    'player:hit': { lives: number; damage: number };
    'player:death': { score: number; distance: number };
    'player:jump': void;
    'player:jump_input': void;
    'player:stop_jump': void;
    'player:dash': { chain: number };
    'player:graze': { distance: number };
    // Membrane pop (used by ComicPopupSystem for POP! effect)
    'player:membrane_pop': void;
    // Player wasted/death variant (used by ComicPopupSystem for SPLAT! effect)
    'player:wasted': void;
    // Near-miss with a dangerous enemy
    'player:fear': void;
    // Perfect-timing coin collection bonus
    'player:perfect': { bonus: number };

    // World/Level events
    'world:chunk-generated': { id: string; type: string };
    'world:biome-changed': { biome: string };
    'world:speed-changed': { speed: number };
    'world:origin-reset': { offset: number };

    // System events
    'system:hit-stop': { duration: number };
    'system:screen-shake': { intensity: number; duration: number };
    'system:play-sound': { sound: string; volume?: number; pitch?: number };

    // Game flow events
    'game:start': void;
    'game:pause': void;
    'game:resume': void;

    // Combat system events
    'combat:attack_up': void;
    'combat:attack_down': void;
    'combat:damage': { damage: number };
    'combat:boss_hit': { bossId: string; damage: number };
    'combat:combo_milestone': { combo: number };
    'combat:combo_reset': void;

    // Boss events
    'boss:phase_change': { phase: string | number };
    'boss:hit': { bossId: string; damage: number; newHp?: number };
    'boss:qte_success': { type: string };
    'boss:qte_fail': { type: string };
    'boss:qte_timeout': void;
    'boss:projectile_spawn': { type: string; damage?: number };
    'boss:defeated': void;

    // Input events
    'input:action': { action: string };

    // DNA events
    'dna_card_collected': { cardId: string; rarity: string };
    'dna:synergy_update': { synergies: string[]; combos?: string[]; totalCards?: number };

    // Particle effects
    'particle:burst': {
        position: [number, number, number];
        color?: string;
        type: 'hit' | 'powerup' | 'dust' | 'combat-kill';
        count?: number;
    };
};

type Handler<T> = (data: T) => void;

class EventBus {
    private listeners = new Map<keyof GameEvents, Set<(data: unknown) => void>>();

    /**
     * Subscribe to an event
     * @returns Unsubscribe function
     */
    on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler as (data: unknown) => void);
        return () => this.off(event, handler);
    }

    /**
     * Unsubscribe from an event
     */
    off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
        const hSet = this.listeners.get(event);
        if (hSet) {
            hSet.delete(handler as (data: unknown) => void);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
        const hSet = this.listeners.get(event);
        if (hSet) {
            hSet.forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`[EventBus] Error in handler for ${event}:`, e);
                }
            });
        }
    }
}

export const eventBus = new EventBus();
