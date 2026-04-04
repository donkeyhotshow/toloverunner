/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { InstancedMesh, Matrix4, Vector3, MeshBasicMaterial } from 'three';
import { useStore } from '../../store';
import { GameStatus, ObjectType, GameObject } from '../../types';
import { CurveHelper } from '../../core/utils/CurveHelper';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { Outlines } from '../System/OutlinesShim';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { safeDispose } from '../../utils/errorHandler';

interface WarningIndicatorProps {
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}

// Reusable material defined outside if static, but better inside for HMR safety if needed.
// However, since it's just a BasicMaterial, module level is almost OK, but useMemo is safer.


export const WarningIndicator: React.FC<WarningIndicatorProps> = React.memo(({ objectsRef, totalDistanceRef }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const MAX_INDICATORS = 10;
    const _matrix = useMemo(() => new Matrix4(), []);
    const pm = getPerformanceManager();
    const showOutlines = typeof Outlines !== 'undefined' && pm.getCurrentQuality() >= QualityLevel.MEDIUM;

    const geometry = useMemo(() => getGeometryPool().getOctahedronGeometry(0.5, 0), []);
    const material = useMemo(() => new MeshBasicMaterial({
        color: '#FFFF00', // Bright Yellow
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        depthTest: false
    }), []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            if (!meshRef.current) return;
            const { status } = useStore.getState();

            if (status !== GameStatus.PLAYING) {
                meshRef.current.count = 0;
                return;
            }

            const totalDist = totalDistanceRef.current;
            const objects = objectsRef.current;
            let count = 0;

            for (let i = 0; i < objects.length && count < MAX_INDICATORS; i++) {
                const obj = objects[i];
                if (!obj || obj.type !== ObjectType.OBSTACLE || !obj.active) continue;

                const worldZ = obj.position[2] + totalDist;
                // Hazard warning for objects 15-35 units ahead
                if (worldZ < -15 && worldZ > -35) {
                    const curve = CurveHelper.getCurveAt(worldZ);
                    const x = obj.position[0] + curve.x;
                    const y = obj.position[1] + curve.y + 3.5; // Float above

                    const pulse = 1.0 + Math.sin(time * 8) * 0.15;
                    _matrix.makeTranslation(x, y, worldZ + 2);
                    // Billboard rotation (facing camera)
                    _matrix.multiply(new Matrix4().makeRotationY(curve.rotY + Math.PI));
                    _matrix.scale(new Vector3(pulse * 0.7, pulse * 0.7, pulse * 0.7)); // Smaller

                    meshRef.current.setMatrixAt(count, _matrix);
                    count++;
                }
            }

            meshRef.current.count = count;
            meshRef.current.instanceMatrix.needsUpdate = true;
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, _matrix]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_INDICATORS]}
            frustumCulled={false}
        >
            {showOutlines ? <Outlines thickness={0.05} color="#000000" /> : null}
        </instancedMesh>
    );
});

export default WarningIndicator;

