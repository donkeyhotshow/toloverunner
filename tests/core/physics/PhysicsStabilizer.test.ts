/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Unit / integration tests for PhysicsStabilizer.
 *
 * Key regressions covered:
 *   B-05 — 0-substep frame must not freeze interpolated position
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsStabilizer } from '../../../core/physics/PhysicsStabilizer';
import type { PhysicsState } from '../../../core/physics/PhysicsStabilizer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal PhysicsState at the given Y. */
function makeState(y: number, vy = 0): PhysicsState {
    return {
        position: { x: 0, y, z: 0 },
        velocity: { x: 0, y: vy, z: 0 },
        rotation: 0,
        isGrounded: y === 0,
    };
}

/**
 * Drive the stabilizer for `frames` render frames, each of `frameDt` seconds.
 * The physics callback moves Y by `velocityY` each fixed substep.
 * Returns the interpolated Y after the final frame.
 */
function runFrames(
    stabilizer: PhysicsStabilizer,
    frames: number,
    frameDt: number,
    velocityY: number
): number {
    let simY = 0;

    for (let f = 0; f < frames; f++) {
        stabilizer.update(frameDt, (dt: number) => {
            simY += velocityY * dt;
            stabilizer.setCurrentState(makeState(simY, velocityY));
        });
    }

    return stabilizer.getInterpolatedState()?.position.y ?? 0;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PhysicsStabilizer', () => {
    let stabilizer: PhysicsStabilizer;
    const FIXED_STEP = 1 / 60; // 60 Hz

    beforeEach(() => {
        stabilizer = new PhysicsStabilizer({
            fixedTimeStep: FIXED_STEP,
            maxSubSteps: 10,
            interpolation: true,
        });
    });

    // -----------------------------------------------------------------------
    // B-05: 0-substep frame freeze
    // -----------------------------------------------------------------------

    describe('B-05 — 0-substep frame must not produce stale interpolated position', () => {
        it('returns currentState position when no substep executes (high-FPS frame)', () => {
            // Seed a currentState at Y=5
            stabilizer.setCurrentState(makeState(5, 2));

            // Manually set a matching previousState by running one full substep first
            stabilizer.update(FIXED_STEP, (_dt) => {
                stabilizer.setCurrentState(makeState(5, 2));
            });

            // Now deliver a frame so small that accumulator never reaches fixedTimeStep
            // (e.g. 240 FPS → dt ≈ 0.004 s, well below 1/60 ≈ 0.0167 s)
            const tinyDt = 0.004; // 250 FPS frame
            let substepFired = false;
            stabilizer.update(tinyDt, (_dt) => {
                substepFired = true;
                stabilizer.setCurrentState(makeState(999, 0)); // Should NOT run
            });

            expect(substepFired).toBe(false); // confirm 0 substeps

            const interp = stabilizer.getInterpolatedState();
            expect(interp).not.toBeNull();
            // B-05 fix: previousState was advanced to currentState, so interpolated Y == currentState Y
            // (not a stale value from 2+ frames ago).
            expect(interp!.position.y).toBeCloseTo(5, 2);
        });

        it('interpolated Y does not regress to a stale value after several 0-substep frames', () => {
            // Run 5 normal frames to establish history
            runFrames(stabilizer, 5, FIXED_STEP, 10);

            // Physics stopped — velocity = 0, position is stable at some Y
            const snapshot = stabilizer.getInterpolatedState()!.position.y;

            // Deliver 10 consecutive 0-substep frames (very high FPS burst)
            const tinyDt = 0.003;
            for (let i = 0; i < 10; i++) {
                stabilizer.update(tinyDt, () => { /* intentionally empty — no substep expected */ });
            }

            const afterBurst = stabilizer.getInterpolatedState()!.position.y;
            // Must not drift more than 0.01 from the snapshot taken before the burst
            expect(Math.abs(afterBurst - snapshot)).toBeLessThanOrEqual(0.01);
        });
    });

    // -----------------------------------------------------------------------
    // Normal operation
    // -----------------------------------------------------------------------

    describe('Normal substep operation', () => {
        it('executes at least one substep per frame at 60 FPS', () => {
            let steps = 0;
            stabilizer.update(FIXED_STEP + 0.001, (_dt) => {
                steps++;
                stabilizer.setCurrentState(makeState(0));
            });
            expect(steps).toBeGreaterThanOrEqual(1);
        });

        it('interpolated Y matches physics Y when alpha ~ 1 (end of frame)', () => {
            // Full fixed-step frame — accumulator drains to ~0, alpha ~ 0
            // After the substep the interp position should be very close to currentState
            let physY = 0;
            stabilizer.update(FIXED_STEP, (dt) => {
                physY += 5 * dt; // constant velocity upward
                stabilizer.setCurrentState(makeState(physY, 5));
            });
            const interp = stabilizer.getInterpolatedState();
            expect(interp!.position.y).toBeCloseTo(physY, 2);
        });

        it('clamps NaN position to 0', () => {
            stabilizer.setCurrentState({
                position: { x: NaN, y: NaN, z: NaN },
                velocity: { x: 0, y: 0, z: 0 },
                rotation: 0,
                isGrounded: true,
            });
            const state = stabilizer.getInterpolatedState();
            expect(state!.position.y).toBe(0);
            expect(state!.position.x).toBe(0);
        });

        it('getMetrics returns correct updatesThisFrame count', () => {
            stabilizer.update(FIXED_STEP * 2.5, (_dt) => {
                stabilizer.setCurrentState(makeState(0));
            });
            const metrics = stabilizer.getMetrics();
            // 2.5 × fixedStep → 2 substeps (capped by maxSubSteps, accumulator carries 0.5)
            expect(metrics.updatesThisFrame).toBe(2);
        });
    });

    // -----------------------------------------------------------------------
    // Spiral-of-death guard
    // -----------------------------------------------------------------------

    describe('Spiral-of-death guard (maxSubSteps cap)', () => {
        it('never exceeds maxSubSteps per frame even with a huge delta', () => {
            let steps = 0;
            stabilizer.update(10.0, (_dt) => { // 10 s spike
                steps++;
                stabilizer.setCurrentState(makeState(0));
            });
            // DEFAULT maxSubSteps = 10
            expect(steps).toBeLessThanOrEqual(10);
        });
    });
});
