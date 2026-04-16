import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Home, Trophy, Sparkles } from 'lucide-react';
import { useStore } from '../../../store';
import { UI_LAYERS } from '../../../constants';
import { ComicPanel } from '../common/ComicPanel';
import { ComicButton } from '../common/ComicButton';

export const VictoryScreen: React.FC = () => {
    const resetGame = useStore(s => s.resetGame);
    const restartGame = useStore(s => s.restartGame);
    const score = useStore(s => (typeof s.score === 'number' ? s.score : 0));
    const distance = useStore(s => (typeof s.distance === 'number' ? s.distance : 0));
    const genesCollected = useStore(s => (typeof s.genesCollected === 'number' ? s.genesCollected : 0));
    const endGameSession = useStore(s => s.endGameSession);

    // Record the session exactly once when the victory screen appears.
    // hasRecordedRef prevents double-firing in React StrictMode and when
    // `score` / `endGameSession` identity changes after mount.
    const hasRecordedRef = useRef(false);
    useEffect(() => {
        if (hasRecordedRef.current) return;
        hasRecordedRef.current = true;
        endGameSession(Number(score), 0);
    }, [score, endGameSession]);

    return (
        <div
            className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto select-none"
            style={{
                zIndex: UI_LAYERS.MODAL_CONTENT,
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0.85) 100%)',
            }}
        >
            {/* Background patterns */}
            <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none" />
            
            {/* Golden particles effect */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, #ffd700 2px, transparent 2px)',
                    backgroundSize: '32px 32px'
                }}
            />

            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-sm"
            >
                <ComicPanel variant="gradient" glow className="p-8 pb-10 overflow-visible">
                    {/* Comic shine effect */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-400/20 via-transparent to-yellow-600/20 pointer-events-none rounded-[inherit]" />
                    
                    {/* Trophy sticker */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                        className="flex justify-center mb-0 -mt-20"
                    >
                        <div className="w-28 h-28 bg-gradient-to-br from-[#ffd700] to-[#ff8f00] border-4 border-black shadow-[8px_8px_0_#000] rotate-[8deg] flex items-center justify-center rounded-3xl z-20 overflow-hidden relative">
                            <div className="absolute inset-0 bg-halftone opacity-20" />
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-6xl relative z-10"
                            >
                                🏆
                            </motion.span>
                        </div>
                    </motion.div>

                    {/* Title */}
                    <h1 className="text-center font-bangers text-7xl text-stroke-black text-[#ffd700] mb-2 transform -rotate-1 drop-shadow-[6px_6px_0_#000] mt-4 relative z-10">
                        VICTORY!
                    </h1>
                    
                    <p className="text-center text-sm font-black text-black/50 uppercase tracking-widest mb-8 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#ffd700]" />
                        You survived the gauntlet!
                        <Sparkles className="w-4 h-4 text-[#ffd700]" />
                    </p>

                    {/* Main Score Panel */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative bg-gradient-to-br from-black to-gray-900 border-4 border-black p-5 text-center shadow-[6px_6px_0_#000] mb-6 overflow-hidden rounded-xl"
                    >
                        <div className="absolute inset-0 bg-halftone-white opacity-10" />
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-yellow-400/70 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                <Trophy className="w-3 h-3" /> FINAL SCORE
                            </div>
                            <div className="font-bangers text-6xl text-[#ffd700] text-stroke-black drop-shadow-[2px_2px_0_#000] leading-none">
                                {Math.floor(Number(score)).toLocaleString()}
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, x: -20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="relative bg-gradient-to-br from-[#00e5ff] to-[#0091ea] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">DISTANCE</div>
                                <div className="font-bangers text-2xl leading-none">{Math.floor(Number(distance))}m</div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, x: 20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 }}
                            className="relative bg-gradient-to-br from-[#76ff03] to-[#00c853] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">GENES</div>
                                <div className="font-bangers text-2xl leading-none">{Number(genesCollected)}</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-3">
                        <ComicButton
                            onClick={() => restartGame()}
                            variant="gold"
                            size="lg"
                            animated
                            glow
                            className="w-full text-3xl h-20"
                        >
                            <RotateCcw className="w-6 h-6" /> ONE MORE!
                        </ComicButton>

                        <ComicButton
                            onClick={() => resetGame()}
                            variant="ghost"
                            size="md"
                            className="w-full border-black/50 text-black/70 hover:bg-black/5 hover:text-black"
                        >
                            <Home className="w-5 h-5" /> EXIT MENU
                        </ComicButton>
                    </div>

                    {/* Decorative bits */}
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 12 }}
                        transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                        className="absolute top-20 -right-4 bg-gradient-to-r from-[#76ff03] to-[#00c853] border-4 border-black px-3 py-2 font-bangers text-xl rotate-12 shadow-[6px_6px_0_#000] z-20"
                    >
                        ALIVE!
                    </motion.div>
                    
                    <motion.div
                        initial={{ scale: 0, rotate: 20 }}
                        animate={{ scale: 1, rotate: -8 }}
                        transition={{ delay: 0.55, type: 'spring', bounce: 0.5 }}
                        className="absolute top-24 -left-5 bg-[#ffd700] border-4 border-black px-2 py-1 font-bangers text-lg rotate-[-8deg] shadow-[4px_4px_0_#000] z-20"
                    >
                        ⭐⭐⭐
                    </motion.div>
                </ComicPanel>
            </motion.div>
        </div>
    );
};
