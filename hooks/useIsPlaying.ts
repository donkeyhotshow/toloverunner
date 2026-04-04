/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useIsPlaying - Хук для проверки статуса игры
 * Устраняет дублирование логики проверки статуса
 */

import { useStore } from '../store';
import { GameStatus } from '../types';

/**
 * Проверяет, играет ли игрок в данный момент
 */
export const useIsPlaying = (): boolean => {
    const status = useStore(s => s.status);
    return status === GameStatus.PLAYING;
};

/**
 * Проверяет, активна ли игра (PLAYING или PAUSED)
 */
export const useIsGameActive = (): boolean => {
    const status = useStore(s => s.status);
    return status === GameStatus.PLAYING || status === GameStatus.PAUSED;
};

