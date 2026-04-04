/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Progression Levels Config
export const LEVEL_CONFIG = {
    BASE_XP: 1000,
    GROWTH_FACTOR: 1.2,
    MAX_LEVEL: 50
};

export interface ProgressionState {
    level: number;
    currentXP: number;
    totalXP: number;
    unlocks: string[];
}

const STORAGE_KEY = 'toloverunner_progression_v1';

export class ProgressionSystem {
    private static instance: ProgressionSystem;
    private state: ProgressionState;

    private constructor() {
        this.state = this.loadState();
    }

    public static getInstance(): ProgressionSystem {
        if (!ProgressionSystem.instance) {
            ProgressionSystem.instance = new ProgressionSystem();
        }
        return ProgressionSystem.instance;
    }

    private loadState(): ProgressionState {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load progression:', e);
        }
        // Default clean state
        return {
            level: 1,
            currentXP: 0,
            totalXP: 0,
            unlocks: []
        };
    }

    private saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save progression:', e);
        }
    }

    public getXPForNextLevel(level: number): number {
        // Formula: Base * (Growth ^ (Level - 1))
        return Math.floor(LEVEL_CONFIG.BASE_XP * Math.pow(LEVEL_CONFIG.GROWTH_FACTOR, level - 1));
    }

    public addXP(amount: number): { leveledUp: boolean, levelsGained: number } {
        this.state.currentXP += amount;
        this.state.totalXP += amount;
        
        let leveledUp = false;
        let levelsGained = 0;
        let xpNeeded = this.getXPForNextLevel(this.state.level);

        while (this.state.currentXP >= xpNeeded && this.state.level < LEVEL_CONFIG.MAX_LEVEL) {
            this.state.currentXP -= xpNeeded;
            this.state.level++;
            levelsGained++;
            leveledUp = true;
            xpNeeded = this.getXPForNextLevel(this.state.level);
        }

        this.saveState();
        return { leveledUp, levelsGained };
    }

    public getState(): ProgressionState {
        return { ...this.state };
    }
    
    public reset(): void {
        this.state = {
            level: 1,
            currentXP: 0,
            totalXP: 0,
            unlocks: []
        };
        this.saveState();
    }
}
