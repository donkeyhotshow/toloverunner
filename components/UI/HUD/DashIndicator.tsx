import React, { useEffect, useRef } from 'react';
import { useStore } from '../../../store';
import { GameStatus } from '../../../types';

export const DashIndicator: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const statusRef = useRef<GameStatus>(GameStatus.MENU);

    useEffect(() => {
        const unsubscribe = useStore.subscribe((state) => {
            const { dashCooldown, status } = state;

            // Handle visibility based on status
            if (statusRef.current !== status) {
                statusRef.current = status;
                if (containerRef.current) {
                    containerRef.current.style.display = status === GameStatus.PLAYING ? 'flex' : 'none';
                }
            }

            if (status !== GameStatus.PLAYING) return;

            const isReady = dashCooldown <= 0;

            if (containerRef.current) {
                containerRef.current.style.background = isReady
                    ? 'linear-gradient(135deg, #00ff00, #00cc00)' // 🎨 Градиент вместо простого цвета
                    : 'linear-gradient(135deg, #666, #444)';
                containerRef.current.style.opacity = isReady ? '1' : '0.5';
                containerRef.current.style.cursor = isReady ? 'pointer' : 'not-allowed';
                containerRef.current.style.boxShadow = isReady
                    ? '0 0 20px #00ff00, 0 0 40px #00ff00' // 🔥 Двойное свечение
                    : 'none';
            }

            if (textRef.current) {
                textRef.current.innerText = isReady ? '💨' : dashCooldown.toFixed(1);
            }
        });

        return unsubscribe;
    }, []);

    const handleDash = () => {
        const state = useStore.getState();
        if (state.dashCooldown <= 0) {
            state.dash();
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleDash}
            className="absolute bottom-6 left-6 pointer-events-auto z-[70] hover:scale-110 active:scale-95"
            style={{
                width: '70px',
                height: '70px',
                borderRadius: '16px', // 🟦 Square with rounded corners
                border: '4px solid #000000', // Comic outline
                display: 'none',
                background: '#29B6F6', // 🟦 Light Blue (Cartoon style)
                boxShadow: '4px 4px 0px #000000', // Comic shadow
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
        >
            {/* 🙂 Face Icon on Button */}
            <div className="relative w-full h-full">
                <span ref={textRef} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-white drop-shadow-md">
                    💨
                </span>
                {/* Cartoon Face Overlay */}
                <div className="absolute top-3 left-3 w-3 h-4 bg-black rounded-full"></div> {/* Eye L */}
                <div className="absolute top-3 right-3 w-3 h-4 bg-black rounded-full"></div> {/* Eye R */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black rounded-full"></div> {/* Mouth */}
            </div>
        </div>
    );
};
