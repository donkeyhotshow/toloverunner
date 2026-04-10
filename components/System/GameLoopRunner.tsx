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
import type { RootState } from '@react-three/fiber';
import type { GameLoopCallback } from './GameLoopRegistry';

/** Safe callback executor: isolates errors so one bad callback cannot break the loop. */
function runCallbacks(
    set: Set<GameLoopCallback>,
    delta: number,
    time: number,
    state: RootState,
    phase: string
) {
    set.forEach(cb => {
        try {
            cb(delta, time, state);
        } catch (e) {
            if (typeof __DEBUG__ !== 'undefined' && __DEBUG__) {
                console.error(`[GameLoop] ${phase} callback error:`, e);
            }
        }
    });
}

/**
 * GameLoopRunner - Drives the game loop by calling registered callbacks
 * Replaces the old CentralGameLoop component.
 */
export const GameLoopRunner: React.FC = () => {
    const status = useStore(s => s.status);

    useEffect(() => {
        if (status === GameStatus.PAUSED || status === GameStatus.PLAYING) {
            getPhysicsStabilizer().resetAccumulator();
        }
    }, [status]);

    useFrame((state, delta) => {
        const store = useStore.getState();
        const currentStatus = store.status;

        const isPaused = currentStatus === GameStatus.PAUSED;
        const isMenu = currentStatus === GameStatus.MENU;
        const isPlaying = currentStatus === GameStatus.PLAYING;
        const isGameOver = currentStatus === GameStatus.GAME_OVER;
        const isVictory = currentStatus === GameStatus.VICTORY;

        if (!isPlaying && !isMenu && !isPaused && !isGameOver && !isVictory) return;

        const hitStopScale = hitStopManager.update(delta);
        const registryScale = getTimeScale();
        let finalDelta = delta * hitStopScale * registryScale;
        finalDelta = Math.max(SAFETY_CONFIG.MIN_DELTA_TIME, Math.min(SAFETY_CONFIG.MAX_DELTA_TIME, finalDelta));

        const time = state.clock.elapsedTime;

        // Strict priority order. Each phase isolated: error in one callback does NOT break the rest.

        // 1. World Update (Physics, Collisions) - must run before player
        if (isPlaying) {
            runCallbacks(callbacks.worldUpdate, finalDelta, time, state, 'worldUpdate');
        }

        // 2. Player Update (Input, Movement) - reads world state written above
        if (isPlaying || isMenu) {
            runCallbacks(callbacks.playerUpdate, finalDelta, time, state, 'playerUpdate');
        }

        // 3. Render Update (Animations, Effects) - reads final simulation state
        if (!isPaused) {
            runCallbacks(callbacks.renderUpdate, finalDelta, time, state, 'renderUpdate');
            // 4. Late Update - camera follow, post-process (always last)
            runCallbacks(callbacks.lateUpdate, finalDelta, time, state, 'lateUpdate');
        }

        markFrameFlush();
        flushUpdates();
    });

    return null;
};
