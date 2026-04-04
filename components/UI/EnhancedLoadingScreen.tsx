import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface EnhancedLoadingScreenProps {
    onComplete?: () => void;
}

export const EnhancedLoadingScreen: React.FC<EnhancedLoadingScreenProps> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing Systems...');
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const loadingStages = [
            { progress: 20, text: 'Inking Outlines...' },
            { progress: 40, text: 'Adding Colors...' },
            { progress: 60, text: 'Drawing Speed Limits...' },
            { progress: 80, text: 'Insert "POW" Effects...' },
            { progress: 100, text: 'COMIC READY!' }
        ];

        let stageIndex = 0;
        const interval = setInterval(() => {
            if (stageIndex < loadingStages.length) {
                const stage = loadingStages[stageIndex];
                if (stage) {
                    setProgress(stage.progress);
                    setLoadingText(stage.text);
                }
                stageIndex++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setVisible(false);
                    onComplete?.();
                }, 500);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a]"
                >
                    {/* Background DNA Helix Effect */}
                    <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-white/10 rounded-full"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-12 max-w-md w-full px-8">
                        {/* Logo */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center"
                        >
<h1 className="text-6xl font-black text-white tracking-tighter mb-2 font-comic comic-text-stroke transform -rotate-2">
                                 ToLOVE Runner V2
                             </h1>
                            <div className="w-12 h-1 bg-[#44FF44] rounded-full mx-auto" />
                        </motion.div>

                        {/* Central Icon - Comic Style */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="relative"
                        >
                            <div className="w-32 h-32 flex items-center justify-center">
                                {/* Comic Burst Background */}
                                <div className="absolute inset-0 bg-[#FFD700] border-4 border-black comic-burst shadow-[5px_5px_0px_rgba(0,0,0,0.5)]"></div>
                                <Zap className="w-16 h-16 text-black relative z-10 fill-black" />
                            </div>
                        </motion.div>

                        {/* Progress Section */}
                        <div className="w-full space-y-6">
                            <div className="flex justify-between items-end px-1">
                                <motion.p
                                    key={loadingText}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]"
                                >
                                    {loadingText}
                                </motion.p>
                                <span className="text-teal-400 text-xs font-black font-mono">{progress}%</span>
                            </div>

                            <div className="relative h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="h-full bg-teal-400 relative"
                                >
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                    />
                                </motion.div>
                            </div>
                        </div>

                        {/* Biological Fact */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="text-center max-w-xs"
                        >
                            <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                                System Status: Optimal<br />
                                Environment: Biological Channel 01
                            </p>
                        </motion.div>
                    </div>

                    <div className="absolute bottom-8 text-gray-800 text-[10px] font-black tracking-[0.5em] uppercase">
                        v2.4.0
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
