import React from 'react';
import { Play, Home } from 'lucide-react';
import { useStore } from '../../../store';
import { GameStatus } from '../../../types';
import { motion } from 'framer-motion';
import { UI_LAYERS } from '../../../constants';
import { ComicPanel } from '../common/ComicPanel';
import { ComicButton } from '../common/ComicButton';
import { FloatingStickers } from '../common/FloatingStickers';

export const PauseScreen: React.FC = () => {
    const setStatus = useStore(s => s.setStatus);
    const resetGame = useStore(s => s.resetGame);

    const handleResume = () => setStatus(GameStatus.PLAYING);
    const handleMenu = () => resetGame();

    return (
        <>
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none">
                <FloatingStickers />
            </div>
            
            <div
                className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto select-none"
                style={{
                    zIndex: UI_LAYERS.MODAL_CONTENT,
                    background: 'linear-gradient(135deg, rgba(255,0,255,0.15) 0%, rgba(0,0,0,0.7) 100%)',
                }}
            >
                {/* Halftone background overlay */}
                <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none" />

                {/* Decorative grid */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '32px 32px'
                    }}
                />

                <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, opacity: 1, rotate: 2 }}
                    transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
                    className="relative z-10 w-full max-w-xs"
                >
                    <ComicPanel variant="gradient" glow className="p-8 flex flex-col items-center overflow-visible">
                        {/* Comic shine effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-[inherit]" />
                        
                        {/* Pause icon/Sticker */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
                            className="w-20 h-20 bg-[#ffd700] border-4 border-black shadow-[6px_6px_0_#000] rotate-[-12deg] flex items-center justify-center rounded-2xl mb-4 -mt-14 relative z-10"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10 rounded-[inherit]" />
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="black">
                                <rect x="5" y="4" width="5" height="16" rx="1" />
                                <rect x="14" y="4" width="5" height="16" rx="1" />
                            </svg>
                        </motion.div>

                        <h2 className="font-bangers text-6xl text-stroke-black text-[#ff1744] mb-2 transform -rotate-1 relative z-10">
                            PAUSED!
                        </h2>
                        
                        {/* Decorative subtitle */}
                        <p className="font-black text-xs uppercase tracking-[0.3em] text-black/40 mb-8">Take a breath</p>

                        <div className="w-full space-y-4">
                            <ComicButton
                                onClick={handleResume}
                                variant="primary"
                                size="lg"
                                glow
                                animated
                                className="w-full"
                            >
                                <Play className="w-6 h-6 fill-current" /> RESUME
                            </ComicButton>

                            <ComicButton
                                onClick={handleMenu}
                                variant="ghost"
                                size="md"
                                className="w-full border-black/50 text-black/70 hover:bg-black/5 hover:text-black"
                            >
                                <Home className="w-5 h-5" /> EXIT MENU
                            </ComicButton>
                        </div>

                        {/* Decorative pop-art stickers */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
                            className="absolute -bottom-4 -right-4 bg-[#00e5ff] border-4 border-black px-4 py-2 font-bangers text-xl rotate-12 shadow-[6px_6px_0_#000] z-20"
                        >
                            AFK?
                        </motion.div>
                        
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                            className="absolute -top-3 -left-4 bg-[#76ff03] border-4 border-black px-3 py-1 font-bangers text-lg rotate-[-8deg] shadow-[4px_4px_0_#000] z-20"
                        >
                            💤
                        </motion.div>
                    </ComicPanel>
                </motion.div>
            </div>
        </>
    );
};
