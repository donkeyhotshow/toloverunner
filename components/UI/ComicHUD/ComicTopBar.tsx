import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { FEATURE_FLAGS } from '../../../constants';

export const ComicTopBar: React.FC = () => {
    const score = useStore(s => typeof s.score === 'number' ? s.score : 0);
    const lives = useStore(s => typeof s.lives === 'number' ? s.lives : 0);
    const maxLives = useStore(s => (typeof s.maxLives === 'number' && s.maxLives > 0) ? s.maxLives : 3);
    const distance = useStore(s => typeof s.distance === 'number' ? s.distance : 0);
    const sessionStartTime = useStore(s => s.sessionStartTime);
    const [timeDisplay, setTimeDisplay] = useState('00:00');

    // Score popup
    const [scorePopup, setScorePopup] = useState<{ value: number; key: number } | null>(null);
    const prevScore = useRef(score);

    useEffect(() => {
        if (!sessionStartTime) return undefined;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            setTimeDisplay(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStartTime]);

    useEffect(() => {
        if (score > prevScore.current && score > 0) {
            const inc = score - prevScore.current;
            setScorePopup({ value: inc, key: Date.now() });
            const t = setTimeout(() => setScorePopup(null), 1000);
            prevScore.current = score;
            return () => clearTimeout(t);
        }
        prevScore.current = score;
        return undefined;
    }, [score]);

    const handlePause = () => {
        window.dispatchEvent(new Event('toggle-pause'));
    };

    // FEATURE_FLAGS.HUD_COMPACT_MOBILE: компактные отступы на мобильных; откат — выключить флаг.
    const topBarPadding = FEATURE_FLAGS.HUD_COMPACT_MOBILE ? 'p-2 sm:p-4' : 'p-4';
    return (
        <div className={`absolute top-0 left-0 right-0 ${topBarPadding} z-[100] pointer-events-none select-none`}>
            <div className="flex justify-between items-start max-w-[1400px] mx-auto">
                {/* LEFT: Score + Distance (Glass Panels) */}
                <div className="flex flex-col gap-3">
                    {/* Score Panel */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-black/20 backdrop-blur-md border border-white/20 px-6 py-3 flex items-center gap-4 rounded-xl shadow-lg ring-1 ring-white/10"
                    >
                        <span className="text-2xl drop-shadow-md">✨</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none">SCORE</span>
                            <motion.span 
                                key={score}
                                initial={{ scale: 1.2, color: '#fff' }}
                                animate={{ scale: 1, color: '#e2e8f0' }}
                                transition={{ duration: 0.08, ease: "easeOut" }}
                                className="text-2xl font-bold text-slate-200 leading-none tabular-nums tracking-wide"
                            >
                                {score.toLocaleString()}
                            </motion.span>
                        </div>
                        {/* Score increment popup */}
                        <AnimatePresence>
                            {scorePopup && (
                                <motion.span
                                    initial={{ scale: 0, y: 10, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ scale: 0, y: -10, opacity: 0 }}
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-cyan-300 drop-shadow-md pointer-events-none whitespace-nowrap z-20"
                                >
                                    +{scorePopup.value}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                    
                    {/* Distance Panel */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 flex items-center gap-3 rounded-lg shadow-md self-start"
                    >
                        <span className="text-lg drop-shadow-md">📐</span>
                        <motion.span 
                            key={Math.floor(distance / 10)}
                            className="text-lg font-medium text-white tabular-nums tracking-wider"
                        >
                            {Math.floor(distance)}m
                        </motion.span>
                    </motion.div>
                </div>

                {/* CENTER: Hearts (Glass style) */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full shadow-lg"
                >
                    {Array.from({ length: Math.max(1, Math.min(10, maxLives)) }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: i < lives ? 1 : 0.8 }}
                            transition={{ type: 'spring', bounce: 0.4 }}
                            className={`transition-all duration-300 drop-shadow-md ${i < lives ? 'opacity-100' : 'opacity-20 grayscale'}`}
                            style={{ fontSize: '24px', lineHeight: 1 }}
                        >
                            ❤️
                        </motion.div>
                    ))}
                </motion.div>

                {/* RIGHT: Timer + Pause */}
                <div className="flex items-start gap-3">
                    {/* Timer Panel */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="relative bg-black/20 backdrop-blur-md border border-white/20 px-5 py-2 flex items-center gap-3 rounded-xl shadow-lg ring-1 ring-white/10"
                    >
                        <span className="text-xl drop-shadow-md">⏱️</span>
                        <span className="text-xl font-medium text-white tabular-nums min-w-[60px] text-center">
                            {timeDisplay}
                        </span>
                    </motion.div>
                    
                    {/* Pause button */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 }}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePause}
                        className="bg-black/20 backdrop-blur-md border border-white/20 w-12 h-12 flex items-center justify-center text-white rounded-xl shadow-lg transition-colors pointer-events-auto cursor-pointer"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="drop-shadow-md">
                            <rect x="4" y="3" width="4" height="14" rx="1" />
                            <rect x="12" y="3" width="4" height="14" rx="1" />
                        </svg>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
