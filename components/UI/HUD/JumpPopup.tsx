import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store';
import { GameStatus } from '../../../types';
import { eventBus } from '../../../utils/eventBus';

export const JumpPopup: React.FC = () => {
    const [show, setShow] = useState(false);
    const status = useStore(s => s.status);

    useEffect(() => {
        const unsub = eventBus.on('player:jump', () => {
            if (status === GameStatus.PLAYING) {
                setShow(true);
                setTimeout(() => setShow(false), 800);
            }
        });
        return () => unsub();
    }, [status]);

    const zenMode = useStore(s => s.zenMode);

    if (!show || zenMode) return null;

    return (
        <>
            <div className="absolute left-[15%] top-[40%] pointer-events-none z-[75] animate-fly-fast font-bangers text-6xl text-comic-yellow text-stroke-thick drop-shadow-md">
                JUMP!
            </div>
            <div className="absolute right-[15%] top-[40%] pointer-events-none z-[75] animate-fly-fast font-bangers text-6xl text-comic-yellow text-stroke-thick drop-shadow-md">
                JUMP!
            </div>
        </>
    );
};
