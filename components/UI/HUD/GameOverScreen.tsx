import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Home } from 'lucide-react';
import { useStore } from '../../../store';
import { UI_LAYERS } from '../../../constants';
import { ComicPanel } from '../common/ComicPanel';
import { ComicButton } from '../common/ComicButton';

export const GameOverScreen: React.FC = () => {
    const restartGame = useStore(s => s.restartGame);
    const resetGame = useStore(s => s.resetGame);
    const distance = useStore(s => (typeof s.distance === 'number' ? s.distance : 0));
    const score = useStore(s => (typeof s.score === 'number' ? s.score : 0));
    const genesCollected = useStore(s => (typeof s.genesCollected === 'number' ? s.genesCollected : 0));
    const maxCombo = useStore(s => (typeof s.maxCombo === 'number' ? s.maxCombo : 0));
    const stats = useStore(s => s.stats);
    const endGameSession = useStore(s => s.endGameSession);
    const gems = useStore(s => (typeof s.gems === 'number' ? s.gems : 0));
    const revive = useStore(s => s.revive);

    // Обчислюємо під час рендеру
    const isNewBestScore = React.useMemo(() => {
        const best = typeof stats?.bestScore === 'number' ? stats.bestScore : 0;
        return Number(score) > best;
    }, [score, stats?.bestScore]);

    // Record the session exactly once when the game-over screen appears.
    // Previously this was guarded by `if (isNewBestScore)`, so gamesPlayed was
    // never incremented for non-record runs. Now we always record; endGameSession
    // uses Math.max so bestScore is only updated when the new score exceeds it.
    // hasRecordedRef prevents double-firing in React StrictMode and when
    // `score` / `endGameSession` identity changes after mount.
    const hasRecordedRef = React.useRef(false);
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
                background: 'linear-gradient(180deg, rgba(255,23,68,0.2) 0%, rgba(0,0,0,0.9) 100%)',
            }}
        >
            {/* Background patterns */}
            <div className="absolute inset-0 bg-halftone opacity-30 pointer-events-none" />
            
            {/* Danger stripes */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 20px)'
                }}
            />

            <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: 10 }}
                animate={{ scale: 1, opacity: 1, rotate: -2 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                className="relative z-10 w-full max-w-sm"
            >
                <ComicPanel variant="gradient" className="p-8 overflow-visible">
                    {/* Comic shine */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/10 via-transparent to-black/20 pointer-events-none rounded-[inherit]" />
                    
                    {/* Skull decoration sticker */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: -15 }}
                        transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                        className="absolute -top-12 -left-10 w-28 h-28 bg-gradient-to-br from-[#ff1744] to-[#c51162] border-4 border-black shadow-[6px_6px_0_#000] rotate-[-15deg] flex items-center justify-center rounded-full z-20"
                    >
                        <span className="text-6xl relative z-10">💀</span>
                    </motion.div>

                    <h1 className="text-center font-bangers text-7xl text-stroke-black text-[#ff1744] mb-2 transform -rotate-1 drop-shadow-[6px_6px_0_#000] relative z-10">
                        WASTED!
                    </h1>
                    
                    {/* Subtitle */}
                    <p className="text-center font-black text-xs uppercase tracking-[0.3em] text-black/40 mb-6">Game Over</p>

                    {isNewBestScore && (
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 3 }}
                            className="bg-gradient-to-r from-[#ffd700] to-[#ff8f00] border-4 border-black p-3 text-center rotate-3 mb-6 shadow-[6px_6px_0_#000] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <span className="relative z-10 text-2xl font-black font-bangers text-black flex items-center justify-center gap-2">
                                🏆 NEW RECORD!
                            </span>
                        </motion.div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="relative bg-gradient-to-br from-[#00e5ff] to-[#0091ea] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">SCORE</div>
                                <div className="font-bangers text-3xl leading-none">{Math.floor(Number(score)).toLocaleString()}</div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="relative bg-gradient-to-br from-[#ffd700] to-[#ff8f00] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">DISTANCE</div>
                                <div className="font-bangers text-3xl leading-none">{Math.floor(Number(distance))}m</div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="relative bg-gradient-to-br from-[#76ff03] to-[#00c853] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">GENES</div>
                                <div className="font-bangers text-3xl leading-none">{Number(genesCollected)}</div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.45 }}
                            className="relative bg-gradient-to-br from-[#ff4081] to-[#c51162] border-4 border-black p-3 text-center shadow-[4px_4px_0_#000] text-white overflow-hidden rounded-xl"
                        >
                            <div className="absolute inset-0 bg-halftone-white opacity-10" />
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">COMBO</div>
                                <div className="font-bangers text-3xl leading-none">{Number(maxCombo)}</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-4">
                        {gems > 0 && (
                            <ComicButton
                                onClick={() => revive()}
                                variant="gold"
                                size="lg"
                                animated
                                className="w-full text-2xl"
                            >
                                REVIVE (💎 1)
                            </ComicButton>
                        )}

                        <ComicButton
                            onClick={() => restartGame()}
                            variant="danger"
                            size="lg"
                            animated
                            glow
                            className="w-full text-3xl py-6"
                        >
                            <RotateCcw className="w-8 h-8" /> TRY AGAIN
                        </ComicButton>

                        <ComicButton
                            onClick={() => resetGame()}
                            variant="ghost"
                            size="md"
                            className="w-full border-black/50 text-black/70 hover:bg-black/5 hover:text-black"
                        >
                            <Home className="w-5 h-5" /> MENU
                        </ComicButton>
                    </div>
                </ComicPanel>
            </motion.div>
        </div>
    );
};
