import React, { useState } from 'react';

// NOTE: Constants moved to constants/Onomatopoeia.ts to respect Fast Refresh rules
// import { OnomatopoeiaTags } from '../../constants/Onomatopoeia';

interface ComicPunchProps {
    text: string;
    className?: string;
    color?: string;
    bgColor?: string;
}

export const ComicPunch: React.FC<ComicPunchProps> = ({
    text,
    className = "",
    color = "white",
    bgColor = "#FF4444"
}) => {
    // Compute rotation once on mount - useState initializer only runs once
    const [rotation] = useState(() => (Math.random() - 0.5) * 10); // -5 to +5

    return (
        <div className={`relative inline-block ${className} font-comic animate-comic-pop`}>
            {/* Radial Rays Background */}
            <div className="comic-rays group-hover:opacity-50 transition-opacity" />

            <div
                className="relative px-4 py-2 text-2xl comic-border comic-shadow-sm comic-burst halftone-bg flex items-center justify-center min-w-[120px]"
                style={{
                    backgroundColor: bgColor,
                    color: color,
                    WebkitTextStroke: '1.5px black',
                    textShadow: '2px 2px 0px #000',
                    transform: `rotate(${rotation}deg)`,
                }}
            >
                {text}
            </div>
        </div>
    );
};
