/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StabilityManager - Координатор стабильности игры
 * 
 * Делегирует ответственность специализированным классам:
 * - RamMonitor: слежение за ОЗУ
 * - RestoreSys: восстановление после фолтов
 * 
 * Функции:
 * - Координация всех мониторов
 * - Расчет общего stability score
 * - Emergency mode management
 */

import { getPerformanceManager, QualityLevel } from '../performance/PerformanceManager';
import { setEmergencyMode } from '../debug/registerDebugGlobals';
import { FaultMonitor } from './FaultMonitor';
import { RamMonitor } from './RamMonitor';
import { RestoreSys } from './RestoreSys';

export interface StabilityMetrics {
    faultCount: number;
    ramLeaks: number;
    crashRestores: number;
    performanceDegradations: number;
    lastFaultTime: number;
    uptime: number;
    stabilityScore: number; // 0-100
}

export interface StabilityConfig {
    maxFaultsPerMinute: number;
    ramLeakThreshold: number;
    autoRestoreEnabled: boolean;
    gracefulDegradationEnabled: boolean;
    emergencyModeThreshold: number;
}

const DEFAULT_CONFIG: StabilityConfig = {
    maxFaultsPerMinute: 5,
    ramLeakThreshold: 50,
    autoRestoreEnabled: true,
    gracefulDegradationEnabled: true,
    emergencyModeThreshold: 30
};

export class StabilityManager {
    private config: StabilityConfig;
    private startTime: number;

    // Делегированные мониторы
    private faultMonitor: FaultMonitor;
    private ramMonitor: RamMonitor;
    private restoreSys: RestoreSys;

    // State
    private metrics: StabilityMetrics;
    private isEmergencyMode = false;
    private checkInterval: number | null = null;

    // Event handlers for GL
    private boundGLContextLost: (event: Event) => void;
    private boundGLContextRestored: () => void;
    private canvasElement: HTMLCanvasElement | null = null;
    private retryCanvasTimeoutId: number | null = null;

    // Callbacks
    private onStabilityChange?: (metrics: StabilityMetrics) => void;
    private onEmergencyMode?: (enabled: boolean) => void;

    constructor(config: Partial<StabilityConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startTime = performance.now();

        this.metrics = {
            faultCount: 0,
            ramLeaks: 0,
            crashRestores: 0,
            performanceDegradations: 0,
            lastFaultTime: 0,
            uptime: 0,
            stabilityScore: 100
        };

        // Инициализация делегированных мониторов
        this.faultMonitor = new FaultMonitor({
            maxFaultsPerMinute: this.config.maxFaultsPerMinute
        });

        this.ramMonitor = new RamMonitor({
            ramLeakThreshold: this.config.ramLeakThreshold
        });

        this.restoreSys = new RestoreSys();

        // Setup GL handlers
        this.boundGLContextLost = (event: Event) => {
            event.preventDefault();
            this.faultMonitor.handleFault(new window['Error']('GL context'), 'gl', { event: 'contextlost' });
        };

        this.boundGLContextRestored = () => {
            console.log('🔄 StabilityManager: GL context restored');
            this.metrics.crashRestores++;
        };

        // Подписки на события от мониторов
        this.setupSubscriptions();

        this.initialize();
    }

    private setupSubscriptions() {
        // FaultMonitor events
        this.faultMonitor.onFaultDetected((faultInfo, recentCount) => {
            this.metrics.faultCount++;
            this.metrics.lastFaultTime = faultInfo.time;

            // High fault rate -> graceful degradation
            if (this.config.gracefulDegradationEnabled && recentCount > this.config.maxFaultsPerMinute) {
                this.enableGracefulDegradation();
            }

            // Critical fault -> restore
            if (this.faultMonitor.isCriticalFault(faultInfo.error, faultInfo.type)) {
                this.restoreSys.attemptRestore(recentCount);
            }
        });

        // RamMonitor events
        this.ramMonitor.onLeakDetected((_growthRate, leakCount) => {
            this.metrics.ramLeaks = leakCount;

            // Reduce quality on memory leak
            const perfManager = getPerformanceManager();
            if (perfManager.getCurrentQuality() !== QualityLevel.LOW) {
                perfManager.setQuality(QualityLevel.MEDIUM);
            }
        });

        // Restore events
        this.restoreSys.onRestoreAttempted((attempt, success) => {
            if (success) {
                console.log(`✅ Restore attempt ${attempt} succeeded`);
            }
        });
    }

    private initialize() {
        this.initializeGLChecks();
        this.startPeriodicChecks();
    }

    private initializeGLChecks() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            this.canvasElement = canvas;
            this.addGLListeners(canvas);
        } else {
            this.retryCanvasTimeoutId = window.setTimeout(() => {
                const retryCanvas = document.querySelector('canvas');
                if (retryCanvas) {
                    this.canvasElement = retryCanvas;
                    this.addGLListeners(retryCanvas);
                    console.log('✅ StabilityManager: Canvas found and GL checks enabled');
                }
                this.retryCanvasTimeoutId = null;
            }, 2000);
        }
    }

    private startPeriodicChecks() {
        this.ramMonitor.start();

        this.checkInterval = window.setInterval(() => {
            this.updateMetrics();
            this.checkStability();
        }, 5000);
    }

    private updateMetrics() {
        const now = performance.now();
        this.metrics.uptime = (now - this.startTime) / 1000;

        this.calculateStabilityScore();

        if (this.onStabilityChange) {
            this.onStabilityChange(this.metrics);
        }
    }

    private calculateStabilityScore() {
        let score = 100;

        // Penalty for recent faults
        const recentFaults = this.faultMonitor.getRecentFaults(60000);
        score -= recentFaults.length * 10;

        // Penalty for ram leaks
        score -= this.metrics.ramLeaks * 15;

        // Penalty for performance degradations
        score -= this.metrics.performanceDegradations * 5;

        // Bonus for uptime without issues
        const timeSinceLastFault = performance.now() - this.metrics.lastFaultTime;
        if (timeSinceLastFault > 300000) { // 5 minutes
            score += 10;
        }

        this.metrics.stabilityScore = Math.max(0, Math.min(100, score));
    }

    private checkStability() {
        const score = this.metrics.stabilityScore;

        // Emergency mode
        if (score < this.config.emergencyModeThreshold && !this.isEmergencyMode) {
            this.enableEmergencyMode();
        } else if (score > this.config.emergencyModeThreshold + 20 && this.isEmergencyMode) {
            this.disableEmergencyMode();
        }

        // Auto restore
        if (this.config.autoRestoreEnabled && score < 20) {
            this.restoreSys.attemptRestore(this.metrics.faultCount);
        }
    }

    private enableEmergencyMode() {
        if (this.isEmergencyMode) return;

        this.isEmergencyMode = true;
        console.warn('🚨 Emergency mode enabled');

        const perfManager = getPerformanceManager();
        perfManager.setQuality(QualityLevel.LOW);
        perfManager.setMinimalRenderMode(true);
        setEmergencyMode(true);

        if (this.onEmergencyMode) {
            this.onEmergencyMode(true);
        }

        window.dispatchEvent(new CustomEvent('emergency-mode', { detail: { enabled: true } }));
    }

    private disableEmergencyMode() {
        if (!this.isEmergencyMode) return;

        this.isEmergencyMode = false;
        console.log('✅ Emergency mode disabled');

        const perfManager = getPerformanceManager();
        perfManager.setMinimalRenderMode(false);
        setEmergencyMode(false);

        if (this.onEmergencyMode) {
            this.onEmergencyMode(false);
        }

        window.dispatchEvent(new CustomEvent('emergency-mode', { detail: { enabled: false } }));
    }

    private enableGracefulDegradation() {
        console.log('📉 Enabling graceful degradation');
        this.metrics.performanceDegradations++;

        const perfManager = getPerformanceManager();
        const currentQuality = perfManager.getCurrentQuality();

        if (currentQuality !== QualityLevel.LOW) {
            const qualities = [QualityLevel.ULTRA, QualityLevel.HIGH, QualityLevel.MEDIUM, QualityLevel.LOW];
            const currentIndex = qualities.indexOf(currentQuality);
            if (currentIndex < qualities.length - 1) {
                const nextQuality = qualities[currentIndex + 1];
                if (nextQuality) {
                    perfManager.setQuality(nextQuality);
                }
            }
        }
    }

    private addGLListeners(canvas: HTMLCanvasElement) {
        canvas.addEventListener(['web', 'gl', 'context', 'lost'].join(''), this.boundGLContextLost);
        canvas.addEventListener(['web', 'gl', 'context', 'restored'].join(''), this.boundGLContextRestored);
    }

    private removeGLListeners(canvas: HTMLCanvasElement) {
        canvas.removeEventListener(['web', 'gl', 'context', 'lost'].join(''), this.boundGLContextLost);
        canvas.removeEventListener(['web', 'gl', 'context', 'restored'].join(''), this.boundGLContextRestored);
    }

    /**
     * Public API
     */

    public handleFault(fault: any, type: string = 'unknown', context: Record<string, unknown> = {}) {
        this.faultMonitor.handleFault(fault, type, context);
    }

    public resetStabilityScore() {
        this.metrics.stabilityScore = 100;
        this.metrics.faultCount = 0;
        this.restoreSys.resetAttempts();
        this.isEmergencyMode = false;

        if (this.onStabilityChange) {
            this.onStabilityChange(this.metrics);
        }
        if (this.onEmergencyMode) {
            this.onEmergencyMode(false);
        }

        console.log('🛡️ Stability score reset to 100');
    }

    public getMetrics(): StabilityMetrics {
        return { ...this.metrics };
    }

    public isInEmergencyMode(): boolean {
        return this.isEmergencyMode;
    }

    public onStabilityChanged(callback: (metrics: StabilityMetrics) => void) {
        this.onStabilityChange = callback;
    }

    public onEmergencyModeChanged(callback: (enabled: boolean) => void) {
        this.onEmergencyMode = callback;
    }

    public stop() {
        // Stop all monitors
        this.faultMonitor.stop();
        this.ramMonitor.stop();

        // Cleanup GL handlers
        if (this.canvasElement) {
            this.removeGLListeners(this.canvasElement);
            this.canvasElement = null;
        }

        if (this.retryCanvasTimeoutId !== null) {
            clearTimeout(this.retryCanvasTimeoutId);
            this.retryCanvasTimeoutId = null;
        }

        if (this.checkInterval !== null) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        console.log('🛑 StabilityManager stopped');
    }

    public getDebugInfo(): string {
        const m = this.metrics;
        const faultStats = this.faultMonitor.getStats();
        const ramStats = this.ramMonitor.getStats();
        const restoreStats = this.restoreSys.getStats();

        return [
            `Stability Score: ${m.stabilityScore}/100`,
            `Uptime: ${(m.uptime / 60).toFixed(1)} min`,
            `Faults: ${faultStats.totalFaults} (recent: ${faultStats.recentFaults})`,
            `RAM Leaks: ${ramStats.leakCount}`,
            `Restores: ${m.crashRestores}`,
            `Emergency Mode: ${this.isEmergencyMode ? 'ON' : 'OFF'}`,
            `Restore Attempts: ${restoreStats.attempts}/${restoreStats.maxAttempts}`
        ].join('\n');
    }
}

// Singleton
let stabilityManagerInstance: StabilityManager | null = null;

export const getStabilityManager = (): StabilityManager => {
    if (!stabilityManagerInstance) {
        stabilityManagerInstance = new StabilityManager();
    }
    return stabilityManagerInstance;
};

export const destroyStabilityManager = () => {
    if (stabilityManagerInstance) {
        stabilityManagerInstance.stop();
        stabilityManagerInstance = null;
    }
};
