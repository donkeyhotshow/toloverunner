/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * safeMath - Безопасные математические операции
 * Защита от NaN, Infinity и других проблемных значений
 */

/**
 * Безопасное деление с проверкой на ноль
 */
export const safeDivide = (a: number, b: number, fallback: number = 0): number => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
        return fallback;
    }
    const result = a / b;
    return Number.isFinite(result) ? result : fallback;
};

/**
 * Безопасное ограничение значения в диапазоне
 */
export const safeClamp = (value: number, min: number, max: number, fallback: number = 0): number => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, value));
};

/**
 * Безопасная интерполяция (lerp)
 */
export const safeLerp = (a: number, b: number, t: number, fallback: number = a): number => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(t)) {
        return fallback;
    }
    const clampedT = safeClamp(t, 0, 1, 0);
    const result = a + (b - a) * clampedT;
    return Number.isFinite(result) ? result : fallback;
};

/**
 * Безопасная дельта времени (ограничение для предотвращения скачков)
 */
export const safeDeltaTime = (delta: number, maxDelta: number = 0.05, minDelta: number = 0.001): number => {
    if (!Number.isFinite(delta) || delta <= 0) {
        return minDelta;
    }
    return safeClamp(delta, minDelta, maxDelta, minDelta);
};

/**
 * Проверка на валидное число
 */
export const isValidNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value);
};

/**
 * Безопасное получение числа с fallback
 */
export const safeNumber = (value: unknown, fallback: number = 0): number => {
    return isValidNumber(value) ? value : fallback;
};

/**
 * Безопасная проверка массива координат
 */
export const isSafePosition = (pos: number[]): boolean => {
    return pos.length >= 3 &&
        isValidNumber(pos[0]) &&
        isValidNumber(pos[1]) &&
        isValidNumber(pos[2]);
};

/**
 * Безопасное получение позиции с fallback
 */
export const safePosition = (pos: number[], fallback: [number, number, number] = [0, 0, 0]): [number, number, number] => {
    if (!isSafePosition(pos)) return fallback;
    return [pos[0] ?? fallback[0], pos[1] ?? fallback[1], pos[2] ?? fallback[2]];
};

/**
 * Стабилизация значения (сглаживание резких скачков)
 */
export const stabilizeValue = (
    current: number,
    target: number,
    maxChange: number,
    fallback: number = 0
): number => {
    if (!isValidNumber(current) || !isValidNumber(target)) return fallback;
    const diff = target - current;
    const clampedDiff = safeClamp(diff, -maxChange, maxChange, 0);
    return current + clampedDiff;
};

/**
 * Безопасная проверка Three.js Vector3
 */
export const isSafeVector3 = (vec: { x: number; y: number; z: number }): boolean => {
    return isValidNumber(vec.x) && isValidNumber(vec.y) && isValidNumber(vec.z);
};

/**
 * Очистка Vector3 от невалидных значений
 */
export const sanitizeVector3 = (vec: { x: number; y: number; z: number }, fallback = 0): void => {
    if (!isValidNumber(vec.x)) vec.x = fallback;
    if (!isValidNumber(vec.y)) vec.y = fallback;
    if (!isValidNumber(vec.z)) vec.z = fallback;
};

