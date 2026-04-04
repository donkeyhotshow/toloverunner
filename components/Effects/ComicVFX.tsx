/**
 * ComicVFX - Система комиксных визуальных эффектов
 * 
 * Особенности:
 * - "POW!", "BAM!", "BOOM!" текстовые эффекты
 * - Звездочки и молнии при столкновениях
 * - Halftone particles
 * - Соответствует Comic Book стилю UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { UI_LAYERS } from '../../constants';

interface ComicEffect {
    id: string;
    type: 'hit' | 'collect' | 'graze';
    position: [number, number, number];
    timestamp: number;
}

export const ComicVFX: React.FC = () => {
    const [effects, setEffects] = useState<ComicEffect[]>([]);
    const [now, setNow] = useState(() => Date.now());
    const nextId = useRef(0);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 50);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const handleHit = (e: Event) => {
            const customEvent = e as CustomEvent;
            const detail = customEvent.detail || {};

            const [px, py, pz] = detail.position || [0, 0, 0];
            const newEffect: ComicEffect = {
                id: `hit-${nextId.current++}`,
                type: 'hit',
                position: [px, py + 5, pz], // 🎨 Offset UP by 5 units
                timestamp: Date.now()
            };

            setEffects(prev => [...prev, newEffect]);

            // Удаляем эффект через 1 секунду
            setTimeout(() => {
                setEffects(prev => prev.filter(e => e.id !== newEffect.id));
            }, 1000);
        };

        const handleCollect = (e: Event) => {
            const customEvent = e as CustomEvent;
            const detail = customEvent.detail || {};

            const [px, py, pz] = detail.position || [0, 0, 0];
            const newEffect: ComicEffect = {
                id: `collect-${nextId.current++}`,
                type: 'collect',
                position: [px, py + 5, pz], // 🎨 Offset UP
                timestamp: Date.now()
            };

            setEffects(prev => [...prev, newEffect]);

            setTimeout(() => {
                setEffects(prev => prev.filter(e => e.id !== newEffect.id));
            }, 800);
        };

        const handleGraze = (e: Event) => {
            const customEvent = e as CustomEvent;
            const detail = customEvent.detail || {};

            const [px, py, pz] = detail.position || [0, 0, 0];
            const newEffect: ComicEffect = {
                id: `graze-${nextId.current++}`,
                type: 'graze',
                position: [px, py + 5, pz], // 🎨 Offset UP
                timestamp: Date.now()
            };

            setEffects(prev => [...prev, newEffect]);

            setTimeout(() => {
                setEffects(prev => prev.filter(e => e.id !== newEffect.id));
            }, 600);
        };

        window.addEventListener('player-hit', handleHit);
        window.addEventListener('player-collect-strong', handleCollect);
        window.addEventListener('player-graze', handleGraze);

        return () => {
            window.removeEventListener('player-hit', handleHit);
            window.removeEventListener('player-collect-strong', handleCollect);
            window.removeEventListener('player-graze', handleGraze);
        };
    }, []);

    return (
        <group>
            {effects.map(effect => (
                <ComicEffectSprite key={effect.id} effect={effect} now={now} />
            ))}
        </group>
    );
};

const ComicEffectSprite: React.FC<{ effect: ComicEffect; now: number }> = ({ effect, now }) => {
    const age = (now - effect.timestamp) / 1000; // seconds

    // Анимация: появление -> рост -> исчезновение
    let scale = 0;
    let opacity = 0.7; // 🔥 FIX: Снижено с 1.0 до 0.7 для меньшей блокировки обзора
    let rotation = 0;

    if (age < 0.2) {
        // Появление (0-0.2s): быстрый рост
        scale = age / 0.2;
        rotation = -0.3 * (1 - scale);
    } else if (age < 0.7) {
        // Удержание (0.2-0.7s)
        scale = 1.0 + Math.sin(age * 10) * 0.1; // Легкая пульсация
    } else {
        // Исчезновение (0.7-1.0s)
        const fadeProgress = (age - 0.7) / 0.3;
        scale = 1.0 - fadeProgress * 0.5;
        opacity = 0.7 - fadeProgress * 0.7; // Fade from 0.7 to 0
    }

    const config = getEffectConfig(effect.type);

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
                    fontSize: `${config.size * scale}px`,
                    color: config.color,
                    fontFamily: 'Impact, "Comic Sans MS", cursive',
                    fontWeight: 'black',
                    textShadow: `-3px -3px 0 #000,  
                                 3px -3px 0 #000,
                                -3px  3px 0 #000,
                                 3px  3px 0 #000,
                                 0px 0px 10px ${config.glowColor}`,
                    WebkitTextStroke: '3px black',
                    opacity: opacity,
                    transform: `rotate(${rotation * 30}deg)`,
                    transition: 'transform 0.1s ease-out',
                    letterSpacing: '2px',
                    animation: effect.type === 'hit' ? 'shake 0.1s infinite' : 'none'
                }}
            >
                {config.text}
            </div>

            {/* Звездочки для коллекта */}
            {effect.type === 'collect' && (
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '40px',
                    opacity: opacity
                }}>
                    ✨⭐✨
                </div>
            )}
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
