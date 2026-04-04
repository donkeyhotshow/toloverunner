/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InfiniteTrack - Simplified version for maximum performance
 * COMIC EDITION: Halftone + Bold Outlines + World Bending
 */

import React, { useMemo, useEffect } from 'react';
import { MeshToonMaterial, DoubleSide } from 'three';
import { TrackSystem, CHUNK_SIZE } from '../../core/track/TrackSystem';
import { Outlines } from '../System/OutlinesShim';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { LOD_CONFIG } from '../../constants';
import { safeDispose } from '../../utils/errorHandler';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { applyWorldBending } from './WorldBendingShader';

interface InfiniteTrackProps {
    trackSystem: TrackSystem;
}

const ROAD_WIDTH = 8;
const ROAD_THICKNESS = 0.5; // Thicker for "slab" feel
const WALL_HEIGHT = 1.6;
const WALL_THICKNESS = 0.6;

export const InfiniteTrack: React.FC<InfiniteTrackProps> = React.memo(({ trackSystem }) => {

    // 1. Materials - Pure Comic Style
    const roadMaterial = useMemo(() => new MeshToonMaterial({
        color: '#FF1493', // Deep Pink
        emissive: '#FF69B4', // Hot Pink emissive
        emissiveIntensity: 0.1,
        side: DoubleSide,
    }), []);

    const wallMaterial = useMemo(() => new MeshToonMaterial({
        color: '#8B0045',
        emissive: '#C71585',
        emissiveIntensity: 0.2,
        side: DoubleSide,
    }), []);

    // Apply Comic Shader (Halftone + Bending)
    useEffect(() => {
        const options = {
            curvature: 0.003,
            enabled: true,
            halftone: true,
            halftoneScale: 0.8, // Visible dots
            halftoneFreq: 50.0
        };
        applyWorldBending(roadMaterial, options);
        applyWorldBending(wallMaterial, options);
    }, [roadMaterial, wallMaterial]);


    // 2. Geometries
    const roadGeo = useMemo(() => {
        // Use a simple Box for performance, but thick
        const geo = getGeometryPool().getBoxGeometry(ROAD_WIDTH, ROAD_THICKNESS, CHUNK_SIZE);
        geo.computeBoundingSphere();
        if (geo.boundingSphere) geo.boundingSphere.radius = 1000;
        return geo;
    }, []);

    const wallGeo = useMemo(() => {
        const geo = getGeometryPool().getBoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CHUNK_SIZE);
        geo.computeBoundingSphere();
        if (geo.boundingSphere) geo.boundingSphere.radius = 1000;
        return geo;
    }, []);

    useEffect(() => {
        return () => {
            // Pool handles geometry lifecycle, but explicit release is good practice
            getGeometryPool().release(roadGeo);
            getGeometryPool().release(wallGeo);

            // Material cleanup
            safeDispose(roadMaterial);
            safeDispose(wallMaterial);
        }
    }, [roadGeo, wallGeo, roadMaterial, wallMaterial]);
    const pm = getPerformanceManager();
    const showOutlines = typeof Outlines !== 'undefined' && pm.getCurrentQuality() >= QualityLevel.MEDIUM;

    return (
        <group>
            {/* Main Road - Pink Slab */}
            <instancedMesh
                ref={(node) => { if (node) trackSystem.registerMesh(node); }}
                args={[roadGeo, roadMaterial, LOD_CONFIG.TRACK_CHUNKS]}
                frustumCulled={false}
            >
                {/* 🖊️ BOLD COMIC OUTLINE */}
                {showOutlines ? <Outlines thickness={0.15} color="#000000" /> : null}
            </instancedMesh>

            {/* Left Wall */}
            <group position={[-(ROAD_WIDTH / 2 + WALL_THICKNESS / 2), WALL_HEIGHT / 2, 0]}>
                <instancedMesh
                    ref={(node) => { if (node) trackSystem.registerMesh(node); }}
                    args={[wallGeo, wallMaterial, LOD_CONFIG.TRACK_CHUNKS]}
                    frustumCulled={false}
                >
                    {showOutlines ? <Outlines thickness={0.10} color="#000000" /> : null}
                </instancedMesh>
            </group>

            {/* Right Wall */}
            <group position={[(ROAD_WIDTH / 2 + WALL_THICKNESS / 2), WALL_HEIGHT / 2, 0]}>
                <instancedMesh
                    ref={(node) => { if (node) trackSystem.registerMesh(node); }}
                    args={[wallGeo, wallMaterial, LOD_CONFIG.TRACK_CHUNKS]}
                    frustumCulled={false}
                >
                    {showOutlines ? <Outlines thickness={0.10} color="#000000" /> : null}
                </instancedMesh>
            </group>
        </group>
    );
});

InfiniteTrack.displayName = 'InfiniteTrack';
export default InfiniteTrack;

