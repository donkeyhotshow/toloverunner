/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

interface StickerProps {
    text: string;
    color: string;
    rotation: number;
    delay: number;
    position: { x: string; y: string };
}

const Sticker: React.FC<StickerProps> = ({ text, color, rotation, delay, position }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.6],
            y: [0, -20, 0]
        }}
        transition={{
            duration: 0.8,
            delay,
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="absolute pointer-events-none select-none z-0"
        style={{ left: position.x, top: position.y }}
    >
        <div
            className="font-bangers text-4xl px-3 py-1 border-[4px] border-black shadow-[4px_4px_0_#000]"
            style={{
                backgroundColor: color,
                transform: `rotate(${rotation}deg)`,
                textShadow: '2px 2px 0 #000'
            }}
        >
            {text}
        </div>
    </motion.div>
);

export const FloatingStickers: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Sticker text="ZAP!" color="#76ff03" rotation={-15} delay={1.0} position={{ x: '10%', y: '15%' }} />
            <Sticker text="POW!" color="#ff1744" rotation={10} delay={1.5} position={{ x: '80%', y: '20%' }} />
            <Sticker text="BAM!" color="#00e5ff" rotation={-5} delay={2.0} position={{ x: '5%', y: '70%' }} />
            <Sticker text="GO!" color="#ffd700" rotation={20} delay={2.5} position={{ x: '85%', y: '80%' }} />
        </div>
    );
};
