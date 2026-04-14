/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Tests for core/gameLoop.ts — fixed-timestep accumulator.
 */

import { describe, it, expect } from 'vitest';
import { GameLoop, FIXED_DT, MAX_STEPS } from '../../core/gameLoop';

describe('GameLoop — fixed-timestep accumulator', () => {
    it('exports FIXED_DT = 1/60', () => {
        expect(FIXED_DT).toBeCloseTo(1 / 60, 10);
    });

    it('exports MAX_STEPS = 5', () => {
        expect(MAX_STEPS).toBe(5);
    });

    it('calls update once for a delta equal to FIXED_DT', () => {
        const loop = new GameLoop();
        let ticks = 0;
        loop.tick(FIXED_DT, () => { ticks++; });
        expect(ticks).toBe(1);
    });

    it('calls update twice for a delta equal to 2 × FIXED_DT', () => {
        const loop = new GameLoop();
        let ticks = 0;
        loop.tick(2 * FIXED_DT, () => { ticks++; });
        expect(ticks).toBe(2);
    });

    it('does not call update when delta is less than FIXED_DT', () => {
        const loop = new GameLoop();
        let ticks = 0;
        loop.tick(FIXED_DT * 0.5, () => { ticks++; });
        expect(ticks).toBe(0);
    });

    it('accumulates across multiple ticks until threshold is reached', () => {
        const loop = new GameLoop();
        let ticks = 0;
        // Three frames at half FIXED_DT each → should fire once after two frames
        loop.tick(FIXED_DT * 0.5, () => { ticks++; }); // acc = 0.5
        expect(ticks).toBe(0);
        loop.tick(FIXED_DT * 0.5, () => { ticks++; }); // acc = 1.0 → fires
        expect(ticks).toBe(1);
        loop.tick(FIXED_DT * 0.5, () => { ticks++; }); // acc = 0.5 again
        expect(ticks).toBe(1);
    });

    it('returns alpha = 0 when accumulator is exactly drained', () => {
        const loop = new GameLoop();
        const alpha = loop.tick(FIXED_DT, () => {});
        expect(alpha).toBeCloseTo(0, 10);
    });

    it('returns alpha = 0.5 when half a FIXED_DT remains', () => {
        const loop = new GameLoop();
        // 1.5 × FIXED_DT → fires once, leaves 0.5 × FIXED_DT → alpha = 0.5
        const alpha = loop.tick(1.5 * FIXED_DT, () => {});
        expect(alpha).toBeCloseTo(0.5, 5);
    });

    it('caps at MAX_STEPS ticks and resets accumulator (spiral-of-death guard)', () => {
        const loop = new GameLoop();
        let ticks = 0;
        // A huge delta (10 s) would produce hundreds of ticks without the cap
        const alpha = loop.tick(10, () => { ticks++; });
        expect(ticks).toBe(MAX_STEPS);
        // After hitting the cap the accumulator is reset → alpha must be 0
        expect(alpha).toBe(0);
    });

    it('reset() clears the accumulator', () => {
        const loop = new GameLoop();
        // Accumulate half a step
        loop.tick(FIXED_DT * 0.5, () => {});
        loop.reset();
        // After reset nothing should have accumulated
        let ticks = 0;
        loop.tick(FIXED_DT * 0.5, () => { ticks++; }); // needs another 0.5 to fire
        expect(ticks).toBe(0);
    });

    it('each update callback receives exactly FIXED_DT', () => {
        const loop = new GameLoop();
        const dts: number[] = [];
        loop.tick(3 * FIXED_DT, (dt) => { dts.push(dt); });
        expect(dts).toHaveLength(3);
        for (const dt of dts) {
            expect(dt).toBeCloseTo(FIXED_DT, 10);
        }
    });
});
