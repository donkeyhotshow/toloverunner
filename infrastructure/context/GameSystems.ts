/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PerformanceManager } from '../performance/PerformanceManager';
import { StabilityManager } from '../stability/StabilityManager';

/**
 * Интерфейс зависимостей для DI
 */
export interface GameSystems {
    performanceManager: PerformanceManager;
    stabilityManager: StabilityManager;
}

/**
 * Фабрика для создания всех систем с правильным порядком инициализации
 */
export function createGameSystems(): GameSystems {
    const performanceManager = new PerformanceManager();
    const stabilityManager = new StabilityManager();

    return {
        performanceManager,
        stabilityManager,
    };
}

/**
 * Функция очистки систем при unmount
 */
export function destroyGameSystems(systems: GameSystems): void {
    systems.performanceManager.stop();
    systems.stabilityManager.stop();
}
