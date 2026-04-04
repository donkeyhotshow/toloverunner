/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * OptimizedGameLoop - Единый оптимизированный игровой цикл
 *
 * ⚠️ НЕ ИСПОЛЬЗУЕТСЯ: фактический цикл — GameLoopRunner (useFrame + GameLoopRegistry).
 * Этот класс оставлен для возможного использования в фоновых задачах; см. docs/POORLY_IMPLEMENTED_AUDIT.md §4.
 * Решает проблему множественных useFrame циклов; централизует обновления с приоритизацией и throttling.
 */

import { debugLog } from '../../utils/debug';

export interface GameTask {
    id: string;
    update: (delta: number, time: number) => void;
    priority: number; // 0-10, где 10 - наивысший приоритет
    frequency: number; // Каждый N-й кадр (1 = каждый кадр, 2 = каждый второй)
    enabled: boolean;
    category: 'critical' | 'gameplay' | 'visual' | 'ui' | 'background';
}

export class OptimizedGameLoop {
    private tasks: Map<string, GameTask> = new Map();
    private frameId: number = 0;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private deltaTime: number = 0;
    private frameTimeThreshold: number = 16.67; // 60 FPS = 16.67ms per frame

    // Performance tracking
    private frameTimeHistory: number[] = [];
    private skipFrameCount: number = 0;
    private totalFrames: number = 0;

    // Adaptive throttling
    private performanceMode: 'high' | 'medium' | 'low' = 'high';
    private lastPerformanceCheck: number = 0;

    constructor(targetFPS: number = 60) {
        this.frameTimeThreshold = 1000 / targetFPS;
    }

    /**
     * Добавить задачу в игровой цикл
     */
    addTask(task: GameTask): void {
        this.tasks.set(task.id, task);
        debugLog(`🎮 GameLoop: Added task "${task.id}" (priority: ${task.priority}, category: ${task.category})`);
    }

    /**
     * Удалить задачу из игрового цикла
     */
    removeTask(id: string): void {
        if (this.tasks.delete(id)) {
            debugLog(`🎮 GameLoop: Removed task "${id}"`);
        }
    }

    /**
     * Включить/выключить задачу
     */
    setTaskEnabled(id: string, enabled: boolean): void {
        const task = this.tasks.get(id);
        if (task) {
            task.enabled = enabled;
            debugLog(`🎮 GameLoop: Task "${id}" ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Изменить приоритет задачи
     */
    setTaskPriority(id: string, priority: number): void {
        const task = this.tasks.get(id);
        if (task) {
            task.priority = Math.max(0, Math.min(10, priority));
            debugLog(`🎮 GameLoop: Task "${id}" priority set to ${task.priority}`);
        }
    }

    /**
     * Запустить игровой цикл
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.frameId = 0;
        this.skipFrameCount = 0;
        this.totalFrames = 0;

        debugLog('🚀 OptimizedGameLoop started');
        this.gameLoop();
    }

    /**
     * Остановить игровой цикл
     */
    stop(): void {
        this.isRunning = false;
        debugLog('🛑 OptimizedGameLoop stopped');
    }

    /**
     * Основной игровой цикл
     */
    private gameLoop = (): void => {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Отслеживание производительности
        this.trackPerformance();

        // Адаптивное управление производительностью
        if (this.shouldSkipFrame()) {
            this.skipFrameCount++;
            requestAnimationFrame(this.gameLoop);
            return;
        }

        // Выполнение задач с приоритизацией
        this.executeTasks();

        this.frameId++;
        this.totalFrames++;

        // Проверка производительности каждые 2 секунды
        if (currentTime - this.lastPerformanceCheck > 2000) {
            this.adjustPerformanceMode();
            this.lastPerformanceCheck = currentTime;
        }

        requestAnimationFrame(this.gameLoop);
    };

    /**
     * Выполнение задач с приоритизацией и throttling
     */
    private executeTasks(): void {
        // Получаем активные задачи, отсортированные по приоритету
        const activeTasks = Array.from(this.tasks.values())
            .filter(task => task.enabled)
            .sort((a, b) => {
                // Сначала по приоритету, потом по категории
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return this.getCategoryPriority(a.category) - this.getCategoryPriority(b.category);
            });

        const frameTimeStart = performance.now();
        let executedTasks = 0;
        const maxExecutionTime = this.frameTimeThreshold * 0.8; // 80% от времени кадра

        for (const task of activeTasks) {
            // Проверяем частоту выполнения
            if (this.frameId % this.getAdjustedFrequency(task) !== 0) {
                continue;
            }

            // Проверяем, не превышаем ли время кадра
            const currentExecutionTime = performance.now() - frameTimeStart;
            if (currentExecutionTime > maxExecutionTime && executedTasks > 0) {
                // Пропускаем менее важные задачи если время кадра превышено
                break;
            }

            try {
                task.update(this.deltaTime / 1000, this.lastTime); // delta в секундах
                executedTasks++;
            } catch (error) {
                console.error(`Error in game task "${task.id}":`, error);
                // Временно отключаем проблемную задачу
                task.enabled = false;
            }
        }
    }

    /**
     * Получить приоритет категории
     */
    private getCategoryPriority(category: GameTask['category']): number {
        const priorities = {
            'critical': 0,
            'gameplay': 1,
            'visual': 2,
            'ui': 3,
            'background': 4
        };
        return priorities[category] || 5;
    }

    /**
     * Получить скорректированную частоту выполнения задачи
     */
    private getAdjustedFrequency(task: GameTask): number {
        let frequency = task.frequency;

        // Адаптивное throttling в зависимости от режима производительности
        switch (this.performanceMode) {
            case 'low':
                if (task.category === 'visual' || task.category === 'background') {
                    frequency *= 3; // Выполняем в 3 раза реже
                } else if (task.category === 'ui') {
                    frequency *= 2; // UI в 2 раза реже
                }
                break;
            case 'medium':
                if (task.category === 'background') {
                    frequency *= 2; // Фоновые задачи в 2 раза реже
                }
                break;
            case 'high':
                // Без изменений
                break;
        }

        return frequency;
    }

    /**
     * Отслеживание производительности
     */
    private trackPerformance(): void {
        this.frameTimeHistory.push(this.deltaTime);

        // Храним историю последних 60 кадров (1 секунда при 60 FPS)
        if (this.frameTimeHistory.length > 60) {
            this.frameTimeHistory.shift();
        }
    }

    /**
     * Определить, нужно ли пропустить кадр
     */
    private shouldSkipFrame(): boolean {
        // Пропускаем кадр если предыдущий занял слишком много времени
        return this.deltaTime > this.frameTimeThreshold * 1.5;
    }

    /**
     * Адаптивная настройка режима производительности
     */
    private adjustPerformanceMode(): void {
        if (this.frameTimeHistory.length < 30) return;

        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        const fps = 1000 / avgFrameTime;

        const previousMode = this.performanceMode;

        if (fps < 30) {
            this.performanceMode = 'low';
        } else if (fps < 45) {
            this.performanceMode = 'medium';
        } else {
            this.performanceMode = 'high';
        }

        if (previousMode !== this.performanceMode) {
            debugLog(`🎯 GameLoop: Performance mode changed from ${previousMode} to ${this.performanceMode} (FPS: ${fps.toFixed(1)})`);
        }
    }

    /**
     * Получить статистику производительности
     */
    getPerformanceStats(): {
        fps: number;
        avgFrameTime: number;
        skipRate: number;
        performanceMode: string;
        activeTasks: number;
    } {
        const avgFrameTime = this.frameTimeHistory.length > 0
            ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
            : 0;

        return {
            fps: avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0,
            avgFrameTime: Math.round(avgFrameTime * 100) / 100,
            skipRate: this.totalFrames > 0 ? (this.skipFrameCount / this.totalFrames) * 100 : 0,
            performanceMode: this.performanceMode,
            activeTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length
        };
    }

    /**
     * Получить список активных задач
     */
    getActiveTasks(): GameTask[] {
        return Array.from(this.tasks.values()).filter(task => task.enabled);
    }

    /**
     * Очистить все задачи
     */
    clearTasks(): void {
        this.tasks.clear();
        debugLog('🧹 GameLoop: All tasks cleared');
    }
}

// Синглтон для глобального доступа
let gameLoopInstance: OptimizedGameLoop | null = null;

/** Возвращает синглтон. Не вызывается из приложения; основной цикл — GameLoopRegistry. */
export const getOptimizedGameLoop = (): OptimizedGameLoop => {
    if (!gameLoopInstance) {
        gameLoopInstance = new OptimizedGameLoop(60);
    }
    return gameLoopInstance;
};

export const destroyOptimizedGameLoop = (): void => {
    if (gameLoopInstance) {
        gameLoopInstance.stop();
        gameLoopInstance = null;
    }
};

// Хелперы для создания типичных задач
export const createGameTask = (
    id: string,
    updateFn: (delta: number, time: number) => void,
    options: Partial<Pick<GameTask, 'priority' | 'frequency' | 'category'>> = {}
): GameTask => ({
    id,
    update: updateFn,
    priority: options.priority ?? 5,
    frequency: options.frequency ?? 1,
    enabled: true,
    category: options.category ?? 'gameplay'
});

// Предустановленные задачи для основных систем
export const createCriticalTask = (id: string, updateFn: (delta: number, time: number) => void): GameTask =>
    createGameTask(id, updateFn, { priority: 10, frequency: 1, category: 'critical' });

export const createGameplayTask = (id: string, updateFn: (delta: number, time: number) => void): GameTask =>
    createGameTask(id, updateFn, { priority: 8, frequency: 1, category: 'gameplay' });

export const createVisualTask = (id: string, updateFn: (delta: number, time: number) => void): GameTask =>
    createGameTask(id, updateFn, { priority: 6, frequency: 1, category: 'visual' });

export const createUITask = (id: string, updateFn: (delta: number, time: number) => void): GameTask =>
    createGameTask(id, updateFn, { priority: 4, frequency: 2, category: 'ui' });

export const createBackgroundTask = (id: string, updateFn: (delta: number, time: number) => void): GameTask =>
    createGameTask(id, updateFn, { priority: 2, frequency: 5, category: 'background' });
