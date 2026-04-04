/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Popup {
    id: number;
    text: string;
    style: React.CSSProperties;
}

export const LobbyPopups: React.FC = () => {
    const [popups, setPopups] = useState<Popup[]>([]);

    useEffect(() => {
        const texts = ["ZAP!", "POW!", "BAM!", "BOOM!", "YAY!", "GO!", "COOL!"];
        const colors = ["#ff1744", "#00e5ff", "#76ff03", "#ffd700", "#ffea00"];

        const interval = setInterval(() => {
            const id = Date.now();
            const text: string = texts[Math.floor(Math.random() * texts.length)]!;
            const color = colors[Math.floor(Math.random() * colors.length)]!;

            const newPopup: Popup = {
                id,
                text,
                style: {
                    left: `${10 + Math.random() * 80}%`,
                    top: `${10 + Math.random() * 80}%`,
                    backgroundColor: color,
                    transform: `rotate(${(Math.random() - 0.5) * 40}deg)`,
                }
            };

            setPopups(prev => [...prev.slice(-4), newPopup]);

            setTimeout(() => {
                setPopups(prev => prev.filter(p => p.id !== id));
            }, 2000);

        }, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <AnimatePresence>
                {popups.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute px-4 py-2 border-[4px] border-black shadow-[6px_6px_0_#000] font-bangers text-3xl text-black z-0"
                        style={p.style}
                    >
                        {p.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
