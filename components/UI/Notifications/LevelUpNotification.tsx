/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store';

export const LevelUpNotification: React.FC = () => {
    const level = useStore(state => state.level);
    const [show, setShow] = useState(false);
    const prevLevel = React.useRef(level);

    useEffect(() => {
        if (level > prevLevel.current) {
            // Schedule state update for next frame to avoid cascading renders
            requestAnimationFrame(() => {
                setShow(true);
            });
            const timer = setTimeout(() => setShow(false), 3000);
            prevLevel.current = level;
            return () => clearTimeout(timer);
        }
        prevLevel.current = level;
        return undefined;
    }, [level]);

    if (!show) return null;

    return (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <div className="flex flex-col items-center animate-bounce-subtle">
                <div className="text-6xl font-comic text-[#FFFF00] comic-text-stroke animate-pulse">
                    LEVEL UP!
                </div>
                <div className="text-4xl font-comic text-white comic-text-stroke mt-2">
                    {level}
                </div>
            </div>
        </div>
    );
};
