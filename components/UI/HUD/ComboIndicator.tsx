/**
 * ComboIndicator - Shows current combo chain
 */

import React from 'react';
import { useStore } from '../../../store';
import type { GameState } from '../../../store/storeTypes';
import { ComicPanel } from '../System/ComicPanel';
import { ComicText } from '../System/ComicText';
import { UI_LAYERS } from '../../../constants';

// Selectors
const selectCombo = (state: GameState) => state.combo;
const selectMultiplier = (state: GameState) => state.multiplier;

export const ComboIndicator: React.FC = () => {
    const combo = useStore(selectCombo);
    const multiplier = useStore(selectMultiplier);

    if (combo < 2) return null;

    return (
        <div className="absolute top-24 right-4 animate-bounce-subtle pointer-events-none" style={{ zIndex: UI_LAYERS.OVERLAY }}>
            <ComicPanel variant="purple" rotation="right" padding="sm" hasHalftone className="border-4 border-black shadow-pow">
                <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-2">
                        <ComicText variant="impact" color="white" outline="lg" className="text-4xl comic-text-stroke-lg">
                            {combo}x
                        </ComicText>
                        <ComicText variant="title" color="white" className="text-[#FFFF00] comic-text-stroke-sm">
                            COMBO
                        </ComicText>
                    </div>
                </div>
            </ComicPanel>
            {multiplier > 1 && (
                <div className="absolute -bottom-4 -right-2 transform rotate-12">
                    <ComicPanel variant="yellow" padding="none" className="px-2 py-0 border-[3px] border-black shadow-comic-sm">
                        <ComicText variant="label" className="text-xs font-black comic-text-stroke-sm">
                            {multiplier.toFixed(1)}x PTS
                        </ComicText>
                    </ComicPanel>
                </div>
            )}
        </div>
    );
};
