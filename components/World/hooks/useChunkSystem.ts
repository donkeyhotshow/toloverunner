import React, { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../../store';
import { GameObject, ObjectType } from '../../../types';
import { SAFETY_CONFIG } from '../../../constants';
import { debugError } from '../../../utils/debug';
import { validatePosition, validateScale } from '../../../utils/validation';
import { gameObjectPool } from '../SharedPool';
import { Color } from 'three';
import { CHUNK_SIZE } from '../../../core/track/TrackSystem';

/** Дистанція впереди игрока, которую держим сгенерированной */
const CHUNK_REQUEST_MARGIN = 400;
/** Количество чанков в одном запросе */
const CHUNKS_PER_REQUEST = 15;

// Map for safer lookups
const ID_TO_TYPE_MAP: Record<number, ObjectType> = {
    0: ObjectType.OBSTACLE,
    1: ObjectType.GENE,
    2: ObjectType.DNA_HELIX,
    3: ObjectType.JUMP_BAR,
    4: ObjectType.COIN,
    5: ObjectType.SHIELD,
    6: ObjectType.SPEED_BOOST,
    7: ObjectType.MAGNET,
    8: ObjectType.OBSTACLE_JUMP,
    9: ObjectType.OBSTACLE_SLIDE,
    10: ObjectType.OBSTACLE_DODGE
};

const intToHex = (int: number) => '#' + new Color(int).getHexString();

export const useChunkSystem = (
    isPlaying: boolean,
    totalDistanceRef: React.MutableRefObject<number>,
    objectsRef: React.MutableRefObject<GameObject[]>,
    obstaclesRef: React.MutableRefObject<GameObject[]>,
    pickupsRef: React.MutableRefObject<GameObject[]>
) => {
    const procGen = useStore(state => state.procGen);
    const laneCount = useStore(state => state.laneCount);
    const biome = useStore(state => state.biome);

    const lastChunkDistance = useRef(0);
    const isProcessingChunk = useRef(false);

    const handleChunkGenerated = useCallback((data: Float32Array) => {
        // ✅ STABILIZED SPAWNING LOGIC (Restored with checks)
        // Ensure we don't process if data is empty or invalid
        if (!data || data.length === 0) {
            isProcessingChunk.current = false;
            return;
        }

        const stride = 7; // type, x, y, z, color, height, width
        const count = Math.floor(data.length / stride);
        if (count === 0) {
            isProcessingChunk.current = false;
            return;
        }

        const MAX_OBJECTS = SAFETY_CONFIG.MAX_OBJECTS || 200; // Fallback safety
        const currentLength = objectsRef.current.length;
        const spaceLeft = MAX_OBJECTS - currentLength;

        // Prevent overflow - visual stability
        if (spaceLeft <= 0) {
            isProcessingChunk.current = false;
            return;
        }

        const objectsToAdd = Math.min(count, spaceLeft);

        try {
            for (let i = 0; i < objectsToAdd; i++) {
                const idx = i * stride;
                const val = data[idx] ?? 0;
                const typeIdx = Math.floor(val) || 0;
                let type = ID_TO_TYPE_MAP[typeIdx] ?? ObjectType.OBSTACLE;

                // SPERN RUNNER v2.2.0 VARIATION LOGIC (DETERMINISTIC):
                // Используем z позиции (data[idx + 3]) как сид для детерминированной генерации
                const zPos = data[idx + 3] ?? 0;
                // Простейшая хэш-функция для генерации псевдослучайного числа [0..1) из Z-координаты
                const r = Math.abs(Math.sin(zPos * 12.9898 + i * 78.233)) - Math.floor(Math.abs(Math.sin(zPos * 12.9898 + i * 78.233)));

                if (type === ObjectType.OBSTACLE) {
                    if (r < 0.3) type = ObjectType.GLOBUS_NORMAL;
                    else if (r < 0.5) type = ObjectType.GLOBUS_ANGRY;
                    else if (r < 0.6) type = ObjectType.VIRUS_KILLER_LOW;
                    else if (r < 0.8) type = ObjectType.BACTERIA_LOW;
                    else type = ObjectType.BACTERIA_HAPPY;
                } else if (type === ObjectType.OBSTACLE_DODGE) {
                    if (r < 0.5) type = ObjectType.BACTERIA_WALL;
                    else type = ObjectType.MEMBRANE_WALL;
                } else if (type === ObjectType.OBSTACLE_JUMP) {
                    if (r < 0.3) type = ObjectType.GLOBUS_BOSS; // Великий глист - перескок
                } else if (type === ObjectType.OBSTACLE_SLIDE) {
                    // Слиз (залишається як є або стає специфічною бактерією)
                }


                // DATA LAYOUT: Type, X, Y, Z, Color, Height, Width
                const rawPosition: [number, number, number] = [
                    data[idx + 1] ?? 0,
                    data[idx + 2] ?? 0,
                    data[idx + 3] ?? 0
                ];

                const dist = totalDistanceRef.current;
                const safeDistId = Number.isFinite(dist) ? dist.toFixed(0) : '0';
                const objectId = `obj_${safeDistId}_${i}`;
                const validatedScale = validateScale(1, SAFETY_CONFIG.MIN_SCALE, SAFETY_CONFIG.MAX_SCALE);

                const newObj = gameObjectPool.acquire();
                newObj.id = objectId;
                newObj.type = type;
                newObj.position = validatePosition(rawPosition);
                newObj.active = true;
                newObj.color = intToHex(data[idx + 4] ?? 0);
                newObj.scale = [validatedScale, validatedScale, validatedScale];
                const h = data[idx + 5];
                const w = data[idx + 6];
                if (h != null && Number.isFinite(h) && h > 0) newObj.height = h;
                if (w != null && Number.isFinite(w) && w > 0) newObj.width = w;

                objectsRef.current.push(newObj);

                // Treat all non-pickup types as obstacles after variation mapping
                const isPickupType =
                    type === ObjectType.COIN ||
                    type === ObjectType.GENE ||
                    type === ObjectType.DNA_HELIX ||
                    type === ObjectType.SHIELD ||
                    type === ObjectType.SPEED_BOOST ||
                    type === ObjectType.MAGNET;

                if (isPickupType) {
                    pickupsRef.current.push(newObj);
                } else {
                    obstaclesRef.current.push(newObj);
                }
            }
        } catch (e) {
            debugError('[ChunkSystem] Error updating chunk:', e);
        }

        isProcessingChunk.current = false;
    }, [objectsRef, obstaclesRef, pickupsRef, totalDistanceRef]);

    useEffect(() => {
        procGen.setCallback(handleChunkGenerated);
        return () => {
            procGen.setCallback(null);
        };
    }, [procGen, handleChunkGenerated]);

    const checkChunkGeneration = useCallback((currentTotalDistance: number) => {
        const threshold = lastChunkDistance.current - CHUNK_REQUEST_MARGIN;
        if (currentTotalDistance <= threshold || isProcessingChunk.current) return;
        isProcessingChunk.current = true;
        const startZ = -lastChunkDistance.current - (CHUNKS_PER_REQUEST * CHUNK_SIZE);
        if (procGen) {
            procGen.requestChunk(startZ, CHUNKS_PER_REQUEST, laneCount, biome);
            lastChunkDistance.current += CHUNKS_PER_REQUEST * CHUNK_SIZE;
        } else {
            isProcessingChunk.current = false;
        }
    }, [procGen, laneCount, biome]);

    useEffect(() => {
        if (isPlaying) {
            objectsRef.current.forEach(obj => gameObjectPool.release(obj));
            objectsRef.current = [];
            obstaclesRef.current = [];
            pickupsRef.current = [];
            lastChunkDistance.current = 0;
            isProcessingChunk.current = true;
            const initialChunks = 45;
            procGen.requestChunk(0, initialChunks, laneCount, biome);
            lastChunkDistance.current = initialChunks * CHUNK_SIZE;
        }
    }, [isPlaying, procGen, laneCount, biome, objectsRef, obstaclesRef, pickupsRef]);

    return {
        checkChunkGeneration
    };
};
