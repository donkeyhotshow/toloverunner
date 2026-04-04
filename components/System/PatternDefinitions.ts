/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PatternDefinitions - Gold Master Level Patterns
 * Library of pre-designed chunks for procedural generation.
 */

// PatternDefinitions.ts

export enum PatternDifficulty {
    EASY = 0,
    MEDIUM = 1,
    HARD = 2,
    INSANE = 3
}

export interface PatternItem {
    type: keyof typeof TYPE_MAP_KEYS; // 'OBSTACLE' | 'COIN' | 'GENE' | 'JUMP_BAR' | etc
    lane: number; // -2 to 2
    zOffset: number; // Relative to start of chunk
    yOffset?: number;
    color?: string;
    /** Высота препятствия (для коллизий и визуала), 1 = норма */
    height?: number;
    /** Ширина (для DODGE стены), 1 = норма */
    width?: number;
}

export interface PatternDef {
    id: string;
    difficulty: PatternDifficulty;
    length: number; // Length of chunk in Z units
    items: PatternItem[];
}

export const TYPE_MAP_KEYS = {
    OBSTACLE: 0,
    GENE: 1,
    DNA_HELIX: 2,
    JUMP_BAR: 3, // Legacy, can map to JUMP
    COIN: 4,
    SHIELD: 5,
    SPEED_BOOST: 6,
    MAGNET: 7,
    OBSTACLE_JUMP: 8,
    OBSTACLE_SLIDE: 9,
    OBSTACLE_DODGE: 10
} as const;

// NOTE: Colors should be consistent with Design
const COLORS = {
    OBSTACLE: '#8B0000', // Deep Red
    COIN: '#FFD700',     // Gold
    GENE: '#00FFFF',     // Cyan
    SHIELD: '#2196F3',
    SPEED: '#FFEB3B'
};

export const PATTERNS: PatternDef[] = [
    // Паттерн А — «ЗИГЗАГ»
    {
        id: 'gdd_zigzag',
        difficulty: PatternDifficulty.EASY,
        length: 50,
        items: [
            { type: 'COIN', lane: -2, zOffset: 5 },
            { type: 'COIN', lane: -1, zOffset: 10 },
            { type: 'COIN', lane: 0, zOffset: 15 },
            { type: 'OBSTACLE_JUMP', lane: 1, zOffset: 20 },
            { type: 'COIN', lane: 2, zOffset: 25 },
            { type: 'COIN', lane: 1, zOffset: 30 },
            { type: 'COIN', lane: 0, zOffset: 35 },
            { type: 'OBSTACLE_JUMP', lane: -1, zOffset: 40 },
        ]
    },
    // Паттерн Б — «ТУНЕЛЬ»
    {
        id: 'gdd_tunnel',
        difficulty: PatternDifficulty.MEDIUM,
        length: 45,
        items: [
            { type: 'OBSTACLE_DODGE', lane: -2, zOffset: 10 },
            { type: 'OBSTACLE_DODGE', lane: -1, zOffset: 10 },
            { type: 'OBSTACLE_SLIDE', lane: 0, zOffset: 15 }, // Слизь сверху
            { type: 'COIN', lane: 0, zOffset: 15, yOffset: 0.2 },
            { type: 'OBSTACLE_DODGE', lane: 1, zOffset: 10 },
            { type: 'OBSTACLE_DODGE', lane: 2, zOffset: 10 },
            { type: 'GENE', lane: 0, zOffset: 25 },
        ]
    },
    // Паттерн В — «ВЕРТИКАЛЬ»
    {
        id: 'gdd_vertical',
        difficulty: PatternDifficulty.MEDIUM,
        length: 50,
        items: [
            { type: 'OBSTACLE_DODGE', lane: 0, zOffset: 10 }, // Стіна
            { type: 'OBSTACLE_JUMP', lane: -1, zOffset: 20 }, // За нею низький перескок
            { type: 'OBSTACLE_JUMP', lane: 1, zOffset: 20 },
            { type: 'COIN', lane: -1, zOffset: 20, yOffset: 2.0 }, // Монета дуже високо
            { type: 'COIN', lane: 1, zOffset: 20, yOffset: 2.0 },
            { type: 'GENE', lane: 0, zOffset: 35 },
        ]
    },
    // Паттерн Г — «СХОДИНКА»
    {
        id: 'gdd_staircase',
        difficulty: PatternDifficulty.HARD,
        length: 60,
        items: [
            { type: 'OBSTACLE_JUMP', lane: 0, zOffset: 10 },
            { type: 'COIN', lane: 0, zOffset: 10, yOffset: 1.5 },
            { type: 'OBSTACLE_JUMP', lane: 0, zOffset: 25 }, // Друга сходинка
            { type: 'GENE', lane: 0, zOffset: 25, yOffset: 3.0 }, // Високо над другою
            // Блокуємо боки
            { type: 'OBSTACLE_DODGE', lane: -1, zOffset: 15 },
            { type: 'OBSTACLE_DODGE', lane: 1, zOffset: 15 },
        ]
    },
    // Паттерн Д — «ХВИЛЯ» 
    {
        id: 'gdd_wave',
        difficulty: PatternDifficulty.HARD,
        length: 70,
        items: [
            { type: 'OBSTACLE', lane: -2, zOffset: 10 },
            { type: 'COIN', lane: -1, zOffset: 15 },
            { type: 'OBSTACLE', lane: 0, zOffset: 20 },
            { type: 'COIN', lane: 1, zOffset: 25 },
            { type: 'OBSTACLE', lane: 2, zOffset: 30 },
            { type: 'COIN', lane: 1, zOffset: 35 },
            { type: 'OBSTACLE', lane: 0, zOffset: 40 },
            { type: 'COIN', lane: -1, zOffset: 45 },
            { type: 'OBSTACLE', lane: -2, zOffset: 50 },
            { type: 'SHIELD', lane: 0, zOffset: 60 },
        ]
    },
    // Класичний шлях для новачків
    {
        id: 'gdd_classic_easy',
        difficulty: PatternDifficulty.EASY,
        length: 40,
        items: [
            { type: 'COIN', lane: 0, zOffset: 10 },
            { type: 'COIN', lane: 0, zOffset: 15 },
            { type: 'COIN', lane: 0, zOffset: 20 },
            { type: 'OBSTACLE_JUMP', lane: -1, zOffset: 25 },
            { type: 'OBSTACLE_JUMP', lane: 1, zOffset: 25 }
        ]
    }
];

export const POWERUP_POOL = [
    { type: 'SHIELD' as const, weight: 0.05, color: COLORS.SHIELD },
    { type: 'SPEED_BOOST' as const, weight: 0.08, color: COLORS.SPEED },
    { type: 'MAGNET' as const, weight: 0.10, color: '#FF00FF' } // Magenta for Magnet
];

// --- ROAD CHUNKS (как в Subway Surfers: целые куски дороги, не случайный набор) ---
// Генерируются сразу одним сегментом: монеты → преграда/путь → монеты. Продуманные цепочки.

export const ROAD_CHUNK_LENGTH_MIN = 50;
export const ROAD_CHUNK_LENGTH_MAX = 85;

/** Полноценные куски дороги (одним куском при генерации) */
export const ROAD_CHUNKS: PatternDef[] = [
    // Подход: монеты ведут к препятствию, после — награда
    {
        id: 'chunk_coins_then_jump',
        difficulty: PatternDifficulty.EASY,
        length: 55,
        items: [
            { type: 'COIN', lane: 0, zOffset: 5 },
            { type: 'COIN', lane: 0, zOffset: 10 },
            { type: 'COIN', lane: 0, zOffset: 15 },
            { type: 'OBSTACLE_JUMP', lane: 0, zOffset: 22, height: 1 },
            { type: 'COIN', lane: 0, zOffset: 22, yOffset: 1.6 },
            { type: 'COIN', lane: -1, zOffset: 30 },
            { type: 'COIN', lane: 1, zOffset: 30 },
            { type: 'GENE', lane: 0, zOffset: 38 },
        ]
    },
    {
        id: 'chunk_slalom_path',
        difficulty: PatternDifficulty.EASY,
        length: 60,
        items: [
            { type: 'COIN', lane: -1, zOffset: 5 },
            { type: 'COIN', lane: 0, zOffset: 10 },
            { type: 'COIN', lane: 1, zOffset: 15 },
            { type: 'OBSTACLE', lane: 0, zOffset: 20, color: COLORS.OBSTACLE },
            { type: 'COIN', lane: -1, zOffset: 25 },
            { type: 'COIN', lane: 1, zOffset: 28 },
            { type: 'OBSTACLE', lane: -1, zOffset: 35, color: COLORS.OBSTACLE },
            { type: 'OBSTACLE', lane: 1, zOffset: 35, color: COLORS.OBSTACLE },
            { type: 'COIN', lane: 0, zOffset: 40 },
            { type: 'COIN', lane: 0, zOffset: 48 },
        ]
    },
    {
        id: 'chunk_slide_then_coins',
        difficulty: PatternDifficulty.EASY,
        length: 52,
        items: [
            { type: 'COIN', lane: 0, zOffset: 5 },
            { type: 'OBSTACLE_SLIDE', lane: 0, zOffset: 14 },
            { type: 'COIN', lane: 0, zOffset: 14, yOffset: 0.2 },
            { type: 'COIN', lane: -1, zOffset: 22 },
            { type: 'COIN', lane: 1, zOffset: 22 },
            { type: 'COIN', lane: 0, zOffset: 30 },
            { type: 'GENE', lane: 0, zOffset: 38 },
        ]
    },
    {
        id: 'chunk_dodge_wall_path',
        difficulty: PatternDifficulty.MEDIUM,
        length: 58,
        items: [
            { type: 'COIN', lane: -1, zOffset: 5 },
            { type: 'COIN', lane: 1, zOffset: 5 },
            { type: 'OBSTACLE_DODGE', lane: 0, zOffset: 15, width: 1.2 },
            { type: 'COIN', lane: -1, zOffset: 20 },
            { type: 'COIN', lane: 1, zOffset: 20 },
            { type: 'OBSTACLE_DODGE', lane: -1, zOffset: 32 },
            { type: 'OBSTACLE_DODGE', lane: 1, zOffset: 32 },
            { type: 'COIN', lane: 0, zOffset: 38 },
            { type: 'GENE', lane: 0, zOffset: 46 },
        ]
    },
    {
        id: 'chunk_combo_jump_slide',
        difficulty: PatternDifficulty.MEDIUM,
        length: 72,
        items: [
            { type: 'COIN', lane: 0, zOffset: 5 },
            { type: 'OBSTACLE_JUMP', lane: 0, zOffset: 12 },
            { type: 'COIN', lane: 0, zOffset: 12, yOffset: 1.5 },
            { type: 'COIN', lane: 0, zOffset: 22 },
            { type: 'OBSTACLE_SLIDE', lane: 0, zOffset: 30 },
            { type: 'COIN', lane: -1, zOffset: 38 },
            { type: 'COIN', lane: 1, zOffset: 38 },
            { type: 'OBSTACLE_DODGE', lane: 0, zOffset: 48 },
            { type: 'COIN', lane: -1, zOffset: 54 },
            { type: 'COIN', lane: 1, zOffset: 54 },
            { type: 'GENE', lane: 0, zOffset: 62 },
        ]
    },
    {
        id: 'chunk_zigzag_reward',
        difficulty: PatternDifficulty.MEDIUM,
        length: 65,
        items: [
            { type: 'COIN', lane: 0, zOffset: 5 },
            { type: 'COIN', lane: 1, zOffset: 12 },
            { type: 'OBSTACLE', lane: 0, zOffset: 18, color: COLORS.OBSTACLE },
            { type: 'COIN', lane: -1, zOffset: 24 },
            { type: 'COIN', lane: -2, zOffset: 30 },
            { type: 'OBSTACLE', lane: 1, zOffset: 35, color: COLORS.OBSTACLE },
            { type: 'COIN', lane: 2, zOffset: 42 },
            { type: 'COIN', lane: 1, zOffset: 48 },
            { type: 'GENE', lane: 0, zOffset: 55 },
        ]
    },
    {
        id: 'chunk_hard_gauntlet',
        difficulty: PatternDifficulty.HARD,
        length: 78,
        items: [
            { type: 'COIN', lane: 0, zOffset: 5 },
            { type: 'OBSTACLE_JUMP', lane: 0, zOffset: 12 },
            { type: 'OBSTACLE', lane: -1, zOffset: 12, color: COLORS.OBSTACLE },
            { type: 'OBSTACLE', lane: 1, zOffset: 12, color: COLORS.OBSTACLE },
            { type: 'COIN', lane: 0, zOffset: 20, yOffset: 1.5 },
            { type: 'OBSTACLE_SLIDE', lane: 0, zOffset: 28 },
            { type: 'COIN', lane: -1, zOffset: 35 },
            { type: 'COIN', lane: 1, zOffset: 35 },
            { type: 'OBSTACLE_DODGE', lane: 0, zOffset: 45 },
            { type: 'COIN', lane: -1, zOffset: 52 },
            { type: 'COIN', lane: 1, zOffset: 52 },
            { type: 'GENE', lane: 0, zOffset: 60 },
            { type: 'COIN', lane: 0, zOffset: 68 },
        ]
    },
];
