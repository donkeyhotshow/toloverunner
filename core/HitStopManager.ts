/**
 * HitStopManager - Manages "Freeze Frame" effects for impact juice
 *
 * When triggered, it scales down the game loop delta for a short duration.
 * This creates a "pause" effect that emphasizes impacts without stopping the render loop.
 */

class HitStopManager {
    private remainingTime: number = 0;
    private activeScale: number = 0.0;
    private destroyed = false;

    private boundOnPlayerHit = () => this.onPlayerHit();
    private boundHitStop: EventListener = (e: Event) => {
        const ev = e as CustomEvent<{ duration?: number; scale?: number }>;
        const duration = ev.detail?.duration ?? 0.08;
        const scale = ev.detail?.scale ?? 0.0;
        this.trigger(duration, scale);
    };

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('player-hit', this.boundOnPlayerHit);
            window.addEventListener('hit-stop', this.boundHitStop as EventListener);
        }
    }

    private onPlayerHit() {
        this.trigger(0.08, 0.0);
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
        if (this.destroyed || typeof window === 'undefined') return;
        window.removeEventListener('player-hit', this.boundOnPlayerHit);
        window.removeEventListener('hit-stop', this.boundHitStop as EventListener);
        this.destroyed = true;
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
