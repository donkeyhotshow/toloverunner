/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GameSystemsContext - Dependency Injection через React Context
 * Заменяет глобальные синглтоны на явные зависимости
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { PerformanceManager } from '../performance/PerformanceManager';
import { StabilityManager } from '../stability/StabilityManager';
import { GameSystems, createGameSystems, destroyGameSystems } from './GameSystems';

// Context с null по умолчанию для проверки инициализации
const GameSystemsContext = createContext<GameSystems | null>(null);

/**
 * Hook для доступа к игровым системам
 * @throws Error если используется вне GameSystemsProvider
 */
export function useGameSystems(): GameSystems {
    const context = useContext(GameSystemsContext);
    if (!context) {
        throw new Error('useGameSystems must be used within GameSystemsProvider');
    }
    return context;
}

/**
 * Селективные хуки для отдельных менеджеров (оптимизация ререндеров)
 */
export function usePerformanceManager(): PerformanceManager {
    return useGameSystems().performanceManager;
}

export function useStabilityManager(): StabilityManager {
    return useGameSystems().stabilityManager;
}

interface GameSystemsProviderProps {
    children: React.ReactNode;
    /** Опциональные кастомные системы для тестирования */
    systems?: GameSystems;
}

/**
 * Provider для игровых систем
 * Создаёт системы один раз и очищает при unmount
 */
export const GameSystemsProvider: React.FC<GameSystemsProviderProps> = ({
    children,
    systems: customSystems,
}) => {
    // Создаём системы только один раз, используя lazy state initialization
    const [systems] = React.useState<GameSystems>(() => customSystems ?? createGameSystems());

    // Запуск систем при монтировании
    useEffect(() => {
        systems.performanceManager.start();
        // stabilityManager запускается автоматически в конструкторе

        return () => {
            destroyGameSystems(systems);
        };
    }, [systems]);

    // Мемоизация для предотвращения лишних ререндеров
    const value = useMemo(() => systems, [systems]);

    return (
        <GameSystemsContext.Provider value={value}>
            {children}
        </GameSystemsContext.Provider>
    );
};

/**
 * HOC для классовых компонентов или компонентов без хуков
 */
export function withGameSystems<P extends object>(
    Component: React.ComponentType<P & { gameSystems: GameSystems }>
): React.FC<Omit<P, 'gameSystems'>> {
    return function WithGameSystemsWrapper(props: Omit<P, 'gameSystems'>) {
        const gameSystems = useGameSystems();
        return <Component {...(props as P)} gameSystems={gameSystems} />;
    };
}

export { GameSystemsContext };
