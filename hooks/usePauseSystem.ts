/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * usePauseSystem - Hook for handling 'p' and 'Escape' keys
 */

import { useEffect } from 'react';
import { useStore } from '../store';
import { GameStatus } from '../types';
import { debugLog } from '../utils/debug';

export const usePauseSystem = () => {
    const status = useStore(s => s.status);
    const setStatus = useStore(s => s.setStatus);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if typing in input field
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            const key = event.key.toLowerCase();
            const code = event.code;

            // 'p' or 'Escape' to toggle pause
            if (key === 'p' || code === 'Escape') {
                event.preventDefault();

                if (status === GameStatus.PLAYING) {
                    debugLog('⏸️ Game paused');
                    setStatus(GameStatus.PAUSED);
                } else if (status === GameStatus.PAUSED) {
                    debugLog('▶️ Game resumed');
                    setStatus(GameStatus.PLAYING);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [status, setStatus]);
};
