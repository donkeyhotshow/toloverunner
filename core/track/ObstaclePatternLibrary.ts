/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ObstaclePatternLibrary - Библиотека паттернов препятствий
 *
 * Функции:
 * - Curated obstacle patterns
 * - Difficulty tiers (Beginner, Intermediate, Advanced, Expert)
 * - Pattern combination system
 * - Dynamic pattern selection
 */

// ObstacleType is defined locally below
export enum ObstacleType {
    STATIC = 'static',           // Обычные статичные препятствия
    ROTATING = 'rotating',       // Вращающиеся препятствия
    MOVING_HORIZONTAL = 'moving_horizontal', // Движение влево-вправо
    MOVING_VERTICAL = 'moving_vertical',     // Движение вверх-вниз
    DESTRUCTIBLE = 'destructible',           // Можно уничтожить атакой
    CHAIN = 'chain',              // Цепочка препятствий
    LOW = 'low',                  // Низька перешкода (тільки стрибок)
    HIGH = 'high',                // Висока перешкода (тільки підкат)
    COMBAT = 'combat'             // Ворог/перешкода (тільки Jump Attack UP+DOWN)
}

export enum AbilityType {
    DASH = 'dash',
    ATTACK = 'attack',
    JUMP = 'jump'
}

export enum PatternDifficulty {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    EXPERT = 'expert',
    NIGHTMARE = 'nightmare'
}

export interface ObstacleInstance {
    type: ObstacleType;
    position: [number, number, number]; // [lane, height, distance]
    properties: {
        rotationSpeed?: number;    // для rotating
        moveSpeed?: number;        // для moving
        moveRange?: number;        // для moving
        health?: number;           // для destructible
        phase?: number;            // для phase offset
        color?: string;
    };
}

export interface ObstaclePattern {
    id: string;
    name: string;
    difficulty: PatternDifficulty;
    description: string;
    length: number;              // Длина паттерна в метрах
    obstacles: ObstacleInstance[];
    requiredAbilities?: AbilityType[]; // ['dash', 'attack'] etc
    scoreValue: number;          // Bonus score for clearing
}

/**
 * Predefined obstacle patterns
 */
export const PATTERN_LIBRARY: ObstaclePattern[] = [
    // === BEGINNER PATTERNS ===
    {
        id: 'beginner_single_lane',
        name: 'Single Lane Block',
        difficulty: PatternDifficulty.BEGINNER,
        description: 'Simple obstacle in one lane',
        length: 5,
        obstacles: [
            {
                type: ObstacleType.STATIC,
                position: [0, 1, 0],
                properties: { color: '#8B008B' }
            }
        ],
        scoreValue: 10
    },
    {
        id: 'beginner_alternate',
        name: 'Alternating Lanes',
        difficulty: PatternDifficulty.BEGINNER,
        description: 'Simple lane switches',
        length: 15,
        obstacles: [
            { type: ObstacleType.STATIC, position: [-1, 1, 0], properties: {} },
            { type: ObstacleType.STATIC, position: [1, 1, 5], properties: {} },
            { type: ObstacleType.STATIC, position: [-1, 1, 10], properties: {} }
        ],
        scoreValue: 30
    },
    {
        id: 'beginner_low_hurdle',
        name: 'Low Hurdle',
        difficulty: PatternDifficulty.BEGINNER,
        description: 'Obstacle that must be jumped over',
        length: 10,
        obstacles: [
            { type: ObstacleType.LOW, position: [0, 1, 0], properties: { color: '#FF4444' } }
        ],
        scoreValue: 20
    },
    {
        id: 'beginner_high_barrier',
        name: 'High Barrier',
        difficulty: PatternDifficulty.BEGINNER,
        description: 'Obstacle that must be slid under',
        length: 10,
        obstacles: [
            { type: ObstacleType.HIGH, position: [0, 1, 0], properties: { color: '#4444FF' } }
        ],
        scoreValue: 20
    },
    {
        id: 'beginner_combat_enemy',
        name: 'Combat Enemy',
        difficulty: PatternDifficulty.BEGINNER,
        description: 'Enemy that requires Jump Attack (UP+DOWN)',
        length: 10,
        obstacles: [
            { type: ObstacleType.COMBAT, position: [0, 1, 0], properties: { color: '#00FF00' } }
        ],
        scoreValue: 50
    },

    // === INTERMEDIATE PATTERNS ===
    {
        id: 'inter_rotating_duo',
        name: 'Spinning Pair',
        difficulty: PatternDifficulty.INTERMEDIATE,
        description: 'Two rotating obstacles requiring timing',
        length: 10,
        obstacles: [
            {
                type: ObstacleType.ROTATING,
                position: [-1, 1, 0],
                properties: { rotationSpeed: 2.0, phase: 0 }
            },
            {
                type: ObstacleType.ROTATING,
                position: [1, 1, 5],
                properties: { rotationSpeed: 2.0, phase: Math.PI }
            }
        ],
        scoreValue: 50
    },
    {
        id: 'inter_horizontal_sweep',
        name: 'Lane Sweeper',
        difficulty: PatternDifficulty.INTERMEDIATE,
        description: 'Horizontally moving obstacle',
        length: 8,
        obstacles: [
            {
                type: ObstacleType.MOVING_HORIZONTAL,
                position: [0, 1, 0],
                properties: { moveSpeed: 3.0, moveRange: 2.0 }
            }
        ],
        scoreValue: 40
    },
    {
        id: 'inter_destructible_wall',
        name: 'Breakable Wall',
        difficulty: PatternDifficulty.INTERMEDIATE,
        description: 'Wall that can be destroyed with attack',
        length: 5,
        obstacles: [
            {
                type: ObstacleType.DESTRUCTIBLE,
                position: [-1, 1, 0],
                properties: { health: 1, color: '#32CD32' }
            },
            {
                type: ObstacleType.DESTRUCTIBLE,
                position: [0, 1, 0],
                properties: { health: 1, color: '#32CD32' }
            },
            {
                type: ObstacleType.DESTRUCTIBLE,
                position: [1, 1, 0],
                properties: { health: 1, color: '#32CD32' }
            }
        ],
        requiredAbilities: [AbilityType.ATTACK],
        scoreValue: 100
    },

    // === ADVANCED PATTERNS ===
    {
        id: 'adv_rotating_gauntlet',
        name: 'Spinning Gauntlet',
        difficulty: PatternDifficulty.ADVANCED,
        description: 'Multiple rotating obstacles with phase offsets',
        length: 20,
        obstacles: [
            {
                type: ObstacleType.ROTATING,
                position: [-1, 1, 0],
                properties: { rotationSpeed: 3.0, phase: 0 }
            },
            {
                type: ObstacleType.ROTATING,
                position: [0, 1, 5],
                properties: { rotationSpeed: 3.0, phase: Math.PI / 3 }
            },
            {
                type: ObstacleType.ROTATING,
                position: [1, 1, 10],
                properties: { rotationSpeed: 3.0, phase: 2 * Math.PI / 3 }
            },
            {
                type: ObstacleType.ROTATING,
                position: [0, 1, 15],
                properties: { rotationSpeed: 3.0, phase: Math.PI }
            }
        ],
        scoreValue: 150
    },
    {
        id: 'adv_vertical_bounce',
        name: 'Bouncing Barriers',
        difficulty: PatternDifficulty.ADVANCED,
        description: 'Vertically moving obstacles',
        length: 15,
        obstacles: [
            {
                type: ObstacleType.MOVING_VERTICAL,
                position: [-1, 1, 0],
                properties: { moveSpeed: 2.0, moveRange: 2.0, phase: 0 }
            },
            {
                type: ObstacleType.MOVING_VERTICAL,
                position: [1, 1, 5],
                properties: { moveSpeed: 2.0, moveRange: 2.0, phase: Math.PI }
            },
            {
                type: ObstacleType.MOVING_VERTICAL,
                position: [0, 1, 10],
                properties: { moveSpeed: 2.0, moveRange: 2.0, phase: Math.PI / 2 }
            }
        ],
        scoreValue: 120
    },
    {
        id: 'adv_dash_tunnel',
        name: 'Dash Required',
        difficulty: PatternDifficulty.ADVANCED,
        description: 'Narrow passage requiring dash to pass',
        length: 10,
        obstacles: [
            { type: ObstacleType.STATIC, position: [-1, 1, 0], properties: {} },
            { type: ObstacleType.STATIC, position: [1, 1, 0], properties: {} },
            { type: ObstacleType.STATIC, position: [-1, 1, 3], properties: {} },
            { type: ObstacleType.STATIC, position: [1, 1, 3], properties: {} },
            { type: ObstacleType.STATIC, position: [-1, 1, 6], properties: {} },
            { type: ObstacleType.STATIC, position: [1, 1, 6], properties: {} }
        ],
        requiredAbilities: [AbilityType.DASH],
        scoreValue: 200
    },

    // === EXPERT PATTERNS ===
    {
        id: 'expert_chaos_spiral',
        name: 'Chaos Spiral',
        difficulty: PatternDifficulty.EXPERT,
        description: 'Complex rotating and moving obstacles',
        length: 25,
        obstacles: [
            {
                type: ObstacleType.ROTATING,
                position: [0, 1, 0],
                properties: { rotationSpeed: 4.0, phase: 0 }
            },
            {
                type: ObstacleType.MOVING_HORIZONTAL,
                position: [-1, 1, 5],
                properties: { moveSpeed: 4.0, moveRange: 2.0 }
            },
            {
                type: ObstacleType.ROTATING,
                position: [1, 1, 10],
                properties: { rotationSpeed: 4.0, phase: Math.PI }
            },
            {
                type: ObstacleType.DESTRUCTIBLE,
                position: [0, 1, 15],
                properties: { health: 2, color: '#FF6B35' }
            },
            {
                type: ObstacleType.MOVING_VERTICAL,
                position: [-1, 1, 20],
                properties: { moveSpeed: 3.0, moveRange: 2.5 }
            }
        ],
        requiredAbilities: [AbilityType.DASH, AbilityType.ATTACK],
        scoreValue: 300
    },
    {
        id: 'expert_all_or_nothing',
        name: 'All or Nothing',
        difficulty: PatternDifficulty.EXPERT,
        description: 'Must destroy all obstacles to pass',
        length: 15,
        obstacles: Array.from({ length: 9 }, (_, i) => ({
            type: ObstacleType.DESTRUCTIBLE,
            position: [(i % 3) - 1, 1, Math.floor(i / 3) * 5] as [number, number, number],
            properties: { health: 1, color: '#4CAF50' }
        })),
        requiredAbilities: [AbilityType.ATTACK],
        scoreValue: 400
    },

    // === NIGHTMARE PATTERNS ===
    {
        id: 'nightmare_bullet_hell',
        name: 'Bullet Hell',
        difficulty: PatternDifficulty.NIGHTMARE,
        description: 'Extreme challenge with all obstacle types',
        length: 30,
        obstacles: [
            // Rotating barriers
            ...Array.from({ length: 5 }, (_, i) => ({
                type: ObstacleType.ROTATING,
                position: [(-1 + (i % 3)), 1, i * 5] as [number, number, number],
                properties: { rotationSpeed: 5.0, phase: i * Math.PI / 5 }
            })),
            // Moving obstacles
            ...Array.from({ length: 3 }, (_, i) => ({
                type: ObstacleType.MOVING_HORIZONTAL,
                position: [0, 1, 10 + i * 5] as [number, number, number],
                properties: { moveSpeed: 5.0, moveRange: 2.0, phase: i * Math.PI / 3 }
            }))
        ],
        requiredAbilities: [AbilityType.DASH, AbilityType.ATTACK],
        scoreValue: 1000
    }
];

export class ObstaclePatternLibrary {
    private patterns: Map<string, ObstaclePattern> = new Map();
    private difficultyGroups: Map<PatternDifficulty, ObstaclePattern[]> = new Map();

    constructor() {
        this.loadPatterns();
    }

    /**
     * Load patterns into library
     */
    private loadPatterns() {
        PATTERN_LIBRARY.forEach(pattern => {
            this.patterns.set(pattern.id, pattern);

            // Group by difficulty
            if (!this.difficultyGroups.has(pattern.difficulty)) {
                this.difficultyGroups.set(pattern.difficulty, []);
            }
            this.difficultyGroups.get(pattern.difficulty)!.push(pattern);
        });

        if (import.meta.env.DEV) {
            console.log(`📚 Loaded ${this.patterns.size} obstacle patterns`);
        }
    }

    /**
     * Get pattern by ID
     */
    getPattern(id: string): ObstaclePattern | undefined {
        return this.patterns.get(id);
    }

    /**
     * Get random pattern by difficulty
     */
    getRandomPattern(difficulty: PatternDifficulty): ObstaclePattern | null {
        const patterns = this.difficultyGroups.get(difficulty);
        if (!patterns || patterns.length === 0) return null;

        return patterns[Math.floor(Math.random() * patterns.length)] || null;
    }

    /**
     * Get patterns by difficulty
     */
    getPatternsByDifficulty(difficulty: PatternDifficulty): ObstaclePattern[] {
        return this.difficultyGroups.get(difficulty) || [];
    }

    /**
     * Get pattern appropriate for player skill
     */
    getAdaptivePattern(
        playerSkill: number, // 0-1
        hasAbilities: AbilityType[]
    ): ObstaclePattern | null {
        // Map skill to difficulty
        let difficulty: PatternDifficulty;
        if (playerSkill < 0.2) difficulty = PatternDifficulty.BEGINNER;
        else if (playerSkill < 0.4) difficulty = PatternDifficulty.INTERMEDIATE;
        else if (playerSkill < 0.6) difficulty = PatternDifficulty.ADVANCED;
        else if (playerSkill < 0.8) difficulty = PatternDifficulty.EXPERT;
        else difficulty = PatternDifficulty.NIGHTMARE;

        // Get candidates
        const candidates = this.getPatternsByDifficulty(difficulty);

        // Filter by available abilities
        const suitable = candidates.filter(pattern => {
            if (!pattern.requiredAbilities) return true;
            return pattern.requiredAbilities.every(req => hasAbilities.includes(req));
        });

        if (suitable.length === 0) {
            // Fallback to easier difficulty
            return this.getRandomPattern(PatternDifficulty.BEGINNER);
        }

        return suitable[Math.floor(Math.random() * suitable.length)] || null;
    }

    /**
     * Create pattern variant (randomize positions slightly)
     */
    createVariant(pattern: ObstaclePattern, variance = 0.5): ObstaclePattern {
        return {
            ...pattern,
            id: `${pattern.id}_variant_${Date.now()}`,
            obstacles: pattern.obstacles.map(obs => {
                const newLane = obs.position[0] + (Math.random() - 0.5) * variance;
                const clampedLane = Math.max(-1.5, Math.min(1.5, newLane)); // Allow slight off-center but strictly within playable area
                return {
                    ...obs,
                    position: [
                        clampedLane,
                        obs.position[1],
                        obs.position[2] + (Math.random() - 0.5) * variance * 2
                    ] as [number, number, number]
                };
            })
        };
    }

    /**
     * Combine multiple patterns
     */
    combinePatterns(patternIds: string[], spacing = 5): ObstaclePattern | null {
        const patterns = patternIds
            .map(id => this.getPattern(id))
            .filter(p => p !== undefined) as ObstaclePattern[];

        if (patterns.length === 0) return null;

        let currentDistance = 0;
        const combinedObstacles: ObstacleInstance[] = [];

        patterns.forEach(pattern => {
            pattern.obstacles.forEach(obs => {
                combinedObstacles.push({
                    ...obs,
                    position: [
                        obs.position[0],
                        obs.position[1],
                        obs.position[2] + currentDistance
                    ]
                });
            });
            currentDistance += pattern.length + spacing;
        });

        return {
            id: `combined_${Date.now()}`,
            name: 'Combined Pattern',
            difficulty: patterns[patterns.length - 1]?.difficulty ?? PatternDifficulty.INTERMEDIATE,
            description: `Combination of ${patterns.length} patterns`,
            length: currentDistance - spacing,
            obstacles: combinedObstacles,
            scoreValue: patterns.reduce((sum, p) => sum + p.scoreValue, 0)
        };
    }

    /**
     * Get all pattern IDs
     */
    getAllPatternIds(): string[] {
        return Array.from(this.patterns.keys());
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            totalPatterns: this.patterns.size,
            byDifficulty: Array.from(this.difficultyGroups.entries()).map(([diff, patterns]) => ({
                difficulty: diff,
                count: patterns.length
            }))
        };
    }
}

// Singleton
let patternLibraryInstance: ObstaclePatternLibrary | null = null;

export const getObstaclePatternLibrary = (): ObstaclePatternLibrary => {
    if (!patternLibraryInstance) {
        patternLibraryInstance = new ObstaclePatternLibrary();
    }
    return patternLibraryInstance;
};

export const destroyObstaclePatternLibrary = () => {
    patternLibraryInstance = null;
};
