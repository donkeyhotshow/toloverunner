import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store';
import { Shield } from 'lucide-react';
import { UI_LAYERS } from '../../../constants';

export const ShieldTimer: React.FC = () => {
    const shieldActive = useStore(s => s.shieldActive);
    const shieldTimer = useStore(s => s.shieldTimer);
    const [isLow, setIsLow] = useState(false);

    useEffect(() => {
        setIsLow(shieldTimer < 3);
    }, [shieldTimer]);

    if (!shieldActive) return null;

    // Calculate fill percentage
    const maxShieldTime = 10;
    const percentage = (shieldTimer / maxShieldTime) * 100;

    return (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-auto" style={{ zIndex: UI_LAYERS.OVERLAY }}>
            <div className={`
                relative w-20 h-20 
                flex items-center justify-center 
                bg-[#00FFFF] 
                rounded-full 
                border-6 border-black 
                shadow-comic
                transition-transform duration-100
                ${isLow ? 'animate-pulse' : 'hover:scale-110'}
            `}>
                {/* Progress Ring Background */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none rounded-full" viewBox="0 0 100 100">
                    <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth="12"
                    />
                    <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#FF1493"
                        strokeWidth="12"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-300 ease-linear"
                    />
                </svg>

                {/* Shield Icon */}
                <div className="z-10 bg-white p-2 rounded-full border-4 border-black border-dashed animate-spin-slow">
                    <Shield className="w-6 h-6 text-black fill-current" />
                </div>

                {/* Time Badge */}
                <div className="absolute -bottom-2 bg-black text-white px-2 py-0.5 text-xs font-black rounded-lg border-2 border-white transform rotate-3">
                    {Math.ceil(shieldTimer)}s
                </div>
            </div>
        </div>
    );
};
