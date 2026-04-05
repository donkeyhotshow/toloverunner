import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Object3D, MeshToonMaterial } from 'three';

import { GameObject, ObjectType } from '../../types';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { CurveHelper } from '../../core/utils/CurveHelper';
import { applyWorldBending } from './WorldBendingShader';
import { getDynamicCullingManager } from '../../infrastructure/rendering/DynamicCullingManager';

export const BiologicEnemiesRenderer: React.FC<{
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}> = React.memo(({ objectsRef, totalDistanceRef }) => {
    const wormMeshRef = useRef<InstancedMesh>(null);
    const bacteriaMeshRef = useRef<InstancedMesh>(null);
    const virusMeshRef = useRef<InstancedMesh>(null);
    const immuneMeshRef = useRef<InstancedMesh>(null);
    const membraneMeshRef = useRef<InstancedMesh>(null);
    const eyeMeshRef = useRef<InstancedMesh>(null); // NEW: Face parts for enemies
    const pupilMeshRef = useRef<InstancedMesh>(null);

    const MAX_COUNT = 60; // Max active meshes per type

    const _dummy = useMemo(() => new Object3D(), []);

    // Geometries
    // 📦 GEOMETRY POOL
    const geoPool = getGeometryPool();
    const settings = getPerformanceManager().getQualitySettings();
    const segmentsMultiplier = settings.segmentsMultiplier;

    // Reusable Geometries with LOD
    const wormBodyGeo = useMemo(() => geoPool.getDodecahedronGeometry(1.0, 0), [geoPool]); // Dodecahedron doesn't scale segments easily here
    const bacteriaBodyGeo = useMemo(() => geoPool.getDodecahedronGeometry(1, 0), [geoPool]);
    const virusGeo = useMemo(() => geoPool.getIcosahedronGeometry(1, 1), [geoPool]);
    const immuneCellGeo = useMemo(() => geoPool.getSphereGeometry(
        1,
        Math.max(16, Math.round(16 * segmentsMultiplier)),
        Math.max(16, Math.round(16 * segmentsMultiplier))
    ), [geoPool, segmentsMultiplier]);
    const membraneGeo = useMemo(() => geoPool.getBoxGeometry(1, 1, 1), [geoPool]);
    const eyeGeo = useMemo(() => geoPool.getSphereGeometry(
        0.3,
        Math.max(12, Math.round(12 * segmentsMultiplier)),
        Math.max(12, Math.round(12 * segmentsMultiplier))
    ), [geoPool, segmentsMultiplier]);
    const pupilGeo = useMemo(() => geoPool.getSphereGeometry(
        0.12,
        Math.max(8, Math.round(8 * segmentsMultiplier)),
        Math.max(8, Math.round(8 * segmentsMultiplier))
    ), [geoPool, segmentsMultiplier]);

    // Materials - MATTE COMIC COLORS (No emissive glow)
    const wormMat = useMemo(() => {
        const mat = new MeshToonMaterial({ 
            color: '#8B2323', // Matte dark red
        }); // RED GLOBUS - no emissive
        applyWorldBending(mat); return mat;
    }, []);
    const bacteriaMat = useMemo(() => {
        const mat = new MeshToonMaterial({ 
            color: '#3d6b3d', // Matte olive green
        }); // GREEN - no emissive
        applyWorldBending(mat); return mat;
    }, []);
    const virusMat = useMemo(() => {
        const mat = new MeshToonMaterial({ 
            color: '#4a7a4a', // Matte green
        }); // GREEN VIRUS - no emissive
        applyWorldBending(mat); return mat;
    }, []);
    const immuneMat = useMemo(() => {
        const mat = new MeshToonMaterial({ 
            color: '#D3D3D3', // Matte light gray
        });
        applyWorldBending(mat); return mat;
    }, []);
    const membraneMat = useMemo(() => {
        const mat = new MeshToonMaterial({ 
            color: '#4682B4', // Matte steel blue
            transparent: true, 
            opacity: 0.5, 
        });
        applyWorldBending(mat); return mat;
    }, []);
    const faceMat = useMemo(() => new MeshToonMaterial({ color: '#FFFFFF' }), []);
    const pupilMat = useMemo(() => new MeshToonMaterial({ color: '#000000' }), []);

    useEffect(() => {
        return () => {
            geoPool.release(wormBodyGeo);
            geoPool.release(bacteriaBodyGeo);
            geoPool.release(virusGeo);
            geoPool.release(immuneCellGeo);
            geoPool.release(membraneGeo);
            geoPool.release(eyeGeo);
            geoPool.release(pupilGeo);
            safeDispose(wormMat);
            safeDispose(bacteriaMat);
            safeDispose(virusMat);
            safeDispose(immuneMat);
            safeDispose(membraneMat);
            safeDispose(faceMat);
            safeDispose(pupilMat);
        };
    }, [geoPool, wormBodyGeo, bacteriaBodyGeo, virusGeo, immuneCellGeo, membraneGeo, eyeGeo, pupilGeo, wormMat, bacteriaMat, virusMat, immuneMat, membraneMat, faceMat, pupilMat]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            const objects = objectsRef.current;
            const totalDist = totalDistanceRef.current;
            const cullLimit = getDynamicCullingManager().getSettings().objectCullDistance || 40;

            let wormCount = 0, bacteriaCount = 0, virusCount = 0, immuneCount = 0, membraneCount = 0;

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || !obj.active) continue;

                const worldZ = obj.position[2] + totalDist;
                if (worldZ > cullLimit || worldZ < -250) continue;

                const curve = CurveHelper.getCurveAt(worldZ);
                const localX = obj.position ? obj.position[0] : 0;
                const localY = obj.position ? obj.position[1] : 0;
                
                _dummy.position.set(curve.x + localX, curve.y + localY, worldZ);
                _dummy.rotation.set(0, 0, 0);
                const phase = (obj.id?.length ?? i) % 10;

                // Визначаємо за типом, до якого мешу відноситься об'єкт
                const type = obj.type;

                // 🪱 ГЕЛЬМІНТИ
                if (type === ObjectType.GLOBUS_NORMAL || type === ObjectType.GLOBUS_ANGRY || type === ObjectType.GLOBUS_BOSS) {
                    if (wormCount >= MAX_COUNT) continue;
                    
                    if (type === ObjectType.GLOBUS_BOSS) {
                        _dummy.scale.set(4.5, 2.0, 12.0);
                        _dummy.position.y = curve.y + 1.0;
                    } else {
                        // GLOBUS_NORMAL / ANGRY
                        _dummy.scale.set(2.2, 1.5, 8.0);
                        _dummy.position.y = curve.y + 0.75;
                    }

                    if (type === ObjectType.GLOBUS_ANGRY) {
                        _dummy.position.x += Math.sin(time * 10 + phase) * 0.1; // Vibration
                    }

                    _dummy.rotation.y = curve.rotY;
                    _dummy.updateMatrix();
                    wormMeshRef.current?.setMatrixAt(wormCount++, _dummy.matrix);

                    // 👹 ADD FACE (GLOBUS)
                    const eyeIdx = (wormCount - 1) * 2;
                    // Position relative to body
                    const faceX = _dummy.position.x;
                    const faceY = _dummy.position.y + 0.3;
                    const faceZ = _dummy.position.z + 1.1; // Forward

                    // Left Eye
                    _dummy.position.set(faceX - 0.4, faceY, faceZ);
                    _dummy.scale.setScalar(0.35);
                    _dummy.updateMatrix();
                    eyeMeshRef.current?.setMatrixAt(eyeIdx, _dummy.matrix);
                    
                    _dummy.position.z += 0.1; // Pupil slightly forward
                    _dummy.scale.setScalar(0.12);
                    _dummy.updateMatrix();
                    pupilMeshRef.current?.setMatrixAt(eyeIdx, _dummy.matrix);

                    // Right Eye
                    _dummy.position.set(faceX + 0.4, faceY, faceZ);
                    _dummy.scale.setScalar(0.35);
                    _dummy.updateMatrix();
                    eyeMeshRef.current?.setMatrixAt(eyeIdx + 1, _dummy.matrix);

                    _dummy.position.z += 0.1;
                    _dummy.scale.setScalar(0.12);
                    _dummy.updateMatrix();
                    pupilMeshRef.current?.setMatrixAt(eyeIdx + 1, _dummy.matrix);
                } 
                // 🦠 ПРОКАРІОТИ
                else if (type === ObjectType.BACTERIA_LOW || type === ObjectType.BACTERIA_MID || 
                         type === ObjectType.BACTERIA_WALL || type === ObjectType.BACTERIA_HAPPY) {
                    if (bacteriaCount >= MAX_COUNT) continue;
                    
                    const breathe = 1.0 + Math.sin(time * 3 + phase) * 0.1;
                    if (type === ObjectType.BACTERIA_WALL) {
                        _dummy.scale.set(3.0 * breathe, 4.0 * breathe, 2.0 * breathe); // Higher wall
                        _dummy.position.y = curve.y + 2.0;
                        _dummy.rotation.z = Math.sin(time + phase) * 0.1;
                    } else if (type === ObjectType.BACTERIA_LOW) {
                        _dummy.scale.set(1.5 * breathe, 0.8 * breathe, 1.5 * breathe); // Low obstacle
                        _dummy.position.y = curve.y + 0.4;
                    } else {
                        _dummy.scale.set(1.8 * breathe, 1.2 * breathe, 1.8 * breathe);
                        _dummy.position.y = curve.y + 0.6;
                    }

                    _dummy.updateMatrix();
                    bacteriaMeshRef.current?.setMatrixAt(bacteriaCount++, _dummy.matrix);
                }
                // 🔴 ПАТОГЕНИ (ВИРУСЫ)
                else if ((type as ObjectType) === ObjectType.VIRUS_KILLER_LOW || (type as ObjectType) === ObjectType.VIRUS_KILLER_HIGH || (type as ObjectType) === ObjectType.VIRUS_KILLER) {
                    if (virusCount >= MAX_COUNT) continue;
                    
                    if (type === ObjectType.VIRUS_KILLER_HIGH) {
                        _dummy.scale.set(3.0, 3.0, 3.0);
                        _dummy.position.y = curve.y + 2.0; // Higher
                    } else {
                        _dummy.scale.set(2.0, 2.0, 2.0);
                        _dummy.position.y = curve.y + 1.0;
                    }

                    _dummy.rotation.set(time * 2, time * 2.5, 0);
                    _dummy.updateMatrix();
                    virusMeshRef.current?.setMatrixAt(virusCount++, _dummy.matrix);
                }
                // ⚪ ЗАХИСНИКИ
                else if (type === ObjectType.IMMUNE_PATROL) {
                    if (immuneCount >= MAX_COUNT) continue;
                    
                    _dummy.scale.set(2.5, 2.5, 2.5);
                    _dummy.position.y = curve.y + 1.25;

                    _dummy.position.x += Math.sin(time + phase) * 1.5; // Drift
                    _dummy.rotation.set(0, time, 0);
                    _dummy.updateMatrix();
                    immuneMeshRef.current?.setMatrixAt(immuneCount++, _dummy.matrix);
                }
                // 🔵 СТРУКТУРИ
                else if (type === ObjectType.MEMBRANE_WALL || type === ObjectType.CELL_MEMBRANE) {
                    if (membraneCount >= MAX_COUNT) continue;
                    
                    _dummy.position.y = curve.y + 2.0;
                    _dummy.scale.set(5.5, 4.0, 0.5); // Wall shape
                    _dummy.rotation.y = curve.rotY;
                    _dummy.updateMatrix();
                    membraneMeshRef.current?.setMatrixAt(membraneCount++, _dummy.matrix);
                }
            }

            if (wormMeshRef.current) { wormMeshRef.current.count = wormCount; scheduleMatrixUpdate(wormMeshRef.current); }
            if (bacteriaMeshRef.current) { bacteriaMeshRef.current.count = bacteriaCount; scheduleMatrixUpdate(bacteriaMeshRef.current); }
            if (virusMeshRef.current) { virusMeshRef.current.count = virusCount; scheduleMatrixUpdate(virusMeshRef.current); }
            if (immuneMeshRef.current) { immuneMeshRef.current.count = immuneCount; scheduleMatrixUpdate(immuneMeshRef.current); }
            if (membraneMeshRef.current) { membraneMeshRef.current.count = membraneCount; scheduleMatrixUpdate(membraneMeshRef.current); }
            
            // Sync eye counts (Simplified: any biologic which is not membrane gets eyes?)
            // For now let's just use the wormCount as base for face parts if we implemented specific logic.
            // Simplified: only Globus (wormRef) gets eyes for now in this pass
            if (eyeMeshRef.current) { eyeMeshRef.current.count = wormCount * 2; scheduleMatrixUpdate(eyeMeshRef.current); }
            if (pupilMeshRef.current) { pupilMeshRef.current.count = wormCount * 2; scheduleMatrixUpdate(pupilMeshRef.current); }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, MAX_COUNT, _dummy]);

    return (
        <group>
            <instancedMesh ref={wormMeshRef} args={[wormBodyGeo, wormMat, MAX_COUNT]} frustumCulled={false} />

            <instancedMesh ref={bacteriaMeshRef} args={[bacteriaBodyGeo, bacteriaMat, MAX_COUNT]} frustumCulled={false} />

            <instancedMesh ref={virusMeshRef} args={[virusGeo, virusMat, MAX_COUNT]} frustumCulled={false} />

            <instancedMesh ref={immuneMeshRef} args={[immuneCellGeo, immuneMat, MAX_COUNT]} frustumCulled={false} />

            <instancedMesh ref={membraneMeshRef} args={[membraneGeo, membraneMat, MAX_COUNT]} frustumCulled={false} />

            
            {/* NEW: Enemy Faces */}
            <instancedMesh ref={eyeMeshRef} args={[eyeGeo, faceMat, MAX_COUNT * 2]} frustumCulled={false} />
            <instancedMesh ref={pupilMeshRef} args={[pupilGeo, pupilMat, MAX_COUNT * 2]} frustumCulled={false} />
        </group>
    );
});
