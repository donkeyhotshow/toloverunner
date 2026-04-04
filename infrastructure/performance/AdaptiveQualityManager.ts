/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdaptiveQualityManager - Адаптивна система якості на основі історії FPS
 * 
 * Особливості:
 * - Динамічна зміна налаштувань графіки на основі історії FPS
 * - Автоматичне зниження якості на мобільних пристроях
 * - Зменшення частинок та VFX на мобільних платформах
 * - Плавна адаптація без різких змін
 */

import { QualityLevel } from './PerformanceManager';
import { getDeviceCapabilities, DeviceCapabilities } from '../../utils/deviceDetect';

export interface AdaptiveQualityConfig {
    /** FPS поріг для зниження якості */
    fpsThresholdDowngrade: number;
    /** FPS поріг для підвищення якості */
    fpsThresholdUpgrade: number;
    /** Кількість кадрів для аналізу */
    historySize: number;
    /** Період адаптації в мс */
    adaptationPeriodMs: number;
    /** Чи використовувати мобільну оптимізацію */
    enableMobileOptimization: boolean;
    /** Коефіцієнт зниження частинок для мобільних */
    mobileParticleMultiplier: number;
    /** Коефіцієнт зниження VFX для мобільних */
    mobileVFXMultiplier: number;
}

const DEFAULT_CONFIG: AdaptiveQualityConfig = {
    fpsThresholdDowngrade: 30,
    fpsThresholdUpgrade: 55,
    historySize: 120, // 2 секунди при 60 FPS
    adaptationPeriodMs: 2000, // Адаптація кожні 2 секунди
    enableMobileOptimization: true,
    mobileParticleMultiplier: 0.5,
    mobileVFXMultiplier: 0.6,
};

export class AdaptiveQualityManager {
    private config: AdaptiveQualityConfig;
    private deviceCapabilities: DeviceCapabilities;
    private fpsHistory: number[] = [];
    private lastAdaptationTime: number = 0;
    private currentQuality: QualityLevel = QualityLevel.HIGH;
    private _mobileOptimized: boolean = false;
    private particleCount: number = 100;
    private vfxEnabled: boolean = true;

    // Callbacks
    private onQualityChange?: (quality: QualityLevel, reason: string) => void;
    private onMobileSettingsChange?: (settings: MobileQualitySettings) => void;

    constructor(config: Partial<AdaptiveQualityConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.deviceCapabilities = getDeviceCapabilities();
        this.initializeForDevice();
    }

    /**
     * Ініціалізувати налаштування для конкретного пристрою
     */
    private initializeForDevice(): void {
        const { isMobile, isLowEndDevice, hasGoodGPU, deviceMemory } = this.deviceCapabilities;

        if (!this.config.enableMobileOptimization) return;

        // Налаштування для мобільних пристроїв
        if (isMobile || isLowEndDevice) {
            // Автоматично встановлюємо LOW або MEDIUM якість
            if (deviceMemory < 4 || !hasGoodGPU) {
                this.currentQuality = QualityLevel.LOW;
            } else {
                this.currentQuality = QualityLevel.MEDIUM;
            }
            this._mobileOptimized = true;
            
            // Застосовуємо мобільні коефіцієнти
            this.applyMobileMultipliers();
        }
    }

    /**
     * Застосувати мобільні коефіцієнти до налаштувань
     */
    private applyMobileMultipliers(): void {
        const { isMobile } = this.deviceCapabilities;

        if (!isMobile) return;

        // Зменшуємо кількість частинок
        this.particleCount = Math.floor(100 * this.config.mobileParticleMultiplier);

        // Зменшуємо VFX
        this.vfxEnabled = this.config.mobileVFXMultiplier > 0.3;

        // Повідомляємо про зміни
        if (this.onMobileSettingsChange) {
            this.onMobileSettingsChange({
                particleCount: this.particleCount,
                vfxEnabled: this.vfxEnabled,
                shadowQuality: this.deviceCapabilities.isLowEndDevice ? 'off' : 'low',
                textureQuality: this.deviceCapabilities.isLowEndDevice ? 0.5 : 0.75,
            });
        }
    }

    /**
     * Записати FPS в історію
     */
    recordFPS(fps: number): void {
        this.fpsHistory.push(fps);
        
        // Обмежуємо розмір історії
        if (this.fpsHistory.length > this.config.historySize) {
            this.fpsHistory.shift();
        }
    }

    /**
     * Оновити адаптивну якість (викликати періодично)
     */
    update(): { shouldUpgrade: boolean; shouldDowngrade: boolean } {
        const now = performance.now();
        
        // Перевіряємо чи час для адаптації
        if (now - this.lastAdaptationTime < this.config.adaptationPeriodMs) {
            return { shouldUpgrade: false, shouldDowngrade: false };
        }

        if (this.fpsHistory.length < 30) {
            return { shouldUpgrade: false, shouldDowngrade: false };
        }

        const averageFPS = this.calculateAverageFPS();
        const result = this.evaluateQuality(averageFPS);
        
        this.lastAdaptationTime = now;

        return result;
    }

    /**
     * Обчислити середній FPS з історії
     */
    private calculateAverageFPS(): number {
        const recentHistory = this.fpsHistory.slice(-60); // Останні 60 кадрів
        const sum = recentHistory.reduce((acc, fps) => acc + fps, 0);
        return sum / recentHistory.length;
    }

    /**
     * Оцінити поточну якість на основі FPS
     */
    private evaluateQuality(averageFPS: number): { shouldUpgrade: boolean; shouldDowngrade: boolean } {
        const shouldUpgrade = 
            averageFPS >= this.config.fpsThresholdUpgrade && 
            this.currentQuality < QualityLevel.ULTRA;

        const shouldDowngrade = 
            averageFPS < this.config.fpsThresholdDowngrade && 
            this.currentQuality > QualityLevel.LOW;

        if (shouldDowngrade) {
            this.downgradeQuality(averageFPS);
            return { shouldUpgrade: false, shouldDowngrade: true };
        }

        if (shouldUpgrade) {
            this.upgradeQuality(averageFPS);
            return { shouldUpgrade: true, shouldDowngrade: false };
        }

        return { shouldUpgrade: false, shouldDowngrade: false };
    }

    /**
     * Знизити якість
     */
    private downgradeQuality(averageFPS: number): void {
        const oldQuality = this.currentQuality;
        
        if (averageFPS < 20) {
            // Критичне падіння - одразу на MIN
            this.currentQuality = QualityLevel.LOW;
        } else {
            // Поступове зниження
            this.currentQuality = Math.max(
                QualityLevel.LOW,
                this.currentQuality - 1
            );
        }

        if (oldQuality !== this.currentQuality && this.onQualityChange) {
            this.onQualityChange(
                this.currentQuality, 
                `FPS average (${averageFPS.toFixed(1)}) below threshold`
            );
        }
    }

    /**
     * Підвищити якість
     */
    private upgradeQuality(averageFPS: number): void {
        const oldQuality = this.currentQuality;
        
        // Не підвищуємо вище поточної якості на мобільних
        if (this._mobileOptimized && this.currentQuality >= QualityLevel.MEDIUM) {
            return;
        }

        this.currentQuality = Math.min(
            QualityLevel.ULTRA,
            this.currentQuality + 1
        );

        if (oldQuality !== this.currentQuality && this.onQualityChange) {
            this.onQualityChange(
                this.currentQuality, 
                `FPS average (${averageFPS.toFixed(1)}) above threshold`
            );
        }
    }

    /**
     * Отримати поточну якість
     */
    getCurrentQuality(): QualityLevel {
        return this.currentQuality;
    }

    /**
     * Отримати налаштування для мобільних
     */
    getMobileSettings(): MobileQualitySettings {
        return {
            particleCount: this.particleCount,
            vfxEnabled: this.vfxEnabled,
            shadowQuality: this.deviceCapabilities.isLowEndDevice ? 'off' : 'low',
            textureQuality: this.deviceCapabilities.isLowEndDevice ? 0.5 : 0.75,
        };
    }

    /**
     * Перевірити чи пристрій мобільний
     */
    isMobile(): boolean {
        return this.deviceCapabilities.isMobile;
    }

    /**
     * Перевірити чи увімкнена мобільна оптимізація
     */
    isMobileOptimized(): boolean {
        return this._mobileOptimized;
    }

    /**
     * Встановити callback зміни якості
     */
    setOnQualityChange(callback: (quality: QualityLevel, reason: string) => void): void {
        this.onQualityChange = callback;
    }

    /**
     * Встановити callback зміни мобільних налаштувань
     */
    setOnMobileSettingsChange(callback: (settings: MobileQualitySettings) => void): void {
        this.onMobileSettingsChange = callback;
    }

    /**
     * Отримати статистику адаптації
     */
    getAdaptationStats(): AdaptationStats {
        return {
            currentQuality: this.currentQuality,
            averageFPS: this.fpsHistory.length > 0 ? this.calculateAverageFPS() : 60,
            fpsHistorySize: this.fpsHistory.length,
            isMobileOptimized: this._mobileOptimized,
            deviceCapabilities: {
                isMobile: this.deviceCapabilities.isMobile,
                isLowEnd: this.deviceCapabilities.isLowEndDevice,
                hasGoodGPU: this.deviceCapabilities.hasGoodGPU,
            }
        };
    }

    /**
     * Примусово встановити якість
     */
    setQuality(quality: QualityLevel): void {
        this.currentQuality = quality;
    }

    /**
     * Скинути історію FPS
     */
    resetHistory(): void {
        this.fpsHistory = [];
    }
}

export interface MobileQualitySettings {
    particleCount: number;
    vfxEnabled: boolean;
    shadowQuality: 'off' | 'low' | 'high';
    textureQuality: number;
}

export interface AdaptationStats {
    currentQuality: QualityLevel;
    averageFPS: number;
    fpsHistorySize: number;
    isMobileOptimized: boolean;
    deviceCapabilities: {
        isMobile: boolean;
        isLowEnd: boolean;
        hasGoodGPU: boolean;
    };
}

// Singleton instance
let adaptiveQualityManager: AdaptiveQualityManager | null = null;

/**
 * Отримати екземпляр AdaptiveQualityManager
 */
export function getAdaptiveQualityManager(config?: Partial<AdaptiveQualityConfig>): AdaptiveQualityManager {
    if (!adaptiveQualityManager) {
        adaptiveQualityManager = new AdaptiveQualityManager(config);
    }
    return adaptiveQualityManager;
}

/**
 * Скинути екземпляр AdaptiveQualityManager
 */
export function resetAdaptiveQualityManager(): void {
    adaptiveQualityManager = null;
}