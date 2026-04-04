/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Skin System - Unlockable cosmetics for meta-progression
 */

export enum SkinType {
    DEFAULT = 'default',
    RAINBOW = 'rainbow',
    GOLDEN = 'golden',
    GALAXY = 'galaxy',
    NEON = 'neon',
    CRYSTAL = 'crystal'
}

export interface SkinConfig {
    id: SkinType;
    name: string;
    description: string;
    cost: number; // Gems
    unlockScore: number; // Required score to unlock purchase
    colors: {
        primary: string;
        secondary?: string;
        emissive: string;
    };
    effect?: 'rainbow' | 'sparkle' | 'glow';
}

export const SKIN_CONFIGS: Record<SkinType, SkinConfig> = {
    [SkinType.DEFAULT]: {
        id: SkinType.DEFAULT,
        name: 'Classic Sperm',
        description: 'The original champion',
        cost: 0,
        unlockScore: 0,
        colors: {
            primary: '#FFFFFF',
            emissive: '#FFFFFF'
        }
    },

    [SkinType.RAINBOW]: {
        id: SkinType.RAINBOW,
        name: 'Rainbow Runner',
        description: 'Taste the rainbow!',
        cost: 50,
        unlockScore: 5000,
        colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
            emissive: '#FF00FF'
        },
        effect: 'rainbow'
    },

    [SkinType.GOLDEN]: {
        id: SkinType.GOLDEN,
        name: 'Golden God',
        description: 'Bling bling!',
        cost: 100,
        unlockScore: 10000,
        colors: {
            primary: '#FFD700',
            emissive: '#FFA500'
        },
        effect: 'sparkle'
    },

    [SkinType.GALAXY]: {
        id: SkinType.GALAXY,
        name: 'Cosmic Traveler',
        description: 'From beyond the stars',
        cost: 150,
        unlockScore: 20000,
        colors: {
            primary: '#4B0082',
            secondary: '#FF1493',
            emissive: '#00FFFF'
        },
        effect: 'glow'
    },

    [SkinType.NEON]: {
        id: SkinType.NEON,
        name: 'Neon Dream',
        description: 'Electric vibes',
        cost: 75,
        unlockScore: 8000,
        colors: {
            primary: '#00FF00',
            secondary: '#FF00FF',
            emissive: '#00FFFF'
        },
        effect: 'glow'
    },

    [SkinType.CRYSTAL]: {
        id: SkinType.CRYSTAL,
        name: 'Diamond Dash',
        description: 'Clarity and beauty',
        cost: 200,
        unlockScore: 30000,
        colors: {
            primary: '#E0F7FA',
            secondary: '#B2EBF2',
            emissive: '#80DEEA'
        },
        effect: 'sparkle'
    }
};

/**
 * Check if skin is unlocked
 */
export function isSkinUnlocked(skinType: SkinType, bestScore: number, ownedSkins: SkinType[]): boolean {
    if (skinType === SkinType.DEFAULT) return true;

    const config = SKIN_CONFIGS[skinType];
    return bestScore >= config.unlockScore && ownedSkins.includes(skinType);
}

/**
 * Check if skin can be purchased
 */
export function canPurchaseSkin(skinType: SkinType, bestScore: number, gems: number, ownedSkins: SkinType[]): boolean {
    if (ownedSkins.includes(skinType)) return false;

    const config = SKIN_CONFIGS[skinType];
    return bestScore >= config.unlockScore && gems >= config.cost;
}
