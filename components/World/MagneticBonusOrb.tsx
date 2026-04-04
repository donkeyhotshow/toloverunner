/**
 * MagneticBonusOrb - Бонусы с магнитным притяжением и визуальными эффектами
 * 
 * Особенности:
 * - Визуальное притяжение к игроку при активном магните
 * - Мерцание и пульсация при приближении
 * - Trail effect (шлейф частиц)
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, InstancedMesh, MeshStandardMaterial } from 'three';
import { GameObject, ObjectType } from '../../types';
import { SAFETY_CONFIG } from '../../constants';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { safeDispose } from '../../utils/errorHandler';
import { useStore } from '../../store';

const _dummy = new Object3D();

interface MagneticBonusOrbProps {
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
    playerPosition: [number, number, number];
}

export const MagneticBonusOrb: React.FC<MagneticBonusOrbProps> = React.memo(({
    objectsRef,
    totalDistanceRef,
    playerPosition
}) => {
    const meshRef = useRef<InstancedMesh>(null);
    const magnetActive = useStore(state => state.magnetActive);

    const MAX_COUNT = SAFETY_CONFIG.MAX_OBJECTS;

    const geo = useMemo(() => getGeometryPool().getSphereGeometry(0.5, 16, 16), []);

    // 💎 Яркий материал для бонусов
    const material = useMemo(() => new MeshStandardMaterial({
        color: '#FFD700', // Золотой
        emissive: '#FFAA00',
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.9
    }), []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(geo);
            safeDispose(material);
        };
    }, [geo, material]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            if (!meshRef.current) return;

            const objects = objectsRef.current;
            const totalDist = totalDistanceRef.current;
            let count = 0;

            const px = playerPosition[0];
            const py = playerPosition[1];

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || obj.type === ObjectType.OBSTACLE || !obj.active) continue;

                const worldZ = obj.position[2] + totalDist;
                if (worldZ > 20 || worldZ < -150) continue;

                // 🧲 МАГНИТНЫЙ ЭФФЕКТ: Используем физическую позицию (PhysicsEngine двигает объект)
                // Удалена конфликтующая визуальная интерполяция

                _dummy.position.set(
                    obj.position[0],
                    obj.position[1] + 1.0, // Visual Height Offset
                    worldZ
                );

                // ✨ Rotation and float effect
                const floatOffset = Math.sin(time * 4 + i) * 0.2;
                _dummy.position.y += floatOffset;
                _dummy.rotation.y = time * 2;

                // 🔥 Пульсация при активном магните и близости к игроку
                // Recalculate dist for visual effects only
                const dx = px - obj.position[0];
                const dy = py - obj.position[1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                const magnetRadius = 5.0;

                let scale = 1.0 + Math.sin(time * 6) * 0.1;
                if (magnetActive && dist < magnetRadius) {
                    const pulseIntensity = 1.0 - (dist / magnetRadius);
                    scale += pulseIntensity * 0.3 * Math.sin(time * 10);
                }

                _dummy.scale.setScalar(scale);
                _dummy.updateMatrix();

                meshRef.current.setMatrixAt(count, _dummy.matrix);
                count++;
                if (count >= MAX_COUNT) break;
            }

            meshRef.current.count = count;
            scheduleMatrixUpdate(meshRef.current);

            // 💫 Обновляем интенсивность свечения при активном магните
            if (material) {
                material.emissiveIntensity = magnetActive
                    ? 2.0 + Math.sin(time * 8) * 0.5
                    : 1.5;
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, MAX_COUNT, magnetActive, playerPosition, material]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[geo, material, MAX_COUNT]}
            />
            {/* Дополнительный point light для усиления эффекта */}
            {magnetActive && (
                <pointLight
                    position={playerPosition}
                    intensity={2}
                    distance={15}
                    color="#FFD700"
                />
            )}
        </group>
    );
});

MagneticBonusOrb.displayName = 'MagneticBonusOrb';
export default MagneticBonusOrb;
