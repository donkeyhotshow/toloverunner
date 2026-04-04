/**
 * ComicHealthDisplay - Displays health using comic-style hearts
 */

import React from 'react';
import { useStore } from '../../../store';
import type { GameState } from '../../../store/storeTypes';
import { ComicPanel } from '../System/ComicPanel';

// Selectors
const selectLives = (state: GameState) => state.lives;
const selectMaxLives = (state: GameState) => state.maxLives;

export const ComicHealthDisplay: React.FC = () => {
    const lives = useStore(selectLives);
    const maxLives = useStore(selectMaxLives);

    return (
        <ComicPanel variant="white" rotation="right" padding="sm" hasHalftone className="min-w-[100px] border-4 border-black shadow-comic">
            <div className="flex gap-1 justify-center">
                {Array.from({ length: maxLives }).map((_, i) => (
                    <span
                        key={i}
                        className={`text-2xl transition-all duration-300 ${i < lives
                                ? 'text-[#FF4444] scale-100 comic-text-stroke-sm drop-shadow-[2px_2px_0_#000]'
                                : 'text-gray-400 grayscale scale-90 opacity-60'
                            }`}
                    >
                        ❤️
                    </span>
                ))}
            </div>
        </ComicPanel>
    );
};
