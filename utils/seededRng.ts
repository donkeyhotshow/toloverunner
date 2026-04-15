/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic seeded pseudo-random number generator.
 *
 * Uses the Mulberry32 algorithm — fast, small, passes statistical tests.
 * All gameplay randomness should use this instead of Math.random() so that:
 *   - the same seed always produces the same sequence
 *   - replays are reproducible across devices and FPS rates
 *   - online sync divergence is eliminated at the RNG level
 *
 * Usage:
 *   const rng = createSeededRng(42);
 *   rng(); // → float in [0, 1)
 */

/**
 * Create a seeded pseudo-random number generator using Mulberry32.
 *
 * @param seed  32-bit unsigned integer seed
 * @returns     A () => number function returning uniform floats in [0, 1)
 */
export function createSeededRng(seed: number): () => number {
    // Ensure seed is a 32-bit unsigned integer
    let state = seed >>> 0;

    return function rng(): number {
        state += 0x6d2b79f5;
        let z = state;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
    };
}

/**
 * Convert a string seed (like the store's `seed` field) to a numeric seed.
 * Uses a simple djb2-style hash.
 */
export function seedFromString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i);
        h |= 0; // keep as int32
    }
    return h >>> 0;
}
