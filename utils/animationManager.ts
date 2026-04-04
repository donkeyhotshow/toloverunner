/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Animation Manager - Централизованное управление анимациями
 */

import { debugLog } from './debug';

export interface AnimationCallback {
    id: string;
    callback: (delta: number, time: number) => void;
    priority: number;
    active: boolean;
}

export class AnimationManager {
    private static instance: AnimationManager;
    private callbacks: Map<string, AnimationCallback> = new Map();
    private isRunning = false;
    private frameId: number | null = null;
    private lastTime = 0;

    private constructor() {}

    static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager();
        }
        return AnimationManager.instance;
    }

    /**
     * Регистрирует анимационный callback
     */
    register(id: string, callback: (delta: number, time: number) => void, priority = 0): void {
        this.callbacks.set(id, {
            id,
            callback,
            priority,
            active: true
        });

        // Сортируем по приоритету
        this.sortCallbacks();

        // Запускаем цикл если еще не запущен
        if (!this.isRunning) {
            this.start();
        }

        debugLog(`AnimationManager: Registered animation '${id}' with priority ${priority}`);
    }

    /**
     * Удаляет анимационный callback
     */
    unregister(id: string): void {
        if (this.callbacks.delete(id)) {
            debugLog(`AnimationManager: Unregistered animation '${id}'`);
        }

        // Останавливаем цикл если нет активных анимаций
        if (this.callbacks.size === 0 && this.isRunning) {
            this.stop();
        }
    }

    /**
     * Активирует/деактивирует анимацию
     */
    setActive(id: string, active: boolean): void {
        const animation = this.callbacks.get(id);
        if (animation) {
            animation.active = active;
        }
    }

    /**
     * Запускает анимационный цикл
     */
    private start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
        
        debugLog('AnimationManager: Started animation loop');
    }

    /**
     * Останавливает анимационный цикл
     */
    private stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        
        debugLog('AnimationManager: Stopped animation loop');
    }

    /**
     * Основной анимационный цикл
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const delta = Math.min((currentTime - this.lastTime) / 1000, 0.05); // Ограничиваем delta
        this.lastTime = currentTime;

        // Выполняем все активные callbacks
        for (const animation of this.callbacks.values()) {
            if (animation.active) {
                try {
                    animation.callback(delta, currentTime / 1000);
                } catch (error) {
                    debugLog(`AnimationManager: Error in animation '${animation.id}':`, error);
                }
            }
        }

        this.frameId = requestAnimationFrame(this.animate);
    };

    /**
     * Сортирует callbacks по приоритету
     */
    private sortCallbacks(): void {
        const sorted = Array.from(this.callbacks.entries())
            .sort(([, a], [, b]) => b.priority - a.priority);
        
        this.callbacks.clear();
        sorted.forEach(([id, callback]) => {
            this.callbacks.set(id, callback);
        });
    }

    /**
     * Получает статистику анимаций
     */
    getStats(): {
        totalAnimations: number;
        activeAnimations: number;
        isRunning: boolean;
    } {
        const activeCount = Array.from(this.callbacks.values())
            .filter(anim => anim.active).length;

        return {
            totalAnimations: this.callbacks.size,
            activeAnimations: activeCount,
            isRunning: this.isRunning
        };
    }

    /**
     * Очищает все анимации
     */
    clear(): void {
        debugLog(`AnimationManager: Clearing ${this.callbacks.size} animations`);
        this.callbacks.clear();
        this.stop();
    }
}

// Глобальный экземпляр
export const animationManager = AnimationManager.getInstance();

// Хук для React компонентов
export function useAnimationManager() {
    return {
        register: (id: string, callback: (delta: number, time: number) => void, priority = 0) => {
            animationManager.register(id, callback, priority);
            
            // Возвращаем функцию очистки
            return () => animationManager.unregister(id);
        },
        unregister: (id: string) => animationManager.unregister(id),
        setActive: (id: string, active: boolean) => animationManager.setActive(id, active)
    };
}