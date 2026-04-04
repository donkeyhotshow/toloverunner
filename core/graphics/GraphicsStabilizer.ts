/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GraphicsStabilizer - Система стабилизации графики
 *
 * Обеспечивает:
 * - Стабильный FPS через адаптивное качество
 * - Плавные переходы между уровнями к
 * - Защиту от визуальных артефактов
 * - Оптимизацию рендеринга в реальном времени
 */

import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';

export interface GraphicsConfig {
    targetFPS: number;
    minFPS: number;
    maxDrawCalls: number;
    maxTriangles: number;
    shadowQuality: 'off' | 'low' | 'medium' | 'high';
    postProcessing: boolean;
    particleMultiplier: number;
    lodBias: number;
}

export interface FrameMetrics {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    gpuMemory: number;
}

const QUALITY_CONFIGS: Record<QualityLevel, GraphicsConfig> = {
    [QualityLevel.LOW]: {
        targetFPS: 30,
        minFPS: 24,
        maxDrawCalls: 50,
        maxTriangles: 50000,
        shadowQuality: 'off',
        postProcessing: false,
        particleMultiplier: 0.3,
        lodBias: 2.0
    },
    [QualityLevel.MEDIUM]: {
        targetFPS: 45,
        minFPS: 30,
        maxDrawCalls: 100,
        maxTriangles: 150000,
        shadowQuality: 'low',
        postProcessing: false,
        particleMultiplier: 0.6,
        lodBias: 1.0
    },
    [QualityLevel.HIGH]: {
        targetFPS: 60,
        minFPS: 45,
        maxDrawCalls: 200,
        maxTriangles: 300000,
        shadowQuality: 'medium',
        postProcessing: true,
        particleMultiplier: 1.0,
        lodBias: 0.5
    },
    [QualityLevel.ULTRA]: {
        targetFPS: 60,
        minFPS: 55,
        maxDrawCalls: 400,
        maxTriangles: 500000,
        shadowQuality: 'high',
        postProcessing: true,
        particleMultiplier: 1.5,
        lodBias: 0.0
    }
};

export class GraphicsStabilizer {
    private currentConfig: GraphicsConfig;
    private frameHistory: number[] = [];
    private readonly historySize = 60;
    private lastQualityChange = 0;
    private readonly qualityChangeCooldown = 3000; // 3 секунды между изменениями

    // Стабилизация
    private isStabilizing = false;
    private stabilizationStartTime = 0;
    private readonly stabilizationDuration = 2000;

    // Метрики
    private metrics: FrameMetrics = {
        fps: 60,
        frameTime: 16.67,
        drawCalls: 0,
        triangles: 0,
        gpuMemory: 0
    };

    constructor() {
        const perfManager = getPerformanceManager();
        const quality = perfManager.getCurrentQuality();
        this.currentConfig = { ...QUALITY_CONFIGS[quality] };
    }

    /**
     * Обновление метрик кадра
     */
    updateFrame(deltaTime: number, renderer?: { info?: { render?: { calls?: number; triangles?: number }; memory?: unknown } }): void {
        const fps = 1 / Math.max(deltaTime, 0.001);

        // Добавляем в историю
        this.frameHistory.push(fps);
        if (this.frameHistory.length > this.historySize) {
            this.frameHistory.shift();
        }

        // Обновляем метрики
        this.metrics.fps = fps;
        this.metrics.frameTime = deltaTime * 1000;

        if (renderer?.info) {
            this.metrics.drawCalls = renderer.info.render?.calls || 0;
            this.metrics.triangles = renderer.info.render?.triangles || 0;
        }

        // Проверяем стабильность
        this.checkStability();
    }

    /**
     * Проверка стабильности и автоматическая адаптация
     */
    private checkStability(): void {
        if (this.frameHistory.length < 30) return;

        const now = performance.now();
        if (now - this.lastQualityChange < this.qualityChangeCooldown) return;

        const avgFPS = this.getAverageFPS();
        const minFPS = Math.min(...this.frameHistory.slice(-30));
        const variance = this.getFPSVariance();

        // Определяем нужно ли изменить качество
        const perfManager = getPerformanceManager();
        const currentQuality = perfManager.getCurrentQuality();

        // Снижаем качество если FPS слишком низкий или нестабильный
        if (avgFPS < this.currentConfig.minFPS || variance > 15) {
            this.decreaseQuality(currentQuality);
        }
        // Повышаем качество если FPS стабильно высокий
        else if (avgFPS > this.currentConfig.targetFPS + 10 && variance < 5 && minFPS > this.currentConfig.targetFPS) {
            this.increaseQuality(currentQuality);
        }
    }

    /**
     * Снижение качества графики
     */
    private decreaseQuality(current: QualityLevel): void {
        const qualities = [QualityLevel.ULTRA, QualityLevel.HIGH, QualityLevel.MEDIUM, QualityLevel.LOW];
        const currentIndex = qualities.indexOf(current);

        if (currentIndex < qualities.length - 1) {
            const newQuality = qualities[currentIndex + 1];
            if (newQuality !== undefined) this.applyQuality(newQuality);
            if (import.meta.env.DEV) {
                console.log(`📉 Graphics: Quality decreased to ${newQuality}`);
            }
        }
    }

    /**
     * Повышение качества графики
     */
    private increaseQuality(current: QualityLevel): void {
        const qualities = [QualityLevel.ULTRA, QualityLevel.HIGH, QualityLevel.MEDIUM, QualityLevel.LOW];
        const currentIndex = qualities.indexOf(current);

        if (currentIndex > 0) {
            const newQuality = qualities[currentIndex - 1];
            if (newQuality !== undefined) this.applyQuality(newQuality);
            if (import.meta.env.DEV) {
                console.log(`📈 Graphics: Quality increased to ${newQuality}`);
            }
        }
    }

    /**
     * Применение нового уровня качества
     */
    private applyQuality(quality: QualityLevel): void {
        const perfManager = getPerformanceManager();
        perfManager.setQuality(quality);

        this.currentConfig = { ...QUALITY_CONFIGS[quality] };
        this.lastQualityChange = performance.now();
        this.isStabilizing = true;
        this.stabilizationStartTime = performance.now();

        // Уведомляем систему
        window.dispatchEvent(new CustomEvent('graphics-quality-changed', {
            detail: { quality, config: this.currentConfig }
        }));
    }

    /**
     * Получение среднего FPS
     */
    getAverageFPS(): number {
        if (this.frameHistory.length === 0) return 60;
        return this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    }

    /**
     * Получение дисперсии FPS (показатель стабильности)
     */
    getFPSVariance(): number {
        if (this.frameHistory.length < 2) return 0;
        const avg = this.getAverageFPS();
        const squaredDiffs = this.frameHistory.map(fps => Math.pow(fps - avg, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
    }

    /**
     * Получение текущей конфигурации
     */
    getConfig(): GraphicsConfig {
        return { ...this.currentConfig };
    }

    /**
     * Получение метрик
     */
    getMetrics(): FrameMetrics {
        return { ...this.metrics };
    }

    /**
     * Проверка стабилизации
     */
    isCurrentlyStabilizing(): boolean {
        if (!this.isStabilizing) return false;

        if (performance.now() - this.stabilizationStartTime > this.stabilizationDuration) {
            this.isStabilizing = false;
        }
        return this.isStabilizing;
    }

    /**
     * Принудительная установка качества
     */
    forceQuality(quality: QualityLevel): void {
        this.applyQuality(quality);
        this.frameHistory = []; // Сброс истории
    }

    /**
     * Получение отладочной информации
     */
    getDebugInfo(): string {
        const avg = this.getAverageFPS();
        const variance = this.getFPSVariance();
        return [
            `FPS: ${this.metrics.fps.toFixed(1)} (avg: ${avg.toFixed(1)})`,
            `Variance: ${variance.toFixed(2)}`,
            `Frame Time: ${this.metrics.frameTime.toFixed(2)}ms`,
            `Draw Calls: ${this.metrics.drawCalls}`,
            `Triangles: ${this.metrics.triangles}`,
            `Stabilizing: ${this.isStabilizing ? 'Yes' : 'No'}`
        ].join('\n');
    }
}

// Синглтон
let graphicsStabilizerInstance: GraphicsStabilizer | null = null;

export const getGraphicsStabilizer = (): GraphicsStabilizer => {
    if (!graphicsStabilizerInstance) {
        graphicsStabilizerInstance = new GraphicsStabilizer();
    }
    return graphicsStabilizerInstance;
};

export const destroyGraphicsStabilizer = (): void => {
    graphicsStabilizerInstance = null;
};
