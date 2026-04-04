/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enhanced Lighting System - COMIC BOOK STYLE
 * Настроено для яркого, насыщенного cel-shading эффекта
 * 
 * ПРИНЦИПЫ КОМИКСНОГО ОСВЕЩЕНИЯ:
 * ✅ Высокая ambient light для плоских, чистых цветов
 * ✅ Яркие directional lights для четких теней
 * ✅ Минимум градаций - контрастные переходы свет/тень
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useFrame } from '@react-three/fiber';
import { Vector3, PointLight } from 'three';

export const EnhancedLighting: React.FC = () => {
    const [bonusFlash, setBonusFlash] = useState(0);
    const playerPos = useRef(new Vector3());
    const lightTarget = useRef(new Vector3());
    const playerLightRef = useRef<PointLight | null>(null);
    const bonusLightRef = useRef<PointLight | null>(null);
    
    useEffect(() => {
        const handleBonus = () => setBonusFlash(1.0);
        window.addEventListener('bonus-collected', handleBonus);
        return () => window.removeEventListener('bonus-collected', handleBonus);
    }, []);

    useFrame((_state, delta) => {
        // Decay bonus flash
        if (bonusFlash > 0) {
            setBonusFlash(prev => Math.max(0, prev - delta * 4.0));
        }

        // Smoothly follow player for the point light
        const localPos = useStore.getState().localPlayerState.position;
        playerPos.current.set(localPos[0], localPos[1] + 1.5, localPos[2]);
        lightTarget.current.lerp(playerPos.current, delta * 10);
        if (playerLightRef.current) {
            playerLightRef.current.position.copy(lightTarget.current);
        }
        if (bonusLightRef.current) {
            bonusLightRef.current.position.set(
                lightTarget.current.x,
                lightTarget.current.y + 2,
                lightTarget.current.z - 2
            );
        }
    });

    return (
        <group name="enhanced-lighting">
            {/* ☀️ СОЛНЦЕ - Яркий Directional Light сверху-спереди */}
            <directionalLight
                position={[15, 25, 10]}
                intensity={2.5} // ⬆️ Increased for more punch
                color="#FFF8E7"
                castShadow={true}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={150}
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
                shadow-bias={-0.0005}
                shadow-radius={6}
            />

            {/* 🌅 AMBIENT LIGHT - reduced to keep toon shadows readable */}
            <ambientLight intensity={0.75} color="#F5F5DC" />

            {/* 🎨 FILL LIGHT - Яркие биологические цвета */}
            <hemisphereLight
                args={['#FFE4E1', '#FFB6C1', 1.2]} 
                position={[0, 1, 0]}
            />

            {/* 💎 PLAYER GLOW - Moving light that illuminates the road around player */}
            <pointLight
                ref={playerLightRef}
                position={[0, 0, 0]}
                intensity={1.2}
                color="#00FFFF" // Cyan glow around player
                distance={15}
                decay={2}
            />

            {/* ✨ BONUS FLASH - Triggers on collection */}
            {bonusFlash > 0 && (
                <pointLight
                    ref={bonusLightRef}
                    position={[0, 0, 0]}
                    intensity={bonusFlash * 5.0}
                    color="#FFD700" // Golden flash
                    distance={20}
                />
            )}

            {/* 💎 RIM LIGHT - Подчеркивает контуры персонажа */}
            <directionalLight
                position={[-8, 8, -12]}
                intensity={1.0}
                color="#B0E0E6"
            />
        </group>
    );
};

export default EnhancedLighting;

