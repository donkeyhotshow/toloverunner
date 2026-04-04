/**
 * TopPanel - Optimized HUD Container
 * Aggregates smaller components into the top bar.
 */

import React from 'react';
import { useStore } from '../../../store';
import type { GameState } from '../../../store/storeTypes';
import { useResponsive } from '../../../hooks/useResponsive';
import { ComicScoreCounter } from './ComicScoreCounter';
import { ComicHealthDisplay } from './ComicHealthDisplay';
import { ComicPanel } from '../System/ComicPanel';
import { ComicText } from '../System/ComicText';
import { WIN_DISTANCE, UI_LAYERS } from '../../../constants';

// Selectors
const selectDistance = (s: GameState) => s.distance;

export const TopPanel: React.FC = React.memo(() => {
    const distance = useStore(selectDistance);
    const { uiScale = 1.0, isMobile } = useResponsive();

    const handlePause = () => {
        window.dispatchEvent(new Event('toggle-pause'));
    };

    return (
        <div
            className="absolute top-0 left-0 right-0 p-4 font-comic select-none"
            data-testid="hud-top-panel"
            data-scale={uiScale}
            style={{
                zIndex: UI_LAYERS.HUD_TOP,
                transform: `scale(${uiScale})`,
                transformOrigin: 'top center',
                pointerEvents: 'none',
            }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-4" style={{ pointerEvents: 'auto' }}>
                    {!isMobile && (
                        <ComicPanel variant="white" rotation="left" padding="none" hasHalftone className="w-16 h-16 flex items-center justify-center overflow-hidden border-4 border-black shadow-comic comic-bubble-sm">
                            <div className="text-3xl drop-shadow-[2px_2px_0_#000]">🧬</div>
                        </ComicPanel>
                    )}
                    <div className="flex flex-col gap-2">
                        <ComicScoreCounter />
                        {!isMobile && (
                            <div className="w-32 h-4 rounded-lg border-[3px] border-black overflow-hidden relative shadow-comic-sm bg-black/60">
                                <div className="absolute inset-0 bg-ben-day opacity-20" />
                                <div className="relative h-full w-full overflow-hidden">
                                    <div className="h-full bg-[#FFFF00] transition-all duration-300 rounded-sm" style={{ width: `${Math.min((distance / WIN_DISTANCE) * 100, 100)}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-start gap-3" style={{ pointerEvents: 'auto' }}>
                    <div className="flex flex-col items-end gap-2">
                        <ComicHealthDisplay />
                        <ComicText variant="label" color="white" outline="md" className="comic-text-stroke-sm">
                            {Math.floor(distance)}m
                        </ComicText>
                    </div>
                    <button
                        onClick={handlePause}
                        className="w-12 h-12 bg-[#FF4444] border-4 border-black rounded-xl shadow-comic flex items-center justify-center text-white text-xl hover:scale-105 hover:shadow-comic-lg active:scale-95 active:translate-y-0.5 active:shadow-comic-sm transition-all comic-bubble-sm"
                    >
                        ⏸️
                    </button>
                </div>
            </div>
            {isMobile && (
                <div className="absolute top-24 left-4 h-48 w-4 rounded-lg border-[3px] border-black overflow-hidden flex items-end shadow-comic-sm bg-black/60">
                    <div className="absolute inset-0 bg-ben-day opacity-20" />
                    <div className="relative w-full h-full flex items-end">
                        <div className="w-full bg-[#FFFF00] transition-all duration-300 rounded-sm" style={{ height: `${Math.min((distance / WIN_DISTANCE) * 100, 100)}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
});

TopPanel.displayName = 'TopPanel';
