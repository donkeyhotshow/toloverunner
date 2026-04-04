/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GameLoopRunner - Main Game Loop Driver
 * Executes the Registered Callbacks via useFrame
 */

import React, { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { flushUpdates, markFrameFlush } from './InstanceUpdateScheduler';
import { callbacks, getTimeScale } from './GameLoopRegistry';
import { hitStopManager } from '../../core/HitStopManager';
import { getPhysicsStabilizer } from '../../core/physics/PhysicsStabilizer';
import { SAFETY_CONFIG } from '../../constants';


/**
 * GameLoopRunner - Drives the game loop by calling registered callbacks
 * Replaces the old CentralGameLoop component.
 */
export const GameLoopRunner: React.FC = () => {
    const status = useStore(s => s.status);

    // Сброс аккумулятора при паузе и при старте/возобновлении (PLAYING) — избегаем рывка из-за большого delta
    useEffect(() => {
        if (status === GameStatus.PAUSED || status === GameStatus.PLAYING) {
            getPhysicsStabilizer().resetAccumulator();
        }
    }, [status]);

    // ...
    useFrame((state, delta) => {
        const store = useStore.getState();
        const status = store.status;

        // Optimization: Don't run logic if in menu (except rendering maybe?)
        // Keeping logic consistent with previous implementation:
        const isPaused = status === GameStatus.PAUSED;
        const isMenu = status === GameStatus.MENU;
        const isPlaying = status === GameStatus.PLAYING;
        const isGameOver = status === GameStatus.GAME_OVER;
        const isVictory = status === GameStatus.VICTORY;

        if (!isPlaying && !isMenu && !isPaused && !isGameOver && !isVictory) return;

        // 🔥 HIT STOP LOGIC: Scale delta based on impact state
        const hitStopScale = hitStopManager.update(delta);
        const registryScale = getTimeScale();
        let finalDelta = delta * hitStopScale * registryScale;
        // Clamp delta for stability (prevents physics spikes on tab switch / lag)
        finalDelta = Math.max(SAFETY_CONFIG.MIN_DELTA_TIME, Math.min(SAFETY_CONFIG.MAX_DELTA_TIME, finalDelta));

        // Use gameDelta for simulation, but pass real delta if needed (rare)
        // Ideally we pass gameDelta to everything effectively "pausing" the world
        const time = state.clock.elapsedTime; // Time keeps flowing, but simulation stops

        // Execute registered callbacks in order
        // 1. World Update (Physics, Collisions)
        if (isPlaying) {
            callbacks.worldUpdate.forEach(cb => cb(finalDelta, time, state));
        }

        // 2. Player Update (Input, Movement)
        if (isPlaying || isMenu) {
            callbacks.playerUpdate.forEach(cb => cb(finalDelta, time, state));
        }

        // 3. Render Update (Animations, Effects) - always if not paused
        if (!isPaused) {
            callbacks.renderUpdate.forEach(cb => cb(finalDelta, time, state));
            callbacks.lateUpdate.forEach(cb => cb(finalDelta, time, state)); // 🎥 Camera Follow (Late)
        }

        // Flush all instanced updates immediate (prevents 1-frame lag)
        markFrameFlush();
        flushUpdates();
    });

    return null;
};
