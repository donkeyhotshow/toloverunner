/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DNABackground - Декоративные спирали ДНК для фона
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Object3D, MeshBasicMaterial } from 'three';
import { useStore } from '../../store';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';

const _dummy = new Object3D();

export const DNABackground: React.FC = () => {
    const barsRef = useRef<InstancedMesh>(null);
    const redSpheresRef = useRef<InstancedMesh>(null);
    const cyanSpheresRef = useRef<InstancedMesh>(null);

    const SPIRAL_COUNT = 8;
    const SEGMENTS_PER_SPIRAL = 25;
    const TOTAL_SEGMENTS = SPIRAL_COUNT * SEGMENTS_PER_SPIRAL;

    const barGeo = useMemo(() => getGeometryPool().getBoxGeometry(0.2, 2.0, 0.2), []);
    const sphereGeo = useMemo(() => getGeometryPool().getSphereGeometry(0.3, 8, 8), []);

    const barMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15, depthWrite: false }), []);
    const redMat = useMemo(() => new MeshBasicMaterial({ color: '#FF4D4D', transparent: true, opacity: 0.6, depthWrite: false }), []);
    const cyanMat = useMemo(() => new MeshBasicMaterial({ color: '#00FFFF', transparent: true, opacity: 0.6, depthWrite: false }), []);

    const spirals = useMemo(() => {
        return Array.from({ length: SPIRAL_COUNT }, (_, i) => {
            const isLeft = i % 2 === 0;
            return {
                initialZ: -(i * 50), // Spread evenly along Z
                x: isLeft ? -15 - Math.random() * 10 : 15 + Math.random() * 10, // Along road edges
                y: -5 + Math.random() * 10,
                rotationSpeed: (isLeft ? 1 : -1) * (0.5 + Math.random() * 0.5),
                phase: Math.random() * Math.PI * 2,
                scale: 3.0 + Math.random() * 2.0,
                parallaxFactor: 1.0 // Lock to world scrolling instead of distant background (so they pass by fast)
            };
        });
    }, []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(barGeo);
            getGeometryPool().release(sphereGeo);
            safeDispose(barMat);
            safeDispose(redMat);
            safeDispose(cyanMat);
        };
    }, [barGeo, sphereGeo, barMat, redMat, cyanMat]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            if (!barsRef.current || !redSpheresRef.current || !cyanSpheresRef.current) return;

            let count = 0;
            const TOTAL_DEPTH = 400; // Loop every 400m

            spirals.forEach((spiral, _sIdx) => {
                // Calculate Parallax Z
                // We move it TOWARDS camera (positive Z) as distance increases, but at partial speed
                // The modulo keeps it wrapping in the background volume (-400 to 0)

                const currentDist = useStore.getState().distance; // Access latest distance
                const travel = currentDist * spiral.parallaxFactor;

                let z = (spiral.initialZ + travel) % TOTAL_DEPTH;
                if (z > 0) z -= TOTAL_DEPTH; // Wrap to back
                // Shift range to be -TOTAL_DEPTH to 0 relative to camera? 
                // Camera is at +15. We want background to be e.g. -150 to -550.
                z -= 150; // Pushed further back to avoid screen clutter

                for (let i = 0; i < SEGMENTS_PER_SPIRAL; i++) {
                    const angle = i * 0.5 + time * spiral.rotationSpeed + spiral.phase;
                    const yOffset = i * 1.5 - (SEGMENTS_PER_SPIRAL * 0.75);

                    const x1 = Math.cos(angle) * spiral.scale;
                    const z1 = Math.sin(angle) * spiral.scale;

                    const x2 = Math.cos(angle + Math.PI) * spiral.scale;
                    const z2 = Math.sin(angle + Math.PI) * spiral.scale;

                    // ◽ BAR
                    _dummy.position.set(
                        spiral.x + (x1 + x2) / 2,
                        spiral.y + yOffset,
                        z + (z1 + z2) / 2 // Use the parallax Z
                    );
                    _dummy.lookAt(spiral.x + x1, spiral.y + yOffset, z + z1);
                    _dummy.scale.set(1, 1, spiral.scale * 2);
                    _dummy.updateMatrix();
                    barsRef.current!.setMatrixAt(count, _dummy.matrix);

                    // 🔴 RED SPHERE
                    _dummy.position.set(spiral.x + x1, spiral.y + yOffset, z + z1);
                    _dummy.scale.setScalar(1);
                    _dummy.updateMatrix();
                    redSpheresRef.current!.setMatrixAt(count, _dummy.matrix);

                    // 🔵 CYAN SPHERE
                    _dummy.position.set(spiral.x + x2, spiral.y + yOffset, z + z2);
                    _dummy.updateMatrix();
                    cyanSpheresRef.current!.setMatrixAt(count, _dummy.matrix);

                    count++;
                }
            });

            barsRef.current.instanceMatrix.needsUpdate = true;
            redSpheresRef.current.instanceMatrix.needsUpdate = true;
            cyanSpheresRef.current.instanceMatrix.needsUpdate = true;
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [spirals, barGeo, sphereGeo]);

    // ✅ FIX: Restored with sorted rendering to prevent artifacts
    return (
        <group renderOrder={-1}>
            <instancedMesh ref={barsRef} args={[barGeo, barMat, TOTAL_SEGMENTS]} renderOrder={-1} />
            <instancedMesh ref={redSpheresRef} args={[sphereGeo, redMat, TOTAL_SEGMENTS]} renderOrder={-1} />
            <instancedMesh ref={cyanSpheresRef} args={[sphereGeo, cyanMat, TOTAL_SEGMENTS]} renderOrder={-1} />
        </group>
    );
};

export default DNABackground;
