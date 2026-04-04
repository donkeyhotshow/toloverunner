/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HitStopController - Freeze frame effect for impactful hits
 *
 * Функции:
 * - Freeze frame on impacts
 * - Time dilation for dramatic effect
 * - Configurable duration and intensity
 */

export interface HitStopConfig {
    duration: number;      // seconds
    timeScale: number;     // 0-1, how much to slow down
    easeOut: boolean;      // Gradually restore time scale
}

export class HitStopController {
    private isActive = false;
    private timer = 0;
    private targetTimeScale = 0;
    private easeOut = false;

    // Callback for time scale changes
    private onTimeScaleChange?: (scale: number) => void;

    constructor() {
        // Initialize
    }

    /**
     * Update hit stop
     */
    update(deltaTime: number): number {
        if (!this.isActive) return 1.0;

        this.timer -= deltaTime;

        if (this.timer <= 0) {
            this.isActive = false;
            this.notifyTimeScale(1.0);
            return 1.0;
        }

        // Ease out effect
        if (this.easeOut) {
            const progress = 1 - (this.timer / (this.timer + deltaTime));
            const currentScale = this.targetTimeScale + (1.0 - this.targetTimeScale) * progress;
            this.notifyTimeScale(currentScale);
            return currentScale;
        }

        return this.targetTimeScale;
    }

    /**
     * Trigger hit stop
     */
    trigger(config?: Partial<HitStopConfig>) {
        const duration = config?.duration || 0.1;
        const timeScale = config?.timeScale !== undefined ? config.timeScale : 0.0;
        const easeOut = config?.easeOut || false;

        this.isActive = true;
        this.timer = duration;
        this.targetTimeScale = Math.max(0, Math.min(1, timeScale));
        this.easeOut = easeOut;

        this.notifyTimeScale(this.targetTimeScale);

        if (import.meta.env.DEV) {
            console.log(`⏸️ Hit stop triggered (${duration}s, scale: ${this.targetTimeScale})`);
        }
    }

    /**
     * Quick hit stop for light hits
     */
    light() {
        this.trigger({ duration: 0.05, timeScale: 0.5, easeOut: true });
    }

    /**
     * Medium hit stop
     */
    medium() {
        this.trigger({ duration: 0.1, timeScale: 0.1, easeOut: true });
    }

    /**
     * Heavy hit stop for powerful attacks
     */
    heavy() {
        this.trigger({ duration: 0.15, timeScale: 0.0, easeOut: true });
    }

    /**
     * Critical hit stop
     */
    critical() {
        this.trigger({ duration: 0.25, timeScale: 0.0, easeOut: true });
    }

    /**
     * Notify time scale change
     */
    private notifyTimeScale(scale: number) {
        if (this.onTimeScaleChange) {
            this.onTimeScaleChange(scale);
        }

        // Dispatch global event
        window.dispatchEvent(new CustomEvent('hitstop-timescale', {
            detail: { scale }
        }));
    }

    /**
     * Check if hit stop is active
     */
    isHitStopActive(): boolean {
        return this.isActive;
    }

    /**
     * Cancel active hit stop
     */
    cancel() {
        if (this.isActive) {
            this.isActive = false;
            this.timer = 0;
            this.notifyTimeScale(1.0);
        }
    }

    /**
     * Set callback
     */
    onTimeScale(callback: (scale: number) => void) {
        this.onTimeScaleChange = callback;
    }

    /**
     * Get debug info
     */
    getDebugInfo(): string {
        return [
            '=== Hit Stop ===',
            `Active: ${this.isActive ? 'YES' : 'NO'}`,
            this.isActive ? `Timer: ${this.timer.toFixed(3)}s` : '',
            this.isActive ? `Time Scale: ${this.targetTimeScale.toFixed(2)}` : ''
        ].filter(Boolean).join('\n');
    }
}

// Singleton
let hitStopInstance: HitStopController | null = null;

export const getHitStopController = (): HitStopController => {
    if (!hitStopInstance) {
        hitStopInstance = new HitStopController();
    }
    return hitStopInstance;
};

export const destroyHitStopController = () => {
    hitStopInstance = null;
};
