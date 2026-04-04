/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useBrowserStability - Hook for handling tab switching and visibility changes
 */

import { useEffect } from 'react';
import { useStore } from '../store';
import { GameStatus } from '../types';
import { debugLog } from '../utils/debug';

export const useBrowserStability = () => {
    const status = useStore(s => s.status);
    const setStatus = useStore(s => s.setStatus);

    useEffect(() => {
        let wasPlayingBeforeHidden = false;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab is hidden/switched away
                debugLog('👁️ Tab hidden - pausing game');

                if (status === GameStatus.PLAYING) {
                    wasPlayingBeforeHidden = true;
                    setStatus(GameStatus.PAUSED);
                }
            } else {
                // Tab is visible again
                debugLog('👁️ Tab visible - resuming if was playing');

                if (wasPlayingBeforeHidden && status === GameStatus.PAUSED) {
                    // Small delay to ensure stable frame before resuming
                    setTimeout(() => {
                        setStatus(GameStatus.PLAYING);
                        wasPlayingBeforeHidden = false;
                    }, 100);
                }
            }
        };

        const handleBlur = () => {
            // Window lost focus
            debugLog('🪟 Window blur - pausing game');
            if (status === GameStatus.PLAYING) {
                wasPlayingBeforeHidden = true;
                setStatus(GameStatus.PAUSED);
            }
        };

        const handleFocus = () => {
            // Window gained focus
            debugLog('🪟 Window focus restored');
            // Don't automatically resume on focus, only on visibility
            // User can press 'p' or 'Escape' to resume
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [status, setStatus]);
};
