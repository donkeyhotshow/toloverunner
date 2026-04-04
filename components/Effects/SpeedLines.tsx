/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, MeshBasicMaterial, AdditiveBlending, DoubleSide, Matrix4 } from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

export const SpeedLines: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const COUNT = 60;
    const offsets = useRef<{ x: number, y: number, offset: number, scale: number }[]>([]);

    const geometry = useMemo(() => getGeometryPool().getPlaneGeometry(0.1, 4), []);
    const material = useMemo(
        () =>
            new MeshBasicMaterial({
                color: '#ffffff',
                transparent: true,
                opacity: 0.3,
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
        offsets.current = Array.from({ length: COUNT }, () => {
            const side = Math.random() < 0.5 ? -1 : 1;
            return {
                x: side * (8 + Math.random() * 8), // Clustered at sides
                y: (Math.random() - 0.5) * 12 + 2,
                offset: Math.random() * 100,
                scale: 0.5 + Math.random() * 1.5
            };
        });
    }, []);

    // Check if should be disabled
    const shouldDisable = useMemo(() => {
        try {
            getPerformanceManager();
            if (typeof (window as unknown as Record<string, unknown>).__TOLOVERUNNER_MINIMAL_RENDER__ !== 'undefined' &&
                (window as unknown as Record<string, unknown>).__TOLOVERUNNER_MINIMAL_RENDER__ === true) return true;
        } catch { /* ignore */ }
        return false;
    }, []);

    useEffect(() => {
        if (shouldDisable) return;

        const callback = (_delta: number, time: number) => {
            const { status, speed, speedBoostActive, distance, combo } = useStore.getState();
            if (status !== GameStatus.PLAYING || !meshRef.current) return;

            const matrix = new Matrix4();
            const currentSpeed = Number.isFinite(speed) ? speed + (distance / 100) : 30;
            const lineSpeed = Math.max(0, currentSpeed * 2.0);

            // ⚔️ Combat v2.4.0: Speed Lines also activate on high combo
            const isHighCombo = combo >= 5;

            for (let i = 0; i < COUNT; i++) {
                const data = offsets.current[i];
                if (!data) continue;

                const z = ((time * lineSpeed + data.offset) % 40) - 20;

                matrix.makeRotationY(Math.PI / 2);
                matrix.setPosition(data.x, data.y, z);

                const sMatrix = new Matrix4().makeScale(1, data.scale, 1);
                matrix.multiply(sMatrix);

                meshRef.current.setMatrixAt(i, matrix);
            }

            scheduleMatrixUpdate(meshRef.current);
            // ⚔️ Combat v2.4.0: Enhanced visuals for high combo
            if (isHighCombo) {
                material.opacity = 0.6;
                material.color.set('#ff00ff'); // Magenta for high combo
            } else {
                material.opacity = speedBoostActive ? 0.7 : 0.25;
                material.color.set(speedBoostActive ? '#00ffff' : '#ffffff');
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [shouldDisable, material]);

    if (shouldDisable) return null;

    return <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} frustumCulled={false} />;
};

