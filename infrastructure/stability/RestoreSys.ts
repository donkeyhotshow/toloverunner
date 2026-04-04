/**
 * RestoreSys - Управление восстановлением после фолтов
 * 
 * Ответственность:
 * - Попытки автоматического восстановления
 * - Координация восстановления систем
 * - Ограничение частоты попыток
 */

import { getPerformanceManager, QualityLevel } from '../performance/PerformanceManager';

export interface RestoreConfig {
    maxRestoreAttempts: number;
    restoreCooldown: number; // ms
    maxFaultsBeforeRestore: number;
}

const DEFAULT_CONFIG: RestoreConfig = {
    maxRestoreAttempts: 3,
    restoreCooldown: 30000, // 30 seconds
    maxFaultsBeforeRestore: 10
};

export class RestoreSys {
    private config: RestoreConfig;
    private restoreAttempts = 0;
    private lastRestoreTime = 0;
    private isRestoring = false;

    // Callbacks
    private onRestore?: (attempt: number, success: boolean) => void;

    constructor(config: Partial<RestoreConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Попытка восстановления
     */
    public attemptRestore(faultCount: number): boolean {
        const now = performance.now();

        // Check cooldown
        if (now - this.lastRestoreTime < this.config.restoreCooldown) {
            return false;
        }

        // Check max attempts
        if (this.restoreAttempts >= this.config.maxRestoreAttempts) {
            console.error('🚨 RestoreSys: Maximum restore attempts reached');
            return false;
        }

        // Check if restore is needed
        if (faultCount < this.config.maxFaultsBeforeRestore && !this.isCriticalCondition()) {
            return false;
        }

        this.restoreAttempts++;
        this.lastRestoreTime = now;
        this.isRestoring = true;

        console.log(`🔄 RestoreSys: Attempting restore (${this.restoreAttempts}/${this.config.maxRestoreAttempts})`);

        try {
            this.performRestoreSequence();

            if (this.onRestore) {
                this.onRestore(this.restoreAttempts, true);
            }

            this.isRestoring = false;
            return true;
        } catch (error) {
            console.error('❌ RestoreSys: Restore failed:', error);

            if (this.onRestore) {
                this.onRestore(this.restoreAttempts, false);
            }

            this.isRestoring = false;
            return false;
        }
    }

    /**
     * Проверка критического состояния
     */
    private isCriticalCondition(): boolean {
        try {
            const perfManager = getPerformanceManager();
            const metrics = perfManager.getMetrics();
            // Consider critical if FPS is below 30
            return metrics.fps < 30;
        } catch {
            return false;
        }
    }

    /**
     * Выполнение последовательности восстановления
     */
    private performRestoreSequence() {
        // 1. Ram cleanup
        this.clearRam();

        // 2. Reset performance to safe level
        const perfManager = getPerformanceManager();
        perfManager.setQuality(QualityLevel.LOW);

        // 3. Clear caches
        this.clearCaches();

        // 4. Restart critical systems
        this.restartCriticalSystems();

        // 5. Notify
        window.dispatchEvent(new CustomEvent('stability-restore', {
            detail: { attempt: this.restoreAttempts }
        }));
    }

    /**
     * Очистка ОЗУ
     */
    private clearRam() {
        try {
            const win = window as unknown as { gc?: () => void };
            if (win.gc) {
                win.gc();
            }

            // Clean DOM
            const canvases = document.querySelectorAll('canvas:not([data-keep])');
            canvases.forEach((canvas, index) => {
                if (index > 0) canvas.remove();
            });

            console.log('🔄 RestoreSys: Ram cleared');
        } catch (error) {
            console.warn('⚠️ RestoreSys: Ram clear failed:', error);
        }
    }

    /**
     * Очистка кэшей
     */
    private clearCaches() {
        try {
            const keysToKeep = ['toloverunner:settings', 'toloverunner:progress'];
            const keysToRemove: string[] = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();

            console.log('🔄 RestoreSys: Caches cleared');
        } catch (error) {
            console.warn('⚠️ RestoreSys: Cache clear failed:', error);
        }
    }

    /**
     * Перезапуск критических систем
     */
    private restartCriticalSystems() {
        try {
            const perfManager = getPerformanceManager();
            perfManager.stop();
            perfManager.start();

            window.dispatchEvent(new CustomEvent('system-restart-required'));

            console.log('🔄 RestoreSys: Critical systems restarted');
        } catch (error) {
            console.warn('⚠️ RestoreSys: System restart failed:', error);
        }
    }

    /**
     * Сброс счетчика попыток
     */
    public resetAttempts() {
        this.restoreAttempts = 0;
    }

    /**
     * Подписка на попытки восстановления
     */
    public onRestoreAttempted(callback: (attempt: number, success: boolean) => void) {
        this.onRestore = callback;
    }

    /**
     * Получение статистики
     */
    public getStats() {
        return {
            attempts: this.restoreAttempts,
            maxAttempts: this.config.maxRestoreAttempts,
            lastRecoveryTime: this.lastRestoreTime,
            isRecovering: this.isRestoring
        };
    }
}
