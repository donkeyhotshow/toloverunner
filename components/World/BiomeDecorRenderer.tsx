/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BiomeDecorRenderer - Renders ambient roadside objects
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, InstancedMesh, MeshToonMaterial } from 'three';
import { BiomeType } from '../../types';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';

import { CurveHelper } from '../../core/utils/CurveHelper';
import { applyWorldBending } from './WorldBendingShader';
import { BIOME_CONFIG } from '../../constants';
import { useStore } from '../../store';

interface BiomeDecorProps {
    biome: BiomeType;
    totalDistanceRef: React.MutableRefObject<number>;
}

export const BiomeDecorRenderer: React.FC<BiomeDecorProps> = React.memo(({ biome, totalDistanceRef }) => {

    const MAX_COUNT = 300;
    const _dummy = useMemo(() => new Object3D(), []);
    const frameSkipRef = useRef(0);

    const jungleRef = useRef<InstancedMesh>(null);
    const veinRef = useRef<InstancedMesh>(null);
    const eggRef = useRef<InstancedMesh>(null);

    // 1. BIO_JUNGLE: Microvilli / Cilia (палитра биома)
    const jungleGeo = useMemo(() => getGeometryPool().getCylinderGeometry(0.08, 0.02, 4, 4), []);

    const jungleMat = useMemo(() => {
        const cfg = BIOME_CONFIG.BIO_JUNGLE;
        const mat = new MeshToonMaterial({
            color: cfg.accentColor,
            emissive: cfg.wallColor,
            emissiveIntensity: 0.12
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    // 2. VEIN: Red Blood Cells (палитра биома)
    const veinGeo = useMemo(() => getGeometryPool().getTorusGeometry(1.2, 0.4, 8, 12), []);
    const veinMat = useMemo(() => {
        const cfg = BIOME_CONFIG.VEIN_TUNNEL;
        const mat = new MeshToonMaterial({ color: cfg.glowColor, emissive: cfg.wallColor, emissiveIntensity: 0.12 });
        applyWorldBending(mat);
        return mat;
    }, []);

    // 3. EGG: Incubator Orbs (палитра биома)
    const eggGeo = useMemo(() => getGeometryPool().getSphereGeometry(1.2, 12, 12), []);
    const eggMat = useMemo(() => {
        const cfg = BIOME_CONFIG.EGG_ZONE;
        const mat = new MeshToonMaterial({ color: cfg.accentColor, emissive: cfg.glowColor, emissiveIntensity: 0.12 });
        applyWorldBending(mat);
        return mat;
    }, []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(jungleGeo);
            getGeometryPool().release(veinGeo);
            getGeometryPool().release(eggGeo);
            safeDispose(jungleMat);
            safeDispose(veinMat);
            safeDispose(eggMat);
        };
    }, [jungleGeo, veinGeo, eggGeo, jungleMat, veinMat, eggMat]);

    useEffect(() => {
            const callback = (_delta: number, time: number) => {
                const state = useStore.getState();
                const totalDist = totalDistanceRef.current;
                const speed = state.speed || 30;
                const adrenaline = 1.0 + (speed - 30) / 70;
                const pX = state.localPlayerState.position[0];

                frameSkipRef.current++;
                const doUpdate = frameSkipRef.current % 2 === 0;

                let activeRef: React.MutableRefObject<InstancedMesh | null> | null = null;
                if (biome === BiomeType.BIO_JUNGLE) activeRef = jungleRef;
                else if (biome === BiomeType.VEIN_TUNNEL) activeRef = veinRef;
                else if (biome === BiomeType.EGG_ZONE) activeRef = eggRef;

                if (!activeRef || !activeRef.current) return;

                if (doUpdate) {
                    if (jungleRef.current) jungleRef.current.count = 0;
                    if (veinRef.current) veinRef.current.count = 0;
                    if (eggRef.current) eggRef.current.count = 0;
                }

                let count = 0;
                const spacing = 2.5; // ⬇️ Denser spacing

                const startN = Math.floor((totalDist - 20) / spacing);
                const endN = Math.floor((totalDist + 180) / spacing); // ⬆️ Longer view distance for decor

                // Детерминированный хэш для стабильных позиций/масштаба (один и тот же n,k → один результат)
                const hash = (a: number, b: number) => {
                    const t = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                    return t - Math.floor(t);
                };

                for (let n = startN; n <= endN; n++) {
                    if (count >= MAX_COUNT) break;

                    const rand = hash(n, 0);
                    const objZ = -(n * spacing);
                    const visualZ = objZ + totalDist;

                    const ciliaPerRow = biome === BiomeType.BIO_JUNGLE ? 4 : 2; // ⬆️ More per row

                    for (let k = 0; k < ciliaPerRow; k++) {
                        if (count >= MAX_COUNT) break;

                        const rowRand = hash(n, k + 10);
                        const side = (n % 2 === 0) ? -1 : 1;
                        const xOffset = 5.5 + (k * 1.5) + (rowRand * 2.5);

                        const decorZ = visualZ + (rowRand * 1.5);
                        const decorCurve = CurveHelper.getCurveAt(decorZ);

                        // 🌬️ BIOLOGIC WIND: Sway away from player as they pass
                        const zDist = Math.abs(decorZ - 0); // Distance to player's Z (which is 0 in local space)
                        const decorX = decorCurve.x + side * xOffset;
                        const xDist = decorX - pX; // Distance to player's X
                        const windImpact = Math.max(0, 1.0 - zDist / 8.0) * (speed / 50); // Stronger impact closer to player and with higher speed
                        const windSway = Math.sign(xDist) * windImpact * 0.5; // Shift away from player

                    _dummy.position.set(decorX + windSway, decorCurve.y, decorZ);

                    // 💓 ADRENALINE PULSE: Everything breathes faster with speed
                    const phase = (n * 10 + k) % 5; // Unique phase for each decor item
                    const breathe = 1.0 + Math.sin(time * 3 * adrenaline + phase) * 0.05;

                    if (biome === BiomeType.BIO_JUNGLE) {
                        const sway = Math.sin(time * 2.5 * adrenaline + n * 0.8 + k) * 0.12; // Adrenaline affects sway frequency
                        _dummy.position.y = decorCurve.y - 0.5;
                        _dummy.rotation.set(sway, rowRand * 6.28, side * 0.15 + rowRand * 0.4 + windSway * 0.3); // Wind affects rotation
                        const scale = (1.2 + rowRand * 2.5) * breathe; // Adrenaline affects scale
                        _dummy.scale.set(
                            (1.0 + rowRand * 0.2) * breathe,
                            scale * (1.0 + windImpact * 0.2), // Stretch in wind
                            (1.0 + rowRand * 0.2) * breathe
                        );
                    }
                    else if (biome === BiomeType.VEIN_TUNNEL) {
                        _dummy.position.y = decorCurve.y + 3.0 + Math.sin(n * 0.5 + k) * 1.5;
                        _dummy.rotation.set(n * 0.3 + k + Math.sin(time * 1.5 * adrenaline + phase) * 0.1, rowRand * 6.28, rand * 6.28 + windSway * 0.3);
                        _dummy.scale.setScalar((0.7 + rowRand * 0.4) * breathe * (1.0 + windImpact * 0.2));
                    }
                    else if (biome === BiomeType.EGG_ZONE) {
                        _dummy.position.y = decorCurve.y + 1.0;
                        _dummy.rotation.set(0, rowRand * 6.28 + Math.sin(time * 1.0 * adrenaline + phase) * 0.1, 0 + windSway * 0.3);
                        _dummy.scale.setScalar((0.9 + rowRand * 0.35) * breathe * (1.0 + windImpact * 0.2));
                    }

                    _dummy.updateMatrix();
                    activeRef.current.setMatrixAt(count++, _dummy.matrix);
                }
            }

            if (doUpdate && activeRef.current) {
                activeRef.current.count = count;
                scheduleMatrixUpdate(activeRef.current);
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [biome, totalDistanceRef, MAX_COUNT, _dummy]);

    return (
        <group>
            <instancedMesh ref={jungleRef} args={[jungleGeo, jungleMat, MAX_COUNT]} frustumCulled={true} visible={biome === BiomeType.BIO_JUNGLE} />
            <instancedMesh ref={veinRef} args={[veinGeo, veinMat, MAX_COUNT]} frustumCulled={true} visible={biome === BiomeType.VEIN_TUNNEL} />
            <instancedMesh ref={eggRef} args={[eggGeo, eggMat, MAX_COUNT]} frustumCulled={true} visible={biome === BiomeType.EGG_ZONE} />
        </group>
    );
});

BiomeDecorRenderer.displayName = 'BiomeDecorRenderer';
