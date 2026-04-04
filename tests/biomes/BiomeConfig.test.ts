/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BiomeConfig test stubs (src/biomes/BiomeConfig.ts + palette.ts)
 * TODO v2.5: Add rendering integration tests when BiomeRenderer is wired to Three.js.
 */

import { describe, it, expect } from 'vitest';
import {
    BIOME_FALLOPIAN_TUBE,
    BIOME_UTERINE_CHAMBER,
    BIOME_OVARIAN_LABYRINTH,
    BIOME_BLOODSTREAM_RUSH,
    BIOME_PROGRESSION,
    getBiomeById,
} from '../../src/biomes/BiomeConfig';
import { ALL_PALETTES } from '../../src/biomes/palette';

describe('BiomeConfig', () => {
    it('each biome has a unique id', () => {
        const ids = BIOME_PROGRESSION.map(b => b.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('BIOME_PROGRESSION contains all four biomes', () => {
        expect(BIOME_PROGRESSION).toHaveLength(4);
    });

    it('getBiomeById returns correct biome', () => {
        const biome = getBiomeById('fallopian_tube');
        expect(biome).toBeDefined();
        expect(biome?.id).toBe('fallopian_tube');
    });

    it('getBiomeById returns undefined for unknown id', () => {
        expect(getBiomeById('does_not_exist')).toBeUndefined();
    });

    it('all biomes have valid objectDensity [0.5–2.0]', () => {
        for (const biome of BIOME_PROGRESSION) {
            expect(biome.objectDensity).toBeGreaterThanOrEqual(0.5);
            expect(biome.objectDensity).toBeLessThanOrEqual(2.0);
        }
    });

    it('all biomes have at least one spawn rule', () => {
        for (const biome of BIOME_PROGRESSION) {
            expect(biome.spawnRules.length).toBeGreaterThan(0);
        }
    });

    it('all spawn rule probabilities are in [0–1]', () => {
        for (const biome of BIOME_PROGRESSION) {
            for (const rule of biome.spawnRules) {
                expect(rule.probability).toBeGreaterThanOrEqual(0);
                expect(rule.probability).toBeLessThanOrEqual(1);
            }
        }
    });

    it('palette hex values match ALL_PALETTES registry', () => {
        expect(ALL_PALETTES[BIOME_FALLOPIAN_TUBE.id]).toBe(BIOME_FALLOPIAN_TUBE.palette);
        expect(ALL_PALETTES[BIOME_UTERINE_CHAMBER.id]).toBe(BIOME_UTERINE_CHAMBER.palette);
        expect(ALL_PALETTES[BIOME_OVARIAN_LABYRINTH.id]).toBe(BIOME_OVARIAN_LABYRINTH.palette);
        expect(ALL_PALETTES[BIOME_BLOODSTREAM_RUSH.id]).toBe(BIOME_BLOODSTREAM_RUSH.palette);
    });
});
