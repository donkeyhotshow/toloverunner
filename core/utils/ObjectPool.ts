/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generic Object Pool for reusing objects and reducing GC pressure.
 * Optimized with adaptive max pool size and proper cleanup.
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private inPool: Set<T> = new Set();
    private factory: () => T;
    private resetter: (_obj: T) => void;
    private maxSize: number;
    private totalCreated: number = 0;

    constructor(factory: () => T, resetter: (_obj: T) => void, initialSize: number = 0, maxSize?: number) {
        this.factory = factory;
        this.resetter = resetter;

        // Adaptive max size based on device memory (if available)
        const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        const adaptiveMax = deviceMemory ? Math.min(deviceMemory * 100, 1000) : 500;
        this.maxSize = maxSize ?? adaptiveMax;

        // Pre-allocate only a portion to avoid startup lag
        const preAllocate = Math.min(initialSize, 50);
        for (let i = 0; i < preAllocate; i++) {
            const obj = this.factory();
            this.pool.push(obj);
            this.inPool.add(obj);
            this.totalCreated++;
        }
    }

    /**
     * Get an object from the pool or create a new one if the pool is empty.
     */
    acquire(): T {
        if (this.pool.length > 0) {
            const obj = this.pool.pop()!;
            this.inPool.delete(obj);
            return obj;
        }
        this.totalCreated++;
        return this.factory();
    }

    /**
     * Return an object to the pool for later reuse.
     * Objects beyond maxSize are discarded to prevent memory bloat.
     */
    release(obj: T): void {
        if (this.inPool.has(obj)) return;

        // Prevent pool from growing indefinitely
        if (this.pool.length >= this.maxSize) {
            // Just reset and discard - let GC handle it
            this.resetter(obj);
            return;
        }

        this.resetter(obj);
        this.pool.push(obj);
        this.inPool.add(obj);
    }

    /**
     * Clear the pool and reset tracking.
     */
    clear(): void {
        this.pool.length = 0;
        this.inPool.clear();
    }

    /**
     * Get current pool size.
     */
    size(): number {
        return this.pool.length;
    }

    /**
     * Get stats for debugging.
     */
    getStats(): { poolSize: number; totalCreated: number; maxSize: number } {
        return {
            poolSize: this.pool.length,
            totalCreated: this.totalCreated,
            maxSize: this.maxSize
        };
    }
}
