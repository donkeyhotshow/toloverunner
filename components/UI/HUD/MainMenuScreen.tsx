/**
 * @license SPDX-License-Identifier: Apache-2.0
 * MainMenuScreen - Premium Glassmorphism Design
 */

import React, { useEffect, useRef } from 'react';
import { Play, Settings, Trophy } from 'lucide-react';
import { useStore } from '../../../store';
import { GameMode, GameStatus } from '../../../types';

// Pre-computed star field data — avoids Math.random() calls during render
const STAR_DATA = Array.from({ length: 60 }, (_, i) => ({
    width: ((i * 7 + 3) % 5 === 0) ? 2 : 1,
    height: ((i * 11 + 7) % 5 === 0) ? 2 : 1,
    left: ((i * 17 + 5) % 100),
    top: ((i * 13 + 11) % 100),
    opacity: 0.2 + ((i * 3 + 1) % 10) / 16.7,
    duration: 1.5 + ((i * 7 + 2) % 30) / 10,
    delay: ((i * 5 + 3) % 30) / 10,
}));

export const MainMenuScreen: React.FC = () => {
    const startGame = useStore(s => s.startGame);
    const setStatus = useStore(s => s.setStatus);
    const setShowPopups = useStore(s => s.setShowPopups);
    const zenMode = useStore(s => s.zenMode);
    const setZenMode = useStore(s => s.setZenMode);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleStartGame = () => startGame(GameMode.ENDLESS);
    const handleOpenShop = () => setStatus(GameStatus.SHOP);

    // Animated floating orbs background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const orbs = Array.from({ length: 8 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 80 + Math.random() * 120,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            hue: Math.random() > 0.5 ? 300 : 200,
        }));

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            orbs.forEach(o => {
                o.x += o.vx; o.y += o.vy;
                if (o.x < -o.r) o.x = canvas.width + o.r;
                if (o.x > canvas.width + o.r) o.x = -o.r;
                if (o.y < -o.r) o.y = canvas.height + o.r;
                if (o.y > canvas.height + o.r) o.y = -o.r;
                const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
                grd.addColorStop(0, `hsla(${o.hue}, 80%, 60%, 0.18)`);
                grd.addColorStop(1, `hsla(${o.hue}, 80%, 60%, 0)`);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
                ctx.fill();
            });
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d0814 0%, #12102a 50%, #0a1628 100%)',
            pointerEvents: 'auto',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            overflow: 'hidden',
        }}>
            {/* Animated orb canvas */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
            }} />

            {/* Star field */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                {STAR_DATA.map((star, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: star.width,
                        height: star.height,
                        borderRadius: '50%',
                        background: 'white',
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        opacity: star.opacity,
                        animation: `pulse ${star.duration}s ease-in-out infinite`,
                        animationDelay: `${star.delay}s`,
                    }} />
                ))}
            </div>

            {/* Glass card */}
            <div style={{
                position: 'relative', zIndex: 10,
                width: '100%', maxWidth: 440, margin: '0 16px',
                padding: '40px 36px',
                background: 'rgba(255,255,255,0.055)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 24,
                boxShadow: '0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        fontSize: 52, fontWeight: 900, letterSpacing: -1,
                        color: '#ffffff',
                        textShadow: '0 0 40px rgba(180,120,255,0.6)',
                        lineHeight: 1,
                        fontStyle: 'italic',
                        textTransform: 'uppercase',
                    }}>
                        ToLOVE
                    </div>
                    <div style={{
                        fontSize: 42, fontWeight: 900, letterSpacing: 4,
                        color: '#f0c040',
                        textShadow: '0 0 30px rgba(240,192,64,0.7)',
                        lineHeight: 1.1,
                        fontStyle: 'italic',
                        textTransform: 'uppercase',
                    }}>
                        RUNNER
                    </div>
                    <div style={{
                        marginTop: 8, fontSize: 12, letterSpacing: 2,
                        color: 'rgba(255,255,255,0.35)',
                        textTransform: 'uppercase',
                    }}>
                        v2.4.0
                    </div>
                </div>

                {/* Divider */}
                <div style={{
                    height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    marginBottom: 28,
                }} />

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={handleStartGame}
                        className="menu-btn-primary"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '16px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
                            fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                            background: 'linear-gradient(135deg, #b563fc, #7c3aed)',
                            color: '#fff',
                            boxShadow: '0 4px 24px rgba(181,99,252,0.5)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(181,99,252,0.7)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(181,99,252,0.5)';
                        }}
                    >
                        <Play size={20} fill="currentColor" />
                        ПОЧАТИ ГРУ
                    </button>

                    <button
                        onClick={handleOpenShop}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '14px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer', fontSize: 16, fontWeight: 600, letterSpacing: 2,
                            textTransform: 'uppercase',
                            background: 'rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                        }}
                    >
                        <Trophy size={18} />
                        МАГАЗИН
                    </button>

                    <button
                        onClick={() => {
                            const next = !zenMode;
                            setZenMode(next);
                            setShowPopups(!next); // Also hide popups in zen mode
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '14px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer', fontSize: 16, fontWeight: 600, letterSpacing: 2,
                            textTransform: 'uppercase',
                            background: zenMode ? 'rgba(255,100,100,0.15)' : 'rgba(255,255,255,0.07)',
                            color: zenMode ? '#ff8888' : 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Settings size={18} />
                        КІНО-РЕЖИМ: {zenMode ? 'УВІМК' : 'ВИМК'}
                    </button>


                </div>

                {/* Controls hint */}
                <div style={{
                    marginTop: 28, paddingTop: 20,
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    textAlign: 'center', fontSize: 11, letterSpacing: 1,
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                }}>
                    WASD / Стрілки — Рух &nbsp;|&nbsp; Пробіл — Стрибок
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
};
