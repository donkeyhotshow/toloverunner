/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Memory Manager - Централизованное управление памятью
 */

import * as THREE from 'three';
import { debugLog } from './debug';

export class MemoryManager {
    private static instance: MemoryManager;
    private disposables: Set<THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry> = new Set();
    private cleanupCallbacks: Set<() => void> = new Set();

    private constructor() {}

    static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    /**
     * Регистрирует объект для автоматической очистки
     */
    register(disposable: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry): void {
        this.disposables.add(disposable);
    }

    /**
     * Регистрирует callback для очистки
     */
    registerCleanup(callback: () => void): void {
        this.cleanupCallbacks.add(callback);
    }

    /**
     * Удаляет объект из регистра (если он был очищен вручную)
     */
    unregister(disposable: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry): void {
        this.disposables.delete(disposable);
    }

    /**
     * Безопасная очистка объекта
     */
    dispose(obj: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry): void {
        try {
            if ('dispose' in obj && typeof obj.dispose === 'function') {
                obj.dispose();
            }
            
            // Дополнительная очистка для Object3D
            if (obj instanceof THREE.Object3D) {
                obj.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) this.dispose(child.geometry);
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => this.dispose(mat));
                            } else {
                                this.dispose(child.material);
                            }
                        }
                    }
                });
                obj.clear();
            }
            
            this.unregister(obj);
        } catch (error) {
            debugLog('MemoryManager: Error disposing object:', error);
        }
    }

    /**
     * Очищает все зарегистрированные объекты
     */
    disposeAll(): void {
        debugLog('MemoryManager: Disposing all registered objects:', this.disposables.size);
        
        // Выполняем cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                debugLog('MemoryManager: Error in cleanup callback:', error);
            }
        });
        this.cleanupCallbacks.clear();

        // Очищаем все зарегистрированные объекты
        this.disposables.forEach(obj => {
            try {
                if ('dispose' in obj && typeof obj.dispose === 'function') {
                    obj.dispose();
                }
            } catch (error) {
                debugLog('MemoryManager: Error disposing registered object:', error);
            }
        });
        this.disposables.clear();
    }

    /**
     * Получает статистику использования памяти
     */
    getMemoryStats(): { 
        registeredObjects: number;
        cleanupCallbacks: number;
        memoryUsage?: number;
    } {
        let memoryUsage: number | undefined;
        
        if ('memory' in performance) {
            const mem = (performance as any).memory;
            memoryUsage = Math.round(mem.usedJSHeapSize / (1024 * 1024)); // MB
        }

        return {
            registeredObjects: this.disposables.size,
            cleanupCallbacks: this.cleanupCallbacks.size,
            memoryUsage
        };
    }

    /**
     * Принудительная сборка мусора (если доступна)
     */
    forceGC(): void {
        if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
            debugLog('MemoryManager: Forced garbage collection');
        }
    }
}

// Глобальный экземпляр
export const memoryManager = MemoryManager.getInstance();

// Хук для React компонентов
export function useMemoryCleanup() {
    return {
        register: (obj: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry) => 
            memoryManager.register(obj),
        registerCleanup: (callback: () => void) => 
            memoryManager.registerCleanup(callback),
        dispose: (obj: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry) => 
            memoryManager.dispose(obj)
    };
}