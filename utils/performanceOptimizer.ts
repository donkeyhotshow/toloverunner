/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Performance Optimizer - Оптимизация производительности useFrame циклов
 */

import { debugLog } from './debug';

export interface PerformanceConfig {
    maxObjectsPerFrame?: number;
    batchSize?: number;
    skipFrames?: number;
    enableProfiling?: boolean;
}

export class PerformanceOptimizer {
    private static instance: PerformanceOptimizer;
    private frameCounter = 0;
    private batchProcessors: Map<string, BatchProcessor<any>> = new Map();

    private constructor() { }

    static getInstance(): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer();
        }
        return PerformanceOptimizer.instance;
    }

    /**
     * Создает оптимизированный обработчик для массивов объектов
     */
    createBatchProcessor<T>(
        id: string,
        config: PerformanceConfig = {}
    ): BatchProcessor<T> {
        const processor = new BatchProcessor<T>(id, {
            maxObjectsPerFrame: config.maxObjectsPerFrame ?? 50,
            batchSize: config.batchSize ?? 10,
            skipFrames: config.skipFrames ?? 0,
            enableProfiling: config.enableProfiling ?? false
        });

        this.batchProcessors.set(id, processor);
        return processor;
    }

    /**
     * Удаляет batch processor
     */
    removeBatchProcessor(id: string): void {
        this.batchProcessors.delete(id);
    }

    /**
     * Оптимизированный forEach для useFrame
     */
    optimizedForEach<T>(
        items: T[],
        callback: (item: T, index: number) => void,
        config: PerformanceConfig = {}
    ): void {
        const maxPerFrame = config.maxObjectsPerFrame ?? 50;
        const skipFrames = config.skipFrames ?? 0;

        // Пропускаем кадры если нужно
        if (skipFrames > 0 && this.frameCounter % (skipFrames + 1) !== 0) {
            this.frameCounter++;
            return;
        }

        // Обрабатываем только ограниченное количество объектов
        const itemsToProcess = items.slice(0, maxPerFrame);

        if (config.enableProfiling && itemsToProcess.length > 0) {
            const startTime = performance.now();
            itemsToProcess.forEach(callback);
            const endTime = performance.now();

            if (endTime - startTime > 16) { // Больше 1 кадра
                debugLog(`PerformanceOptimizer: Slow forEach detected: ${endTime - startTime}ms for ${itemsToProcess.length} items`);
            }
        } else {
            itemsToProcess.forEach(callback);
        }

        this.frameCounter++;
    }

    /**
     * Создает throttled функцию для useFrame
     */
    createThrottledCallback(
        callback: () => void,
        intervalMs: number
    ): () => void {
        let lastCall = 0;

        return () => {
            const now = performance.now();
            if (now - lastCall >= intervalMs) {
                callback();
                lastCall = now;
            }
        };
    }

    /**
     * Получает статистику производительности
     */
    getStats(): {
        frameCounter: number;
        batchProcessors: number;
        processorStats: Record<string, any>;
    } {
        const processorStats: Record<string, any> = {};

        for (const [id, processor] of this.batchProcessors.entries()) {
            processorStats[id] = processor.getStats();
        }

        return {
            frameCounter: this.frameCounter,
            batchProcessors: this.batchProcessors.size,
            processorStats
        };
    }
}

export class BatchProcessor<T> {
    private currentBatch = 0;
    private processedCount = 0;
    private totalProcessTime = 0;
    private frameSkipCounter = 0;

    constructor(
        private id: string,
        private config: Required<PerformanceConfig>
    ) { }

    /**
     * Обрабатывает массив объектов по батчам
     */
    process(
        items: T[],
        callback: (item: T, index: number) => void
    ): void {
        // Пропускаем кадры если нужно
        if (this.config.skipFrames > 0) {
            if (this.frameSkipCounter < this.config.skipFrames) {
                this.frameSkipCounter++;
                return;
            }
            this.frameSkipCounter = 0;
        }

        const startIndex = this.currentBatch * this.config.batchSize;
        const endIndex = Math.min(startIndex + this.config.batchSize, items.length);
        const batch = items.slice(startIndex, endIndex);

        if (batch.length === 0) {
            this.currentBatch = 0; // Сбрасываем для следующего цикла
            return;
        }

        const startTime = this.config.enableProfiling ? performance.now() : 0;

        batch.forEach((item, localIndex) => {
            callback(item, startIndex + localIndex);
        });

        if (this.config.enableProfiling) {
            const processTime = performance.now() - startTime;
            this.totalProcessTime += processTime;
            this.processedCount += batch.length;
        }

        this.currentBatch++;

        // Если обработали все объекты, сбрасываем счетчик
        if (endIndex >= items.length) {
            this.currentBatch = 0;
        }
    }

    /**
     * Получает статистику обработчика
     */
    getStats(): {
        id: string;
        currentBatch: number;
        processedCount: number;
        averageProcessTime: number;
        config: Required<PerformanceConfig>;
    } {
        return {
            id: this.id,
            currentBatch: this.currentBatch,
            processedCount: this.processedCount,
            averageProcessTime: this.processedCount > 0 ? this.totalProcessTime / this.processedCount : 0,
            config: this.config
        };
    }

    /**
     * Сбрасывает статистику
     */
    resetStats(): void {
        this.processedCount = 0;
        this.totalProcessTime = 0;
    }
}

// Глобальный экземпляр
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Хук для React компонентов
export function usePerformanceOptimizer() {
    return {
        createBatchProcessor: <T>(id: string, config?: PerformanceConfig) =>
            performanceOptimizer.createBatchProcessor<T>(id, config),

        optimizedForEach: <T>(
            items: T[],
            callback: (item: T, index: number) => void,
            config?: PerformanceConfig
        ) => performanceOptimizer.optimizedForEach(items, callback, config),

        createThrottledCallback: (callback: () => void, intervalMs: number) =>
            performanceOptimizer.createThrottledCallback(callback, intervalMs)
    };
}