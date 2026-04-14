/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procedural - PATTERN BASED SYSTEM (Gold Master)
 * Uses predefined patterns for better gameplay flow.
 */
import { BiomeType } from '../../types';
import { LANE_WIDTH, BIOME_CONFIG } from '../../constants';
import { PATTERNS, PatternDef, PatternDifficulty, TYPE_MAP_KEYS, POWERUP_POOL, ROAD_CHUNKS } from './PatternDefinitions';
import { CurveHelper } from '../../core/utils/CurveHelper';

class SimpleRNG {
    private seed: number;

    constructor(seedStr: string) {
        let h = 0x811c9dc5;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        this.seed = h >>> 0;
    }

    random(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

function colorToInt(hex: string | undefined): number {
    if (!hex) return 0xff0000;
    return parseInt(hex.replace('#', ''), 16);
}

export class ProceduralSystem {
    private generator: SimpleRNG;
    private callback: ((data: Float32Array) => void) | null = null;

    // Track distance to adjust difficulty
    private totalGeneratedDistance = 0;

    constructor(seed: string) {
        this.generator = new SimpleRNG(seed);
    }

    init(seed: string) {
        this.generator = new SimpleRNG(seed);
        this.totalGeneratedDistance = 0;
    }

    setCallback(cb: ((data: Float32Array) => void) | null) {
        this.callback = cb;
    }

    /**
     * Определяет плавные вероятности сложностей по пройденной дистанции.
     * Easy → Medium → Hard нарастают непрерывно, без резких скачков.
     */
     private getDifficultyProbabilities(dist: number) {
         const t = Math.max(0, Math.min(1, dist / 1000)); // 0..1 на первых ~1000 м
         const ease = t * t * (3 - 2 * t); // smoothstep

         // В начале: easy=1, med=0, hard=0
         // К 1000м: easy≈0.1, med≈0.4, hard≈0.5 (как в старой таблице)
         const hardBase = 0.5 * ease;
         const easyBase = 1.0 - 0.9 * ease;
         let medBase = 1.0 - easyBase - hardBase;
         if (medBase < 0) medBase = 0;

         // Add wave oscillation based on distance for periodic intensity changes
         const waveLength = 500; // distance for a full wave cycle
         const waveAmplitude = 0.15; // 15% oscillation magnitude
         const wave = waveAmplitude * Math.sin((2 * Math.PI * dist) / waveLength);
         // Apply wave to each base probability, ensuring they stay positive
         let easy = easyBase * (1 + wave);
         let med = medBase * (1 + wave);
         let hard = hardBase * (1 + wave);
         // Clamp to small positive minimum to avoid negative
         const min = 0.001;
         if (easy < min) easy = min;
         if (med < min) med = min;
         if (hard < min) hard = min;

         const sum = easy + med + hard;
         return { easy: easy / sum, med: med / sum, hard: hard / sum };
     }

    private selectPattern(_laneCount: number): PatternDef {
        const probs = this.getDifficultyProbabilities(this.totalGeneratedDistance);
        const r = this.generator.random();

        let targetDifficulty = PatternDifficulty.EASY;
        if (r < probs.easy) targetDifficulty = PatternDifficulty.EASY;
        else if (r < probs.easy + probs.med) targetDifficulty = PatternDifficulty.MEDIUM;
        else targetDifficulty = PatternDifficulty.HARD;

        // Filter patterns by difficulty
        const available = PATTERNS.filter(p => p.difficulty === targetDifficulty);

        // Fallback if no patterns for diff (shouldn't happen)
        if (available.length === 0) {
            const fallback = PATTERNS[0];
            if (!fallback) {
                return { id: 'fallback-easy', difficulty: PatternDifficulty.EASY, length: 20, items: [] };
            }
            return fallback;
        }

        const idx = Math.floor(this.generator.random() * available.length);
        const selected = available[idx];
        return selected ?? available[0] ?? PATTERNS[0] ?? { id: 'fallback-default', difficulty: PatternDifficulty.EASY, length: 20, items: [] };
    }

    /** Выбор целого куска дороги (как в Subway Surfers) — один сегмент целиком */
    private selectRoadChunk(): PatternDef | null {
        const probs = this.getDifficultyProbabilities(this.totalGeneratedDistance);
        const r = this.generator.random();

        let targetDifficulty = PatternDifficulty.EASY;
        if (r < probs.easy) targetDifficulty = PatternDifficulty.EASY;
        else if (r < probs.easy + probs.med) targetDifficulty = PatternDifficulty.MEDIUM;
        else targetDifficulty = PatternDifficulty.HARD;

        const available = ROAD_CHUNKS.filter(c => c.difficulty === targetDifficulty);
        if (available.length === 0) return null;

        const idx = Math.floor(this.generator.random() * available.length);
        return available[idx] ?? null;
    }

    requestChunk(startZ: number, count: number, laneCount: number, _biome: BiomeType) {
        // Each logical "chunk" is CHUNK_UNIT_SIZE world-units long.
        // count is the number of chunks requested by the caller (e.g. 45 on first load, 15 on refill).
        // We generate content to cover count × CHUNK_UNIT_SIZE world units.
        const CHUNK_UNIT_SIZE = 20; // matches TrackSystem.CHUNK_SIZE
        const BATCH_LENGTH = Math.max(100, count * CHUNK_UNIT_SIZE);

        // Buffer: up to 400 objects (generous cap to avoid per-frame overflow on large batches)
        const MAX_OBJECTS = 400;
        const maxFloats = MAX_OBJECTS * 7; // type, x, y, z, color, height, width
        const buffer = new Float32Array(maxFloats);
        let offset = 0;

        const pushObj = (type: number, x: number, y: number, z: number, colorStr?: string, height: number = 1, width: number = 1) => {
            if (offset + 7 > maxFloats) return;
            buffer[offset++] = type;
            buffer[offset++] = x;
            buffer[offset++] = y;
            buffer[offset++] = z;
            buffer[offset++] = colorToInt(colorStr);
            buffer[offset++] = height;
            buffer[offset++] = width;
        };

        // Current generation pointer within this batch (integer steps for stability)
        let currentZ = Math.round(startZ / 2) * 2; // snap to 2-unit grid for stability
        const targetZ = currentZ - BATCH_LENGTH;

        // Keep adding patterns until we cover the batch length
        // С вероятностью 55% генерируем целым куском дороги (ROAD_CHUNK), иначе — мелкими паттернами
        const USE_CHUNK_PROB = 0.55;

        while (currentZ > targetZ) {
            const useChunk = this.generator.random() < USE_CHUNK_PROB && ROAD_CHUNKS.length > 0;
            const pattern = useChunk ? this.selectRoadChunk() : this.selectPattern(laneCount);

            if (!pattern || pattern.items.length === 0) {
                // Если паттерна нет, спавним "заполнитель" (декор)
                const fillerType = TYPE_MAP_KEYS.GENE; // Используем гены как мелкий декор или просто пропускаем
                pushObj(fillerType, (this.generator.random() - 0.5) * 8, 0.5, currentZ - 5, '#444444', 0.5, 0.5);
                
                currentZ -= 20; // Шаг для пустого места
                currentZ = Math.floor(currentZ);
                continue;
            }

            // Generate Objects from Pattern
            pattern.items.forEach(item => {
                const typeId = TYPE_MAP_KEYS[item.type] || 0;
                const lane = Math.max(-2, Math.min(2, item.lane)); // Clamp -2 to 2
                
                const z = currentZ - item.zOffset;
                
                // Align with curve IMMEDIATELY during generation
                const curve = CurveHelper.getCurveAt(z);
                const x = curve.x + lane * LANE_WIDTH;
                const baseY = item.yOffset ?? (typeId === TYPE_MAP_KEYS.OBSTACLE ? 0.7 : 0.5);
                const y = curve.y + baseY;
                
                const height = item.height ?? 1;
                const width = item.width ?? 1;

                let color = item.color;

                // If it's an obstacle and no color set, use biome palette for variety
                if (typeId === TYPE_MAP_KEYS.OBSTACLE && !color) {
                    const cfg = BIOME_CONFIG[_biome];
                    const cRoll = this.generator.random();
                    color = cRoll < 0.5 ? cfg.glowColor : (cRoll < 0.85 ? cfg.wallColor : cfg.accentColor);
                }

                // If Item is generic 'COIN' we might swap it for PowerUp randomly
                if (item.type === 'COIN' && this.generator.random() < 0.02) { // 2% chance per coin to replace with powerup
                    const pRoll = this.generator.random();
                    let cumulative = 0;
                    for (const p of POWERUP_POOL) {
                        cumulative += p.weight;
                        if (pRoll < cumulative) {
                            // Correctly map PowerUp name to ID
                            // We don't have direct string-to-id for these mixed in items loop
                            // Just manual overwrite
                            const pId = TYPE_MAP_KEYS[p.type];
                            if (pId) pushObj(pId, x, 0.6, z, p.color, 1, 1);
                            return; // Skip adding the coin
                        }
                    }
                }

                pushObj(typeId, x, y, z, color, height, width);
            });

            currentZ -= pattern.length;
            // ZERO GAP: Убираем зазоры между сегментами дороги для бесшовности
            // Добавляем микро-вариативность дистанции только для мелких паттернов
            const varyDist = useChunk ? 0 : (this.generator.random() * 5); 
            currentZ -= varyDist;
            
            currentZ = Math.floor(currentZ); // Строгое выравнивание для исключения float-щелей
        }

        this.totalGeneratedDistance += BATCH_LENGTH;

        const finalBuffer = buffer.slice(0, offset);
        if (this.callback) {
            this.callback(finalBuffer);
        }
    }

    requestPatternChunk() { }
    generatePatternObjects(): Float32Array | null { return null; }
    terminate() { }
}
