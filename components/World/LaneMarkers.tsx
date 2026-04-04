/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LaneMarkers - SIMPLIFIED VERSION (прямая дорога)
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Matrix4, Object3D, MeshToonMaterial } from 'three';
import { Outlines } from '../System/OutlinesShim';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { LANE_WIDTH } from '../../constants';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { safeDispose } from '../../utils/errorHandler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { CurveHelper } from '../../core/utils/CurveHelper';

// Material and geometry moved inside component for proper lifecycle management

interface LaneMarkersProps {
    totalDistanceRef: React.MutableRefObject<number>;
}

const LaneMarkers: React.FC<LaneMarkersProps> = ({ totalDistanceRef }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const COUNT_PER_LANE = 100;
    const TOTAL_COUNT = COUNT_PER_LANE * 2;

    const matrix = useMemo(() => new Matrix4(), []);
    const _dummy = useMemo(() => new Object3D(), []);

    const geometry = useMemo(() => getGeometryPool().getBoxGeometry(0.3, 0.1, 4), []); // Longer dashes
    const material = useMemo(() => new MeshToonMaterial({
        color: '#FFAB91', // 🍑 Peach/Soft Orange
        emissive: '#FF8A65',
        emissiveIntensity: 0.2, // Softer glow
    }), []);
    const pm = getPerformanceManager();
    const showOutlines = typeof Outlines !== 'undefined' && pm.getCurrentQuality() >= QualityLevel.MEDIUM;


    // Add THREE import if not present
    useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        const callback = (_delta: number, _time: number) => {
            if (!meshRef.current) return;

            // REMOVED THROTTLING: Smooth update
            const totalDist = totalDistanceRef.current;

            // Loop logic for infinite markings
            const spacing = 15;
            const trackLength = COUNT_PER_LANE * spacing;

            for (let i = 0; i < COUNT_PER_LANE; i++) {
                // Calculate position relative to total distance to create scrolling effect
                // SCROLL TOWARDS CAMERA (+Z)
                // Markers Spawn at -200 and move to +20
                const trackOffset = (totalDist) % trackLength;
                let z = -200 + (i * spacing) + trackOffset;

                // Wrap around
                if (z > 20) z -= trackLength;

                // Cull if too far behind or ahead
                if (z > 20 || z < -200) {
                    // Hide by scaling to 0
                    matrix.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i * 2, matrix);
                    meshRef.current.setMatrixAt(i * 2 + 1, matrix);
                    continue;
                }

                const y = 0.05;
                const laneOffsets = [-0.5, 0.5];

                // Get curve at this Z
                const curve = CurveHelper.getCurveAt(z);

                for (let j = 0; j < 2; j++) {
                    const laneOff = laneOffsets[j];
                    if (laneOff === undefined) continue;
                    _dummy.position.set(curve.x + laneOff * LANE_WIDTH, y, z);
                    _dummy.rotation.set(0, curve.rotY, 0);
                    _dummy.updateMatrix();
                    meshRef.current.setMatrixAt(i * 2 + j, _dummy.matrix);
                }
            }

            scheduleMatrixUpdate(meshRef.current);
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [totalDistanceRef, matrix, _dummy]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, TOTAL_COUNT]}
            frustumCulled={true}
            onPointerOver={undefined} // Optimization: disable raycasting if not needed
        >
            {showOutlines ? <Outlines thickness={1.5} color="#000000" /> : null}
        </instancedMesh>
    );
};

export default LaneMarkers;
