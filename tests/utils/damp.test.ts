/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Tests for utils/damp.ts — frame-rate-independent exponential smoothing.
 */

import { describe, it, expect } from 'vitest';
import { dampFactor, damp, dampAngle, dampVec3 } from '../../utils/damp';

describe('damp — frame-rate-independent smoothing', () => {
    it('dampFactor is always within [0, 1]', () => {
        expect(dampFactor(10, 1 / 60)).toBeGreaterThan(0);
        expect(dampFactor(10, 1 / 60)).toBeLessThan(1);
        // Even with a huge lambda/dt the factor saturates at 1 and never exceeds it,
        // so smoothing can never overshoot the target.
        expect(dampFactor(1000, 10)).toBeLessThanOrEqual(1);
        expect(dampFactor(1000, 10)).toBeGreaterThan(0.999);
    });

    it('dampFactor returns 0 for non-positive or invalid inputs (no overshoot)', () => {
        expect(dampFactor(10, 0)).toBe(0);
        expect(dampFactor(-1, 1 / 60)).toBe(0);
        expect(dampFactor(NaN, 1 / 60)).toBe(0);
        expect(dampFactor(10, NaN)).toBe(0);
    });

    it('never overshoots the target even at very low FPS (the naive-lerp bug)', () => {
        // Naive `lerp(0, 1, delta * 25)` at 10 FPS gives factor 2.5 → overshoots to 2.5.
        const lowFps = 1 / 10;
        const result = damp(0, 1, 25, lowFps);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(1);
    });

    it('converges to the target over time', () => {
        let v = 0;
        for (let i = 0; i < 300; i++) v = damp(v, 100, 10, 1 / 60);
        expect(v).toBeCloseTo(100, 1);
    });

    it('produces a near frame-rate-independent settle after a fixed duration', () => {
        // Smooth toward 1 for ~0.5s at 60 FPS vs 30 FPS; results should be close.
        let a = 0;
        for (let i = 0; i < 30; i++) a = damp(a, 1, 8, 1 / 60);
        let b = 0;
        for (let i = 0; i < 15; i++) b = damp(b, 1, 8, 1 / 30);
        expect(Math.abs(a - b)).toBeLessThan(0.05);
    });

    it('dampAngle takes the shortest path around the -PI..PI wrap', () => {
        // From 3.0 rad toward -3.0 rad the short way is +~0.28 rad (through PI), not -6 rad.
        const next = dampAngle(3.0, -3.0, 100, 1);
        expect(next).toBeGreaterThan(3.0);
    });

    it('dampVec3 mutates and smooths a plain {x,y,z} object', () => {
        const cur = { x: 0, y: 0, z: 0 };
        dampVec3(cur, { x: 10, y: 20, z: 30 }, 10, 1 / 60);
        expect(cur.x).toBeGreaterThan(0);
        expect(cur.x).toBeLessThan(10);
        expect(cur.y).toBeGreaterThan(0);
        expect(cur.z).toBeGreaterThan(0);
    });
});
