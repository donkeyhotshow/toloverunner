/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * AdvancedPerformanceMonitor - Detailed profiling for Three.js/R3F
 * Tracks: FPS, Draw Calls, Triangles, Memory, Frame Budget
 * 
 * Usage:
 * const monitor = new AdvancedPerformanceMonitor();
 * monitor.begin('render');
 * // ... render code
 * monitor.end('render');
 * console.log(monitor.getReport());
 */

import * as THREE from 'three';

export interface PerformanceReport {
    fps: number;
    frameTime: number; // ms
    drawCalls: number;
    triangles: number;
    memoryMB: number;
    markers: Map<string, number>; // Custom timing markers
    budget: {
        target: number; // ms (16.67 for 60fps, 33.33 for 30fps)
        actual: number;
        percentage: number;
    };
}

export class AdvancedPerformanceMonitor {
    private renderer: THREE.WebGLRenderer | null = null;
    private frameCount = 0;
    private lastTime = performance.now();
    private frameTimes: number[] = [];
    private markers = new Map<string, number>();
    private targetFPS: number;

    constructor(targetFPS = 30) {
        this.targetFPS = targetFPS;
    }

    setRenderer(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
    }

    /**
     * Mark the beginning of a timed section
     */
    begin(label: string) {
        this.markers.set(`${label}_start`, performance.now());
    }

    /**
     * Mark the end of a timed section
     */
    end(label: string) {
        const startTime = this.markers.get(`${label}_start`);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.markers.set(label, duration);
            this.markers.delete(`${label}_start`);
        }
    }

    /**
     * Update per-frame metrics
     */
    update() {
        this.frameCount++;
        const now = performance.now();
        const frameTime = now - this.lastTime;
        this.lastTime = now;

        // Track last 60 frames
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
    }

    /**
     * Get current performance report
     */
    getReport(): PerformanceReport {
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length || 0;
        const fps = 1000 / avgFrameTime;
        const targetFrameTime = 1000 / this.targetFPS;

        const report: PerformanceReport = {
            fps: Math.round(fps),
            frameTime: Math.round(avgFrameTime * 100) / 100,
            drawCalls: this.renderer?.info.render.calls || 0,
            triangles: this.renderer?.info.render.triangles || 0,
            memoryMB: this.getMemoryUsage(),
            markers: new Map(this.markers),
            budget: {
                target: targetFrameTime,
                actual: avgFrameTime,
                percentage: Math.round((avgFrameTime / targetFrameTime) * 100),
            },
        };

        return report;
    }

    /**
     * Get formatted performance string for display
     */
    getDisplayString(): string {
        const report = this.getReport();
        const lines = [
            `FPS: ${report.fps} (Target: ${this.targetFPS})`,
            `Frame: ${report.frameTime}ms / ${report.budget.target}ms (${report.budget.percentage}%)`,
            `Draw Calls: ${report.drawCalls}`,
            `Triangles: ${this.formatNumber(report.triangles)}`,
            `Memory: ${report.memoryMB}MB`,
        ];

        // Add custom markers
        report.markers.forEach((time, label) => {
            if (!label.endsWith('_start')) {
                lines.push(`${label}: ${Math.round(time * 100) / 100}ms`);
            }
        });

        return lines.join('\n');
    }

    /**
     * Check if performance is within acceptable range
     */
    isPerformanceGood(): boolean {
        const report = this.getReport();
        return report.budget.percentage <= 100 && report.fps >= this.targetFPS * 0.9;
    }

    /**
     * Get bottleneck analysis
     */
    getBottleneck(): string {
        const report = this.getReport();

        if (report.drawCalls > 500) {
            return 'GPU_DRAW_CALLS';
        }
        if (report.triangles > 500000) {
            return 'GPU_GEOMETRY';
        }
        if (report.budget.percentage > 150) {
            return 'CPU_HEAVY';
        }
        if (report.memoryMB > 500) {
            return 'MEMORY';
        }

        return 'NONE';
    }

    private getMemoryUsage(): number {
        const perfMemory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
        if (perfMemory && perfMemory.usedJSHeapSize) {
            return Math.round(perfMemory.usedJSHeapSize / 1048576);
        }
        return 0;
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.frameCount = 0;
        this.frameTimes = [];
        this.markers.clear();
        this.lastTime = performance.now();
    }
}

// Singleton instance
let monitorInstance: AdvancedPerformanceMonitor | null = null;

export const getAdvancedPerformanceMonitor = (): AdvancedPerformanceMonitor => {
    if (!monitorInstance) {
        monitorInstance = new AdvancedPerformanceMonitor(30); // Default 30 FPS target
    }
    return monitorInstance;
};
