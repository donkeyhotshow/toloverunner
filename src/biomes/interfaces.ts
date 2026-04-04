/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Biome interfaces (ADR-0003 — `biomes` bounded context).
 * All biome modules must implement these contracts to stay decoupled from core/.
 */

// ── Palette ───────────────────────────────────────────────────────────────────

export interface BiomePalette {
    /** Primary surface color (hex) */
    primary: string;
    /** Accent / obstacle color (hex) */
    accent: string;
    /** Background / sky color (hex) */
    background: string;
    /** Emissive / glow color (hex) */
    emissive: string;
    /** Fog color (hex) */
    fog: string;
}

// ── Object spawning ───────────────────────────────────────────────────────────

export interface BiomeObjectRule {
    /** Object type id (maps to ObjectType enum in types.ts) */
    objectType: string;
    /** Spawn probability [0–1] */
    probability: number;
    /** Minimum distance between consecutive spawns (units) */
    minSpacing: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface IBiomeConfig {
    /** Unique identifier, e.g. 'fallopian_tube' */
    id: string;
    /** Human-readable name */
    name: string;
    /** Visual palette */
    palette: BiomePalette;
    /** Obstacle / collectible density multiplier [0.5–2.0] */
    objectDensity: number;
    /** Ordered list of spawn rules */
    spawnRules: readonly BiomeObjectRule[];
    /** Audio track id */
    musicTrack: string;
    /** Distance (metres) before transitioning to next biome, 0 = infinite */
    transitionDistance: number;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export interface IBiomeRenderer {
    /** Apply the biome visual config (materials, fog, lights) */
    apply(config: IBiomeConfig): void;
    /** Transition from current to next biome over `durationMs` milliseconds */
    transition(next: IBiomeConfig, durationMs: number): Promise<void>;
    /** Clean up Three.js resources */
    dispose(): void;
}
