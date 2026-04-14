/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorldLevelManager - Refactored with Hooks
 */

import React, { useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { GameStatus, GameObject, ObjectType } from '../../types';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { useIsPlaying } from '../../hooks/useIsPlaying';
import { WIN_DISTANCE } from '../../constants';
import { safeDeltaTime, isValidNumber } from '../../utils/safeMath';
import { debugError, debugLog } from '../../utils/debug';
import { eventBus } from '../../utils/eventBus';

const ORIGIN_RESET_THRESHOLD = 5000;
const _GRID_SNAP = 1000; // Snap recycled positions to 0.001 precision (1/1000)

import { InstancedLevelObjects } from './InstancedLevelObjects';
import { BioInfiniteTrack } from './BioInfiniteTrack';
import { WarningIndicator } from './WarningIndicator';


import { useChunkSystem } from './hooks/useChunkSystem';
import { useGamePhysics } from './hooks/useGamePhysics';
import { useTrackSystem } from './hooks/useTrackSystem';
import { gameObjectPool } from './SharedPool';
import ComicVFX from '../Effects/ComicVFX';
import FinishEgg from './FinishEgg';

import VirusObstacles from './VirusObstacle';
import { NewObstaclesRenderer } from './NewObstaclesRenderer';
import { BiologicEnemiesRenderer } from './BiologicEnemiesRenderer';
import { BiomeDecorRenderer } from './BiomeDecorRenderer';
import { getDynamicCullingManager } from '../../infrastructure/rendering/DynamicCullingManager';

export const WorldLevelManager: React.FC = React.memo(() => {
    const isPlaying = useIsPlaying();
    const speed = useStore(state => state.speed);
    const speedBoostActive = useStore(state => state.speedBoostActive);
    const biome = useStore(state => state.biome);

    // Core Refs
    const totalDistanceRef = useRef(0);
    const objectsRef = useRef<GameObject[]>([]);
    const obstaclesRef = useRef<GameObject[]>([]);
    const specialObstaclesRef = useRef<GameObject[]>([]); // For Jump/Slide/Dodge
    const biologicEnemiesRef = useRef<GameObject[]>([]); // 🦠 NEW: For GDD v2.2.0 Enemies
    const pickupsRef = useRef<GameObject[]>([]);

    // State & Distance Tracking
    const accumulatedScoreDistance = useRef(0);
    const lastStoreUpdate = useRef(0);
    const lastLoggedDistanceRef = useRef(0);

    // Hooks
    const trackSystem = useTrackSystem();
    const { updatePhysics } = useGamePhysics();
    const { checkChunkGeneration } = useChunkSystem(
        isPlaying,
        totalDistanceRef,
        objectsRef,
        obstaclesRef,
        pickupsRef
    );

    // Reset Track System on play
    useEffect(() => {
        if (isPlaying) {
            trackSystem.reset();
            totalDistanceRef.current = 0;
            accumulatedScoreDistance.current = 0;
        }
    }, [isPlaying, trackSystem]);

    useEffect(() => {
        return () => {
            objectsRef.current = [];
            obstaclesRef.current = [];
            specialObstaclesRef.current = [];
            biologicEnemiesRef.current = [];
            pickupsRef.current = [];
        };
    }, []);

    // Main Game Loop
    useEffect(() => {
        if (!isPlaying) return;

        const callback = (delta: number, time: number) => {
            try {
                const safeDelta = safeDeltaTime(delta, 0.1, 0.001);
                const currentSpeed = speed || 30;
                const boost = speedBoostActive ? 2 : 1;
                const moveDist = currentSpeed * safeDelta * boost;

                if (isValidNumber(moveDist) && moveDist > 0) {
                    totalDistanceRef.current += moveDist;
                    accumulatedScoreDistance.current += moveDist;
                }

                if (!isValidNumber(totalDistanceRef.current)) {
                    totalDistanceRef.current = 0;
                }

                // Floating origin reset: shift all Z coordinates to preserve float32 precision
                if (totalDistanceRef.current >= ORIGIN_RESET_THRESHOLD) {
                    const offset = ORIGIN_RESET_THRESHOLD;
                    totalDistanceRef.current -= offset;

                    // Shift all active objects' local Z back by offset
                    const allObjects = objectsRef.current;
                    for (let i = 0; i < allObjects.length; i++) {
                        const obj = allObjects[i];
                        if (obj && obj.active) {
                            obj.position[2] -= offset;
                        }
                    }

                    debugLog(`[FloatingOrigin] Reset at ${offset} units, shifted ${allObjects.length} objects`);
                    eventBus.emit('world:origin-reset', { offset });
                }

                // Sync Store (Throttled 0.2s for smoother speed/score updates)
                if (time - lastStoreUpdate.current > 0.2) {
                    useStore.getState().increaseDistance(accumulatedScoreDistance.current);
                    accumulatedScoreDistance.current = 0;
                    lastStoreUpdate.current = time;

                    eventBus.emit('world:speed-changed', { speed: currentSpeed });
                }

                // 2. Systems Update
                trackSystem.update(totalDistanceRef.current);

                const store = useStore.getState();
                store.updateDashCooldown(safeDelta);
                store.updateShieldTimer(safeDelta);
                store.updateMagnetTimer(safeDelta);
                store.updateSpeedBoostTimer(safeDelta);
                store.updateInvincibilityTimer(safeDelta);
                store.updateDeathTimer(safeDelta);

                // 3. Culling (High Frequency - Local)
                const objects = objectsRef.current;
                const totalDist = totalDistanceRef.current;
                
                // Smart Culling + LOD from DynamicCullingManager
                const cullingSettings = getDynamicCullingManager().getSettings();
                const cullBehind = cullingSettings.objectCullDistance || 30;
                const cullAhead = -(cullingSettings.drawDistance || 300);
                
                let writeIndex = 0;
                let obsWriteIndex = 0;
                let specialWriteIndex = 0;
                let bioWriteIndex = 0;
                let pickWriteIndex = 0;

                for (let i = 0, len = objects.length; i < len; i++) {
                    const obj = objects[i];
                    if (!obj || !obj.active) continue;

                    const worldZ = obj.position[2] + totalDist;
                    if (worldZ > cullBehind || worldZ < cullAhead) {
                        obj.active = false;
                        gameObjectPool.release(obj);
                        continue;
                    }

                    if (writeIndex !== i) objects[writeIndex] = obj;
                    writeIndex++;

                    if (obj.type === ObjectType.OBSTACLE) {
                        obstaclesRef.current[obsWriteIndex++] = obj;
                    } else if (
                        obj.type === ObjectType.OBSTACLE_JUMP ||
                        obj.type === ObjectType.OBSTACLE_SLIDE ||
                        obj.type === ObjectType.OBSTACLE_DODGE
                    ) {
                        specialObstaclesRef.current[specialWriteIndex++] = obj;
                    } else if (
                        obj.type === ObjectType.GLOBUS_WORM ||
                        obj.type === ObjectType.BACTERIA_BLOCKER ||
                        obj.type === ObjectType.VIRUS_KILLER ||
                        obj.type === ObjectType.IMMUNE_CELL ||
                        obj.type === ObjectType.CELL_MEMBRANE
                    ) {
                        biologicEnemiesRef.current[bioWriteIndex++] = obj;
                    } else {
                        pickupsRef.current[pickWriteIndex++] = obj;
                    }
                }

                // Resize arrays
                if (objects.length !== writeIndex) objects.length = writeIndex;
                if (obstaclesRef.current.length !== obsWriteIndex) obstaclesRef.current.length = obsWriteIndex;
                if (specialObstaclesRef.current.length !== specialWriteIndex) specialObstaclesRef.current.length = specialWriteIndex;
                if (biologicEnemiesRef.current.length !== bioWriteIndex) biologicEnemiesRef.current.length = bioWriteIndex;
                if (pickupsRef.current.length !== pickWriteIndex) pickupsRef.current.length = pickWriteIndex;

                // 4. Chunk Generation Check
                checkChunkGeneration(totalDistanceRef.current);

                // 5. Physics & Collision
                updatePhysics(safeDelta, objects, totalDistanceRef, accumulatedScoreDistance, lastLoggedDistanceRef);

                // 6. Win Condition
                if (totalDistanceRef.current >= WIN_DISTANCE + 10) {
                    store.setStatus(GameStatus.VICTORY);
                }
            } catch (e) {
                debugError('WorldUpdate Error:', e);
            }
        };

        registerGameLoopCallback('worldUpdate', callback);
        return () => unregisterGameLoopCallback('worldUpdate', callback);
    }, [isPlaying, speed, speedBoostActive, trackSystem, updatePhysics, checkChunkGeneration]);

    return (
        <group name="WorldLevel">
            {/* 3. Infinite Track System — pass live speed so UV scroll matches physics */}
            <BioInfiniteTrack playerZ={0} speed={speed} />

            {/* 🛡️ DECORATION (New Biome Decor) */}
            <BiomeDecorRenderer biome={biome} totalDistanceRef={totalDistanceRef} />

            {/* 4. Instanced Objects (Coins, Genes) */}
            {/* LaneMarkers removed in favor of texture-based markings for better performance/bending */}
            {/* <LaneMarkers totalDistanceRef={totalDistanceRef} /> */}

            {/* 🛑 OBSTACLES & PICKUPS RESTORED (Stabilized) */}
            <InstancedLevelObjects
                pickupsRef={pickupsRef}
                totalDistanceRef={totalDistanceRef}
            />
            <VirusObstacles
                objectsRef={obstaclesRef}
                totalDistanceRef={totalDistanceRef}
            />
            {/* 🛑 SPECIALIZED OBSTACLES (Jump/Slide/Dodge) */}
            <NewObstaclesRenderer
                objectsRef={specialObstaclesRef}
                totalDistanceRef={totalDistanceRef}
            />
            {/* 🦠 BIOLOGIC ENEMIES (Globus, Virus, Bacteria) */}
            <BiologicEnemiesRenderer
                objectsRef={biologicEnemiesRef}
                totalDistanceRef={totalDistanceRef}
            />
            <WarningIndicator objectsRef={obstaclesRef} totalDistanceRef={totalDistanceRef} />

            {/* 💥 Comic-style visual effects */}
            <ComicVFX />
            {/* 🏁 🎨 VQC: Гигантское яйцо на финише */}
            <FinishEgg totalDistanceRef={totalDistanceRef} />
        </group>
    );
});

WorldLevelManager.displayName = 'WorldLevelManager';
export default WorldLevelManager;
