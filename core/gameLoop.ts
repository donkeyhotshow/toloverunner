/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Fixed-timestep game loop accumulator.
 *
 * Converts variable render-frame deltas into a deterministic series of fixed-dt
 * ticks.  The returned `alpha` value (0–1) is the interpolation factor between
 * the previous and current physics state, suitable for smooth visual rendering.
 *
 * Usage (React Three Fiber):
 *   const loop = useRef(new GameLoop());
 *
 *   useFrame((_, delta) => {
 *     const alpha = loop.current.tick(delta, updateCore);
 *     render(alpha);
 *   });
 *
 * Spiral-of-death prevention: at most MAX_STEPS ticks are run per render frame.
 * Any accumulated excess beyond that is discarded so a 5-second alt-tab does not
 * produce hundreds of simulation steps.
 */

/** Shared fixed timestep (seconds) — 1/60 s per logic tick. */
export const FIXED_DT = 1 / 60;

/** Maximum simulation steps to run in a single render frame. */
export const MAX_STEPS = 5;

export class GameLoop {
    private acc = 0;

    /**
     * Advance the simulation by `delta` seconds.
     *
     * @param delta   Raw frame delta from the renderer (seconds, variable).
     * @param update  Pure update callback called once per fixed tick with dt=FIXED_DT.
     * @returns       Alpha in [0, 1) — fraction of FIXED_DT remaining in the accumulator,
     *                used to lerp between the previous and current simulation state for
     *                smooth rendering.
     */
    tick(delta: number, update: (dt: number) => void): number {
        this.acc += delta;

        let steps = 0;
        while (this.acc >= FIXED_DT && steps < MAX_STEPS) {
            update(FIXED_DT);
            this.acc -= FIXED_DT;
            steps++;
        }

        // Spiral-of-death guard: if we burned all MAX_STEPS, drop leftover accumulation
        // so the next frame starts fresh rather than trying to "catch up" endlessly.
        if (steps === MAX_STEPS) {
            this.acc = 0;
        }

        return this.acc / FIXED_DT;
    }

    /** Reset the accumulator (call when the game is paused or restarted). */
    reset(): void {
        this.acc = 0;
    }
}
