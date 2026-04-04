/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Event Listener Manager - Предотвращение утечек event listeners
 */

import { debugLog } from './debug';

export interface ManagedEventListener {
    id: string;
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
}

export class EventListenerManager {
    private static instance: EventListenerManager;
    private listeners: Map<string, ManagedEventListener> = new Map();
    private componentListeners: Map<string, Set<string>> = new Map();

    private constructor() {}

    static getInstance(): EventListenerManager {
        if (!EventListenerManager.instance) {
            EventListenerManager.instance = new EventListenerManager();
        }
        return EventListenerManager.instance;
    }

    /**
     * Добавляет управляемый event listener
     */
    addEventListener(
        componentId: string,
        target: EventTarget,
        type: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): string {
        const listenerId = `${componentId}_${type}_${Date.now()}_${Math.random()}`;
        
        const managedListener: ManagedEventListener = {
            id: listenerId,
            target,
            type,
            listener,
            options
        };

        // Добавляем listener
        target.addEventListener(type, listener, options);
        
        // Регистрируем в менеджере
        this.listeners.set(listenerId, managedListener);
        
        // Связываем с компонентом
        if (!this.componentListeners.has(componentId)) {
            this.componentListeners.set(componentId, new Set());
        }
        this.componentListeners.get(componentId)!.add(listenerId);

        debugLog(`EventListenerManager: Added listener ${listenerId} for ${type} on ${componentId}`);
        return listenerId;
    }

    /**
     * Удаляет конкретный event listener
     */
    removeEventListener(listenerId: string): void {
        const listener = this.listeners.get(listenerId);
        if (listener) {
            listener.target.removeEventListener(listener.type, listener.listener, listener.options);
            this.listeners.delete(listenerId);
            
            // Удаляем из компонентных связей
            for (const [componentId, listenerIds] of this.componentListeners.entries()) {
                if (listenerIds.has(listenerId)) {
                    listenerIds.delete(listenerId);
                    if (listenerIds.size === 0) {
                        this.componentListeners.delete(componentId);
                    }
                    break;
                }
            }
            
            debugLog(`EventListenerManager: Removed listener ${listenerId}`);
        }
    }

    /**
     * Удаляет все listeners для компонента
     */
    removeComponentListeners(componentId: string): void {
        const listenerIds = this.componentListeners.get(componentId);
        if (listenerIds) {
            const count = listenerIds.size;
            listenerIds.forEach(listenerId => {
                const listener = this.listeners.get(listenerId);
                if (listener) {
                    listener.target.removeEventListener(listener.type, listener.listener, listener.options);
                    this.listeners.delete(listenerId);
                }
            });
            
            this.componentListeners.delete(componentId);
            debugLog(`EventListenerManager: Removed ${count} listeners for component ${componentId}`);
        }
    }

    /**
     * Получает статистику listeners
     */
    getStats(): {
        totalListeners: number;
        componentCount: number;
        listenersByComponent: Record<string, number>;
    } {
        const listenersByComponent: Record<string, number> = {};
        
        for (const [componentId, listenerIds] of this.componentListeners.entries()) {
            listenersByComponent[componentId] = listenerIds.size;
        }

        return {
            totalListeners: this.listeners.size,
            componentCount: this.componentListeners.size,
            listenersByComponent
        };
    }

    /**
     * Очищает все listeners (для экстренных случаев)
     */
    clearAll(): void {
        const count = this.listeners.size;
        
        for (const listener of this.listeners.values()) {
            listener.target.removeEventListener(listener.type, listener.listener, listener.options);
        }
        
        this.listeners.clear();
        this.componentListeners.clear();
        
        debugLog(`EventListenerManager: Cleared all ${count} listeners`);
    }
}

// Глобальный экземпляр
export const eventListenerManager = EventListenerManager.getInstance();

// Хук для React компонентов
export function useEventListenerManager(componentId: string) {
    return {
        addEventListener: (
            target: EventTarget,
            type: string,
            listener: EventListener,
            options?: boolean | AddEventListenerOptions
        ) => eventListenerManager.addEventListener(componentId, target, type, listener, options),
        
        removeEventListener: (listenerId: string) => 
            eventListenerManager.removeEventListener(listenerId),
        
        cleanup: () => eventListenerManager.removeComponentListeners(componentId)
    };
}