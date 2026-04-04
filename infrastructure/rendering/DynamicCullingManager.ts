/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dynamic Culling Manager - Агрессивная оптимизация отрисовки
 * Динамически регулирует дистанцию отрисовки на основе FPS
 */



/**
 * Настройки агрессивного culling
 */
interface CullingSettings {
    drawDistance: number;
    objectCullDistance: number;
    particleDistance: number;
    shadowDistance: number;
}

/**
 * Пресеты для разных уровней производительности
 */
const CULLING_PRESETS: Record<string, CullingSettings> = {
    ULTRA: {
        drawDistance: 300,        // Match LOD_CONFIG
        objectCullDistance: 250,
        particleDistance: 150,
        shadowDistance: 100
    },
    HIGH: {
        drawDistance: 200,
        objectCullDistance: 180,
        particleDistance: 100,
        shadowDistance: 80
    },
    MEDIUM: {
        drawDistance: 150,
        objectCullDistance: 130,
        particleDistance: 80,
        shadowDistance: 60
    },
    LOW: {
        drawDistance: 100,
        objectCullDistance: 90,
        particleDistance: 50,
        shadowDistance: 40
    },
    EMERGENCY: {
        drawDistance: 80,
        objectCullDistance: 70,
        particleDistance: 30,
        shadowDistance: 20
    }
};

/**
 * Менеджер динамического culling
 */
class DynamicCullingManager {
    private static instance: DynamicCullingManager;
    private currentSettings: CullingSettings;

    private fpsBuffer: number[] = [];
    private readonly BUFFER_SIZE = 120; // 2 секунды при 60 FPS
    private lastAdjustTime = 0;
    private readonly ADJUST_COOLDOWN = 3000; // 3 секунды между изменениями

    private constructor() {
        this.currentSettings = { ...CULLING_PRESETS.MEDIUM } as CullingSettings;
    }

    static getInstance(): DynamicCullingManager {
        if (!DynamicCullingManager.instance) {
            DynamicCullingManager.instance = new DynamicCullingManager();
        }
        return DynamicCullingManager.instance;
    }

    /**
     * Обновить настройки culling на основе FPS
     */
    update(currentFPS: number): void {
        const now = performance.now();

        // Добавляем FPS в буфер
        this.fpsBuffer.push(currentFPS);
        if (this.fpsBuffer.length > this.BUFFER_SIZE) {
            this.fpsBuffer.shift();
        }

        // Проверяем cooldown
        if (now - this.lastAdjustTime < this.ADJUST_COOLDOWN) {
            return;
        }

        // Вычисляем средний FPS
        const avgFPS = this.fpsBuffer.reduce((sum, fps) => sum + fps, 0) / this.fpsBuffer.length;

        // Определяем нужные настройки на основе среднего FPS
        let targetPreset: CullingSettings;

        if (avgFPS < 25) {
            targetPreset = CULLING_PRESETS.EMERGENCY as CullingSettings;
        } else if (avgFPS < 40) {
            targetPreset = CULLING_PRESETS.LOW as CullingSettings;
        } else if (avgFPS < 50) {
            targetPreset = CULLING_PRESETS.MEDIUM as CullingSettings;
        } else if (avgFPS < 58) {
            targetPreset = CULLING_PRESETS.HIGH as CullingSettings;
        } else {
            targetPreset = CULLING_PRESETS.ULTRA as CullingSettings;
        }

        // Плавно переходим к целевым настройкам
        const changed = this.smoothTransition(targetPreset);

        if (changed) {
            this.lastAdjustTime = now;
            if (import.meta.env.DEV) {
                console.log(`[DynamicCulling] Adjusted for FPS ${avgFPS.toFixed(1)}:`, this.currentSettings);
            }
        }
    }

    /**
     * Плавный переход к новым настройкам
     */
    private smoothTransition(target: CullingSettings): boolean {
        let changed = false;
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        // Плавно меняем только если разница существенная (>10%)
        const threshold = 0.1;
        for (const key of Object.keys(this.currentSettings) as Array<keyof CullingSettings>) {
            const current = this.currentSettings[key];
            const targetValue = target[key];
            const diff = Math.abs(current - targetValue) / current;

            if (diff > threshold) {
                this.currentSettings[key] = Math.round(lerp(current, targetValue, 0.5));
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Получить текущие настройки culling
     */
    getSettings(): Readonly<CullingSettings> {
        return { ...this.currentSettings };
    }



    /**
     * Сбросить буфер FPS (например, после паузы)
     */
    reset(): void {
        this.fpsBuffer = [];
        this.lastAdjustTime = 0;
    }

    /**
     * Принудительно установить пресет
     */
    forcePreset(preset: keyof typeof CULLING_PRESETS): void {
        this.currentSettings = { ...CULLING_PRESETS[preset] } as CullingSettings;
        this.fpsBuffer = [];
    }
}

/**
 * Получить экземпляр менеджера culling
 */
export function getDynamicCullingManager(): DynamicCullingManager {
    return DynamicCullingManager.getInstance();
}

/**
 * Экспортируем типы для использования
 */
export type { CullingSettings };
