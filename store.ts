/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { GameState } from './store/storeTypes';
import { createSessionSlice } from './store/sessionSlice';
import { createGameplaySlice } from './store/gameplaySlice';
import { createPlayerSlice, initialPlayerState } from './store/playerSlice';
import { createUISlice } from './store/uiSlice';
import { createPersistenceSlice } from './store/persistenceSlice';
import { createProgressionSlice } from './store/progressionSlice';
import { createNetworkSlice } from './store/networkSlice';

import { unifiedAudio } from './core/audio/UnifiedAudioManager';
import { GameStatus } from './types';

let audioRafId: number | null = null;

export { initialPlayerState };

export const useStore = createWithEqualityFn<GameState>((...a) => {
    const [set, get, api] = a as [typeof a[0], typeof a[1], { subscribe?: (_selector: (state: GameState) => unknown, _callback: (value: unknown) => void) => void }];

    const startAudioLoop = () => {
        if (audioRafId !== null) {
            cancelAnimationFrame(audioRafId);
            audioRafId = null;
        }
        const loop = () => {
            const state = get();
            if (state.status === GameStatus.PLAYING) {
                // music tempo
                unifiedAudio.updateTempo(state.speed);

                // music intensity (Consolidated from DynamicAudio)
                const progress = Math.min(state.distance / 1000, 1);
                const speedIntensity = Math.min(state.speed / 100, 1);
                const comboIntensity = Math.min((state.combo || 0) / 10, 1);
                const intensity = (progress + speedIntensity + comboIntensity) / 3;
                const tempoFactor = 0.5 + intensity * 0.5;

                unifiedAudio.updateMusicIntensity(intensity, tempoFactor);

                audioRafId = requestAnimationFrame(loop);
            } else {
                audioRafId = null;
            }
        };
        audioRafId = requestAnimationFrame(loop);
    };

    const stopAudioLoop = () => {
        if (audioRafId !== null) {
            cancelAnimationFrame(audioRafId);
            audioRafId = null;
        }
    };

    // Subscribe to status to manage long-lived loops predictably
    api?.subscribe?.(
        (state: GameState) => state.status,
        (value: unknown) => {
            const status = value as GameStatus;
            if (status === GameStatus.PLAYING) {
                startAudioLoop();
            } else {
                stopAudioLoop();
            }
        }
    );

    return {
        ...createSessionSlice(...a),
        ...createGameplaySlice(...a),
        ...createPlayerSlice(...a),
        ...createUISlice(...a),
        ...createPersistenceSlice(...a),
        ...createProgressionSlice(...a),
        ...createNetworkSlice(...a),
        metrics: { fps: 60, ping: 0 },
        isStoreInitialized: false,

        // Global Init Action that sits outside specific slices
        init: () => {
            if (get().isStoreInitialized) return;
            set(() => ({ isStoreInitialized: true }));

            // 1. Load Data
            get().loadData();

            // 2. Audio Loop managed via status subscription
            if (get().status === GameStatus.PLAYING) {
                startAudioLoop();
            }

            // 4. Export store for dev monitoring (dev only) OR when CI/QA explicitly requests it.
            //    Use VQA_EXPOSE_STORE=1 (or 'true') in CI environment to allow VQA/Playwright to read state.
            // Note: `process.env` is not available in the browser when built with Vite;
            // use `import.meta.env` instead and allow an explicit window override for tests.
            const envObj = (import.meta.env as unknown as Record<string, string | boolean | undefined>) || {};
            const exposeFlag =
                (envObj.VQA_EXPOSE_STORE === '1' || envObj.VQA_EXPOSE_STORE === 'true') ||
                (envObj.VITE_VQA_EXPOSE_STORE === '1' || envObj.VITE_VQA_EXPOSE_STORE === 'true') ||
                (typeof (window as unknown as { __VQA_EXPOSE_STORE__?: string }).__VQA_EXPOSE_STORE__ !== 'undefined' && (window as unknown as { __VQA_EXPOSE_STORE__?: string }).__VQA_EXPOSE_STORE__ === '1');

            const isDevMode = import.meta.env.DEV;

            try {
                const globalWindow = window as unknown as { __TOLOVERUNNER_STORE__?: unknown };
                if (exposeFlag) {
                    globalWindow.__TOLOVERUNNER_STORE__ = { getState: get, setState: set };
                } else if (isDevMode) {
                    globalWindow.__TOLOVERUNNER_STORE__ = { getState: get };
                }
            } catch { /* ignore non-browser env */ }
        }
    };
});
