/**
 * ComicText - Standardized typography for Comic UI
 */

import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ComicTextProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'title' | 'value' | 'label' | 'impact';
    outline?: 'none' | 'sm' | 'md' | 'lg';
    color?: 'black' | 'white' | 'yellow' | 'red';
}

export const ComicText: React.FC<ComicTextProps> = ({
    children,
    className,
    variant = 'value',
    outline = 'none',
    color = 'black',
    ...props
}) => {

    const variants = {
        title: "font-comic font-bold text-xl uppercase tracking-widest opacity-80",
        value: "font-comic font-black text-4xl leading-none",
        label: "font-comic font-bold text-sm",
        impact: "font-comic font-black text-6xl italic",
    };

    const outlines = {
        none: "",
        sm: "drop-shadow-[1px_1px_0px_#000]",
        md: "drop-shadow-[2px_2px_0px_#000]",
        lg: "drop-shadow-[3px_3px_0px_#000]", // Web stroke alternative
    };

    const colors = {
        black: "text-black",
        white: "text-white",
        yellow: "text-[#FFFF00]",
        red: "text-[#FF4444]",
    };

    // Custom text stroke for heavier needs (optional CSS class helper could be better, but inline works for now)
    const strokeStyle = outline === 'lg' ? {
        textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000'
    } : {};

    return (
        <div
            className={twMerge(variants[variant], outlines[outline], colors[color], className)}
            style={outline === 'lg' ? strokeStyle : undefined}
            {...props}
        >
            {children}
        </div>
    );
};
