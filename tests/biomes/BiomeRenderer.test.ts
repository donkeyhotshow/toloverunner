/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BiomeRenderer test stubs (src/biomes/BiomeRenderer.ts)
 * TODO v2.5: Mock Three.js scene and assert material/fog updates when wired.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiomeRenderer } from '../../src/biomes/BiomeRenderer';
import { BIOME_FALLOPIAN_TUBE, BIOME_UTERINE_CHAMBER } from '../../src/biomes/BiomeConfig';

describe('BiomeRenderer', () => {
    let renderer: BiomeRenderer;

    beforeEach(() => {
        renderer = new BiomeRenderer();
    });

    it('has no currentBiome initially', () => {
        expect(renderer.currentBiome).toBeNull();
    });

    it('apply sets the current biome', () => {
        renderer.apply(BIOME_FALLOPIAN_TUBE);
        expect(renderer.currentBiome?.id).toBe('fallopian_tube');
    });

    it('transition updates current biome to next', async () => {
        renderer.apply(BIOME_FALLOPIAN_TUBE);
        await renderer.transition(BIOME_UTERINE_CHAMBER, 500);
        expect(renderer.currentBiome?.id).toBe('uterine_chamber');
    });

    it('dispose clears current biome', () => {
        renderer.apply(BIOME_FALLOPIAN_TUBE);
        renderer.dispose();
        expect(renderer.currentBiome).toBeNull();
    });

    it('apply after dispose throws an error', () => {
        renderer.dispose();
        expect(() => renderer.apply(BIOME_FALLOPIAN_TUBE)).toThrow();
    });

    it('transition after dispose throws an error', async () => {
        renderer.dispose();
        await expect(renderer.transition(BIOME_UTERINE_CHAMBER, 500)).rejects.toThrow();
    });
});
