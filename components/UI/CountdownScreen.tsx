/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CountdownScreen - "3-2-1-GO!" sequence before game starts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_LAYERS } from '../../constants';

interface CountdownScreenProps {
    onComplete: () => void;
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({ onComplete }) => {
    const [count, setCount] = useState(3);
    const [showGo, setShowGo] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCount(prev => {
                if (prev <= 0) return 0;
                if (prev === 1) {
                    setShowGo(true);
                    setTimeout(() => {
                        onComplete();
                    }, 800); // Show "GO!" for 0.8s
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none font-comic overflow-hidden" style={{ zIndex: UI_LAYERS.MODAL }}>
            <div className="absolute inset-0 bg-ben-day opacity-25 pointer-events-none" />
            <AnimatePresence mode="wait">
                {count > 0 && (
                    <motion.div
                        key={count}
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 2, rotate: 180, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                            duration: 0.6
                        }}
                        className="text-white comic-text-stroke-lg drop-shadow-2xl"
                        style={{
                            fontSize: 'min(20rem, 40vw)',
                            textShadow: '8px 8px 0px #000, -8px -8px 0px #000, 8px -8px 0px #000, -8px 8px 0px #000'
                        }}
                    >
                        {count}
                    </motion.div>
                )}

                {showGo && (
                    <motion.div
                        key="go"
                        initial={{ scale: 0, y: 100, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.5, y: -100, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15
                        }}
                        className="text-[#44FF44] comic-text-stroke-lg drop-shadow-2xl transform -rotate-3"
                        style={{
                            fontSize: 'min(15rem, 30vw)',
                            textShadow: '8px 8px 0px #000, -8px -8px 0px #000, 8px -8px 0px #000, -8px 8px 0px #000'
                        }}
                    >
                        GO!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Decorative elements */}
            <div className="absolute top-20 left-20 text-8xl animate-spin-slow">⚡</div>
            <div className="absolute bottom-20 right-20 text-8xl animate-bounce">💥</div>
            <div className="absolute top-20 right-20 text-6xl animate-pulse">🔥</div>
            <div className="absolute bottom-20 left-20 text-6xl animate-ping">💨</div>
        </div>
    );
};