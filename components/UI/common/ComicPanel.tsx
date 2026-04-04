import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type MotionDivBaseProps = React.ComponentProps<typeof motion.div>;

interface ComicPanelProps extends Omit<MotionDivBaseProps, 'initial' | 'animate' | 'transition' | 'children' | 'style'> {
    style?: React.CSSProperties;
    variant?: 'light' | 'dark' | 'glass' | 'neon' | 'gradient';
    tilted?: boolean;
    glow?: boolean;
    animated?: boolean;
    children?: React.ReactNode;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({
    children,
    className,
    variant = 'light',
    tilted = false,
    glow = false,
    animated = false,
    ...props
}) => {
    const baseStyles = 'relative border-black rounded-3xl transition-all';

    const variants = {
        light: 'bg-white border-4 border-black shadow-comic',
        dark: 'bg-black/90 border-4 border-white/30 text-white shadow-comic backdrop-blur-md',
        glass: 'bg-white/15 border-4 border-black backdrop-blur-lg shadow-comic',
        neon: 'bg-black border-4 border-[#ff00ff] shadow-[0_0_20px_rgba(255,0,255,0.5),4px_4px_0_#000]',
        gradient: 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-4 border-black shadow-comic'
    };

    const tiltStyle = tilted ? 'transform -rotate-1 hover:rotate-0 transition-transform duration-300' : '';
    const glowStyle = glow ? 'animate-pulse shadow-[0_0_30px_rgba(255,215,0,0.6),4px_4px_0_#000]' : '';

    const baseClassName = cn(baseStyles, variants[variant], tiltStyle, glowStyle, className);
    const content = (
        <>
            <div className="absolute inset-0 bg-halftone opacity-[0.08] pointer-events-none rounded-[inherit]" />
            <div className="absolute inset-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] pointer-events-none rounded-[inherit]" />
            {children}
        </>
    );

    if (animated) {
        return (
            <motion.div
                className={baseClassName}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                {...(props as MotionDivBaseProps)}
                style={props.style as React.CSSProperties | undefined}
            >
                {content}
            </motion.div>
        );
    }

    return (
        <div
            className={baseClassName}
            {...(props as React.HTMLAttributes<HTMLDivElement>)}
        >
            {content}
        </div>
    );
};
