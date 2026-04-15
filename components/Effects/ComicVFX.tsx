/**
 * ComicVFX - Система комиксных визуальных эффектов
 * 
 * Особенности:
 * - "POW!", "BAM!", "BOOM!" текстовые эффекты
 * - Звездочки и молнии при столкновениях
 * - Соответствует Comic Book стилю UI
 *
 * Performance note: effect age is computed at render time from a stable
 * `createdAt` timestamp — no setInterval polling needed.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { UI_LAYERS } from '../../constants';
import { eventBus } from '../../utils/eventBus';

interface ComicEffect {
    id: string;
    type: 'hit' | 'collect' | 'graze';
    position: [number, number, number];
    maxAge: number; // ms
}

export const ComicVFX: React.FC = () => {
    const [effects, setEffects] = useState<ComicEffect[]>([]);
    const nextId = useRef(0);

    const spawnEffect = (
        type: ComicEffect['type'],
        position: [number, number, number],
        maxAge: number
    ) => {
        const id = `${type}-${nextId.current++}`;
        setEffects(prev => [...prev, { id, type, position, maxAge }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), maxAge);
    };

    useEffect(() => {
        const unsubHit = eventBus.on('player:hit-vfx', ({ position }) => {
            spawnEffect('hit', [position[0], position[1] + 5, position[2]], 1000);
        });
        const unsubCollect = eventBus.on('player:collect-strong', ({ position }) => {
            spawnEffect('collect', [position[0], position[1] + 5, position[2]], 800);
        });
        const unsubGraze = eventBus.on('player:graze', ({ distance: _ }) => {
            spawnEffect('graze', [0, 5, 0], 600);
        });

        return () => {
            unsubHit();
            unsubCollect();
            unsubGraze();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <group>
            {effects.map(effect => (
                <ComicEffectSprite key={effect.id} effect={effect} />
            ))}
        </group>
    );
};

const ComicEffectSprite: React.FC<{ effect: ComicEffect }> = ({ effect }) => {
    const config = getEffectConfig(effect.type);
    const durationSec = effect.maxAge / 1000;

    return (
        <Html
            position={effect.position}
            center
            distanceFactor={5}
            style={{
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: effect.type === 'hit' ? UI_LAYERS.COMIC_VFX_HIT : UI_LAYERS.COMIC_VFX
            }}
        >
            <div
                className="comic-vfx"
                style={{
                    fontSize: `${config.size}px`,
                    color: config.color,
                    fontFamily: 'Impact, "Comic Sans MS", cursive',
                    fontWeight: 'black',
                    textShadow: `-3px -3px 0 #000,  
                                 3px -3px 0 #000,
                                -3px  3px 0 #000,
                                 3px  3px 0 #000,
                                 0px 0px 10px ${config.glowColor}`,
                    WebkitTextStroke: '3px black',
                    letterSpacing: '2px',
                    animation: `comicVfxPop ${durationSec}s cubic-bezier(0.175,0.885,0.32,1.275) forwards`,
                }}
            >
                {config.text}
            </div>

            {/* Stars for collect */}
            {effect.type === 'collect' && (
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '40px',
                    animation: `comicVfxFade ${durationSec}s ease-out forwards`,
                }}>
                    ✨⭐✨
                </div>
            )}

            <style>{`
                @keyframes comicVfxPop {
                    0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
                    15%  { transform: scale(1.3) rotate(8deg);  opacity: 0.85; }
                    60%  { transform: scale(1.0) rotate(0deg);  opacity: 0.7; }
                    100% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
                }
                @keyframes comicVfxFade {
                    0%   { opacity: 0.9; }
                    70%  { opacity: 0.7; }
                    100% { opacity: 0; }
                }
            `}</style>
        </Html>
    );
};

function getEffectConfig(type: ComicEffect['type']) {
    switch (type) {
        case 'hit':
            return {
                text: 'BAM!',
                size: 80,
                color: '#8B2323', // MATTE Dark Red
                glowColor: '#8B4513' // MATTE Brown
            };
        case 'collect':
            return {
                text: 'POW!',
                size: 60,
                color: '#DAA520', // MATTE Goldenrod
                glowColor: '#8B4513' // MATTE Brown
            };
        case 'graze':
            return {
                text: 'WHOOSH!',
                size: 55,
                color: '#556B2F', // MATTE Olive
                glowColor: '#8B4513' // MATTE Brown
            };
    }
}

// Добавляем CSS для shake анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px) rotate(-2deg); }
        75% { transform: translateX(5px) rotate(2deg); }
    }
`;
document.head.appendChild(style);

export default ComicVFX;
