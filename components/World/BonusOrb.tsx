/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BonusOrb - Optimized instanced orbs with better visuals
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, InstancedMesh, MeshStandardMaterial, MathUtils } from 'three';
import { GameObject, ObjectType } from '../../types';
import { SAFETY_CONFIG } from '../../constants';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { safeDispose } from '../../utils/errorHandler';
import { useStore } from '../../store'; // ✅ FIX P0: Added missing import


const _dummy = new Object3D();

interface BonusOrbProps {
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}

export const BonusOrb: React.FC<BonusOrbProps> = React.memo(({ objectsRef, totalDistanceRef }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const frameCounter = useRef(0);

    const MAX_COUNT = SAFETY_CONFIG.MAX_OBJECTS;

    const geo = useMemo(() => getGeometryPool().getSphereGeometry(0.5, 16, 16), []);
    const material = useMemo(() => new MeshStandardMaterial({
        color: '#FFD700', // 🔥 GOLD: Yellow coin color
        emissive: '#FF8C00', // 🔥 Orange glow
        emissiveIntensity: 2.5, // Strong neon glow
        roughness: 0.05, // Glossy
        metalness: 0.9 // Metallic sheen
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

            frameCounter.current++;
            frameCounter.current++;
            // REMOVED THROTTLING: Smooth updates
            // if (frameCounter.current % 3 !== 0) return;

            const objects = objectsRef.current;
            const totalDist = totalDistanceRef.current;
            const playerState = useStore.getState().localPlayerState;
            const pPos = playerState.position;
            let count = 0;

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || obj.type === ObjectType.OBSTACLE || !obj.active) continue;

                const worldZ = obj.position[2] + totalDist;
                // If collecting, we allow it to be visible even if outside normal range for a bit
                const isCollecting = obj.collecting !== undefined && obj.collecting > 0;
                if (!isCollecting && (worldZ > 20 || worldZ < -150)) continue;

                _dummy.position.set(
                    obj.position[0],
                    obj.position[1] + 1.0, // Floating a bit higher
                    worldZ
                );

                // Rotation and float effect
                const floatOffset = Math.sin(time * 4 + i) * 0.2;
                _dummy.position.y += floatOffset;
                _dummy.rotation.y = time * 2;
                _dummy.scale.setScalar(1.0 + Math.sin(time * 6) * 0.1);

                // 🎯 SPEC: Suck-in animation
                if (isCollecting) {
                    const t = Math.min(1.0, 1.0 - (obj.collecting! / 0.35)); // 0 to 1
                    // Lerp towards player head position (Z=0 in world view usually)
                    _dummy.position.x = MathUtils.lerp(_dummy.position.x, pPos[0], t);
                    _dummy.position.y = MathUtils.lerp(_dummy.position.y, pPos[1] + 0.5, t);
                    _dummy.position.z = MathUtils.lerp(_dummy.position.z, 2.0, t); // Slightly in front of camera/player
                    _dummy.scale.multiplyScalar(1.0 - t);
                }

                _dummy.updateMatrix();

                meshRef.current.setMatrixAt(count, _dummy.matrix);
                count++;
                if (count >= MAX_COUNT) break;
            }

            meshRef.current.count = count;
            scheduleMatrixUpdate(meshRef.current);
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, MAX_COUNT]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[geo, material, MAX_COUNT]}
            />
            {/* ✨ Bonus Area Aura Light */}
            <pointLight 
                intensity={1.5}
                color="#FFD700"
                distance={25}
                decay={2}
                position={[0, 3, 5]} // General area in front of player
            />
        </group>
    );
});

BonusOrb.displayName = 'BonusOrb';
export default BonusOrb;
