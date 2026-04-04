import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Vector3 } from 'three';
import { useStore } from '../../store';
import { eventBus } from '../../utils/eventBus';

/**
 * ComicPopupSystem - Visual Onomatopoeia
 * Manages floating text for "BOING!", "WHOOSH!", "SPLAT!", etc.
 * Popups arc toward upper-left/right corners with jitter and fade-out.
 */

interface Popup {
    id: number;
    text: string;
    position: Vector3;
    life: number;
    color: string;
    scale: number;
    velocity: Vector3;
    rotation: number;
}

const FADE_START = 0.35; // life value below which fade begins (~0.35 * 0.5s = 0.175s remaining)
const LIFE_DECAY = 2.0;  // life units lost per second → total life ~0.5s

export const ComicPopupSystem: React.FC = () => {
    const [popups, setPopups] = useState<Popup[]>([]);
    const nextId = useRef(0);
    const lastPopupTime = useRef(0);
    const lastPopupHeight = useRef(0);
    const sideToggle = useRef(1); // alternates -1 (left) / +1 (right)

    // Listen for events
    useEffect(() => {
        const spawn = (text: string, color: string, scale: number = 1.0) => {
            const now = Date.now();
            const playerPos = useStore.getState().localPlayerState.position;

            // Stacking queue: if popups are too close in time, offset vertically
            if (now - lastPopupTime.current < 250) {
                lastPopupHeight.current += 1.5;
                if (lastPopupHeight.current > 4.5) lastPopupHeight.current = 1.0;
            } else {
                lastPopupHeight.current = 0;
            }
            lastPopupTime.current = now;

            // Alternate left/right, with jitter
            const side = sideToggle.current;
            sideToggle.current *= -1;

            const jitterX = (Math.random() - 0.5) * 2.0; // ±1 unit
            const jitterY = Math.random() * 1.5;          // 0–1.5 units

            const startPos = new Vector3(
                playerPos[0] + side * (6.0 + jitterX),
                playerPos[1] + 5.0 + jitterY + lastPopupHeight.current,
                playerPos[2] - 2.0
            );

            // Arc outward horizontally + upward
            const vel = new Vector3(
                side * (1.5 + Math.random() * 1.0),
                2.5 + Math.random() * 2.0,
                0
            );

            const scaleJitter = scale * (0.8 + Math.random() * 0.4); // ±20%

            setPopups(prev => {
                const next = [...prev];
                if (next.length >= 4) next.shift();

                return [...next, {
                    id: nextId.current++,
                    text,
                    position: startPos,
                    life: 1.0,
                    color,
                    scale: scaleJitter,
                    velocity: vel,
                    rotation: (Math.random() - 0.5) * 0.4
                }];
            });
        };

        const unsubs = [
            eventBus.on('game:start', () => spawn("HERE WE GO!", "#FFFFFF", 1.2)),
            eventBus.on('player:jump', () => spawn("BOING!", "#FFD700", 1.2)),
            eventBus.on('player:dash', () => spawn("WHOOSH!", "#00FFFF", 1.5)),
            eventBus.on('player:hit', () => spawn("BONK!", "#FF0000", 2.0)),
            eventBus.on('player:graze', () => spawn("ZOOM!", "#FFFFFF", 1.5)),
            eventBus.on('player:collect', (data: { type?: string } | undefined) => {
                if (data?.type === 'magnet') spawn("ЙОУ МАГНІТ!", "#FFD700", 1.5);
                else if (data?.type === 'shield') spawn("SHIELD UP!", "#FF00FF", 1.5);
                else if (Math.random() > 0.6) spawn("DING!", "#FFD700", 0.8);
            }),
            eventBus.on('player:membrane_pop', () => spawn("POP!", "#00BFFF", 2.5)),
            eventBus.on('player:death', () => spawn("SPLAT!", "#8B0000", 3.0)),
            eventBus.on('player:wasted', () => spawn("SPLAT!", "#8B0000", 3.0)),
            // === COMBAT SYSTEM v2.4.0 ===
            eventBus.on('combat:attack_up', () => spawn("POW!", "#FF4500", 2.5)),
            eventBus.on('combat:attack_down', () => spawn("SPLAT!", "#32CD32", 2.5)),
            eventBus.on('combat:damage', () => spawn("CRUNCH!", "#DC143C", 2.0)),
            eventBus.on('combat:boss_hit', () => spawn("WHAM!", "#FFD700", 3.0)),
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    // Update without allocations: mutate position/velocity in-place
    useFrame((_state, delta) => {
        if (popups.length === 0) return;

        setPopups(prev => {
            const next: Popup[] = [];
            const maxPopups = 5;
            for (let i = prev.length - 1; i >= 0 && next.length < maxPopups; i--) {
                const p = prev[i];
                if (!p) continue;
                const newLife = p.life - delta * LIFE_DECAY;
                if (newLife <= 0) continue;
                p.position.addScaledVector(p.velocity, delta);
                p.velocity.y -= delta * 10;
                p.life = newLife;
                next.unshift(p);
            }
            return next.length > maxPopups ? next.slice(-maxPopups) : next;
        });
    });

    return (
        <group>
            {popups.map(p => {
                const opacity = p.life < FADE_START
                    ? Math.max(0, p.life / FADE_START)
                    : 1.0;
                return (
                    <Text
                        key={p.id}
                        position={p.position}
                        fontSize={p.scale}
                        color={p.color}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.05}
                        outlineColor="#000000"
                        fillOpacity={opacity}
                        outlineOpacity={opacity}
                        rotation={[0, 0, p.rotation]}
                        renderOrder={999}
                    >
                        {p.text}
                    </Text>
                );
            })}
        </group>
    );
};
