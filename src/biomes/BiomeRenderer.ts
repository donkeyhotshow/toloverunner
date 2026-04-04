/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BiomeRenderer — stub implementation of IBiomeRenderer (ADR-0003 `biomes` context).
 *
 * TODO v2.5: Wire into Three.js scene — update fog, light colors, and material uniforms.
 * The stub logs the operations so tests can verify call order without a real scene.
 */

import type { IBiomeConfig, IBiomeRenderer } from './interfaces';

export class BiomeRenderer implements IBiomeRenderer {
    private _currentBiome: IBiomeConfig | null = null;
    private _disposed = false;

    get currentBiome(): IBiomeConfig | null {
        return this._currentBiome;
    }

    apply(config: IBiomeConfig): void {
        if (this._disposed) throw new Error('BiomeRenderer: already disposed');
        // TODO v2.5: scene.fog.color.set(config.palette.fog)
        //            scene.background.set(config.palette.background)
        //            update shared material uniforms with palette values
        this._currentBiome = config;
    }

    async transition(next: IBiomeConfig, _durationMs: number): Promise<void> {
        if (this._disposed) throw new Error('BiomeRenderer: already disposed');
        // TODO v2.5: Tween fog/background/material colors over durationMs using GSAP or custom RAF
        this._currentBiome = next;
    }

    dispose(): void {
        // TODO v2.5: Dispose Three.js materials/textures created by this renderer
        this._currentBiome = null;
        this._disposed = true;
    }
}
