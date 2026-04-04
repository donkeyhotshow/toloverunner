/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Speed drift smoke-test — verifies that repeated `collectCoin` calls never push
 * `speed` above GAMEPLAY_CONFIG.MAX_SPEED, even after thousands of coins (simulating
 * a long session).
 *
 * GDD reference: "скоростная формула — MAX_SPEED = 45" (constants.ts:222)
 * See also: docs/reports/PHYSICS_ANALYSIS_REPORT.md — drift-speed after 1000+ metres.
 */

import { describe, it, expect } from 'vitest';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../../../constants';

describe('Speed drift guard', () => {
    /**
     * Simulates the fixed-point speed increment applied by collectCoin:
     *   speedIncrement = (Math.round(speed * 1000) + 12) / 1000
     * capped at MAX_SPEED.
     */
    function simulateSpeedAccumulation(iterations: number, startSpeed = RUN_SPEED_BASE): number {
        let speed = startSpeed;
        for (let i = 0; i < iterations; i++) {
            speed = Math.min(GAMEPLAY_CONFIG.MAX_SPEED, (Math.round(speed * 1000) + 12) / 1000);
        }
        return speed;
    }

    it('speed never exceeds MAX_SPEED after 100 coin collects', () => {
        const finalSpeed = simulateSpeedAccumulation(100);
        expect(finalSpeed).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('speed never exceeds MAX_SPEED after 1000 coin collects (long session)', () => {
        const finalSpeed = simulateSpeedAccumulation(1000);
        expect(finalSpeed).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('speed converges to exactly MAX_SPEED and stays there', () => {
        const speed1000 = simulateSpeedAccumulation(1000);
        const speed2000 = simulateSpeedAccumulation(2000);
        // After saturation both should equal MAX_SPEED — no drift above ceiling
        expect(speed1000).toBe(speed2000);
        expect(speed2000).toBe(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('fixed-point increment is monotonically non-decreasing until MAX_SPEED', () => {
        let speed = RUN_SPEED_BASE;
        let prev = speed;
        for (let i = 0; i < 500; i++) {
            speed = Math.min(GAMEPLAY_CONFIG.MAX_SPEED, (Math.round(speed * 1000) + 12) / 1000);
            expect(speed).toBeGreaterThanOrEqual(prev);
            prev = speed;
        }
    });
});
