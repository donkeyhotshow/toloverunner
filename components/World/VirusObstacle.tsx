/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VirusObstacles - REDESIGNED: Яркие мультяшные вирусы с лицами (Decals)
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, InstancedMesh, MeshBasicMaterial, MeshToonMaterial, DoubleSide, Vector3, Euler } from 'three';
import { GameObject, ObjectType } from '../../types';
import { SAFETY_CONFIG } from '../../constants';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { safeDispose } from '../../utils/errorHandler';
import { useRefSafety } from '../../utils/refSafetyHelper';

import { CurveHelper } from '../../core/utils/CurveHelper';
import { applyWorldBending } from './WorldBendingShader';
import { getDynamicCullingManager } from '../../infrastructure/rendering/DynamicCullingManager';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { useStore } from '../../store';
import { BIOME_CONFIG } from '../../constants';
import { debugError } from '../../utils/debug';

const _dummy = new Object3D();

interface VirusObstaclesProps {
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}

export const VirusObstacles: React.FC<VirusObstaclesProps> = React.memo(({ objectsRef, totalDistanceRef }) => {
    const biome = useStore(state => state.biome);
    const meshRef = useRef<InstancedMesh>(null);
    const spikesRef = useRef<InstancedMesh>(null);
    const shadowsRef = useRef<InstancedMesh>(null);
    const frameCounter = useRef(0);
    const spikeVecRef = useRef<Vector3>(new Vector3());
    const spikeEulerRef = useRef<Euler>(new Euler());

    // Ref safety helper
    const { areValid, withRefs } = useRefSafety();

    const MAX_COUNT = SAFETY_CONFIG.MAX_OBJECTS;

    // 📦 GEOMETRY POOL
    const geoPool = getGeometryPool();
    const settings = getPerformanceManager().getQualitySettings();

    // Standard virus face
    const faceGeo = useMemo(() => geoPool.getCylinderGeometry(
        0.6, 0.45, 0.4,
        Math.max(6, Math.round(12 * settings.segmentsMultiplier)), 1, false
    ), [geoPool, settings.segmentsMultiplier]);

    // Spikes (High LOD only if Ultra)
    const spikeGeo = useMemo(() => geoPool.getSphereGeometry(
        0.2,
        Math.max(8, Math.round(16 * settings.segmentsMultiplier)),
        Math.max(6, Math.round(12 * settings.segmentsMultiplier))
    ), [geoPool, settings.segmentsMultiplier]);

    // Eye geometry
    const eyeGeo = useMemo(() => geoPool.getSphereGeometry(0.12, 8, 8), [geoPool]);

    // Pulse geometry
    const pulseGeo = useMemo(() => geoPool.getTorusGeometry(
        0.8, 0.05,
        Math.max(8, Math.round(16 * settings.segmentsMultiplier)),
        Math.max(6, Math.round(12 * settings.segmentsMultiplier))
    ), [geoPool, settings.segmentsMultiplier]);

    // 🦠 Основное тело вируса - ШАР
    const virusGeo = useMemo(() => geoPool.getSphereGeometry(
        0.4,
        Math.max(12, Math.round(16 * settings.segmentsMultiplier)),
        Math.max(12, Math.round(16 * settings.segmentsMultiplier))
    ), [geoPool, settings.segmentsMultiplier]);

    const shadowGeo = useMemo(() => geoPool.getCircleGeometry(
        0.4,
        Math.max(12, Math.round(16 * settings.segmentsMultiplier))
    ), [geoPool, settings.segmentsMultiplier]);

    // Muzzle Outer (Green)
    const muzzleGeo = useMemo(() => {
        const radSegments = Math.max(6, Math.round(8 * settings.segmentsMultiplier));
        const geo = geoPool.getCylinderGeometry(0.5, 0.35, 0.6, radSegments);
        geo.rotateX(-Math.PI / 2); // Point forward
        return geo;
    }, [geoPool, settings.segmentsMultiplier]);

    // Muzzle Inner (Black Void)
    const voidGeo = useMemo(() => {
        const radSegments = Math.max(6, Math.round(8 * settings.segmentsMultiplier));
        const geo = geoPool.getCircleGeometry(0.35, radSegments);
        return geo;
    }, [geoPool, settings.segmentsMultiplier]);

    const faceFeatureMat = useMemo(() => new MeshBasicMaterial({ color: '#000000' }), []);

    // Refs for face parts
    const eyeLeftRef = useRef<InstancedMesh>(null);
    const eyeRightRef = useRef<InstancedMesh>(null);
    const muzzleRef = useRef<InstancedMesh>(null); // Green part
    const voidRef = useRef<InstancedMesh>(null);   // Black part

    // 🎨 BLACK OBSTACLES: Dark obstacles
    const virusMaterialGreen = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#1a1a1a', // ⬛ Dark Black
            emissive: '#220022', // Subtle dark purple glow
            emissiveIntensity: 0.15 // LOW intensity
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    const shadowMaterial = useMemo(() => new MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.3,
        side: DoubleSide
    }), []);

    const spikeMaterialGreen = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#0d0d0d', // ⬛ Very dark spikes
            emissive: '#000000', // No emission
            emissiveIntensity: 0.0,
        });
        applyWorldBending(mat);
        return mat;
    }, []);

      const pm = getPerformanceManager();

    useEffect(() => {
        try {
            const cfg = BIOME_CONFIG[biome];
            virusMaterialGreen.color.set(cfg.glowColor);
            virusMaterialGreen.emissive.set(cfg.wallColor);
            virusMaterialGreen.emissiveIntensity = 0.15;
            spikeMaterialGreen.color.set(cfg.glowColor);
            spikeMaterialGreen.emissive.set(cfg.wallColor);
            spikeMaterialGreen.emissiveIntensity = 0.15;
        } catch (e) {
            debugError('[VirusObstacles] Error updating biome config:', e);
        }
    }, [biome, virusMaterialGreen, spikeMaterialGreen]);

    useEffect(() => {
        return () => {
            geoPool.release(virusGeo);
            geoPool.release(spikeGeo);
            geoPool.release(shadowGeo);
            geoPool.release(eyeGeo);
            geoPool.release(faceGeo);
            geoPool.release(pulseGeo);
            geoPool.release(muzzleGeo);
            geoPool.release(voidGeo);

            safeDispose(virusMaterialGreen);
            safeDispose(spikeMaterialGreen);
            safeDispose(faceFeatureMat);
            safeDispose(shadowMaterial);
        };
    }, [geoPool, virusGeo, spikeGeo, shadowGeo, eyeGeo, faceGeo, pulseGeo, muzzleGeo, voidGeo, virusMaterialGreen, spikeMaterialGreen, faceFeatureMat, shadowMaterial]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            // Use safe ref checking
            const refs = {
                meshRef,
                spikesRef,
                eyeLeftRef,
                eyeRightRef,
                muzzleRef,
                voidRef,
                shadowsRef
            };

            withRefs(refs, (validRefs) => {
                frameCounter.current++;

                const playerState = useStore.getState().localPlayerState;
                const pX = playerState.position[0];
                const objects = objectsRef.current;
                const totalDist = totalDistanceRef.current;

            let count = 0;
            let totalSpikeCount = 0;

            // P-1 FIX: hoist culling limit before the loop (was called per-object)
            const CULL_LIMIT = getDynamicCullingManager().getSettings().objectCullDistance || 30;

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || obj.type !== ObjectType.OBSTACLE || !obj.active) continue;
                // Compute world Z and curve for this object so it follows the road
                const worldZ = obj.position[2] + totalDist;
                const curve = CurveHelper.getCurveAt(worldZ);

                if (worldZ > CULL_LIMIT || worldZ < -150) continue;

                // 🎭 SPAWN FADE-IN
                const spawnDistance = 15;
                const fadeInDistance = 3;
                let spawnScale = 1.0;

                if (worldZ > spawnDistance - fadeInDistance && worldZ <= spawnDistance) {
                    const fadeProgress = (spawnDistance - worldZ) / fadeInDistance;
                    spawnScale = Math.min(1.0, fadeProgress);
                    spawnScale = spawnScale * spawnScale;
                }

                // 🌊 FLOATING ANIMATION (position follows curve)
                const floatOffset = Math.sin(time * 1.0 + i * 0.5) * 0.45; // 🐌 MEASURED: speed 1.8 -> 1.0
                const baseLocalY = (obj.position && obj.position[1]) ? obj.position[1] : 0;
                // Position on X follows curve.x + local X offset
                const virusX = curve.x + (obj.position ? obj.position[0] : 0);
                // Y follows curve.y + baseLocalY + float offset (sits on road surface)
                const virusY = curve.y + baseLocalY + 0.8 + floatOffset;

                // Scale & Rotation - MEASURED BREATHING
                const breathingScale = 1.0 + Math.sin(time * 1.2 + i) * 0.43; // 🐌 MEASURED: freq 2.5 -> 1.2
                const s = breathingScale * 0.35 * spawnScale; 

                // Rotations
                const rotX = Math.sin(time * 0.5 + i) * 0.1;
                const rotY = -Math.PI / 2 + Math.sin(time * 0.3) * 0.2;
                const rotZ = Math.cos(time * 0.4 + i) * 0.1;

                // 🎭 REACTIVITY: FOLLOW PLAYER (Eyes track player X)
                const distToPlayer = Math.abs(worldZ - 0);
                const isNear = distToPlayer < 12.0;
                
                // Track player X with limit
                // const targetRotY = -Math.PI / 2 + MathUtils.clamp((pX - localX) * 0.2, -0.6, 0.6); // localX is not defined
                const targetRotY = -Math.PI / 2 + Math.max(-0.6, Math.min(0.6, (pX - virusX) * 0.2)); // Using virusX as localX
                const currentRotY = isNear ? rotY + (targetRotY - rotY) * 0.2 : rotY + (targetRotY - rotY) * 0.05; // Simplified lerp

                _dummy.position.set(virusX, virusY, worldZ);
                _dummy.scale.setScalar(s);
                _dummy.rotation.set(rotX, currentRotY, rotZ);
                _dummy.updateMatrix();
                validRefs.meshRef.setMatrixAt(count, _dummy.matrix);

                // Update face parts using validRefs
                const updatePart = (mesh: InstancedMesh, x: number, y: number, z: number, sx: number = 1, sy: number = 1, sz: number = 1) => {
                    _dummy.position.set(virusX, virusY, worldZ);
                    _dummy.rotation.set(rotX, currentRotY, rotZ);
                    _dummy.scale.setScalar(s);

                    _dummy.translateX(x);
                    _dummy.translateY(y);
                    _dummy.translateZ(z);

                    _dummy.scale.set(s * sx * spawnScale, s * sy * spawnScale, s * sz * spawnScale);
                    _dummy.updateMatrix();
                    mesh.setMatrixAt(count, _dummy.matrix);
                };

                updatePart(validRefs.eyeLeftRef, 0.75, 0.35, 0.35, 0.9, 0.9, 0.9);
                updatePart(validRefs.eyeRightRef, 0.75, 0.35, -0.35, 0.9, 0.9, 0.9);
                updatePart(validRefs.muzzleRef, 0.9, -0.1, 0);

                // Update void part using validRefs
                _dummy.position.set(virusX, virusY, worldZ);
                _dummy.rotation.set(rotX, currentRotY, rotZ);
                _dummy.scale.setScalar(s);
                _dummy.translateX(1.21);
                _dummy.translateY(-0.1);
                _dummy.rotateY(Math.PI / 2);
                _dummy.scale.set(s * spawnScale, s * spawnScale, s * spawnScale);
                _dummy.updateMatrix();
                validRefs.voidRef.setMatrixAt(count, _dummy.matrix);

                // SHADOW using validRefs
                _dummy.position.set(virusX, 0.01, worldZ);
                _dummy.rotation.set(-Math.PI / 2, 0, 0);
                _dummy.scale.setScalar(1.2 * s);
                _dummy.updateMatrix();
                validRefs.shadowsRef.setMatrixAt(count, _dummy.matrix);

                // 🔺 Шипы вокруг вируса
                const spikeCountPerVirus = 20;
                const goldenRatio = (1 + Math.sqrt(5)) / 2;
                let actualSpikeCountForThisVirus = 0;
                const _spikeVec = spikeVecRef.current;
                const _spikeEuler = spikeEulerRef.current;

                for (let j = 0; j < spikeCountPerVirus; j++) {
                    const theta = 2 * Math.PI * j / goldenRatio;
                    const phi = Math.acos(1 - 2 * (j + 0.5) / spikeCountPerVirus);

                    const sx = Math.cos(theta) * Math.sin(phi);
                    const sy = Math.sin(theta) * Math.sin(phi);
                    const sz = Math.cos(phi);

                    if (sz > 0.6) continue;

                    const radius = s * 0.95;
                    _spikeVec.set(sx, sy, sz);
                    _spikeEuler.set(rotX, rotY, rotZ);
                    _spikeVec.applyEuler(_spikeEuler);

                    const spikeX = virusX + _spikeVec.x * radius;
                    const spikeY = virusY + _spikeVec.y * radius;
                    const spikeWorldZ = worldZ + _spikeVec.z * radius;

                    _dummy.position.set(virusX, virusY, worldZ);
                    _dummy.lookAt(spikeX, spikeY, spikeWorldZ);
                    _dummy.position.set(spikeX, spikeY, spikeWorldZ);
                    _dummy.rotateX(Math.PI / 2);

                    // Reset scale for spike (relative to body scale)
                    _dummy.scale.set(s * 0.8, s * 1.5, s * 0.8);
                    _dummy.updateMatrix();

                    const spikeIndex = totalSpikeCount + actualSpikeCountForThisVirus;
                    if (spikeIndex < MAX_COUNT * 20) { // MAX_COUNT * 20 is the max capacity for spikes
                        validRefs.spikesRef.setMatrixAt(spikeIndex, _dummy.matrix);
                        actualSpikeCountForThisVirus++;
                    }
                }
                totalSpikeCount += actualSpikeCountForThisVirus;

                count++;
                if (count >= MAX_COUNT) break;
            }

            validRefs.meshRef.count = count;
            validRefs.spikesRef.count = totalSpikeCount;
            validRefs.eyeLeftRef.count = count;
            validRefs.eyeRightRef.count = count;
            validRefs.muzzleRef.count = count;
            validRefs.voidRef.count = count;
            validRefs.shadowsRef.count = count;

            scheduleMatrixUpdate(validRefs.meshRef);
            scheduleMatrixUpdate(validRefs.spikesRef);
            scheduleMatrixUpdate(validRefs.eyeLeftRef);
            scheduleMatrixUpdate(validRefs.eyeRightRef);
            scheduleMatrixUpdate(validRefs.muzzleRef);
            scheduleMatrixUpdate(validRefs.voidRef);
            scheduleMatrixUpdate(validRefs.shadowsRef);
            }); // Close withRefs
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [objectsRef, totalDistanceRef, MAX_COUNT]);

    return (
        <group>
            {/* Shadows */}
            <instancedMesh ref={shadowsRef} args={[shadowGeo, shadowMaterial, MAX_COUNT]} />

            {/* Body */}
            <instancedMesh
                ref={meshRef}
                args={[virusGeo, virusMaterialGreen, MAX_COUNT]}
                castShadow
                receiveShadow
                renderOrder={5}
            >
            </instancedMesh>


            {/* Face Parts */}
            <instancedMesh ref={eyeLeftRef} args={[eyeGeo, faceFeatureMat, MAX_COUNT]} />
            <instancedMesh ref={eyeRightRef} args={[eyeGeo, faceFeatureMat, MAX_COUNT]} />

            {/* Muzzle (Green Body) */}
            <instancedMesh
                ref={muzzleRef}
                args={[muzzleGeo, virusMaterialGreen, MAX_COUNT]}
                renderOrder={5}
            >
            </instancedMesh>


            {/* Muzzle (Black Void) */}
            <instancedMesh ref={voidRef} args={[voidGeo, faceFeatureMat, MAX_COUNT]} renderOrder={6} />

            {/* Spikes */}
            <instancedMesh
                ref={spikesRef}
                args={[spikeGeo, spikeMaterialGreen, MAX_COUNT * 20]}
                castShadow
            />
        </group>
    );
});

VirusObstacles.displayName = 'VirusObstacles';
export default VirusObstacles;
