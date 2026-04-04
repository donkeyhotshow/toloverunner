/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DNASynergySystem - DNA card synergy system with bonuses and combination effects
 * Manages DNA card collections, synergies, and combo effects
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { useStore } from '../../../store';
import { eventBus } from '../../../utils/eventBus';

// ==================== TYPES ====================

export type SynergyType =
    | 'speed_boost'      // Speed cards synergy
    | 'defense_boost'   // Shield cards synergy
    | 'magnet_boost'    // Magnet cards synergy
    | 'score_boost'     // Score cards synergy
    | 'combo_master'     // Multiple attack cards
    | 'survivor'        // HP-related cards
    | 'agility'          // Jump/dodge cards
    | 'balanced';       // Mixed card types

export interface SynergyBonus {
    type: SynergyType;
    name: string;
    description: string;
    multiplier: number;
    bonusEffect?: {
        stat: string;
        value: number;
    };
    requiredCards: string[]; // Card IDs or effect types
    minCount: number;
}

export interface CardCombo {
    id: string;
    name: string;
    description: string;
    cards: string[]; // Card IDs that trigger the combo
    bonus: {
        type: 'damage' | 'speed' | 'defense' | 'score' | 'special';
        value: number;
    };
    active: boolean;
}

// Synergy configurations
export const SYNERGY_BONUSES: SynergyBonus[] = [
    {
        type: 'speed_boost',
        name: 'Швидкість світла',
        description: '+50% швидкість при 3+ картах швидкості',
        multiplier: 1.5,
        requiredCards: ['speed_1', 'speed_2', 'speed_3'],
        minCount: 3,
    },
    {
        type: 'defense_boost',
        name: 'Залізний щит',
        description: '+30% захист при 3+ картах щита',
        multiplier: 1.3,
        requiredCards: ['shield_1', 'shield_2', 'shield_3'],
        minCount: 3,
    },
    {
        type: 'magnet_boost',
        name: 'Магнітне поле',
        description: '+40% дальність магніту при 2+ картах',
        multiplier: 1.4,
        requiredCards: ['magnet_1', 'magnet_2', 'magnet_3'],
        minCount: 2,
    },
    {
        type: 'score_boost',
        name: 'Очкомаг',
        description: '+75% очки при 3+ картах очок',
        multiplier: 1.75,
        requiredCards: ['score_1', 'score_2', 'score_3'],
        minCount: 3,
    },
    {
        type: 'combo_master',
        name: 'Комбо Майстер',
        description: '+25% комбо множник',
        multiplier: 1.25,
        requiredCards: ['double_jump'],
        minCount: 1,
    },
    {
        type: 'agility',
        name: 'Акваріус',
        description: '+20% шанс уникнути шкоди',
        multiplier: 1.2,
        requiredCards: ['double_jump', 'magnet_1'],
        minCount: 2,
    },
];

// Card combo definitions
export const CARD_COMBOS: CardCombo[] = [
    {
        id: 'combo_speed_shield',
        name: 'Швидкий захист',
        description: 'Швидкість + Захист = Нескорий воїн',
        cards: ['speed_1', 'shield_1'],
        bonus: { type: 'speed', value: 15 },
        active: false,
    },
    {
        id: 'combo_magnet_score',
        name: 'Золотий магніт',
        description: 'Магніт + Очки = Золота жила',
        cards: ['magnet_2', 'score_2'],
        bonus: { type: 'score', value: 30 },
        active: false,
    },
    {
        id: 'combo_triple_speed',
        name: 'Ультра швидкість',
        description: 'Три карти швидкості = Максимальна швидкість',
        cards: ['speed_1', 'speed_2', 'speed_3'],
        bonus: { type: 'speed', value: 50 },
        active: false,
    },
    {
        id: 'combo_triple_shield',
        name: 'Незламний щит',
        description: 'Три карти щита = Безсмертя',
        cards: ['shield_1', 'shield_2', 'shield_3'],
        bonus: { type: 'defense', value: 100 },
        active: false,
    },
    {
        id: 'combo_all_rounder',
        name: 'Універсал',
        description: 'По одній карті кожного типу',
        cards: ['speed_1', 'shield_1', 'magnet_1', 'score_1'],
        bonus: { type: 'special', value: 25 },
        active: false,
    },
];

// ==================== HOOK ====================

export interface UseDNASynergyReturn {
    synergies: SynergyBonus[];
    activeCombos: CardCombo[];
    totalBonus: {
        speed: number;
        defense: number;
        score: number;
        magnet: number;
    };
    isLoaded: boolean;
    refreshSynergies: () => void;
}

/**
 * Hook for managing DNA card synergies
 */
export const useDNASynergy = (): UseDNASynergyReturn => {
    const dnaCards = useStore(s => s.dnaCards) || [];
    const [synergies, setSynergies] = useState<SynergyBonus[]>([]);
    const [activeCombos, setActiveCombos] = useState<CardCombo[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Calculate synergies and combos based on owned cards
    const calculateSynergies = useCallback(() => {
        const ownedCardIds = new Set(dnaCards.map(c => c.id));
        const ownedEffectTypes = new Set(dnaCards.map(c => c.effect.type));

        // Check for synergies
        const activeSynergies: SynergyBonus[] = [];

        SYNERGY_BONUSES.forEach(synergy => {
            // Count matching cards
            let count = 0;
            synergy.requiredCards.forEach(cardId => {
                if (ownedCardIds.has(cardId)) {
                    count++;
                }
            });

            // Also check by effect type
            if (synergy.requiredCards.some(id => id.includes('speed')) && ownedEffectTypes.has('speed_boost')) {
                count += dnaCards.filter(c => c.effect.type === 'speed_boost').length;
            }
            if (synergy.requiredCards.some(id => id.includes('shield')) && ownedEffectTypes.has('shield_interval')) {
                count += dnaCards.filter(c => c.effect.type === 'shield_interval').length;
            }
            if (synergy.requiredCards.some(id => id.includes('magnet')) && ownedEffectTypes.has('magnet_duration')) {
                count += dnaCards.filter(c => c.effect.type === 'magnet_duration').length;
            }
            if (synergy.requiredCards.some(id => id.includes('score')) && ownedEffectTypes.has('score_multiplier')) {
                count += dnaCards.filter(c => c.effect.type === 'score_multiplier').length;
            }

            if (count >= synergy.minCount) {
                activeSynergies.push(synergy);
            }
        });

        setSynergies(activeSynergies);

        // Check for combos
        const newActiveCombos: CardCombo[] = [];

        CARD_COMBOS.forEach(combo => {
            const hasAllCards = combo.cards.every(cardId => ownedCardIds.has(cardId));
            if (hasAllCards) {
                newActiveCombos.push({ ...combo, active: true });
            }
        });

        setActiveCombos(newActiveCombos);
        setIsLoaded(true);

        // Emit synergy update event
        eventBus.emit('dna:synergy_update', {
            synergies: activeSynergies.map(s => s.type),
            combos: newActiveCombos.map(c => c.id),
            totalCards: dnaCards.length,
        });
    }, [dnaCards]);

    // Recalculate when cards change
    useEffect(() => {
        if (dnaCards.length > 0 || isLoaded) {
            calculateSynergies();
        }
    }, [dnaCards, calculateSynergies, isLoaded]);

    // Calculate total bonuses
    const totalBonus = useMemo(() => {
        let speed = 0;
        let defense = 0;
        let score = 0;
        let magnet = 0;

        // Apply base card effects
        dnaCards.forEach(card => {
            switch (card.effect.type) {
                case 'speed_boost':
                    speed += card.effect.value;
                    break;
                case 'shield_interval':
                    defense += card.effect.value;
                    break;
                case 'magnet_duration':
                    magnet += card.effect.value;
                    break;
                case 'score_multiplier':
                    score += card.effect.value;
                    break;
            }
        });

        // Apply synergy bonuses
        synergies.forEach(synergy => {
            switch (synergy.type) {
                case 'speed_boost':
                    speed = Math.floor(speed * synergy.multiplier);
                    break;
                case 'defense_boost':
                    defense = Math.floor(defense * synergy.multiplier);
                    break;
                case 'magnet_boost':
                    magnet = Math.floor(magnet * synergy.multiplier);
                    break;
                case 'score_boost':
                    score = Math.floor(score * synergy.multiplier);
                    break;
            }
        });

        // Apply combo bonuses
        activeCombos.forEach(combo => {
            switch (combo.bonus.type) {
                case 'speed':
                    speed += combo.bonus.value;
                    break;
                case 'defense':
                    defense += combo.bonus.value;
                    break;
                case 'score':
                    score += combo.bonus.value;
                    break;
            }
        });

        return { speed, defense, score, magnet };
    }, [dnaCards, synergies, activeCombos]);

    return {
        synergies,
        activeCombos,
        totalBonus,
        isLoaded,
        refreshSynergies: calculateSynergies,
    };
};

// ==================== COMPONENTS ====================

/**
 * DNA Synergy UI Component
 */
export const DNAHyperspaceUI: React.FC = () => {
    const { synergies, activeCombos, totalBonus, isLoaded } = useDNASynergy();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isLoaded) return null;

    const hasSynergies = synergies.length > 0;
    const hasCombos = activeCombos.length > 0;

    return (
        <div style={{
            position: 'absolute',
            top: '100px',
            right: '20px',
            zIndex: 1000,
        }}>
            {/* Synergy indicator */}
            {(hasSynergies || hasCombos) && (
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9) 0%, rgba(255, 140, 0, 0.9) 100%)',
                        border: '3px solid #FFD700',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <span style={{ fontSize: '24px' }}>✨</span>
                    <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>
                        {synergies.length} Синергій
                    </span>
                    {activeCombos.length > 0 && (
                        <span style={{
                            background: '#FF4444',
                            color: '#FFF',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                        }}>
                            {activeCombos.length} Комбо!
                        </span>
                    )}
                </div>
            )}

            {/* Expanded view */}
            {isExpanded && (hasSynergies || hasCombos) && (
                <div style={{
                    position: 'absolute',
                    top: '60px',
                    right: '0',
                    width: '320px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '3px solid #FFD700',
                    borderRadius: '12px',
                    padding: '15px',
                }}>
                    {/* Total bonuses */}
                    <div style={{ marginBottom: '15px' }}>
                        <h3 style={{ color: '#FFD700', margin: '0 0 10px 0', fontSize: '16px' }}>
                            ⚡ Бонуси
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <StatBadge icon="🏃" label="Швидкість" value={`+${totalBonus.speed}%`} />
                            <StatBadge icon="🛡️" label="Захист" value={`+${totalBonus.defense}%`} />
                            <StatBadge icon="💎" label="Очки" value={`+${totalBonus.score}%`} />
                            <StatBadge icon="🧲" label="Магніт" value={`+${totalBonus.magnet}%`} />
                        </div>
                    </div>

                    {/* Active synergies */}
                    {synergies.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <h3 style={{ color: '#FF8800', margin: '0 0 10px 0', fontSize: '14px' }}>
                                🌟 Синергії
                            </h3>
                            {synergies.map((synergy, index) => (
                                <div key={index} style={{
                                    background: 'rgba(255, 140, 0, 0.2)',
                                    border: '1px solid #FF8800',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    marginBottom: '8px',
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#FFD700', fontSize: '13px' }}>
                                        {synergy.name}
                                    </div>
                                    <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>
                                        {synergy.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active combos */}
                    {activeCombos.length > 0 && (
                        <div>
                            <h3 style={{ color: '#FF4444', margin: '0 0 10px 0', fontSize: '14px' }}>
                                🔥 Комбо
                            </h3>
                            {activeCombos.map((combo, index) => (
                                <div key={index} style={{
                                    background: 'rgba(255, 68, 68, 0.2)',
                                    border: '1px solid #FF4444',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    marginBottom: '8px',
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#FF6666', fontSize: '13px' }}>
                                        {combo.name}
                                    </div>
                                    <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>
                                        {combo.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Stat badge component
const StatBadge: React.FC<{
    icon: string;
    label: string;
    value: string;
}> = ({ icon, label, value }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '8px',
        textAlign: 'center',
    }}>
        <div style={{ fontSize: '18px' }}>{icon}</div>
        <div style={{ color: '#AAA', fontSize: '10px' }}>{label}</div>
        <div style={{ color: '#44FF44', fontWeight: 'bold', fontSize: '12px' }}>{value}</div>
    </div>
);

// ==================== EFFECTS APPLIER ====================

/**
 * Applies DNA synergy bonuses to gameplay
 */
export class DNASynergyApplier {
    private static instance: DNASynergyApplier;
    private currentBonuses = {
        speed: 0,
        defense: 0,
        score: 0,
        magnet: 0,
    };

    private constructor() { }

    static getInstance(): DNASynergyApplier {
        if (!DNASynergyApplier.instance) {
            DNASynergyApplier.instance = new DNASynergyApplier();
        }
        return DNASynergyApplier.instance;
    }

    applyBonuses(bonuses: typeof this.currentBonuses): typeof this.currentBonuses {
        this.currentBonuses = { ...bonuses };

        // Apply to store/game
        console.log('[DNA] Applied synergy bonuses:', this.currentBonuses);

        return this.currentBonuses;
    }

    getBonuses(): typeof this.currentBonuses {
        return { ...this.currentBonuses };
    }

    // Get speed bonus multiplier
    getSpeedMultiplier(): number {
        return 1 + (this.currentBonuses.speed / 100);
    }

    // Get defense bonus multiplier
    getDefenseMultiplier(): number {
        return 1 + (this.currentBonuses.defense / 100);
    }

    // Get score bonus multiplier
    getScoreMultiplier(): number {
        return 1 + (this.currentBonuses.score / 100);
    }

    // Get magnet bonus multiplier
    getMagnetMultiplier(): number {
        return 1 + (this.currentBonuses.magnet / 100);
    }
}

export default DNAHyperspaceUI;
