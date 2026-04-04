import React, { useEffect, useRef } from 'react';

interface PowerUpTimerProps {
    icon: string;
    label: string;
    time: number;
    color: string;
}

export const PowerUpTimer: React.FC<PowerUpTimerProps> = ({ icon, label, time: initialTime, color }) => {
    const timeRef = useRef<HTMLDivElement>(null);
    const progressCircleRef = useRef<SVGCircleElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // We still receive 'time' as a prop, but we can also use a local interval or subscribe
        // However, since TopPanel already subscribes and passes 'time', we can use a ref to update DOM
        // to avoid React re-rendering the whole component tree.
        // Actually, if we want to avoid React re-renders, we should NOT pass 'time' as a prop.
        // But for now, let's at least optimize the DOM updates.

        if (timeRef.current) timeRef.current.innerText = `${Math.ceil(initialTime)}s`;

        const progress = Math.max(0, Math.min(100, (initialTime / 10) * 100));
        const circumference = 2 * Math.PI * 10;

        if (progressCircleRef.current) {
            progressCircleRef.current.style.strokeDashoffset = `${circumference * (1 - progress / 100)}`;
        }
        if (progressBarRef.current) {
            progressBarRef.current.style.width = `${progress}%`;
        }
    }, [initialTime]);

    return (
        <div
            className="bg-white/95 backdrop-blur-sm border-2 rounded-2xl p-3 flex items-center gap-3 shadow-xl min-w-[120px] powerup-timer-container"
            style={{
                borderColor: color,
                boxShadow: `0 0 20px ${color}40, 0 8px 32px rgba(0, 0, 0, 0.1)`,
                transition: 'transform 0.2s ease-out'
            }}
        >
            {/* Иконка с эффектом пульсации (CSS) */}
            <div className="relative powerup-icon-wrapper">
                <span className="powerup-icon" style={{ fontSize: '1.5rem', filter: `drop-shadow(0 0 8px ${color}80)` }}>
                    {icon}
                </span>
                {/* Кольцо прогресса вокруг иконки */}
                <svg className="absolute -inset-1 w-8 h-8 -rotate-90" viewBox="0 0 24 24">
                    <circle
                        ref={progressCircleRef}
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 10}`}
                        style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                        opacity="0.3"
                    />
                </svg>
            </div>

            {/* Текст и таймер */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-slate-600 uppercase tracking-wider leading-none">
                    {label}
                </div>
                <div ref={timeRef} className="text-xl font-black leading-none" style={{
                    color,
                    textShadow: `0 2px 4px rgba(0, 0, 0, 0.2)`,
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {Math.ceil(initialTime)}s
                </div>

                {/* Мини-прогресс бар */}
                <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                        ref={progressBarRef}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color, transition: 'width 0.3s ease-out' }}
                    />
                </div>
            </div>

            <style>{`
                .powerup-timer-container:hover {
                    transform: scale(1.05);
                }
                .powerup-icon-wrapper {
                    animation: powerup-pulse 2s ease-in-out infinite;
                }
                @keyframes powerup-pulse {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    25% { transform: scale(1.1) rotate(5deg); }
                    75% { transform: scale(1.1) rotate(-5deg); }
                }
            `}</style>
        </div>
    );
};
