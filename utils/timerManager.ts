/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Timer Manager - Управление setTimeout/setInterval с автоочисткой
 */

import { debugLog } from './debug';

export interface ManagedTimer {
    id: string;
    timerId: number;
    type: 'timeout' | 'interval';
    componentId: string;
    callback: () => void;
    delay: number;
    createdAt: number;
}

export class TimerManager {
    private static instance: TimerManager;
    private timers: Map<string, ManagedTimer> = new Map();
    private componentTimers: Map<string, Set<string>> = new Map();

    private constructor() { }

    static getInstance(): TimerManager {
        if (!TimerManager.instance) {
            TimerManager.instance = new TimerManager();
        }
        return TimerManager.instance;
    }

    /**
     * Создает управляемый setTimeout
     */
    setTimeout(
        componentId: string,
        callback: () => void,
        delay: number
    ): string {
        const managedId = `${componentId}_timeout_${Date.now()}_${Math.random()}`;

        const timerId = window.setTimeout(() => {
            try {
                callback();
            } catch (error) {
                debugLog(`TimerManager: Error in timeout callback ${managedId}:`, error);
            } finally {
                // Автоматически удаляем после выполнения
                this.clearTimer(managedId);
            }
        }, delay);

        const managedTimer: ManagedTimer = {
            id: managedId,
            timerId,
            type: 'timeout',
            componentId,
            callback,
            delay,
            createdAt: Date.now()
        };

        this.registerTimer(managedId, managedTimer);
        return managedId;
    }

    /**
     * Создает управляемый setInterval
     */
    setInterval(
        componentId: string,
        callback: () => void,
        delay: number
    ): string {
        const managedId = `${componentId}_interval_${Date.now()}_${Math.random()}`;

        const timerId = window.setInterval(() => {
            try {
                callback();
            } catch (error) {
                debugLog(`TimerManager: Error in interval callback ${managedId}:`, error);
            }
        }, delay);

        const managedTimer: ManagedTimer = {
            id: managedId,
            timerId,
            type: 'interval',
            componentId,
            callback,
            delay,
            createdAt: Date.now()
        };

        this.registerTimer(managedId, managedTimer);
        return managedId;
    }

    /**
     * Регистрирует таймер в менеджере
     */
    private registerTimer(managedId: string, timer: ManagedTimer): void {
        this.timers.set(managedId, timer);

        if (!this.componentTimers.has(timer.componentId)) {
            this.componentTimers.set(timer.componentId, new Set());
        }
        this.componentTimers.get(timer.componentId)!.add(managedId);

        debugLog(`TimerManager: Registered ${timer.type} ${managedId} for ${timer.componentId}`);
    }

    /**
     * Очищает конкретный таймер
     */
    clearTimer(managedId: string): void {
        const timer = this.timers.get(managedId);
        if (timer) {
            if (timer.type === 'timeout') {
                clearTimeout(timer.timerId);
            } else {
                clearInterval(timer.timerId);
            }

            this.timers.delete(managedId);

            // Удаляем из компонентных связей
            const componentTimers = this.componentTimers.get(timer.componentId);
            if (componentTimers) {
                componentTimers.delete(managedId);
                if (componentTimers.size === 0) {
                    this.componentTimers.delete(timer.componentId);
                }
            }

            debugLog(`TimerManager: Cleared ${timer.type} ${managedId}`);
        }
    }

    /**
     * Очищает все таймеры для компонента
     */
    clearComponentTimers(componentId: string): void {
        const timerIds = this.componentTimers.get(componentId);
        if (timerIds) {
            const count = timerIds.size;
            timerIds.forEach(timerId => {
                const timer = this.timers.get(timerId);
                if (timer) {
                    if (timer.type === 'timeout') {
                        clearTimeout(timer.timerId);
                    } else {
                        clearInterval(timer.timerId);
                    }
                    this.timers.delete(timerId);
                }
            });

            this.componentTimers.delete(componentId);
            debugLog(`TimerManager: Cleared ${count} timers for component ${componentId}`);
        }
    }

    /**
     * Получает статистику таймеров
     */
    getStats(): {
        totalTimers: number;
        timeouts: number;
        intervals: number;
        componentCount: number;
        timersByComponent: Record<string, { timeouts: number; intervals: number }>;
    } {
        const timersByComponent: Record<string, { timeouts: number; intervals: number }> = {};
        let timeouts = 0;
        let intervals = 0;

        for (const timer of this.timers.values()) {
            if (timer.type === 'timeout') {
                timeouts++;
            } else {
                intervals++;
            }

            if (!timersByComponent[timer.componentId]) {
                timersByComponent[timer.componentId] = { timeouts: 0, intervals: 0 };
            }
            const component = timersByComponent[timer.componentId];
            if (component) {
                component[timer.type === 'timeout' ? 'timeouts' : 'intervals']++;
            }
        }

        return {
            totalTimers: this.timers.size,
            timeouts,
            intervals,
            componentCount: this.componentTimers.size,
            timersByComponent
        };
    }

    /**
     * Очищает все таймеры (для экстренных случаев)
     */
    clearAll(): void {
        const count = this.timers.size;

        for (const timer of this.timers.values()) {
            if (timer.type === 'timeout') {
                clearTimeout(timer.timerId);
            } else {
                clearInterval(timer.timerId);
            }
        }

        this.timers.clear();
        this.componentTimers.clear();

        debugLog(`TimerManager: Cleared all ${count} timers`);
    }
}

// Глобальный экземпляр
export const timerManager = TimerManager.getInstance();

// Хук для React компонентов
export function useTimerManager(componentId: string) {
    return {
        setTimeout: (callback: () => void, delay: number) =>
            timerManager.setTimeout(componentId, callback, delay),

        setInterval: (callback: () => void, delay: number) =>
            timerManager.setInterval(componentId, callback, delay),

        clearTimer: (timerId: string) => timerManager.clearTimer(timerId),

        cleanup: () => timerManager.clearComponentTimers(componentId)
    };
}