import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type MotionButtonBaseProps = React.ComponentProps<typeof motion.button>;

interface ComicButtonProps extends Omit<MotionButtonBaseProps, 'whileHover' | 'whileTap' | 'style' | 'children'> {
    style?: React.CSSProperties;
    variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'gold' | 'success';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    icon?: React.ReactNode;
    children?: React.ReactNode;
    isActive?: boolean;
    glow?: boolean;
    animated?: boolean;
}

export const ComicButton: React.FC<ComicButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    icon,
    isActive,
    animated = false,
    glow = false,
    ...props
}) => {
    const baseStyles = 'relative font-bangers uppercase tracking-wider border-black transition-all duration-100 ease-out flex items-center justify-center gap-2 select-none rounded-xl overflow-hidden';

    const variants = {
        primary: 'bg-gradient-to-br from-[#76ff03] to-[#55cc00] text-black shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:-rotate-1 hover:shadow-[8px_8px_0_#000] border-4',
        secondary: 'bg-gradient-to-br from-[#00e5ff] to-[#00b0ff] text-black shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:-rotate-1 hover:shadow-[8px_8px_0_#000] border-4',
        accent: 'bg-gradient-to-br from-[#ffeb3b] to-[#fdd835] text-black shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:-rotate-1 hover:shadow-[8px_8px_0_#000] border-4',
        danger: 'bg-gradient-to-br from-[#ff1744] to-[#c51162] text-white shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:-rotate-1 hover:shadow-[8px_8px_0_#000] border-4',
        ghost: 'bg-transparent border-2 border-white/30 shadow-none hover:bg-white/10 text-white hover:scale-105',
        gold: 'bg-gradient-to-br from-[#ffd700] to-[#ff8f00] text-black shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] border-4',
        success: 'bg-gradient-to-br from-[#69f0ae] to-[#00c853] text-black shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] border-4',
        active: 'bg-gradient-to-br from-[#44FF44] to-[#22AA22] text-black shadow-[4px_4px_0_#000] translate-x-[2px] translate-y-[2px] border-4'
    };

    const sizes = {
        sm: 'h-10 px-4 text-sm border-2 shadow-comic-sm',
        md: 'h-14 px-6 text-xl border-3',
        lg: 'h-20 px-8 text-2xl border-4',
        xl: 'h-24 px-10 text-4xl border-6'
    };

    // Override variant if active
    const appliedVariant = isActive ? variants.active : variants[variant];

    // Adjust shadow for specific sizes if needed
    const appliedSize = sizes[size];

    const baseClassName = cn(baseStyles, appliedVariant, appliedSize, className, glow && 'animate-glow-pulse');
    const content = (
        <>
            <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none" />
            <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
            {icon && <span className="mr-1 relative z-10">{icon}</span>}
            <span className={cn('drop-shadow-sm relative z-10', variant === 'primary' && 'text-shadow-white')}>{children}</span>
        </>
    );

    if (animated) {
        return (
            <motion.button
                className={baseClassName}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                {...(props as MotionButtonBaseProps)}
                style={props.style as React.CSSProperties | undefined}
            >
                {content}
            </motion.button>
        );
    }

    return (
        <button
            className={baseClassName}
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
            {content}
        </button>
    );
};
