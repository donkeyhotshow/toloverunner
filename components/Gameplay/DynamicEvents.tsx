import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal, useThree } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, NormalBlending, DoubleSide, Color, MathUtils } from 'three';
import { useStore } from '../../store';
import { selectDynamicEventsData } from '../../store/selectors';
import { GameStatus } from '../../types';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';
import { UI_LAYERS } from '../../constants';

interface GameEvent {
    id: string;
    type: 'speed_boost' | 'coin_rain' | 'obstacle_wave' | 'perfect_zone' | 'combo_multiplier';
    duration: number;
    intensity: number;
    startTime: number;
    active: boolean;
}

export const DynamicEvents: React.FC = () => {
    // Safe access to Three.js context - may not be available during SSR or lazy loading
    // Safe access to Three.js context - we assume this is used inside Canvas
    // If not, useThree will throw, which is expected behavior for R3F hooks
    const { camera } = useThree();

    const activeEventsRef = useRef<GameEvent[]>([]);
    const lastEventTime = useRef(0);
    const eventCounter = useRef(0);
    const overlayRef = useRef<Mesh>(null);
    // CRITICAL FIX: Store reference to dynamically created style element for cleanup
    const eventStyleRef = useRef<HTMLStyleElement | null>(null);

    const { status, distance, combo, score, activateSpeedBoost, activateMagnet } = useStore(selectDynamicEventsData);

    const geometry = useMemo(() => getGeometryPool().getPlaneGeometry(2, 2), []);
    const material = useMemo(() => new MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        blending: NormalBlending, // Removed AdditiveBlending to reduce "glow"
        side: DoubleSide
    }), []);

    useEffect(() => {
        return () => {
            // CRITICAL FIX: Clean up DOM elements to prevent memory leaks
            getGeometryPool().release(geometry);
            safeDispose(material);

            // Remove the dynamically created style element
            if (eventStyleRef.current && eventStyleRef.current.parentNode) {
                eventStyleRef.current.parentNode.removeChild(eventStyleRef.current);
                eventStyleRef.current = null;
            }
        };
    }, [geometry, material]);

    const generateEvent = useCallback((currentTime: number): GameEvent | null => {
        const progress = Math.min(distance / 1000, 1);
        const timeSinceLastEvent = currentTime - lastEventTime.current;
        const minInterval = 15000 - (progress * 10000);

        if (timeSinceLastEvent < minInterval) return null;

        const eventProbabilities = {
            speed_boost: combo > 5 ? 0.3 : 0.1,
            coin_rain: score > 1000 ? 0.25 : 0.15,
            obstacle_wave: progress > 0.3 ? 0.2 : 0.1,
            perfect_zone: combo > 10 ? 0.4 : 0.2,
            combo_multiplier: combo > 3 ? 0.3 : 0.1
        };

        const random = Math.random();
        let cumulativeProbability = 0;

        for (const [eventType, probability] of Object.entries(eventProbabilities)) {
            cumulativeProbability += probability;
            if (random <= cumulativeProbability) {
                eventCounter.current++;
                const id = `event_${eventCounter.current}`;
                return {
                    id,
                    type: eventType as GameEvent['type'],
                    duration: 5000 + Math.random() * 5000,
                    intensity: 0.5 + Math.random() * 0.5,
                    startTime: currentTime,
                    active: true
                };
            }
        }
        return null;
    }, [distance, combo, score]);

    const showEventNotification = useCallback((message: string, color: string) => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 35%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: ${color};
            padding: 14px 28px;
            border-radius: 40px;
            font-size: 22px;
            font-weight: 900;
            z-index: ${UI_LAYERS.NOTIFICATIONS};
            pointer-events: none;
            box-shadow: 0 5px 20px rgba(0,0,0,0.6);
            border: 2px solid ${color};
            animation: eventPopup 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        `;

        if (!document.getElementById('event-animations') && !eventStyleRef.current) {
            const style = document.createElement('style');
            style.id = 'event-animations';
            style.textContent = `
                @keyframes eventPopup {
                    0% { opacity: 0; transform: translate(-50%, 40px) scale(0.7); }
                    15% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    85% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -40px) scale(0.9); }
                }
            `;
            document.head.appendChild(style);
            eventStyleRef.current = style;
        }

        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 2500);
    }, []);

    const triggerEventEffects = useCallback((event: GameEvent) => {
        switch (event.type) {
            case 'speed_boost':
                activateSpeedBoost();
                showEventNotification('🚀 SPEED BOOST!', '#4caf50');
                break;
            case 'coin_rain':
                activateMagnet();
                showEventNotification('💰 COIN RAIN!', '#ffeb3b');
                break;
            case 'obstacle_wave':
                showEventNotification('⚠️ OBSTACLE WAVE!', '#2e7d32');
                break;
            case 'perfect_zone':
                showEventNotification('✨ PERFECT ZONE!', '#e91e63');
                break;
            case 'combo_multiplier':
                showEventNotification('🔥 COMBO X2!', '#ff9800');
                break;
        }
    }, [activateSpeedBoost, activateMagnet, showEventNotification]);

    useEffect(() => {
        const callback = (delta: number, time: number) => {
            if (useStore.getState().status !== GameStatus.PLAYING) return;

            const currentTime = time * 1000;
            const newEvent = generateEvent(currentTime);

            if (newEvent) {
                activeEventsRef.current.push(newEvent);
                lastEventTime.current = currentTime;
                triggerEventEffects(newEvent);
            }

            activeEventsRef.current = activeEventsRef.current.filter(event => (currentTime - event.startTime) < event.duration);

            if (overlayRef.current) {
                const overlay = overlayRef.current;
                const mat = overlay.material as MeshBasicMaterial;

                let targetColor = '#ffffff';
                let targetOpacity = 0;

                const mainEvent = activeEventsRef.current[0];
                if (mainEvent) {
                    targetOpacity = 0.05; // Reduced opacity for less shine
                    if (mainEvent.type === 'speed_boost') targetColor = '#00ff44';
                    else if (mainEvent.type === 'coin_rain') targetColor = '#ffdd00';
                    else if (mainEvent.type === 'perfect_zone') targetColor = '#ff00ff';
                    else if (mainEvent.type === 'obstacle_wave') targetColor = '#2e7d32';
                }

                mat.color.lerp(new Color(targetColor), delta * 4);
                mat.opacity = MathUtils.lerp(mat.opacity, targetOpacity, delta * 4);
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [distance, combo, score, status, generateEvent, triggerEventEffects]);

    return createPortal(
        <mesh
            ref={overlayRef}
            geometry={geometry}
            material={material}
            scale={5}
            position={[0, 0, -0.2]}
            renderOrder={9999}
        />,
        camera
    );
};
