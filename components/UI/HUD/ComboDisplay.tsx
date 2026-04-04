import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store';

export const ComboDisplay: React.FC = () => {
    const combo = useStore(s => s.combo);
    const multiplier = useStore(s => s.multiplier);
    const comboTimer = useStore(s => s.comboTimer);

    const zenMode = useStore(s => s.zenMode);

    if (combo < 3 || zenMode) return null; // Only show for meaningful combos


    const timerPercentage = (comboTimer / 3.5) * 100;

    return (
        // 🔝 TOP-LEFT corner - small, non-intrusive
        <div className="absolute top-20 left-4 pointer-events-none z-[110]">
            <AnimatePresence mode="wait">
                <motion.div
                    key={combo}
                    initial={{ scale: 0.8, opacity: 0, x: -10 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="flex flex-col items-start"
                >
                    {/* Compact row: multiplier + combo count */}
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 shadow-lg">
                        <div className="bg-yellow-400 text-black font-black text-sm px-2 py-0.5 rounded-full border-2 border-black -rotate-3">
                            x{multiplier.toFixed(1)}
                        </div>
                        <span className="text-2xl font-black text-white italic tracking-tight drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                            {combo}×
                        </span>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">STREAK</span>
                    </div>

                    {/* Timer Bar */}
                    <div className="w-full h-1.5 bg-black/40 border border-black/50 rounded-full mt-1 overflow-hidden">
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: `${timerPercentage}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                            className="h-full bg-cyan-400"
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
