/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// No imports needed for this module

// ==========================================
// 1. RELIABILITY & NETWORK HEALTH LAYER
// (REMOVED MULTIPLAYER LOGIC)
// ==========================================

export class PerformanceMonitor {
    private frames = 0;
    private lastTime = Date.now();
    private metrics = { fps: 60 };

    update() {
        this.frames++;
        const now = Date.now();
        if (now >= this.lastTime + 1000) {
            this.metrics.fps = this.frames;
            this.frames = 0;
            this.lastTime = now;
        }
    }

    getMetrics() { return this.metrics; }
}
