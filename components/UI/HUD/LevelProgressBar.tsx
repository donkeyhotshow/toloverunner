import React from 'react';
import { useStore } from '../../../store';
import { WIN_DISTANCE } from '../../../constants';

export const LevelProgressBar: React.FC = React.memo(() => {
    const distanceRef = React.useRef<HTMLSpanElement>(null);
    const goalRef = React.useRef<HTMLDivElement>(null);
    const fillRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        // Subscribe to state changes
        const unsubscribe = useStore.subscribe(
            (state) => {
                const distance = state.distance;
                if (distanceRef.current) {
                    distanceRef.current.innerText = `${Math.floor(distance)}m`;
                }
                if (goalRef.current) {
                    const remaining = Math.max(0, WIN_DISTANCE - distance);
                    goalRef.current.innerText = remaining > 0 ? `${Math.floor(remaining)}m to goal` : 'Goal reached!';
                }
                if (fillRef.current) {
                    const progress = Math.min(100, Math.max(0, (distance / WIN_DISTANCE) * 100));
                    fillRef.current.style.width = `${progress}%`;
                }
            }
        );
        return unsubscribe;
    }, []);

    return (
        <div className="flex flex-col items-center w-full max-w-xs mx-auto">
            <div className="text-center mb-3">
                <div className="bg-white text-black px-5 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <span ref={distanceRef} className="text-lg font-black tracking-[0.2em] uppercase">
                        0m
                    </span>
                </div>
                <div ref={goalRef} className="mt-2 text-black text-[10px] font-black uppercase tracking-widest drop-shadow-[1px_1px_0px_rgba(255,255,255,1)]">
                    {WIN_DISTANCE}m to goal
                </div>
            </div>

            <div className="w-full h-4 bg-white rounded-full border-4 border-black relative overflow-hidden shadow-inner">
                <div
                    ref={fillRef}
                    className="absolute top-0 left-0 h-full bg-yellow-400 transition-[width] duration-300 ease-out"
                    style={{ width: '0%' }}
                />
            </div>

            <div className="flex justify-between w-full px-1 mt-2">
                <div className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">Start</div>
                <div className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">Goal</div>
            </div>
        </div>
    );
});

LevelProgressBar.displayName = 'LevelProgressBar';
