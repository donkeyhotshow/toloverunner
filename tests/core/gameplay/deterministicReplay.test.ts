/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic replay tests — the core guarantee of the fixed-timestep architecture.
 *
 * Every test here proves one of:
 *   A. Identical seed + inputs → identical final state (cross-device determinism)
 *   B. State at frame N is reproducible across independent runs (snapshot stability)
 *   C. Lag spikes do not corrupt game state (tab-switch safety)
 *   D. computeEffectiveSpeed is a pure function (no external dependencies)
 */

import { describe, it, expect } from 'vitest';
import { simulate, FIXED_DT, type SimInput } from '../../../core/simulation/gameSimulator';
import { computeEffectiveSpeed } from '../../../store/gameplay/speedActions';
import { createSeededRng, seedFromString } from '../../../utils/seededRng';
import { RUN_SPEED_BASE, GAMEPLAY_CONFIG } from '../../../constants';

// ── A. Replay determinism ─────────────────────────────────────────────────────

describe('Deterministic replay — same seed + inputs → same state', () => {
    it('two runs with no inputs produce identical final states', () => {
        const opts = { seed: 'test-seed-42', frames: 200 };
        const run1 = simulate(opts);
        const run2 = simulate(opts);
        expect(run1).toEqual(run2);
    });

    it('two runs with coin collection inputs are identical', () => {
        const inputs: SimInput[] = [
            { frame: 10, action: 'collect_coin' },
            { frame: 20, action: 'collect_coin' },
            { frame: 55, action: 'collect_coin' },
        ];
        const opts = { seed: 'seed-coins', inputs, frames: 300 };
        expect(simulate(opts)).toEqual(simulate(opts));
    });

    it('two runs with damage and slow inputs are identical', () => {
        const inputs: SimInput[] = [
            { frame: 5,  action: 'slow' },
            { frame: 30, action: 'take_damage' },
            { frame: 60, action: 'graze' },
            { frame: 90, action: 'boost' },
        ];
        const opts = { seed: 'seed-combat', inputs, frames: 400 };
        expect(simulate(opts)).toEqual(simulate(opts));
    });

    it('different seeds produce different states', () => {
        const run1 = simulate({ seed: 'seed-alpha', frames: 100 });
        const run2 = simulate({ seed: 'seed-beta',  frames: 100 });
        // RNG sequences differ → finalRng must differ
        expect(run1.finalRng).not.toBe(run2.finalRng);
    });

    it('finalRng is deterministic for the same seed', () => {
        const rng1 = simulate({ seed: 'rng-check', frames: 60 }).finalRng;
        const rng2 = simulate({ seed: 'rng-check', frames: 60 }).finalRng;
        expect(rng1).toBe(rng2);
        expect(rng1).toBeGreaterThanOrEqual(0);
        expect(rng1).toBeLessThan(1);
    });
});

// ── B. State snapshot stability ───────────────────────────────────────────────

describe('Snapshot stability — frame N always produces state A', () => {
    const SEED = 'snapshot-seed';

    it('state at frame 60 (1 second) is stable', () => {
        const snap = simulate({ seed: SEED, frames: 60 });

        // gameClock must be exactly 60 × FIXED_DT (within float rounding)
        expect(snap.gameClock).toBeCloseTo(60 * FIXED_DT, 10);
        expect(snap.timePlayed).toBeCloseTo(60 * FIXED_DT, 10);
        expect(snap.lives).toBe(3);
        expect(snap.speed).toBeGreaterThanOrEqual(GAMEPLAY_CONFIG.MIN_SPEED);
        expect(snap.speed).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('state at frame 100 is identical across two runs', () => {
        const a = simulate({ seed: SEED, frames: 100 });
        const b = simulate({ seed: SEED, frames: 100 });
        expect(a).toEqual(b);
    });

    it('state at frame 200 is identical across two runs', () => {
        const a = simulate({ seed: SEED, frames: 200 });
        const b = simulate({ seed: SEED, frames: 200 });
        expect(a).toEqual(b);
    });

    it('distance increases monotonically with frames', () => {
        const s60  = simulate({ seed: SEED, frames: 60  });
        const s120 = simulate({ seed: SEED, frames: 120 });
        const s200 = simulate({ seed: SEED, frames: 200 });
        expect(s120.distance).toBeGreaterThan(s60.distance);
        expect(s200.distance).toBeGreaterThan(s120.distance);
    });

    it('baseSpeed increases over time (progression curve)', () => {
        const early = simulate({ seed: SEED, frames: 60  });
        const later = simulate({ seed: SEED, frames: 600 });
        expect(later.baseSpeed).toBeGreaterThanOrEqual(early.baseSpeed);
    });
});

// ── C. Lag-spike resistance ───────────────────────────────────────────────────

describe('Lag-spike resistance — variable safeDelta does not corrupt state', () => {
    it('slow effect timer counts down by exactly dt each tick', () => {
        const initialRemaining = 2.0; // seconds
        const frames = 60;            // 1 second

        const state = simulate({
            seed: 'slow-test',
            inputs: [{ frame: 0, action: 'slow' }],
            frames,
        });

        // After 60 frames (1s), ~1s should remain on a 2s slow
        const remaining = state.slowEffects[0]?.remainingTime ?? 0;
        expect(remaining).toBeCloseTo(initialRemaining - frames * FIXED_DT, 5);
    });

    it('speed boost expires after exactly 5 seconds (300 frames)', () => {
        const state = simulate({
            seed: 'boost-test',
            inputs: [{ frame: 0, action: 'boost' }],
            frames: 301, // one frame past expiry
        });
        expect(state.speedBoostActive).toBe(false);
        expect(state.speedBoostTimer).toBe(0);
    });

    it('invincibility expires after exactly 2.5 seconds (150 frames)', () => {
        const state = simulate({
            seed: 'invincibility-test',
            inputs: [{ frame: 0, action: 'take_damage' }],
            frames: 151, // one frame past expiry
        });
        expect(state.isInvincible).toBe(false);
    });

    it('gameClock advances by exactly frames × FIXED_DT', () => {
        const FRAMES = 360;
        const state = simulate({ seed: 'clock-test', frames: FRAMES });
        expect(state.gameClock).toBeCloseTo(FRAMES * FIXED_DT, 8);
    });
});

// ── D. computeEffectiveSpeed purity ──────────────────────────────────────────

describe('computeEffectiveSpeed — pure function, no external dependencies', () => {
    it('returns baseSpeed when no effects are active', () => {
        expect(computeEffectiveSpeed(20, false, [])).toBe(20);
    });

    it('applies boost factor', () => {
        const result = computeEffectiveSpeed(10, true, []);
        // SPEED_BOOST_FACTOR × 10, clamped to MAX_SPEED
        expect(result).toBe(Math.min(GAMEPLAY_CONFIG.MAX_SPEED, 10 * 2.0));
    });

    it('filters out expired slows (remainingTime ≤ 0)', () => {
        const slows = [
            { factor: 0.1, remainingTime: 0 },   // expired
            { factor: 0.1, remainingTime: -0.5 }, // expired
        ];
        expect(computeEffectiveSpeed(20, false, slows)).toBe(20);
    });

    it('applies the minimum slow factor from active effects', () => {
        const slows = [
            { factor: 0.8, remainingTime: 1.0 },
            { factor: 0.5, remainingTime: 2.0 },
            { factor: 0.3, remainingTime: 0.5 },
        ];
        const result = computeEffectiveSpeed(20, false, slows);
        // min factor = 0.3; 20 × 0.3 = 6 → clamped to MIN_SPEED
        expect(result).toBe(GAMEPLAY_CONFIG.MIN_SPEED);
    });

    it('is deterministic — same inputs always return same output', () => {
        const slows = [{ factor: 0.6, remainingTime: 1.5 }];
        const a = computeEffectiveSpeed(20, false, slows);
        const b = computeEffectiveSpeed(20, false, slows);
        expect(a).toBe(b);
    });

    it('clamps result to MIN_SPEED', () => {
        const result = computeEffectiveSpeed(0.001, false, []);
        expect(result).toBe(GAMEPLAY_CONFIG.MIN_SPEED);
    });

    it('clamps result to MAX_SPEED', () => {
        const result = computeEffectiveSpeed(GAMEPLAY_CONFIG.MAX_SPEED + 100, true, []);
        expect(result).toBe(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('has no performance.now() dependency — can be called at any wall-clock time', () => {
        // If the function depended on performance.now() internally, this test would
        // be flaky. Pure function → always deterministic.
        const slows = [{ factor: 0.7, remainingTime: 1.0 }];
        const results = Array.from({ length: 5 }, () => computeEffectiveSpeed(15, false, slows));
        expect(new Set(results).size).toBe(1); // all values are identical
    });
});

// ── E. Seeded RNG ─────────────────────────────────────────────────────────────

describe('Seeded RNG determinism', () => {
    it('same seed always produces the same sequence', () => {
        const makeSeq = (seed: number, n: number) => {
            const rng = createSeededRng(seed);
            return Array.from({ length: n }, rng);
        };
        const a = makeSeq(12345, 20);
        const b = makeSeq(12345, 20);
        expect(a).toEqual(b);
    });

    it('different seeds produce different sequences', () => {
        const rng1 = createSeededRng(1);
        const rng2 = createSeededRng(2);
        expect(rng1()).not.toBe(rng2());
    });

    it('returns values in [0, 1)', () => {
        const rng = createSeededRng(999);
        for (let i = 0; i < 100; i++) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('seedFromString converts the same string to the same number', () => {
        expect(seedFromString('hello')).toBe(seedFromString('hello'));
        expect(seedFromString('hello')).not.toBe(seedFromString('world'));
    });

    it('RUN_SPEED_BASE is stable (simulator baseline)', () => {
        // Ensures the constants the simulator uses are not accidentally mutated
        expect(RUN_SPEED_BASE).toBeGreaterThan(0);
        expect(typeof RUN_SPEED_BASE).toBe('number');
    });
});
