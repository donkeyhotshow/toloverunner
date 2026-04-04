/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Type-safe Data Utilities - Generic functions for data manipulation
 */

/**
 * Type-safe object picker - extracts specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}

/**
 * Type-safe object omit - removes specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> {
    const result = { ...obj } as Record<string, unknown>;
    for (const key of keys) {
        delete result[key as string];
    }
    return result as Omit<T, K>;
}

/**
 * Type-safe array filter with predicate
 */
export function filterArray<T>(
    array: T[],
    predicate: (item: T, index: number) => boolean
): T[] {
    return array.filter(predicate);
}

/**
 * Type-safe array map with custom return type
 */
export function mapArray<T, U>(
    array: T[],
    transform: (item: T, index: number) => U
): U[] {
    return array.map(transform);
}

/**
 * Type-safe deep clone
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Object) {
        const clonedObj = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }

    return obj;
}

/**
 * Type-safe JSON parse with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

/**
 * Type-safe array group by
 */
export function groupBy<T, K extends string | number>(
    array: T[],
    keyGetter: (item: T) => K
): Record<K, T[]> {
    return array.reduce((result, item) => {
        const key = keyGetter(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {} as Record<K, T[]>);
}

/**
 * Type-safe array unique by key
 */
export function uniqueBy<T, K>(
    array: T[],
    keyGetter: (item: T) => K
): T[] {
    const seen = new Set<K>();
    return array.filter(item => {
        const key = keyGetter(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * Type-safe array partition
 */
export function partition<T>(
    array: T[],
    predicate: (item: T) => boolean
): [T[], T[]] {
    const pass: T[] = [];
    const fail: T[] = [];
    
    for (const item of array) {
        if (predicate(item)) {
            pass.push(item);
        } else {
            fail.push(item);
        }
    }
    
    return [pass, fail];
}

/**
 * Type-safe object map
 */
export function mapObject<T extends object, U>(
    obj: T,
    transform: (value: T[keyof T], key: keyof T) => U
): { [K in keyof T]: U } {
    const result = {} as { [K in keyof T]: U };
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = transform(obj[key], key);
        }
    }
    return result;
}

/**
 * Type-safe function retry
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        backoff?: boolean;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt < maxAttempts) {
                const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

/**
 * Type-safe debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delayMs);
    };
}

/**
 * Type-safe throttle function
 */
export function throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    limitMs: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= limitMs) {
            lastCall = now;
            fn(...args);
        }
    };
}

/**
 * Type-safe memoization
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    fn: T
): T {
    const cache = new Map<string, unknown>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key) as ReturnType<T>;
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result as ReturnType<T>;
    }) as T;
}

/**
 * Type guard for non-null values
 */
export function isNonNull<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

/**
 * Type guard for array
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Type guard for object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type-safe type casting with validation
 */
export function cast<T>(value: unknown, validator: (value: unknown) => boolean): T | null {
    if (validator(value)) {
        return value as T;
    }
    return null;
}

/**
 * Type-safe optional getter
 */
export function getOrDefault<T, K extends keyof T>(
    obj: T,
    key: K,
    defaultValue: T[K]
): T[K] {
    return obj[key] ?? defaultValue;
}

/**
 * Type-safe array find with default
 */
export function findOrDefault<T>(
    array: T[],
    predicate: (item: T) => boolean,
    defaultValue: T
): T {
    return array.find(predicate) ?? defaultValue;
}