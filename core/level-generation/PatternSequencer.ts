/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PatternSequencer - Управління чергуванням сегментів рівня
 */

import { LEVEL_PATTERNS, LevelSegment, PatternDifficulty } from './LevelPatternLibrary';
import { SeededRNG } from './LevelSeedSystem';

export class PatternSequencer {
    private rng: SeededRNG;
    private lastPatternId: string | null = null;
    private patternsCount: number = 0;
    private history: string[] = [];

    constructor(rng: SeededRNG) {
        this.rng = rng;
    }

    setRNG(rng: SeededRNG): void {
        this.rng = rng;
    }

    /**
     * Вибирає наступний паттерн на основі часу гри та історії
     */
    getNextPattern(timeSeconds: number): LevelSegment {
        const difficulty = this.getDifficultyForTime(timeSeconds);
        let possiblePatterns = LEVEL_PATTERNS.filter(p => p.difficulty === difficulty);

        // Правила чергування
        
        // 1. Якщо було 2 важких поспіль -> ОБОВ'ЯЗКОВО відпочинок (SEG-E04)
        if (this.shouldProvideRest()) {
            const restPattern = LEVEL_PATTERNS.find(p => p.id === 'SEG-E04');
            if (restPattern) return this.finalizeSelection(restPattern);
        }

        // 2. Виключаємо останній використаний
        possiblePatterns = possiblePatterns.filter(p => p.id !== this.lastPatternId);

        // 3. Якщо ми в EXTREME, іноді вставляємо відпочинок
        if (difficulty === PatternDifficulty.EXTREME && this.rng.chance(0.3)) {
             const restPattern = LEVEL_PATTERNS.find(p => p.id === 'SEG-E04');
             if (restPattern) return this.finalizeSelection(restPattern);
        }

        // Випадковий вибір з дозволених
        const selected = this.rng.pick(possiblePatterns) || LEVEL_PATTERNS[0];
        return this.finalizeSelection(selected);
    }

    private finalizeSelection(pattern: LevelSegment): LevelSegment {
        this.lastPatternId = pattern.id;
        this.patternsCount++;
        this.history.push(pattern.id);
        if (this.history.length > 5) this.history.shift();
        return pattern;
    }

    private shouldProvideRest(): boolean {
        if (this.history.length < 2) return false;
        
        const lastTwo = this.history.slice(-2);
        const patterns = lastTwo.map(id => LEVEL_PATTERNS.find(p => p.id === id));
        
        const allHard = patterns.every(p => 
            p && (p.difficulty === PatternDifficulty.HARD || p.difficulty === PatternDifficulty.EXTREME)
        );

        return allHard;
    }

    private getDifficultyForTime(time: number): PatternDifficulty {
        if (time < 30) return PatternDifficulty.EASY;
        if (time < 60) {
            // E + M, співвідношення 2:1 (66% E, 33% M)
            return this.rng.chance(0.33) ? PatternDifficulty.MEDIUM : PatternDifficulty.EASY;
        }
        if (time < 120) {
            // M + H, співвідношення 1:1
            return this.rng.chance(0.5) ? PatternDifficulty.HARD : PatternDifficulty.MEDIUM;
        }
        if (time < 180) {
            // H + X, співвідношення 2:1
            return this.rng.chance(0.33) ? PatternDifficulty.EXTREME : PatternDifficulty.HARD;
        }
        // 180+ сек: переважно X
        return this.rng.chance(0.8) ? PatternDifficulty.EXTREME : PatternDifficulty.HARD;
    }

    reset(): void {
        this.lastPatternId = null;
        this.patternsCount = 0;
        this.history = [];
    }
}
