/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { RootState } from '@react-three/fiber';
import { Object3D, InstancedMesh, MeshBasicMaterial, AdditiveBlending, DoubleSide, Matrix4 } from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

interface HorizontalMotionLinesProps {
    targetRef: React.RefObject<Object3D>;
}

export const HorizontalMotionLines: React.FC<HorizontalMotionLinesProps> = ({ targetRef }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const COUNT = 12;
    const offsets = useRef<number[]>([]);
    const velocities = useRef<number[]>([]);

    const geometry = useMemo(() => getGeometryPool().getPlaneGeometry(0.05, 4), []);
    const material = useMemo(
        () =>
            new MeshBasicMaterial({
                color: '#00ffff',
                transparent: true,
                opacity: 0.6,
                toneMapped: false,
                blending: AdditiveBlending,
                side: DoubleSide
            }),
        []
    );

    useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        offsets.current = Array.from({ length: COUNT }, () => Math.random() * 2 - 1);
        velocities.current = Array.from({ length: COUNT }, () => 0.5 + Math.random() * 0.5);
    }, []);

    useEffect(() => {
        const callback = (_delta: number, time: number, _state: RootState) => {
            const { status, speedBoostActive, isDashing } = useStore.getState();
            if (status !== GameStatus.PLAYING || !meshRef.current || !targetRef.current) return;

            const matrix = new Matrix4();
            const targetPos = targetRef.current.position;

            // Валидация позиции цели
            if (!Number.isFinite(targetPos.x) || !Number.isFinite(targetPos.y) || !Number.isFinite(targetPos.z)) {
                console.warn('[HorizontalMotionLines] Invalid target position');
                return;
            }

            const intense = speedBoostActive || isDashing;
            const currentCount = intense ? COUNT : COUNT / 2;

            for (let i = 0; i < COUNT; i++) {
                if (i >= currentCount) {
                    matrix.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, matrix);
                    continue;
                }
                const speedMult = intense ? 2.5 : 1.0;
                const vel = velocities.current[i];
                const zOffset = vel !== undefined ? ((time * 20 * vel * speedMult) % 10) : 0;
                const x = targetPos.x + (i % 2 === 0 ? 0.6 : -0.6) + (Math.sin(time * 5 + i) * 0.1);
                const y = targetPos.y + (Math.cos(time * 3 + i) * 0.2);
                const z = targetPos.z + 0.5 + zOffset;

                // Валидация позиции линии
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    matrix.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, matrix);
                    continue;
                }

                matrix.makeRotationX(Math.PI / 2);
                matrix.setPosition(x, y, z);

                // Scale based on zOffset to fade in/out
                const scale = Math.max(0, 1 - (zOffset / 10)) * (intense ? 1.5 : 1.0);
                const sMatrix = new Matrix4().makeScale(1, scale, 1);
                matrix.multiply(sMatrix);

                meshRef.current.setMatrixAt(i, matrix);
            }

            scheduleMatrixUpdate(meshRef.current);
            const opacity = (intense ? 0.9 : 0.4) * (0.5 + Math.sin(time * 25) * 0.3);
            material.opacity = Math.max(0, Math.min(1, opacity)); // Clamp 0-1
            material.color.set(isDashing ? '#ffff00' : (speedBoostActive ? '#ffffff' : '#00ffff'));
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [targetRef, material]);

    return <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} frustumCulled={false} />;
};
