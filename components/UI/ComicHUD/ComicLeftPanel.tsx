import React, { useEffect, useRef } from 'react';
import { useStore } from '../../../store';
import { GameStatus } from '../../../types';
import { motion } from 'framer-motion';

export const ComicLeftPanel: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<SVGCircleElement>(null);
    const iconRef = useRef<HTMLSpanElement>(null);
    const statusRef = useRef<GameStatus>(GameStatus.MENU);

    // Direct store subscription for max perf — no re-renders
    useEffect(() => {
        const DASH_CD_MAX = 3; // seconds
        const CIRCUMFERENCE = 2 * Math.PI * 20; // r=20

        const unsubscribe = useStore.subscribe((state) => {
            const { dashCooldown, status } = state;

            if (statusRef.current !== status) {
                statusRef.current = status;
                if (containerRef.current) {
                    containerRef.current.style.display = status === GameStatus.PLAYING ? 'flex' : 'none';
                }
            }

            if (status !== GameStatus.PLAYING) return;

            const isReady = dashCooldown <= 0;
            const progress = isReady ? 0 : dashCooldown / DASH_CD_MAX;

            if (ringRef.current) {
                ringRef.current.style.strokeDashoffset = `${progress * CIRCUMFERENCE}`;
                ringRef.current.style.stroke = isReady ? '#00ff88' : 'rgba(0,0,0,0.2)';
            }

            if (containerRef.current) {
                containerRef.current.className = `absolute bottom-20 left-8 z-[70] pointer-events-auto cursor-pointer transition-all duration-200 ${isReady ? 'animate-glow-pulse' : ''
                    }`;
            }

            if (iconRef.current) {
                iconRef.current.textContent = isReady ? '⚡' : dashCooldown.toFixed(1);
                iconRef.current.style.fontSize = isReady ? '24px' : '16px';
            }
        });

        return unsubscribe;
    }, []);

    const handleDash = () => {
        const state = useStore.getState();
        if (state.dashCooldown <= 0) {
            state.dash();
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleDash}
            style={{ display: 'none' }}
            className="absolute bottom-20 left-8 z-[70] pointer-events-auto cursor-pointer"
        >
            {/* GLASS BUTTON: Premium Dash */}
            <motion.div
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.95 }}
                className="relative w-16 h-16 bg-black/20 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl flex items-center justify-center transition-all overflow-hidden ring-1 ring-white/10"
            >
                {/* SVG cooldown progress border */}
                <svg className="absolute inset-0 w-full h-full p-1" viewBox="0 0 48 48">
                    <circle
                        ref={ringRef}
                        cx="24" cy="24" r="21"
                        fill="none"
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="dash-ring transition-all duration-100 ease-out"
                        style={{
                            strokeDasharray: `${2 * Math.PI * 21}`,
                            strokeDashoffset: '0',
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                        }}
                    />
                </svg>

                {/* Icon/Text */}
                <motion.span
                    ref={iconRef}
                    key={useStore.getState().dashCooldown <= 0 ? 'ready' : 'cd'}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.08, ease: "easeOut" }}
                    className="relative z-10 font-medium text-white select-none drop-shadow-md"
                    style={{ fontSize: '24px' }}
                >
                    ⚡
                </motion.span>
            </motion.div>
            
            {/* Label in a glass tag */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                className="absolute -bottom-2 -right-4 bg-black/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-md shadow-md z-20"
            >
                <span className="relative z-10 text-[10px] font-bold text-white uppercase tracking-widest leading-none">DASH [S]</span>
            </motion.div>
        </div>
    );
};
