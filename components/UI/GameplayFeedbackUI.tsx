/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStore } from '../../store';
import { Zap, Magnet, Shield, FastForward } from 'lucide-react';
import { UI_LAYERS } from '../../constants';
import { ComicButton } from './common/ComicButton';
import { useResponsive } from '../../hooks/useResponsive';

export const GameplayFeedbackUI: React.FC = () => {
    const dash = useStore(s => s.dash);
    const dashCooldown = useStore(s => s.dashCooldown);

    const shieldActive = useStore(s => s.shieldActive);
    const shieldTimer = useStore(s => s.shieldTimer);

    const magnetActive = useStore(s => s.magnetActive);
    const magnetTimer = useStore(s => s.magnetTimer);

    const speedBoostActive = useStore(s => s.speedBoostActive);
    const speedBoostTimer = useStore(s => s.speedBoostTimer);

    const { isMobile } = useResponsive();
    const topClass = isMobile ? 'top-24' : 'top-36';
    const leftClass = isMobile ? 'left-2' : 'left-4';

    return (
        <div className={`absolute ${topClass} ${leftClass} flex flex-col items-start gap-6 pointer-events-none`} style={{ zIndex: UI_LAYERS.OVERLAY }}>
            {/* Ability Buttons: только пауэр-апы; DASH — один раз в ComicLeftPanel (снизу слева), без дублирования */}
            {isMobile && (
                <div className="flex gap-6 pointer-events-auto">
                    <div className="relative transform -rotate-2 hover:rotate-0 transition-transform">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-[12px] text-black bg-[#ffd700] px-2 py-0.5 font-black border-[3px] border-black uppercase tracking-wider whitespace-nowrap shadow-[2px_2px_0_#000] rotate-[-2deg]">
                            DASH [S]
                        </div>
                        <ComicButton
                            variant="secondary"
                            size="lg"
                            className="w-24 h-24 flex-col gap-0 p-0 overflow-hidden border-4 shadow-[6px_6px_0_#000] bg-white group"
                            onClick={() => dash()}
                            disabled={dashCooldown > 0}
                        >
                            {dashCooldown > 0 && (
                                <div
                                    className="absolute inset-0 bg-black/50 z-10 transition-all ease-linear origin-bottom bg-halftone"
                                    style={{
                                        transform: `scaleY(${(dashCooldown / 3)})`,
                                        borderTop: '4px solid black'
                                    }}
                                />
                            )}
                            <Zap
                                size={48}
                                strokeWidth={3}
                                className={`relative z-0 transition-all ${dashCooldown <= 0 ? 'text-black fill-yellow-400 group-hover:scale-110' : 'text-gray-400 fill-gray-200'}`}
                            />
                        </ComicButton>
                    </div>
                </div>
            )}

            {/* Active Power-Ups Row */}
            <div className="flex flex-col gap-3">
                {shieldActive && (
                    <PowerUpIndicator
                        type="SHIELD"
                        timer={shieldTimer}
                        color="#2979ff" // Bright Blue
                        icon={<Shield size={24} color="white" fill="rgba(255,255,255,0.3)" strokeWidth={3} />}
                        rotation="2deg"
                    />
                )}
                {magnetActive && (
                    <PowerUpIndicator
                        type="MAGNET"
                        timer={magnetTimer}
                        color="#ff1744" // Bright Red
                        icon={<Magnet size={24} color="white" fill="rgba(255,255,255,0.3)" strokeWidth={3} />}
                        rotation="-1deg"
                    />
                )}
                {speedBoostActive && (
                    <PowerUpIndicator
                        type="SPEED"
                        timer={speedBoostTimer}
                        color="#ffea00" // Bright Yellow
                        icon={<FastForward size={24} color="black" fill="rgba(0,0,0,0.1)" strokeWidth={3} />}
                        rotation="3deg"
                    />
                )}
            </div>
        </div>
    );
};

const PowerUpIndicator: React.FC<{
    type: string;
    timer: number;
    color: string;
    icon: React.ReactNode;
    rotation: string;
}> = ({ timer, color, icon, rotation }) => {
    return (
        <div
            className="w-16 h-16 flex flex-col items-center justify-center font-comic border-[3px] border-black shadow-[4px_4px_0_#000] animate-bounce-in rounded-xl relative overflow-hidden"
            style={{
                backgroundColor: color,
                transform: `rotate(${rotation})`
            }}
        >
            {/* Timer Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <span className="text-4xl font-black">{Math.ceil(timer)}</span>
            </div>

            <div className="z-10 mb-1 drop-shadow-md transform scale-110">
                {icon}
            </div>

            <div className="bg-black/20 px-1.5 rounded text-[10px] font-bold text-white uppercase tracking-tight leading-none backdrop-blur-sm border border-black/10">
                {Math.ceil(timer)}s
            </div>
        </div>
    );
};
