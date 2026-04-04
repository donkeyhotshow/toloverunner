/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ErrorMonitor - Мониторинг и обработка ошибок
 * 
 * Ответственность:
 * - Глобальная обработка ошибок (window error, unhandled rejection)
 * - Отслеживание истории ошибок
 * - Определение критичности ошибок
 */

export interface FaultInfo {
    time: number;
    error: Error;
    type: string;
    context: Record<string, unknown>;
    recovered: boolean;
}

export interface FaultMonitorConfig {
    maxFaultsPerMinute: number;
    faultHistoryDuration: number; // ms
}

const DEFAULT_CONFIG: FaultMonitorConfig = {
    maxFaultsPerMinute: 5,
    faultHistoryDuration: 3600000 // 1 hour
};

export class FaultMonitor {
    private config: FaultMonitorConfig;
    private faultHistory: FaultInfo[] = [];

    // Bound handlers for cleanup
    private boundErrorHandler: (event: ErrorEvent) => void;
    private boundRejectionHandler: (event: PromiseRejectionEvent) => void;

    // Callbacks
    private onFault?: (fault: FaultInfo, recentFaultCount: number) => void;
    private onHighFaultRate?: (faultCount: number) => void;

    constructor(config: Partial<FaultMonitorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Pre-bind handlers
        this.boundErrorHandler = (event: ErrorEvent) => {
            this.handleFault(new Error(event.message), 'javascript', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        };

        this.boundRejectionHandler = (event: PromiseRejectionEvent) => {
            this.handleFault(new Error(event.reason), 'promise', { reason: event.reason });
        };

        this.initialize();
    }

    private initialize() {
        window.addEventListener('error', this.boundErrorHandler);
        window.addEventListener('unhandledrejection', this.boundRejectionHandler);
    }

    /**
     * Обработка фолта
     */
    public handleFault(error: Error, type: string = 'unknown', context: Record<string, unknown> = {}) {
        const now = performance.now();

        const faultInfo: FaultInfo = {
            time: now,
            error,
            type,
            context,
            recovered: false
        };

        this.faultHistory.push(faultInfo);

        // Clean old faults
        const cutoff = now - this.config.faultHistoryDuration;
        this.faultHistory = this.faultHistory.filter(e => e.time > cutoff);

        console.error(`🚨 ErrorMonitor - ${type} error:`, error, context);

        // Check fault rate
        const recentFaults = this.getRecentFaults(60000);

        if (this.onFault) {
            this.onFault(faultInfo, recentFaults.length);
        }

        if (recentFaults.length > this.config.maxFaultsPerMinute) {
            if (this.onHighFaultRate) {
                this.onHighFaultRate(recentFaults.length);
            }
        }

        return faultInfo;
    }

    /**
     * Получение недавних фолтов
     */
    public getRecentFaults(timeWindow: number): FaultInfo[] {
        const now = performance.now();
        return this.faultHistory.filter(e => now - e.time < timeWindow);
    }

    /**
     * Определение критичности фолта
     */
    public isCriticalFault(error: Error, type: string): boolean {
        const criticalPatterns = [
            /webgl/i,
            /context.*lost/i,
            /out of memory/i,
            /maximum call stack/i,
            /script error/i
        ];

        const criticalTypes = ['webgl', 'memory', 'context'];

        return criticalPatterns.some(pattern => pattern.test(error.message)) ||
            criticalTypes.includes(type);
    }

    /**
     * Отметка фолтов как восстановленные
     */
    public markFaultsRecovered(timeWindow: number) {
        const recent = this.getRecentFaults(timeWindow);
        recent.forEach(e => e.recovered = true);
    }

    /**
     * Подписка на фолты
     */
    public onFaultDetected(callback: (fault: FaultInfo, recentCount: number) => void) {
        this.onFault = callback;
    }

    /**
     * Подписка на высокую частоту фолтов
     */
    public onHighFaultRateDetected(callback: (faultCount: number) => void) {
        this.onHighFaultRate = callback;
    }

    /**
     * Получение статистики
     */
    public getStats() {
        return {
            totalFaults: this.faultHistory.length,
            recentFaults: this.getRecentFaults(60000).length,
            recoveredFaults: this.faultHistory.filter(e => e.recovered).length
        };
    }

    /**
     * Очистка истории фолтов
     */
    public clearHistory() {
        this.faultHistory = [];
    }

    /**
     * Остановка мониторинга
     */
    public stop() {
        window.removeEventListener('error', this.boundErrorHandler);
        window.removeEventListener('unhandledrejection', this.boundRejectionHandler);
    }
}
