
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Global Curve Configuration
// 🔥 STRAIGHT TRACK to prevent misalignment/blocking
export const CURVE_AMP = 0;
export const CURVE_FREQ = 0;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CurveHelper - синхронізація кривизни для всіх об'єктів
 * Централизованное кэширование для оптимизации производительности
 */

// Централизованный кэш для всех вызовов
const CURVE_CACHE = new Map<number, { x: number, y: number, rotY: number }>();
const CACHE_STEP = 2; // Кэшируем с шагом 2 единицы
const MAX_CACHE_SIZE = 1000; // Максимальный размер кэша

// Pool for result objects to avoid GC pressure
const RESULT_POOL: { x: number, y: number, rotY: number }[] = [];
for (let i = 0; i < 200; i++) {
    RESULT_POOL.push({ x: 0, y: 0, rotY: 0 });
}
let poolIndex = 0;

export class CurveHelper {
    /**
     * Returns the X/Y offset and Y rotation for any given Z position in the world.
     * Use this to sync player, obstacles, and the tunnel segments.
     * 
     * NOTE: The returned object is from a pool. Do not store it; use its values immediately.
     * 
     * @param z - The generic "World Z" (Distance travelled + local Z)
     * @returns Object with x, y offsets and rotation Y
     */
    static getCurveAt(z: number): { x: number, y: number, rotY: number } {
        // 🔥 OPTIMIZATION: Use cache with interpolation
        const cacheKey = Math.floor(z / CACHE_STEP) * CACHE_STEP;
        let cached = CURVE_CACHE.get(cacheKey);

        if (!cached) {
            // Calculate and cache
            const x = Math.sin(cacheKey * CURVE_FREQ) * CURVE_AMP;
            const rotY = Math.atan(CURVE_AMP * CURVE_FREQ * Math.cos(cacheKey * CURVE_FREQ));
            cached = { x, y: 0, rotY };

            // Limit cache size
            if (CURVE_CACHE.size < MAX_CACHE_SIZE) {
                CURVE_CACHE.set(cacheKey, cached);
            }
        }

        // Pool result
        const res = RESULT_POOL[poolIndex];
        if (!res) {
            // Fallback if pool is somehow empty
            return { x: cached.x, y: 0, rotY: cached.rotY };
        }
        poolIndex = (poolIndex + 1) % RESULT_POOL.length;

        // Simple linear interpolation for smoothness between cache steps
        const nextKey = cacheKey + CACHE_STEP;
        let next = CURVE_CACHE.get(nextKey);
        if (!next) {
            const x = Math.sin(nextKey * CURVE_FREQ) * CURVE_AMP;
            const rotY = Math.atan(CURVE_AMP * CURVE_FREQ * Math.cos(nextKey * CURVE_FREQ));
            next = { x, y: 0, rotY };
        }

        const t = (z - cacheKey) / CACHE_STEP;
        const nextX = next.x;
        const nextRotY = next.rotY;

        res.x = cached.x + (nextX - cached.x) * t;
        res.y = 0;
        res.rotY = cached.rotY + (nextRotY - cached.rotY) * t;

        return res;
    }

    /**
     * Очищает кэш кривизны
     * Полезно при смене уровня или рестарте игры
     */
    static clearCache(): void {
        CURVE_CACHE.clear();
    }

    /**
     * Returns only the rotation Y for a given Z position
     * @param z - The generic "World Z"
     * @returns Rotation in radians
     */
    static getRotationAt(z: number): number {
        return Math.atan(CURVE_AMP * CURVE_FREQ * Math.cos(z * CURVE_FREQ));
    }
}
