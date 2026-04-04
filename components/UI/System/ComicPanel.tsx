/**
 * ComicPanel - Base component for all HUD panels
 * Implements standard comic book styling:
 * - Thick black borders
 * - Hard shadows
 * - Optional rotation/skew
 * - Varied background styles
 */

import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ComicPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'yellow' | 'white' | 'red' | 'purple' | 'green';
    rotation?: 'none' | 'left' | 'right';
    padding?: 'sm' | 'md' | 'lg' | 'none';
    hasShine?: boolean;
    hasHalftone?: boolean;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({
    children,
    className,
    variant = 'white',
    rotation = 'none',
    padding = 'md',
    hasShine = true,
    hasHalftone = false,
    ...props
}) => {
    const baseStyles = "relative border-4 border-black rounded-xl shadow-comic overflow-hidden transition-transform";

    // Variant colors
    const variants = {
        yellow: "bg-[#FFEB3B]",
        white: "bg-white",
        red: "bg-[#FF4444]",
        purple: "bg-[#9933FF] text-white",
        green: "bg-[#00FF7F]",
    };

    // Rotation styles
    const rotations = {
        none: "",
        left: "-rotate-2 hover:rotate-0",
        right: "rotate-2 hover:rotate-0",
    };

    // Padding settings
    const paddings = {
        none: "",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
    };

    return (
        <div
            className={twMerge(
                baseStyles,
                variants[variant],
                rotations[rotation],
                paddings[padding],
                className
            )}
            {...props}
        >
            {/* Halftone Overlay */}
            {hasHalftone && (
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,#000_1px,transparent_1px)] bg-[length:4px_4px]" />
                </div>
            )}

            {/* Shine Effect (Glassy look) */}
            {hasShine && (
                <div className="absolute top-0 right-0 w-16 h-full bg-white opacity-40 skew-x-[-25deg] translate-x-8 pointer-events-none" />
            )}

            {/* Content Container (relative to stay above backgrounds) */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
