/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InstancedLevelObjects - High quality instanced objects with better materials and animations
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, MeshToonMaterial } from 'three';
import { InstancedMesh } from 'three';
import { Outlines } from '../System/OutlinesShim';
import { GameObject, ObjectType } from '../../types';
import { SAFETY_CONFIG } from '../../constants';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';

import { CurveHelper } from '../../core/utils/CurveHelper';
import { applyWorldBending } from './WorldBendingShader';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';

export const InstancedLevelObjects: React.FC<{
    pickupsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}> = React.memo(({ pickupsRef, totalDistanceRef }) => {
    const coinMeshRef = useRef<InstancedMesh>(null);
    const geneMeshRef = useRef<InstancedMesh>(null);
    const shieldMeshRef = useRef<InstancedMesh>(null);
    const boostMeshRef = useRef<InstancedMesh>(null);
    const magnetMeshRef = useRef<InstancedMesh>(null);

    const MAX_COUNT = SAFETY_CONFIG.MAX_OBJECTS;
    const pm = getPerformanceManager();
    const showOutlines = pm.getCurrentQuality() >= QualityLevel.MEDIUM;

    // Smart culling: use frustum culling for performance
    // Only disable for very high quality mode where we want everything visible
    const _USE_FRUSTUM_CULLING = pm.getCurrentQuality() !== QualityLevel.ULTRA;

    // PERF: Pre-allocated objects to avoid GC pressure
    const _dummy = useMemo(() => new Object3D(), []);

    // GEOMETRIES
    const coinGeo = useMemo(() => getGeometryPool().getTorusGeometry(0.5, 0.15, 12, 16), []);
    const geneGeo = useMemo(() => getGeometryPool().getOctahedronGeometry(0.6, 0), []);
    const shieldGeo = useMemo(() => getGeometryPool().getSphereGeometry(0.7, 12, 12), []);
    const boostGeo = useMemo(() => getGeometryPool().getCylinderGeometry(0, 0.5, 1.2, 8, 1), []);
    const magnetGeo = useMemo(() => getGeometryPool().getTorusGeometry(0.5, 0.2, 8, 24), []);

    // MATERIALS
    // MATERIALS (Matte Cartoon Style)
    const coinMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#FFD700', // Gold
            emissive: '#B8860B', // Dark Goldenrod shadow
            emissiveIntensity: 0.2 // Low emission, just for color pop
        });
        applyWorldBending(mat);
        return mat;
    }, []);
    const geneMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#00CED1', // Dark Turquoise
            emissive: '#008B8B',
            emissiveIntensity: 0.2
        });
        applyWorldBending(mat);
        return mat;
    }, []);
    const shieldMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#1E90FF', // DodgerBlue
            emissive: '#00008B',
            transparent: true,
            opacity: 0.6
        });
        applyWorldBending(mat);
        return mat;
    }, []);
    const boostMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#FF4500', // OrangeRed
            emissive: '#8B0000',
            emissiveIntensity: 0.2
        });
        applyWorldBending(mat);
        return mat;
    }, []);
    const magnetMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#9370DB', // MediumPurple
            emissive: '#4B0082',
            emissiveIntensity: 0.2
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    useEffect(() => {
        return () => {
            [coinGeo, geneGeo, shieldGeo, boostGeo, magnetGeo].forEach(g => getGeometryPool().release(g));
            [coinMat, geneMat, shieldMat, boostMat, magnetMat].forEach(m => safeDispose(m));
        };
    }, [coinGeo, geneGeo, shieldGeo, boostGeo, magnetGeo, coinMat, geneMat, shieldMat, boostMat, magnetMat]);

    useEffect(() => {
        // PERF: Cache for curve calculations
        const curveCache = new Map<number, { x: number; rotY: number }>();

        const callback = (_delta: number, time: number) => {
            const pickups = pickupsRef.current;
            const totalDist = totalDistanceRef.current;

            // PERF: Dynamic culling based on quality settings
            const quality = pm.getCurrentQuality();
            let cullBehind = 50;
            let cullAhead = -600;
            
            if (quality === QualityLevel.LOW) {
                cullBehind = 30;
                cullAhead = -300;
            } else if (quality === QualityLevel.MEDIUM) {
                cullBehind = 40;
                cullAhead = -500;
            }
            
            const CULL_BEHIND = cullBehind;
            const CULL_AHEAD = cullAhead;

            let coinCount = 0, geneCount = 0, shieldCount = 0, boostCount = 0, magnetCount = 0;

            // PERF: Clear curve cache each frame
            curveCache.clear();

            for (let i = 0; i < pickups.length; i++) {
                const obj = pickups[i];
                if (!obj || !obj.active) continue;
                const worldZ = obj.position[2] + totalDist;
                if (worldZ > CULL_BEHIND || worldZ < CULL_AHEAD) continue;

                const curve = CurveHelper.getCurveAt(worldZ);

                _dummy.position.set(curve.x + obj.position[0], obj.position[1] + 0.8, worldZ);
                const pulse = 1.0 + Math.sin(time * 6 + i) * 0.12;
                _dummy.scale.setScalar(pulse);
                _dummy.rotation.set(0, time * 4 + i + curve.rotY, 0);

                if (obj.type === ObjectType.COIN) {
                    if (coinCount >= MAX_COUNT / 2) continue;
                    _dummy.scale.setScalar(0.9 * pulse);
                    _dummy.updateMatrix();
                    coinMeshRef.current?.setMatrixAt(coinCount++, _dummy.matrix);
                } else if (obj.type === ObjectType.GENE || obj.type === ObjectType.DNA_HELIX) {
                    if (geneCount >= MAX_COUNT / 4) continue;
                    _dummy.rotation.x = time * 2;
                    _dummy.updateMatrix();
                    geneMeshRef.current?.setMatrixAt(geneCount++, _dummy.matrix);
                } else if (obj.type === ObjectType.SHIELD) {
                    if (shieldCount >= MAX_COUNT / 8) continue;
                    _dummy.scale.setScalar(1.2 * pulse);
                    _dummy.updateMatrix();
                    shieldMeshRef.current?.setMatrixAt(shieldCount++, _dummy.matrix);
                } else if (obj.type === ObjectType.SPEED_BOOST) {
                    if (boostCount >= MAX_COUNT / 8) continue;
                    _dummy.rotation.x = Math.PI / 2;
                    _dummy.scale.set(0.8, 2.0, 0.8);
                    _dummy.updateMatrix();
                    boostMeshRef.current?.setMatrixAt(boostCount++, _dummy.matrix);
                } else if (obj.type === ObjectType.MAGNET) {
                    if (magnetCount >= MAX_COUNT / 8) continue;
                    _dummy.rotation.x = time * 3;
                    _dummy.updateMatrix();
                    magnetMeshRef.current?.setMatrixAt(magnetCount++, _dummy.matrix);
                }
            }

            if (coinMeshRef.current) coinMeshRef.current.count = coinCount;
            if (geneMeshRef.current) geneMeshRef.current.count = geneCount;
            if (shieldMeshRef.current) shieldMeshRef.current.count = shieldCount;
            if (boostMeshRef.current) boostMeshRef.current.count = boostCount;
            if (magnetMeshRef.current) magnetMeshRef.current.count = magnetCount;

            // PERF: Batch matrix updates
            [coinMeshRef, geneMeshRef, shieldMeshRef, boostMeshRef, magnetMeshRef].forEach(ref => {
                if (ref.current) scheduleMatrixUpdate(ref.current);
            });
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [pickupsRef, totalDistanceRef, MAX_COUNT, showOutlines, _dummy]);

    return (
        <group>
            {/* Pickups */}
            <instancedMesh ref={coinMeshRef} args={[coinGeo, coinMat, MAX_COUNT / 2]} frustumCulled={false} renderOrder={8}>
                {showOutlines && <Outlines thickness={0.05} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={geneMeshRef} args={[geneGeo, geneMat, MAX_COUNT / 4]} frustumCulled={false} renderOrder={8}>
                {showOutlines && <Outlines thickness={0.05} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={shieldMeshRef} args={[shieldGeo, shieldMat, MAX_COUNT / 8]} frustumCulled={false} renderOrder={8}>
                {showOutlines && <Outlines thickness={0.05} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={boostMeshRef} args={[boostGeo, boostMat, MAX_COUNT / 8]} frustumCulled={false} renderOrder={8}>
                {showOutlines && <Outlines thickness={0.05} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={magnetMeshRef} args={[magnetGeo, magnetMat, MAX_COUNT / 8]} frustumCulled={false} renderOrder={8}>
                {showOutlines && <Outlines thickness={0.05} color="#000000" />}
            </instancedMesh>
        </group>
    );
});


export default InstancedLevelObjects;
