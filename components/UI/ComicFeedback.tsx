/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComicPunch } from './ComicPunch';
import { OnomatopoeiaTags } from '../../constants/Onomatopoeia';
import { UI_LAYERS } from '../../constants';
import { eventBus } from '../../utils/eventBus';

interface FeedbackItem {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
}

export const ComicFeedback: React.FC = () => {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const lastSpawnTime = useRef(0);
    const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    const addFeedback = useCallback((type: keyof typeof OnomatopoeiaTags, color: string) => {
        const now = Date.now();
        if (now - lastSpawnTime.current < 300) return; // Reduced burst noise (300ms throttle)
        lastSpawnTime.current = now;

        const pool = OnomatopoeiaTags[type];
        const text = pool[Math.floor(Math.random() * pool.length)] || 'WOW!';
        const idBase = Math.random().toString(36).substr(2, 9);

        const isLeft = Math.random() < 0.5;
        const id = `${idBase}_${isLeft ? 'L' : 'R'}`;

        const x = isLeft ? 15 : 85; // Moved further to edges
        const y = 8 + Math.random() * 12; // 🔥 FIXED: TOP SAFE ZONE: 8-20% height (center is clear)

        setItems(prev => {
            if (prev.length >= 4) return prev; // Reduced max simultaneous items (4 instead of 6)
            return [...prev, { id, text, x, y, color }];
        });

        const timeout = setTimeout(() => {
            setItems(prev => prev.filter(item => item.id !== id));
            timeoutsRef.current.delete(timeout);
        }, 500); // Fast fade out (0.5s)

        timeoutsRef.current.add(timeout);
    }, []);

    useEffect(() => {
        const timeoutsSnapshot = timeoutsRef.current;
        const unsubHit = eventBus.on('player:hit', () => addFeedback('FAIL', '#FF4444'));
        const unsubCollect = eventBus.on('player:collect-strong', () => addFeedback('VICTORY', '#44FF44'));
        const unsubBoost = eventBus.on('player:boost', () => addFeedback('START', '#4444FF'));
        const unsubPerfect = eventBus.on('player:perfect', () => addFeedback('PERFECT', '#FF00FF'));
        const unsubDash = eventBus.on('player:dash-chain', () => addFeedback('COMBO', '#FFA500'));

        return () => {
            unsubHit();
            unsubCollect();
            unsubBoost();
            unsubPerfect();
            unsubDash();
            timeoutsSnapshot.forEach(timeout => clearTimeout(timeout));
            timeoutsSnapshot.clear();
        };
    }, [addFeedback]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: UI_LAYERS.HUD }}>
            {items.map(item => (
                <div
                    key={item.id}
                    className="absolute animate-comic-pop-fast"
                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <ComicPunch text={item.text} bgColor={item.color} />
                </div>
            ))}
        </div>
    );
};

