import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../../store';
import type { GameState } from '../../../store/storeTypes';
import { ComicPanel } from '../System/ComicPanel';
import { ComicText } from '../System/ComicText';
import { eventBus } from '../../../utils/eventBus';

// Selectors
const selectPerfectTimingBonus = (state: GameState) => state.perfectTimingBonus;

export const PerfectTimingIndicator: React.FC = () => {
    const perfectTimingBonus = useStore(selectPerfectTimingBonus);
    const [isVisible, setIsVisible] = useState(false);
    const prevBonus = useRef(0);

    const [displayBonus, setDisplayBonus] = useState(0);

    useEffect(() => {
        if (perfectTimingBonus > 0) {
            prevBonus.current = perfectTimingBonus;
            const id = setTimeout(() => {
                setDisplayBonus(perfectTimingBonus);
                setIsVisible(true);
            }, 0);
            eventBus.emit('particle:burst', {
                position: [0, 3, 0],
                color: '#FFD700',
                type: 'powerup',
                count: 40
            });
            const t = setTimeout(() => setIsVisible(false), 2500);
            return () => {
                clearTimeout(id);
                clearTimeout(t);
            };
        }
        return undefined;
    }, [perfectTimingBonus]);

    const showPopups = useStore(s => s.showPopups);
    const zenMode = useStore(s => s.zenMode);

    if (!isVisible || !showPopups || zenMode) return null;


    return (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none scale-75 animate-bounce-impulse">

            {/* Golden glow effect */}
            <div className="absolute inset-0 animate-ping opacity-50">
                <ComicPanel variant="yellow" rotation="right" padding="md" className="blur-md" />
            </div>

            <ComicPanel variant="yellow" rotation="right" padding="md" className="shadow-[8px_8px_0px_#000] relative animate-pulse">
                <div className="text-center min-w-[200px]">
                    <ComicText variant="title" className="text-black mb-1">
                        PERFECT TIMING!
                    </ComicText>
                    <ComicText variant="impact" color="white" outline="md" className="text-4xl text-[#FF4444]">
                        +{displayBonus}
                    </ComicText>

                    <ComicText variant="label" className="mt-1 opacity-70">
                        BONUS POINTS
                    </ComicText>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-black/50 border-t-2 border-black/20 pt-1">
                        ⚡ Chain&nbsp;collect&nbsp;&lt;&nbsp;0.5s
                    </div>
                </div>
            </ComicPanel>
        </div>
    );
};
