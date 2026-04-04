import React from 'react';
import { useStore } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';

export const ComicRightPanel: React.FC = () => {
    const combo = useStore(s => (typeof s.combo === 'number' ? s.combo : 0));

    if (combo < 2) return null;

    const multiplier = Math.floor(combo / 5) + 1;

    return (
        <div className="absolute right-6 top-24 z-[100] pointer-events-none select-none">
            <AnimatePresence>
                <motion.div
                    initial={{ scale: 0, opacity: 0, x: 50 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: 50 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="relative"
                >
                    {/* GLASS COMBO PANEL: Premium Glass-morphism */}
                    <div className="relative bg-black/20 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl px-6 py-4 flex items-center justify-center gap-4 min-w-[140px] overflow-hidden ring-1 ring-white/10">
                        {/* Combo count */}
                        <div className="flex flex-col items-center relative z-10" style={{ transform: 'rotate(0deg)' }}>
                            <motion.span 
                                key={combo}
                                initial={{ scale: 1.3, color: '#fff' }}
                                animate={{ scale: 1, color: '#e2e8f0' }}
                                transition={{ duration: 0.08, ease: "easeOut" }}
                                className="text-5xl font-bold text-white leading-none drop-shadow-lg tracking-tight"
                            >
                                {combo}×
                            </motion.span>
                            <div className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-1">
                                COMBO
                            </div>
                        </div>

                        {/* Multiplier badge - Glass style */}
                        {multiplier > 1 && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                                className="relative bg-gradient-to-br from-purple-500/80 to-pink-500/80 backdrop-blur-sm border border-white/30 rounded-full w-12 h-12 flex items-center justify-center shadow-md overflow-hidden"
                            >
                                <span className="text-xl font-bold text-white relative z-10 drop-shadow-sm">
                                    ×{multiplier}
                                </span>
                            </motion.div>
                        )}

                        {/* Fire sticker -> Clean icon */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-3xl filter drop-shadow-md ml-2"
                        >
                            🔥
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
