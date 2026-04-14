/**
 * ComicScoreCounter - Bio-Comic Style Score Display
 * Refactored to use Comic System Components
 */

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../../store';
import { ComicPanel } from '../System/ComicPanel';
import { ComicText } from '../System/ComicText';
import { eventBus } from '../../../utils/eventBus';

export const ComicScoreCounter: React.FC = () => {
    const score = useStore(s => s.score);
    const [isPulsing, setIsPulsing] = useState(false);
    const [pulseScale, setPulseScale] = useState(1.1); // Dynamic scale
    const [showScorePopup, setShowScorePopup] = useState(false);
    const [scoreIncrement, setScoreIncrement] = useState(0);
    const prevScore = useRef(score);

    // Listen for HUD pulse events via eventBus (single event system)
    useEffect(() => {
        const unsub = eventBus.on('ui:hud-pulse', ({ element, intensity }) => {
            if (element === 'score') {
                setPulseScale(intensity ?? 1.1);
                setIsPulsing(true);
                setTimeout(() => setIsPulsing(false), 200);
            }
        });
        return () => unsub();
    }, []);

    // 🔢 Score Change Logic (Text Popup only)
    useEffect(() => {
        if (score > prevScore.current && score > 0) {
            const increment = score - prevScore.current;
            setScoreIncrement(increment); // Use setState instead of ref mutation
            // Only trigger popup, leave pulsing to the event for better timing
            setShowScorePopup(true);
            const popupTimer = setTimeout(() => setShowScorePopup(false), 1200);

            prevScore.current = score;
            return () => clearTimeout(popupTimer);
        }
        prevScore.current = score;
        return undefined;
    }, [score]);

    return (
        <div className="relative">
            <ComicPanel
                variant="yellow"
                rotation={isPulsing ? 'right' : 'left'}
                hasHalftone
                className={`transition-transform duration-100 ease-out border-4 border-black shadow-comic`}
                style={{ transform: isPulsing ? `scale(${pulseScale})` : 'scale(1)' }}
                padding="sm"
            >
                <div className="flex flex-col items-center min-w-[120px]">
                    <ComicText variant="label" className="tracking-widest opacity-80 mb-[-4px] comic-text-stroke-sm">
                        SCORE
                    </ComicText>
                    <ComicText variant="value" outline="lg" className="text-3xl comic-text-stroke-lg text-black">
                        {score.toLocaleString()}
                    </ComicText>
                </div>
            </ComicPanel>

            {/* Score Increment Popup */}
            {showScorePopup && scoreIncrement > 0 && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-score-popup pointer-events-none z-20">
                    <div className="bg-[#00FF7F] text-black font-black text-lg px-3 py-1 rounded-full border-[3px] border-black shadow-comic comic-text-stroke-sm">
                        +{scoreIncrement.toLocaleString()}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes score-popup {
                    0% { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.5); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1.2); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.8); }
                }
                .animate-score-popup {
                    animation: score-popup 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
};