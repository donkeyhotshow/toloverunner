/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * validation - Доменная валидация входных данных (полоса, позиция, скорость, масштаб).
 * Низкоуровневая арифметика — см. utils/safeMath.ts.
 */

import { safeClamp, isValidNumber, isSafePosition, safePosition } from './safeMath';

const DEFAULT_FALLBACK_POSITION: [number, number, number] = [0, 0, 0];

/**
 * Валидация индекса полосы (доменное правило: целое в [-limit, limit]).
 */
export const validateLaneIndex = (laneIndex: number, limit: number = 1): number => {
    if (!isValidNumber(laneIndex)) return 0;
    const rounded = Math.round(laneIndex);
    return safeClamp(rounded, -limit, limit, 0);
};

/**
 * Валидация позиции (массив из трёх чисел).
 */
export const validatePosition = (position: [number, number, number] | undefined): [number, number, number] => {
    if (!position || !Array.isArray(position) || position.length !== 3) {
        return DEFAULT_FALLBACK_POSITION;
    }
    return isSafePosition(position) ? safePosition(position, DEFAULT_FALLBACK_POSITION) : DEFAULT_FALLBACK_POSITION;
};

/**
 * Валидация скорости (доменные границы min/max).
 */
export const validateSpeed = (speed: number, min: number = 0, max: number = 100): number => {
    return safeClamp(speed, min, max, min);
};

/**
 * Валидация масштаба (положительное число в [min, max], иначе fallback 1).
 */
export const validateScale = (scale: number, min: number = 0.1, max: number = 10): number => {
    if (!isValidNumber(scale) || scale <= 0) return 1;
    return safeClamp(scale, min, max, 1);
};

