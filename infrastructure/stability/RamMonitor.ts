/**
 * RamMonitor - Слежение за использованием ОЗУ
 * 
 * Ответственность:
 * - Отслеживание использования ОЗУ
 * - Определение утечек ОЗУ
 * - Очистка ОЗУ при необходимости
 */

export interface RamSnapshot {
    time: number;
    used: number; // MB
}

export interface RamMonitorConfig {
    ramLeakThreshold: number; // MB per minute
    checkInterval: number; // ms
    snapshotDuration: number; // ms
}

const DEFAULT_CONFIG: RamMonitorConfig = {
    ramLeakThreshold: 50, // MB per minute
    checkInterval: 10000, // 10 seconds
    snapshotDuration: 600000 // 10 minutes
};

export class RamMonitor {
    private config: RamMonitorConfig;
    private ramSnapshots: RamSnapshot[] = [];
    private ramCheckInterval: number | null = null;
    private ramLeakCount = 0;

    // Callbacks
    private onRamLeak?: (growthRate: number, leakCount: number) => void;
    private onRamCleanup?: () => void;

    constructor(config: Partial<RamMonitorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Запуск
     */
    public start() {
        if (this.ramCheckInterval !== null) return;

        this.ramCheckInterval = window.setInterval(() => {
            this.checkRamLeaks();
        }, this.config.checkInterval);
    }

    /**
     * Проверка утечек ОЗУ
     */
    private checkRamLeaks() {
        const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        if (!perfMemory) return;

        const now = performance.now();
        const currentMemory = perfMemory.usedJSHeapSize / 1048576; // MB

        this.ramSnapshots.push({ time: now, used: currentMemory });

        // Clean old snapshots
        const cutoff = now - this.config.snapshotDuration;
        this.ramSnapshots = this.ramSnapshots.filter(s => s.time > cutoff);

        // Analyze trend
        if (this.ramSnapshots.length >= 5) {
            const oldestSnapshot = this.ramSnapshots[0];
            if (oldestSnapshot) {
                const growth = currentMemory - oldestSnapshot.used;
                const timeSpan = (now - oldestSnapshot.time) / 60000; // minutes
                const growthRate = growth / timeSpan; // MB per minute

                if (growthRate > this.config.ramLeakThreshold) {
                    this.handleRamLeak(growthRate);
                }
            }
        }
    }

    /**
     * Обработка утечки ОЗУ
     */
    private handleRamLeak(growthRate: number) {
        this.ramLeakCount++;
        console.warn(`🧠 RamMonitor: Ram leak detected (${growthRate.toFixed(2)} MB/min)`);

        // Attempt cleanup
        this.performRamCleanup();

        // Notify
        if (this.onRamLeak) {
            this.onRamLeak(growthRate, this.ramLeakCount);
        }
    }

    /**
     * Очистка ОЗУ
     */
    private performRamCleanup() {
        try {
            // Force garbage collection if available
            const win = window as unknown as { gc?: () => void };
            if (win.gc) {
                win.gc();
            }

            // Clean DOM elements
            this.cleanupDOM();

            // Notify
            if (this.onRamCleanup) {
                this.onRamCleanup();
            }

            console.log('🧹 RamMonitor: Cleanup completed');
        } catch (error) {
            console.warn('⚠️ RamMonitor: Cleanup failed:', error);
        }
    }

    /**
     * Очистка DOM элементов
     */
    private cleanupDOM() {
        const canvases = document.querySelectorAll('canvas:not([data-keep])');
        canvases.forEach((canvas, index) => {
            if (index > 0) {
                canvas.remove();
            }
        });

        const elementsWithListeners = document.querySelectorAll('[data-has-listeners]');
        elementsWithListeners.forEach(element => {
            element.removeAttribute('data-has-listeners');
        });
    }

    /**
     * Принудительная очистка (публичный метод)
     */
    public forceCleanup() {
        this.performRamCleanup();
    }

    /**
     * Подписка на утечки
     */
    public onLeakDetected(callback: (growthRate: number, leakCount: number) => void) {
        this.onRamLeak = callback;
    }

    /**
     * Подписка на очистку
     */
    public onRamCleaned(callback: () => void) {
        this.onRamCleanup = callback;
    }

    /**
     * Получение текущего ОЗУ
     */
    public getCurrentRam(): number {
        const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        return perfMemory ? perfMemory.usedJSHeapSize / 1048576 : 0;
    }

    /**
     * Получение статистики
     */
    public getStats() {
        return {
            currentMemory: this.getCurrentRam(),
            snapshotsCount: this.ramSnapshots.length,
            leakCount: this.ramLeakCount
        };
    }

    /**
     * Остановка
     */
    public stop() {
        if (this.ramCheckInterval !== null) {
            clearInterval(this.ramCheckInterval);
            this.ramCheckInterval = null;
        }
    }
}
