/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GameLoopRegistry - Registry for game loop callbacks.
 * Extracted from legacy CentralGameLoop to fix Fast Refresh support.
 */

import { RootState } from '@react-three/fiber';

export type GameLoopCallback = (delta: number, time: number, state: RootState) => void;

interface GameLoopCallbacks {
    worldUpdate: Set<GameLoopCallback>;
    playerUpdate: Set<GameLoopCallback>;
    renderUpdate: Set<GameLoopCallback>;
    lateUpdate: Set<GameLoopCallback>;
}



export const callbacks: GameLoopCallbacks = {
    worldUpdate: new Set(),
    playerUpdate: new Set(),
    renderUpdate: new Set(),
    lateUpdate: new Set(),
};

let timeScale = 1.0;

export const setTimeScale = (scale: number) => {
    timeScale = scale;
};

export const getTimeScale = () => timeScale;

/**
 * Регистрация коллбэков (сохраняем совместимость)
 */
export const registerGameLoopCallback = (type: keyof GameLoopCallbacks, callback: GameLoopCallback) => {
    callbacks[type].add(callback);
};

export const unregisterGameLoopCallback = (type: keyof GameLoopCallbacks, callback: GameLoopCallback) => {
    callbacks[type].delete(callback);
};
