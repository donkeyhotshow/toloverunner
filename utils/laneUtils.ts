/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * laneUtils - Утилиты для работы с полосами движения
 * Централизованная логика для поддержки 5 полос
 */

import { LANE_WIDTH, SAFETY_CONFIG } from '../constants';
import { validateLaneIndex } from './validation';

/**
 * Максимальный индекс полосы (для 5 полос: -2, -1, 0, 1, 2)
 */
export const MAX_LANE_INDEX = SAFETY_CONFIG.LANE_LIMIT;

/**
 * Минимальный индекс полосы
 */
export const MIN_LANE_INDEX = -SAFETY_CONFIG.LANE_LIMIT;

/**
 * Количество полос
 */
export const LANE_COUNT = (MAX_LANE_INDEX - MIN_LANE_INDEX) + 1; // 5

/**
 * Валидирует индекс полосы для 5 полос
 * @param laneIndex Индекс полосы
 * @returns Валидированный индекс полосы
 */
export const validateLane = (laneIndex: number): number => {
    return validateLaneIndex(laneIndex, MAX_LANE_INDEX);
};

/**
 * Преобразует индекс полосы в X координату
 * @param laneIndex Индекс полосы (-2 до 2)
 * @returns X координата
 */
export const laneToX = (laneIndex: number): number => {
    const validated = validateLane(laneIndex);
    return validated * LANE_WIDTH;
};

/**
 * Преобразует X координату в индекс полосы
 * @param x X координата
 * @returns Индекс полосы
 */
export const xToLane = (x: number): number => {
    return Math.round(x / LANE_WIDTH);
};

/**
 * Валидирует X координату в пределах полос
 * @param x X координата
 * @returns Валидированная X координата
 */
export const validateLaneX = (x: number): number => {
    const maxX = MAX_LANE_INDEX * LANE_WIDTH;
    const minX = MIN_LANE_INDEX * LANE_WIDTH;
    return Math.max(minX, Math.min(maxX, x));
};

/**
 * Проверяет, находится ли индекс полосы в допустимых пределах
 * @param laneIndex Индекс полосы
 * @returns true если индекс валиден
 */
export const isValidLane = (laneIndex: number): boolean => {
    return Number.isFinite(laneIndex) &&
        laneIndex >= MIN_LANE_INDEX &&
        laneIndex <= MAX_LANE_INDEX;
};


/**
 * Вычисляет высоту трека в заданной точке X (учитывая кривизну)
 * Используется для того, чтобы игрок не проваливался под изогнутую дорогу
 * @param x X координата
 * @returns Y высота поверхности трека
 */
export const getTrackHeightAtX = (_x: number): number => {
    // 🔥 FIXED: Custom Road Geometry is now FLAT (BoxGeometry), so return 0.
    // Removed old pipe curvature logic: return 1.5 * normalizedX * normalizedX;
    return 0;
};
