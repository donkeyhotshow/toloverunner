/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PerformanceManager - Автоматическая адаптация качества для стабильного FPS
 *
 * Функции:
 * - Мониторинг FPS, draw calls, memory в реальном времени
 * - Автоматическое переключение качества при падении FPS
 * - Адаптивная LOD система (DRAW_DISTANCE, TRACK_CHUNKS)
 * - Debug overlay для визуализации метрик
 *
 * @example
 * ```typescript
 * const perfManager = new PerformanceManager();
 * perfManager.start();
 *
 * // В игровом цикле:
 * useFrame(() => {
 *     perfManager.update();
 *     const quality = perfManager.getCurrentQuality();
 * });
 * ```
 */

import * as THREE from 'three';
import { debugLog, debugWarn } from '../../utils/debug';
import {
    registerDebugMetricsLog,
    registerDebugQuality,
    setEmergencyMode,
    setMinimalRenderMode as setDebugMinimalRenderMode,
} from '../debug/registerDebugGlobals';

export enum QualityLevel {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    ULTRA = 3
}

export interface PerformanceMetrics {
    fps: number;
    averageFps: number;
    minFps: number;
    maxFps: number;
    drawCalls: number;
    triangles: number;
    memoryUsed: number; // MB
    activeObjects: number;
    deltaTime: number;
    systemTimings: Record<string, number>; // ms spent in each system
    missedInputs?: number;
    physicsSubSteps?: number;
}

export interface QualitySettings {
    drawDistance: number;
    trackChunks: number;
    shadowQuality: 'off' | 'low' | 'high';
    particleCount: number;
    textureQuality: number; // 0.5 - 2.0
    segmentsMultiplier: number; // 0.5 - 2.0 (LOD)
    antiAliasing: boolean;
}

const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
    [QualityLevel.LOW]: {
        drawDistance: 500,
        trackChunks: 50,
        shadowQuality: 'off',
        particleCount: 20,
        textureQuality: 0.5,
        segmentsMultiplier: 0.5,
        antiAliasing: false,
    },
    [QualityLevel.MEDIUM]: {
        drawDistance: 1000,
        trackChunks: 80,
        shadowQuality: 'off',
        particleCount: 40,
        textureQuality: 0.75,
        segmentsMultiplier: 0.8,
        antiAliasing: false,
    },
    [QualityLevel.HIGH]: {
        drawDistance: 2000,
        trackChunks: 120,
        shadowQuality: 'low',
        particleCount: 80,
        textureQuality: 1.0,
        segmentsMultiplier: 1.0,
        antiAliasing: true,
    },
    [QualityLevel.ULTRA]: {
        drawDistance: 3000,
        trackChunks: 200,
        shadowQuality: 'high',
        particleCount: 150,
        textureQuality: 1.5,
        segmentsMultiplier: 2.0,
        antiAliasing: true,
    },
};

const FPS_THRESHOLDS = {
    CRITICAL: 10,  // Ниже 10 FPS - критично, переключаемся на LOW
    LOW: 25,       // Ниже 25 FPS - понижаем качество
    MEDIUM: 40,    // 25-40 FPS - средний уровень
    HIGH: 55,      // 40-55 FPS - высокий уровень
    STABLE: 58,    // Выше 58 FPS - стабильно, можно повысить качество
};

export class PerformanceManager {
    private currentQuality: QualityLevel = QualityLevel.LOW;
    private metrics: PerformanceMetrics = {
        fps: 60,
        averageFps: 60,
        minFps: 60,
        maxFps: 60,
        drawCalls: 0,
        triangles: 0,
        memoryUsed: 0,
        activeObjects: 0,
        deltaTime: 0,
        systemTimings: {},
        missedInputs: 0,
        physicsSubSteps: 0,
    };

    private systemTimings: Map<string, number> = new Map();
    private activeTimers: Map<string, number> = new Map();

    // FPS tracking
    private fpsHistory: number[] = [];
    private readonly FPS_HISTORY_SIZE = 120; // 2 секунды при 60 FPS
    private frameCount = 0;
    private lastTime = performance.now();
    private lastFpsUpdateTime = performance.now();

    // Quality switching
    private qualitySwitchCooldown = 0;
    private readonly QUALITY_SWITCH_COOLDOWN = 3000; // 3 секунды между переключениями
    private lowFpsCounter = 0;
    private readonly LOW_FPS_THRESHOLD_COUNT = 180; // 180 кадров (3 сек) для переключения

    // Renderer reference (для draw calls и triangles)
    private renderer: THREE.WebGLRenderer | null = null;
    // Batching / minimal render mode
    private batchingEnabled = false;


    // Periodic metric sampler (5s)
    private metricSamplerId: number | null = null;
    private readonly METRIC_SAMPLE_INTERVAL_MS = 5000;
    private metricsLog: PerformanceMetrics[] = [];
    // Telemetry counters (accumulate between metric samples)
    private missedInputsCounter = 0;
    private physicsSubStepsCounter = 0;

    // Callbacks
    private onQualityChange?: (_quality: QualityLevel, _settings: QualitySettings) => void;
    private onMetricsUpdate?: (_metrics: PerformanceMetrics) => void;

    /** Текущая дистанция отрисовки (из пресета качества); не мутировать LOD_CONFIG. */
    private currentDrawDistance: number;

    constructor(initialQuality: QualityLevel = QualityLevel.HIGH) {
        this.currentQuality = initialQuality;
        this.currentDrawDistance = QUALITY_PRESETS[initialQuality].drawDistance;
        this.applyQualitySettings(initialQuality);
    }

    /**
     * Запустить мониторинг производительности
     */
    start() {
        this.lastTime = performance.now();
        this.lastFpsUpdateTime = performance.now();
        this.fpsHistory = [];
        this.frameCount = 0;

        // Expose profiler to window
        if (typeof window !== 'undefined') {
            (window as unknown as { __TOLOVERUNNER_PROFILER__: unknown }).__TOLOVERUNNER_PROFILER__ = {
                getMetrics: () => this.getMetrics(),
                getSystemTimings: () => Object.fromEntries(this.systemTimings)
            };
        }

        debugLog('🚀 PerformanceManager started');
        debugLog(`   Initial quality: ${this.currentQuality}`);
        debugLog(`   Settings:`, QUALITY_PRESETS[this.currentQuality]);
        // start periodic metric sampler (every 5s)
        try {
            if (this.metricSamplerId == null) {
                this.metricSamplerId = window.setInterval(() => {
                    const snapshot = this.getMetrics();
                    this.metricsLog.push(snapshot);

                    // CRITICAL FIX: More aggressive log size management to prevent memory leaks
                    const maxLogSize = 360; // 30min history at 5s intervals
                    if (this.metricsLog.length > maxLogSize) {
                        // Remove oldest entries, keeping only the most recent
                        const excessEntries = this.metricsLog.length - maxLogSize;
                        this.metricsLog.splice(0, excessEntries);
                    }

                    // Emergency cleanup if log grows too large
                    if (this.metricsLog.length > maxLogSize * 1.5) {
                        console.warn('⚠️ Metrics log exceeded safe limit, performing emergency cleanup');
                        this.metricsLog = this.metricsLog.slice(-maxLogSize);
                    }
                    // best-effort console logging (dev)
                    if (Math.random() < 0.1) { // Log 10% of samples to avoid spam
                        debugLog('[PerformanceManager] periodic-sample', snapshot);
                    }
                    // expose latest snapshot via debug registry
                    registerDebugMetricsLog(this.metricsLog);
                }, this.METRIC_SAMPLE_INTERVAL_MS);
            }
        } catch { /* ignore (server-side) */ }
    }

    /**
     * Начать замер времени для системы
     */
    beginSystem(name: string) {
        this.activeTimers.set(name, performance.now());
    }

    /**
     * Закончить замер времени для системы
     */
    endSystem(name: string) {
        const start = this.activeTimers.get(name);
        if (start !== undefined) {
            const duration = performance.now() - start;
            const current = this.systemTimings.get(name) || 0;
            // Exponential moving average for smoother values
            this.systemTimings.set(name, current * 0.9 + duration * 0.1);
            this.activeTimers.delete(name);
        }
    }

    /**
     * Регистрация времени обработки кадра (ms)
     */
    recordFrameTime(frameTime: number) {
        this.update(frameTime / 1000);
    }

    /**
     * Обновить метрики производительности (вызывать в useFrame)
     * Optimized: Only updates metrics every 100ms, quality adaptation every 500ms
     */
    update(deltaTime?: number, isMenu: boolean = false) {
        const now = performance.now();
        this.frameCount++;

        // Calculate frame delta
        const frameDelta = now - this.lastTime;
        this.lastTime = now;

        // Skip invalid frames (tab switch, etc)
        if (frameDelta > 200) return;

        const currentFps = 1000 / Math.max(frameDelta, 0.001);

        // Add to history with strict size enforcement to prevent memory leaks
        this.fpsHistory.push(currentFps);

        // CRITICAL FIX: Force array size limit to prevent unbounded growth
        while (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
            this.fpsHistory.shift();
        }

        // Additional safety check - truncate if somehow exceeded
        if (this.fpsHistory.length > this.FPS_HISTORY_SIZE * 1.5) {
            console.warn('⚠️ FPS history exceeded safe limit, truncating');
            this.fpsHistory = this.fpsHistory.slice(-this.FPS_HISTORY_SIZE);
        }

        // Throttle metric updates to every 100ms
        const timeSinceMetricUpdate = now - this.lastFpsUpdateTime;
        if (timeSinceMetricUpdate >= 100) {
            this.updateMetrics(currentFps, deltaTime);
            this.lastFpsUpdateTime = now;

            // Callback (throttled)
            if (this.onMetricsUpdate) {
                this.onMetricsUpdate(this.metrics);
            }
        }

        // Throttle quality adaptation to every 500ms (not in menu)
        if (!isMenu && this.qualitySwitchCooldown <= 0) {
            // Only check every 500ms to reduce CPU overhead
            if (timeSinceMetricUpdate >= 500 || this.fpsHistory.length === this.FPS_HISTORY_SIZE) {
                this.adaptQuality();
            }
        } else if (this.qualitySwitchCooldown > 0) {
            this.qualitySwitchCooldown -= frameDelta;
        }
    }

    /**
     * Обновить метрики производительности
     */
    private updateMetrics(currentFps: number, deltaTime?: number) {
        // FPS метрики
        this.metrics.fps = Math.round(currentFps);
        this.metrics.averageFps = Math.round(
            this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
        );
        this.metrics.minFps = Math.round(Math.min(...this.fpsHistory));
        this.metrics.maxFps = Math.round(Math.max(...this.fpsHistory));

        // Renderer метрики
        if (this.renderer?.info) {
            this.metrics.drawCalls = this.renderer.info.render.calls || 0;
            this.metrics.triangles = this.renderer.info.render.triangles || 0;
        }

        // Memory метрики (Chrome-specific API with fallback)
        const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        if (perfMemory && typeof perfMemory.usedJSHeapSize === 'number') {
            this.metrics.memoryUsed = Math.round(
                perfMemory.usedJSHeapSize / 1048576
            );
        } else {
            // CRITICAL FIX: Fallback for non-Chrome browsers
            // Estimate memory usage based on active objects and other metrics
            const estimatedMemory = Math.max(50,
                (this.metrics.activeObjects * 0.1) +
                (this.metrics.drawCalls * 0.05) +
                (this.fpsHistory.length * 0.001)
            );
            this.metrics.memoryUsed = Math.round(estimatedMemory);
        }

        // Delta time
        if (deltaTime !== undefined) {
            this.metrics.deltaTime = Math.round(deltaTime * 1000 * 100) / 100; // ms с 2 знаками
        }

        // System timings
        this.metrics.systemTimings = Object.fromEntries(this.systemTimings);
        // Telemetry counters (sampled and reset)
        this.metrics.missedInputs = this.missedInputsCounter;
        this.metrics.physicsSubSteps = this.physicsSubStepsCounter;
        // reset counters after sampling
        this.missedInputsCounter = 0;
        this.physicsSubStepsCounter = 0;
    }

    /**
     * Increment missed input counter (e.g., input dropped due to throttling)
     */
    incrementMissedInputs(count: number = 1) {
        this.missedInputsCounter += count;
    }

    /**
     * Add physics sub-steps executed in a frame (for stability monitoring)
     */
    addPhysicsSubSteps(count: number) {
        this.physicsSubStepsCounter += count;
    }

    /**
     * Enable draw call batching on renderer if supported.
     * This is a best-effort helper — renderer implementation may expose enableBatching().
     */
    enableBatching() {
        if (!this.renderer) return false;
        const r = this.renderer as unknown as { enableBatching?: (v: boolean) => void; capabilities?: unknown; mergeDrawCalls?: (v: boolean) => void };
        try {
            if (typeof r.enableBatching === 'function') {
                r.enableBatching(true);
                this.batchingEnabled = true;
                return true;
            }
            // try common engines flag
            if (r.capabilities && typeof r.mergeDrawCalls === 'function') {
                r.mergeDrawCalls(true);
                this.batchingEnabled = true;
                return true;
            }
        } catch {
            // ignore
        }
        return false;
    }

    /**
     * Toggle minimal render mode — reduce updates, skip expensive passes.
     * Renderer implementation may expose setMinimalMode(boolean).
     */
    setMinimalRenderMode(enabled: boolean) {
        this.minimalRenderMode = enabled;
        const r = this.renderer as unknown as { setMinimalMode?: (v: boolean) => void };
        try {
            if (r && typeof r.setMinimalMode === 'function') {
                r.setMinimalMode(enabled);
            }
            // Register via debug globals (tree-shaken in prod)
            setDebugMinimalRenderMode(enabled);
        } catch { /* ignore */ }
    }

    /**
     * Улучшенная адаптивная система качества с предиктивным анализом
     */
    private adaptQuality() {
        const avgFps = this.metrics.averageFps;
        const mps = this.metrics.minFps;
        const drawCalls = this.metrics.drawCalls;
        const memoryUsed = this.metrics.memoryUsed;

        // Предиктивный анализ тренда FPS
        const recentFps = this.fpsHistory.slice(-30); // Последние 30 кадров
        const fpsTrend = this.calculateTrend(recentFps);

        // Критично низкий FPS с учетом тренда
        if (avgFps < FPS_THRESHOLDS.CRITICAL || (avgFps < 40 && fpsTrend < -2)) {
            this.lowFpsCounter++;
            if (this.lowFpsCounter >= this.LOW_FPS_THRESHOLD_COUNT && this.currentQuality !== QualityLevel.LOW) {
                this.setQuality(QualityLevel.LOW);
                this.lowFpsCounter = 0;

                // Экстренные меры для критически низкого FPS
                this.enableEmergencyOptimizations();

                debugWarn(`🚨 CRITICAL FPS (${avgFps}, trend: ${fpsTrend.toFixed(1)}) - emergency optimizations enabled`);
            }
            return;
        }

        // Сброс счётчика при нормальном FPS
        if (avgFps >= FPS_THRESHOLDS.MEDIUM) {
            this.lowFpsCounter = 0;
        }

        // Интеллектуальное понижение качества с учетом нескольких факторов
        const shouldDowngrade = this.shouldDowngradeQuality(avgFps, mps, drawCalls, memoryUsed, fpsTrend);
        const shouldUpgrade = this.shouldUpgradeQuality(avgFps, mps, drawCalls, memoryUsed, fpsTrend);

        if (shouldDowngrade) {
            this.downgradeQuality();
        } else if (shouldUpgrade) {
            this.upgradeQuality();
        }
    }

    /**
     * Расчет тренда FPS для предиктивного анализа
     */
    private calculateTrend(samples: number[]): number {
        if (samples.length < 10) return 0;

        const firstHalf = samples.slice(0, Math.floor(samples.length / 2));
        const secondHalf = samples.slice(Math.floor(samples.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        return secondAvg - firstAvg;
    }

    /**
     * Определяет необходимость понижения качества
     */
    private shouldDowngradeQuality(avgFps: number, minFps: number, drawCalls: number, memoryUsed: number, trend: number): boolean {
        // Основные критерии понижения
        if (avgFps < FPS_THRESHOLDS.LOW) return true;
        if (minFps < 35) return true; // Критические провалы FPS
        if (trend < -3) return true; // Быстрое падение FPS

        // Дополнительные критерии для превентивного понижения
        if (drawCalls > 200 && avgFps < 50) return true; // Высокая нагрузка на рендер
        if (memoryUsed > 200 && avgFps < 55) return true; // Высокое потребление памяти

        return false;
    }

    /**
     * Определяет возможность повышения качества
     */
    private shouldUpgradeQuality(avgFps: number, minFps: number, drawCalls: number, memoryUsed: number, trend: number): boolean {
        // Консервативные критерии повышения
        if (avgFps < FPS_THRESHOLDS.STABLE) return false;
        if (minFps < FPS_THRESHOLDS.HIGH) return false;
        if (trend < 0) return false; // Не повышаем при падающем тренде

        // Дополнительные проверки стабильности
        if (drawCalls > 150) return false; // Не повышаем при высокой нагрузке
        if (memoryUsed > 150) return false; // Не повышаем при высоком потреблении памяти

        // Требуем стабильно высокий FPS для повышения
        return avgFps >= 58 && minFps >= 55 && trend >= 0;
    }

    /**
     * Понижение качества с логикой
     */
    private downgradeQuality() {
        const current = this.currentQuality;

        if (current === QualityLevel.ULTRA) {
            this.setQuality(QualityLevel.HIGH);
        } else if (current === QualityLevel.HIGH) {
            this.setQuality(QualityLevel.MEDIUM);
        } else if (current === QualityLevel.MEDIUM) {
            this.setQuality(QualityLevel.LOW);
        }
    }

    /**
     * Повышение качества с логикой
     */
    private upgradeQuality() {
        const current = this.currentQuality;

        if (current === QualityLevel.LOW) {
            this.setQuality(QualityLevel.MEDIUM);
        } else if (current === QualityLevel.MEDIUM) {
            this.setQuality(QualityLevel.HIGH);
        } else if (current === QualityLevel.HIGH) {
            this.setQuality(QualityLevel.ULTRA);
        }
    }

    /**
     * Экстренные оптимизации для критически низкого FPS
     */
    private enableEmergencyOptimizations() {
        try {
            // Включаем минимальный режим рендера
            this.setMinimalRenderMode(true);

            // Принудительно включаем batching
            this.enableBatching();

            // Уведомляем систему об экстренном режиме via debug registry
            setEmergencyMode(true);

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('emergency-optimization', {
                    detail: { enabled: true, reason: 'critical_fps' }
                }));
            }
        } catch (e) {
            // Silent fail in production
            debugWarn('Failed to enable emergency optimizations:', e);
        }
    }

    /**
     * Установить уровень качества
     */
    setQuality(quality: QualityLevel) {
        if (this.currentQuality === quality) return;

        this.currentQuality = quality;
        this.applyQualitySettings(quality);
        this.qualitySwitchCooldown = this.QUALITY_SWITCH_COOLDOWN;

        // Сброс истории FPS после переключения
        this.fpsHistory = [];

        // Callback
        if (this.onQualityChange) {
            const settings = QUALITY_PRESETS[quality];
            this.onQualityChange(quality, settings);
        }

        debugLog(`🎨 Quality changed to: ${quality}`);
        debugLog(`   Settings:`, QUALITY_PRESETS[quality]);
    }

    /**
     * Применить настройки качества (храним в экземпляре, не мутируем LOD_CONFIG).
     */
    private applyQualitySettings(quality: QualityLevel) {
        const settings = QUALITY_PRESETS[quality];
        this.currentDrawDistance = settings.drawDistance;
        // LOD_CONFIG.TRACK_CHUNKS и DRAW_DISTANCE не мутируем — см. getDrawDistance()

        registerDebugQuality(quality, settings);
    }

    /**
     * Текущая дистанция отрисовки по уровню качества (единый источник для culling/генерации).
     */
    getDrawDistance(): number {
        return this.currentDrawDistance;
    }

    /**
     * Получить текущие метрики
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Получить текущий уровень качества
     */
    getCurrentQuality(): QualityLevel {
        return this.currentQuality;
    }

    /**
     * Получить настройки качества
     */
    getQualitySettings(quality?: QualityLevel): QualitySettings {
        return QUALITY_PRESETS[quality || this.currentQuality];
    }

    /**
     * Установить renderer для мониторинга draw calls
     */
    setRenderer(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
        // attempt to enable batching automatically for performance
        try { this.enableBatching(); } catch { }
    }

    /**
     * Установить количество активных объектов
     */
    setActiveObjects(count: number) {
        this.metrics.activeObjects = count;
    }

    /**
     * Подписаться на изменение качества
     */
    onQualityChanged(callback: (quality: QualityLevel, settings: QualitySettings) => void) {
        this.onQualityChange = callback;
    }

    /**
     * Подписаться на обновление метрик
     */
    onMetricsChanged(callback: (metrics: PerformanceMetrics) => void) {
        this.onMetricsUpdate = callback;
    }

    /**
     * Остановить мониторинг
     */
    stop() {
        this.fpsHistory = [];

        // CRITICAL FIX: Clear metric sampler interval to prevent memory leaks
        if (this.metricSamplerId !== null) {
            window.clearInterval(this.metricSamplerId);
            this.metricSamplerId = null;
        }

        // Clear all timers and references
        this.activeTimers.clear();
        this.systemTimings.clear();
        this.metricsLog = [];

        debugLog('🛑 PerformanceManager stopped');
    }

    /**
     * Получить отладочную информацию
     */
    private minimalRenderMode = false;

    // ... (rest of class)

    /**
     * Получить отладочную информацию
     */
    getDebugInfo(): string {
        const m = this.metrics;
        return [
            `FPS: ${m.fps} (avg: ${m.averageFps}, min: ${m.minFps}, max: ${m.maxFps})`,
            `Quality: ${this.currentQuality}`,
            `Draw Calls: ${m.drawCalls} (Batching: ${this.batchingEnabled ? 'ON' : 'OFF'})`,
            `Triangles: ${m.triangles}`,
            `Memory: ${m.memoryUsed} MB`,
            `Active Objects: ${m.activeObjects}`,
            `Delta: ${m.deltaTime}ms`,
            `Render Mode: ${this.minimalRenderMode ? 'MINIMAL' : 'NORMAL'}`,
        ].join('\n');
    }
}

// Синглтон instance для глобального доступа
let performanceManagerInstance: PerformanceManager | null = null;

export const getPerformanceManager = (): PerformanceManager => {
    if (!performanceManagerInstance) {
        // 🔥 FORCE HIGH QUALITY IN DEV (P0 Fix)
        const initialQuality = import.meta.env.DEV ? QualityLevel.HIGH : QualityLevel.MEDIUM;
        performanceManagerInstance = new PerformanceManager(initialQuality);
    }
    return performanceManagerInstance;
};

export const destroyPerformanceManager = () => {
    if (performanceManagerInstance) {
        performanceManagerInstance.stop();
        performanceManagerInstance = null;
    }
};
