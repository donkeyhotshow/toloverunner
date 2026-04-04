import React, { useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import { useStore } from '../../../store';
import { FEATURE_FLAGS } from '../../../constants';

export const MobileControls: React.FC = () => {
    const lane = useStore(s => s.localPlayerState.lane);
    const isJumping = useStore(s => s.localPlayerState.isJumping);
    const setLocalPlayerState = useStore(s => s.setLocalPlayerState);

    // 🕹️ UI Polish: Dynamic Opacity
    const [isInteracting, setIsInteracting] = React.useState(false);

    const handleMove = useCallback((dir: number) => {
        const nextLane = Math.max(-2, Math.min(2, (lane || 0) + dir));
        setLocalPlayerState({ lane: nextLane });
        setIsInteracting(true);
        setTimeout(() => setIsInteracting(false), 200);
    }, [lane, setLocalPlayerState]);

    const handleJump = useCallback(() => {
        if (!isJumping) {
            setLocalPlayerState({ isJumping: true });
            setIsInteracting(true);
            setTimeout(() => setIsInteracting(false), 200);
        }
    }, [isJumping, setLocalPlayerState]);

    // 🕹️ UI Polish: White Glass Style
    // FEATURE_FLAGS.MOBILE_TOUCH_HIT_AREA: min 44px touch target (a11y); откат — выключить флаг.
    const touchArea = FEATURE_FLAGS.MOBILE_TOUCH_HIT_AREA ? 'min-w-[44px] min-h-[44px] w-20 h-20' : 'w-20 h-20';
    const glassClass = `${touchArea} bg-white/40 backdrop-blur-md rounded-full border-2 border-white/60 flex items-center justify-center active:scale-95 transition-transform shadow-lg`;

    // 👻 Ghost Joystick: Vanishes when idle, Faint when usage
    // Active: Alpha 0.3 (Glass). Idle: Alpha 0.0 (Invisible) or 0.1 (Hint).
    // "resets or vanishes completely" -> 0.0. But for usability, 0.1 is safer for "finding" the buttons.
    // Idle 0.2 для лучшей видимости кнопок, Active 0.4 (Ghost).
    const containerOpacity = isInteracting ? 'opacity-40' : 'opacity-20';

    return (
        <div className={`absolute bottom-10 left-0 right-0 flex justify-between px-10 pointer-events-auto z-[60] md:hidden select-none transition-opacity duration-300 ${containerOpacity}`}>
            <div className="flex gap-4">
                <button
                    onPointerDown={() => handleMove(-1)}
                    className={glassClass}
                >
                    <ChevronLeft className="w-8 h-8 text-white/80" />
                </button>
                <button
                    onPointerDown={() => handleMove(1)}
                    className={glassClass}
                >
                    <ChevronRight className="w-8 h-8 text-white/80" />
                </button>
            </div>
            <button
                onPointerDown={handleJump}
                className={glassClass}
            >
                <ArrowUp className="w-8 h-8 text-white/80" />
            </button>
        </div>
    );
};
