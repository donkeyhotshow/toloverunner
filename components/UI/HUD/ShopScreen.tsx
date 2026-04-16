import React from 'react';
import { useStore } from '../../../store';
import { GameStatus } from '../../../types';
import { motion } from 'framer-motion';
import { ComicPanel } from '../common/ComicPanel';
import { ComicButton } from '../common/ComicButton';
import { X, ShoppingBag, Sparkles, Star } from 'lucide-react';
import { UI_LAYERS } from '../../../constants';

export const ShopScreen: React.FC = () => {
    const setStatus = useStore(s => s.setStatus);
    const gems = useStore(s => (typeof s.gems === 'number' ? s.gems : 0));

    return (
        <div
            className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto select-none"
            style={{ 
                zIndex: UI_LAYERS.MODAL_CONTENT,
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(0,0,0,0.8) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
        >
            {/* Background overlays */}
            <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none" />
            
            {/* Animated grid pattern */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-5 animate-pulse"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
                className="relative z-10 w-full max-w-md"
            >
                <ComicPanel variant="gradient" className="p-10 flex flex-col items-center justify-center overflow-visible">
                    {/* Comic shine */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none rounded-[inherit]" />
                    
                    {/* Header Sticker */}
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: -2 }}
                        transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#ffd700] to-[#ff8f00] border-4 border-black px-8 py-3 shadow-[8px_8px_0_#000] rotate-[-2deg] z-20"
                    >
                        <h2 className="font-bangers text-4xl text-black text-stroke-white-sm flex items-center gap-2">
                            <Sparkles className="w-6 h-6" />
                            BIOME SHOP
                            <Sparkles className="w-6 h-6" />
                        </h2>
                    </motion.div>

                    {/* Gem Counter sticker */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
                        className="absolute top-4 right-4 bg-white border-[3px] border-black px-5 py-2 shadow-[6px_6px_0_#000] rotate-[5deg] flex items-center gap-2 z-20"
                    >
                        <Star className="w-5 h-5 text-[#ffd700] fill-[#ffd700]" />
                        <span className="font-bangers text-3xl text-black leading-none">{Number(gems)}</span>
                    </motion.div>

                    <div className="flex flex-col items-center gap-8 text-center mt-8">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="w-32 h-32 bg-gradient-to-br from-[#00e5ff] to-[#0091ea] border-4 border-black shadow-[8px_8px_0_#000] flex items-center justify-center rounded-3xl rotate-3 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-halftone opacity-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
                            <ShoppingBag size={64} className="text-black relative z-10" />
                        </motion.div>

                        <div>
                            <p className="font-bangers text-5xl text-black mb-3 relative">
                                UNDER CONSTRUCTION!
                                <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="absolute -right-8 top-0 text-2xl"
                                >
                                    ✏️
                                </motion.span>
                            </p>
                            <p className="font-black text-xs font-ui text-black/40 uppercase tracking-[0.3em]">New Bio-Skins Incoming</p>
                        </div>

                        {/* Decorative badges */}
                        <div className="flex gap-3">
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, delay: 0 }}
                                className="w-12 h-12 bg-[#76ff03] border-3 border-black shadow-[4px_4px_0_#000] rounded-xl flex items-center justify-center"
                            >
                                <span className="text-2xl">🧬</span>
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                className="w-12 h-12 bg-[#ff1744] border-3 border-black shadow-[4px_4px_0_#000] rounded-xl flex items-center justify-center"
                            >
                                <span className="text-2xl">🦠</span>
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                                className="w-12 h-12 bg-[#ffd700] border-3 border-black shadow-[4px_4px_0_#000] rounded-xl flex items-center justify-center"
                            >
                                <span className="text-2xl">💎</span>
                            </motion.div>
                        </div>

                        <ComicButton
                            onClick={() => setStatus(GameStatus.MENU)}
                            variant="secondary"
                            size="lg"
                            animated
                            glow
                            className="w-full mt-2 text-2xl h-16 shadow-[6px_6px_0_#000]"
                        >
                            <X className="w-6 h-6" /> BACK TO MENU
                        </ComicButton>
                    </div>

                    {/* Decorative Pop-Art sticker */}
                    <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: -12 }}
                        transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                        className="absolute -bottom-5 -left-6 bg-gradient-to-r from-[#ff1744] to-[#ff5c8d] border-4 border-black px-5 py-2 font-bangers text-2xl rotate-[-12deg] shadow-[6px_6px_0_#000] text-white z-20"
                    >
                        SOON!
                    </motion.div>
                </ComicPanel>
            </motion.div>
        </div>
    );
};
