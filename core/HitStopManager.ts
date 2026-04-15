/**
 * HitStopManager - Manages "Freeze Frame" effects for impact juice
 *
 * When triggered, it scales down the game loop delta for a short duration.
 * This creates a "pause" effect that emphasizes impacts without stopping the render loop.
 * Subscribes via eventBus (single event system — no window events).
 */

import { eventBus } from '../utils/eventBus';

class HitStopManager {
    private remainingTime: number = 0;
    private activeScale: number = 0.0;
    private unsubHit: (() => void) | null = null;
    private unsubStop: (() => void) | null = null;

    constructor() {
        this.unsubHit = eventBus.on('player:hit', () => this.trigger(0.08, 0.0));
        this.unsubStop = eventBus.on('system:hit-stop', ({ duration, scale }) => {
            this.trigger(duration, scale ?? 0.0);
        });
    }

    public trigger(duration: number, scale: number = 0.0) {
        this.remainingTime = duration;
        this.activeScale = scale;
    }

    public update(realDelta: number): number {
        if (this.remainingTime > 0) {
            this.remainingTime -= realDelta;
            return this.activeScale;
        }
        return 1.0;
    }

    public destroy(): void {
        this.unsubHit?.();
        this.unsubStop?.();
        this.unsubHit = null;
        this.unsubStop = null;
    }
}

let hitStopManagerInstance: HitStopManager | null = null;

export function getHitStopManager(): HitStopManager {
    if (!hitStopManagerInstance) {
        hitStopManagerInstance = new HitStopManager();
    }
    return hitStopManagerInstance;
}

export function destroyHitStopManager(): void {
    if (hitStopManagerInstance) {
        hitStopManagerInstance.destroy();
        hitStopManagerInstance = null;
    }
}

/** Singleton instance for backward compatibility. Use getHitStopManager() when you need to call destroy(). */
export const hitStopManager = {
    update(realDelta: number): number {
        return getHitStopManager().update(realDelta);
    }
};
