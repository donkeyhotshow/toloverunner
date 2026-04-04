/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewObstaclesRenderer - Renders specialized obstacles (Jump, Slide, Dodge)
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Object3D, MeshToonMaterial, Color } from 'three';
import { SelectiveOutline } from './SelectiveOutline';
import { GameObject, ObjectType, BiomeType, BiomeConfig } from '../../types';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { CurveHelper } from '../../core/utils/CurveHelper';
import { applyWorldBending } from './WorldBendingShader';
import { getDynamicCullingManager } from '../../infrastructure/rendering/DynamicCullingManager';
import { useStore } from '../../store';
import { BIOME_CONFIG } from '../../constants';

export const NewObstaclesRenderer: React.FC<{
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}> = React.memo(({ objectsRef, totalDistanceRef }) => {

    // InstaMesh Refs
    const jumpMeshRef = useRef<InstancedMesh>(null);
    const slideMeshRef = useRef<InstancedMesh>(null);
    const dodgeMeshRef = useRef<InstancedMesh>(null);

    const MAX_COUNT = 100; // Cap for special obstacles
    const pm = getPerformanceManager();
    const showOutlines = pm.getCurrentQuality() >= QualityLevel.MEDIUM;

    const _dummy = useMemo(() => new Object3D(), []);

    // --- GEOMETRY & MATERIALS ---
    const geoPool = getGeometryPool();
    const segmentsMultiplier = getPerformanceManager().getQualitySettings().segmentsMultiplier;

    // 1. JUMP: Calcified Bone Spikes (цвет из биома)
    const jumpGeo = useMemo(() => geoPool.getConeGeometry(
        0.3, 1.2, 
        Math.max(6, Math.round(8 * segmentsMultiplier)), 1, false
    ), [geoPool, segmentsMultiplier]);

    const jumpMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#F5F5DC', // ⚪ Bone/Beige
            emissive: '#4a0000', // 🩸 Subtle blood glow
            emissiveIntensity: 0.2
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    // 2. SLIDE: Mucus Vines (цвет из биома)
    const slideGeo = useMemo(() => geoPool.getDodecahedronGeometry(0.4, 0), [geoPool]);
    const slideMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#DAA520', // 🍯 Golden Mucus
            emissive: '#8B4513',
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.7
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    // 3. DODGE: Muscle Wall (цвет из биома)
    const dodgeGeo = useMemo(() => geoPool.getBoxGeometry(0.9, 3.2, 0.5), [geoPool]);
    const dodgeMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#CD5C5C', // 🥩 Muscle Red
            emissive: '#2a0000',
            emissiveIntensity: 0.3
        });
        applyWorldBending(mat);
        return mat;
    }, []);


    useEffect(() => {
        return () => {
            geoPool.release(jumpGeo);
            geoPool.release(slideGeo);
            geoPool.release(dodgeGeo);
            safeDispose(jumpMat);
            safeDispose(slideMat);
            safeDispose(dodgeMat);
        };
    }, [geoPool, jumpGeo, slideGeo, dodgeGeo, jumpMat, slideMat, dodgeMat]);

    // Tint materials by biome (единая стилистика из палитры биома)
    const biome = useStore(state => state.biome as BiomeType);
     
    useEffect(() => {
        try {
            const cfg: BiomeConfig | undefined = BIOME_CONFIG[biome];
            if (!cfg) return;
            // 🩸 Maintain partial biological white but tint with biome
            jumpMat.color.set(cfg.roadColor).lerp(new Color('#FFFFFF'), 0.5);
            jumpMat.emissive.set(cfg.glowColor).multiplyScalar(0.2);
            
            slideMat.color.set(cfg.accentColor).lerp(new Color('#FFFFFF'), 0.4);
            slideMat.emissive.set(cfg.glowColor).multiplyScalar(0.2);
            
            dodgeMat.color.set(cfg.wallColor).lerp(new Color('#FFFFFF'), 0.6);
            dodgeMat.emissive.set(cfg.glowColor).multiplyScalar(0.2);
        } catch {
            // ignore
        }
    }, [biome, jumpMat, slideMat, dodgeMat]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            const state = useStore.getState();
            const objects = objectsRef.current;
            const totalDist = totalDistanceRef.current;
            const pX = state.localPlayerState.position[0];

            let jumpCount = 0;
            let slideCount = 0;
            let dodgeCount = 0;

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || !obj.active) continue;

                // Culling
                const worldZ = obj.position[2] + totalDist;
                const cullLimit = getDynamicCullingManager().getSettings().objectCullDistance || 30;
                if (worldZ > cullLimit || worldZ < -250) continue;

                // Position Setup (align to track curve)
                const curve = CurveHelper.getCurveAt(worldZ);
                const localX = obj.position ? obj.position[0] : 0;
                const localY = obj.position ? obj.position[1] : 0;
                _dummy.position.set(curve.x + localX, curve.y + localY, worldZ);
                _dummy.rotation.set(0, 0, 0);
                _dummy.scale.setScalar(1.0);

                // --- BIOLOGICAL REACTIVITY ---
                // Distance to player head/body (Z=0 in local, shifted by totalDist)
                const distToPlayer = Math.abs(worldZ - 0); 
                const isNear = distToPlayer < 12.0;
                const laneMatch = Math.abs(localX - pX) < 1.5;

                // --- JUMP OBSTACLE (Spike) ---
                if (obj.type === ObjectType.OBSTACLE_JUMP) {
                    if (jumpCount >= MAX_COUNT) continue;

                    _dummy.position.y = curve.y + 0.6;
                    const phase = (obj.id?.length ?? i) % 10;
                    let scaleH = (obj.height != null && obj.height > 0) ? obj.height : 1;
                    let scaleW = (obj.width != null && obj.width > 0) ? obj.width : 1;
                    
                    // 🩸 REACTIVITY: Sharpen when player in same lane and near
                    if (isNear && laneMatch) {
                        scaleH *= 1.3;
                        scaleW *= 0.7;
                    }

                    const scalePulse = 1.0 + Math.sin(time * 4 + phase) * 0.08;
                    _dummy.scale.set(0.3 * scaleW * scalePulse, 1.2 * scaleH, 0.3 * scaleW * scalePulse);
                    _dummy.rotation.y = time * 0.5 + phase * 0.7;

                    _dummy.updateMatrix();
                    jumpMeshRef.current?.setMatrixAt(jumpCount++, _dummy.matrix);
                }
                // --- SLIDE OBSTACLE (Vines) ---
                else if (obj.type === ObjectType.OBSTACLE_SLIDE) {
                    if (slideCount >= MAX_COUNT) continue;

                    _dummy.position.y = curve.y + 2.2;
                    const phase = (obj.id?.length ?? i) % 10;
                    
                    // 🩸 REACTIVITY: Drip/Wobble faster if player passes under
                    const speedMult = (isNear && laneMatch) ? 4.0 : 1.0;
                    const sway = Math.sin(time * (2 * speedMult) + phase) * (0.25 * speedMult);
                    _dummy.rotation.set(0, 0, sway);

                    const len = (obj.width != null && obj.width > 0) ? obj.width : 1;
                    _dummy.scale.set(3.5 * len, 0.6, 0.6);

                    _dummy.updateMatrix();
                    slideMeshRef.current?.setMatrixAt(slideCount++, _dummy.matrix);
                }
                // --- DODGE OBSTACLE (Muscle Wall) ---
                else if (obj.type === ObjectType.OBSTACLE_DODGE) {
                    if (dodgeCount >= MAX_COUNT) continue;

                    _dummy.position.y = curve.y + 1.6;
                    const phase = (obj.id?.length ?? i) % 10;
                    
                    let w = (obj.width != null && obj.width > 0) ? obj.width : 1;
                    let h = (obj.height != null && obj.height > 0) ? obj.height : 1;
                    
                    // 🩸 REACTIVITY: Contraction (Tense up)
                    if (isNear && laneMatch) {
                        w *= 0.8;
                        h *= 1.1;
                    }

                    const breathe = 1.0 + Math.sin(time * 5 + phase) * 0.04;
                    _dummy.scale.set(0.9 * w * breathe, 3.2 * h, 0.5);
                    _dummy.rotation.y = Math.sin(time * 0.5 + phase) * 0.06;

                    _dummy.updateMatrix();
                    dodgeMeshRef.current?.setMatrixAt(dodgeCount++, _dummy.matrix);
                }
            }

            if (jumpMeshRef.current) {
                jumpMeshRef.current.count = jumpCount;
                scheduleMatrixUpdate(jumpMeshRef.current);
            }
            if (slideMeshRef.current) {
                slideMeshRef.current.count = slideCount;
                scheduleMatrixUpdate(slideMeshRef.current);
            }
            if (dodgeMeshRef.current) {
                dodgeMeshRef.current.count = dodgeCount;
                scheduleMatrixUpdate(dodgeMeshRef.current);
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, MAX_COUNT, _dummy]);

    return (
        <group>
            <instancedMesh ref={jumpMeshRef} args={[jumpGeo, jumpMat, MAX_COUNT]} frustumCulled={true}>
                {showOutlines && <SelectiveOutline thickness={0.12} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={slideMeshRef} args={[slideGeo, slideMat, MAX_COUNT]} frustumCulled={true}>
                {showOutlines && <SelectiveOutline thickness={0.08} color="#000000" />}
            </instancedMesh>
            <instancedMesh ref={dodgeMeshRef} args={[dodgeGeo, dodgeMat, MAX_COUNT]} frustumCulled={true}>
                {showOutlines && <SelectiveOutline thickness={0.18} color="#000000" />}
            </instancedMesh>
        </group>
    );
});
