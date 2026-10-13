/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * damp - Frame-rate-independent exponential smoothing.
 *
 * The naive smoothing pattern `value = lerp(value, target, delta * k)` is NOT
 * frame-rate independent: the amount smoothed per second changes with FPS, and
 * when `delta * k >= 1` (which happens below ~25 FPS for large k) the lerp factor
 * exceeds 1, causing overshoot and visible oscillation/jitter.
 *
 * The correct, time-based formulation is:
 *
 *     factor = 1 - exp(-lambda * dt)
 *
 * which gives an identical settle rate regardless of frame time and can never
 * exceed 1, so it degrades gracefully during frame drops.
 *
 * `lambda` (the smoothing rate, 1/seconds) maps intuitively to the old per-frame
 * coefficients: a value that used `delta * 8` should use `lambda = 8`, matching
 * the 60 FPS feel while remaining stable at any FPS.
 */

/**
 * Compute the frame-rate-independent interpolation factor in [0, 1].
 *
 * @param lambda Smoothing rate (1/seconds). Higher = snappier.
 * @param dt     Frame delta in seconds.
 */
export function dampFactor(lambda: number, dt: number): number {
    if (!Number.isFinite(lambda) || !Number.isFinite(dt) || dt <= 0) return 0;
    if (lambda <= 0) return 0;
    // 1 - e^(-lambda*dt) is always within [0, 1) for positive inputs.
    return 1 - Math.exp(-lambda * dt);
}

/**
 * Frame-rate-independent scalar smoothing toward `target`.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    return current + (target - current) * dampFactor(lambda, dt);
}

/**
 * Frame-rate-independent angular smoothing (radians), taking the shortest path
 * around the -PI..PI wrap so a value never spins the long way round.
 */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * dampFactor(lambda, dt);
}

interface Vec3Like {
    x: number;
    y: number;
    z: number;
    // Loosely typed so THREE.Vector3 (whose lerp is (Vector3, number) => Vector3)
    // is assignable without fighting the structural type checker.
    lerp?: (v: never, alpha: number) => unknown;
}

/**
 * Frame-rate-independent vector smoothing. Mutates and returns `current`.
 * Works with THREE.Vector3 (uses its own `.lerp`) or any {x,y,z} object.
 */
export function dampVec3<T extends Vec3Like>(current: T, target: T, lambda: number, dt: number): T {
    const t = dampFactor(lambda, dt);
    if (typeof current.lerp === 'function') {
        (current.lerp as (v: T, alpha: number) => unknown)(target, t);
        return current;
    }
    current.x += (target.x - current.x) * t;
    current.y += (target.y - current.y) * t;
    current.z += (target.z - current.z) * t;
    return current;
}
