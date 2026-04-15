/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic game simulator for replay testing and cross-platform validation.
 *
 * The simulator models only the gameplay-logic layer (speed, slowEffects, timers,
 * score, gameClock) — no Three.js, no DOM, no browser APIs.
 * All randomness is driven by the seeded RNG so the same seed always produces the
 * same output regardless of device FPS or wall-clock time.
 *
 * The per-frame logic is delegated to `core/update.ts` (the pure gameplay update
 * function shared with the live game loop), ensuring simulator and runtime are
 * always in sync.
 *
 * Usage:
 *   const state1 = simulate({ seed: 'abc', inputs: [], frames: 200 });
 *   const state2 = simulate({ seed: 'abc', inputs: [], frames: 200 });
 *   expect(state1).toEqual(state2);  // determinism guarantee
 */

import { createSeededRng, seedFromString } from '../../utils/seededRng';
import { computeEffectiveSpeed } from '../../store/gameplay/speedActions';
import { update, initialCoreState, type CoreInput } from '../update';

/** Fixed timestep — identical to PhysicsStabilizer default and GameLoop. */
export const FIXED_DT = 1 / 60;

/** Possible per-frame inputs for the simulator. */
export interface SimInput {
    /** Frame index on which this input fires. */
    frame: number;
    /** What action happens on this frame. */
    action: CoreInput;
}

/** Result type returned by `simulate()`. */
export interface SimState {
    frame: number;
    gameClock: number;    // seconds — pure game-time counter, no wall clock
    timePlayed: number;   // seconds
    speed: number;
    baseSpeed: number;
    score: number;
    distance: number;
    lives: number;
    combo: number;
    momentum: number;
    slowEffects: ReadonlyArray<{ factor: number; remainingTime: number }>;
    speedBoostActive: boolean;
    speedBoostTimer: number;
    invincibilityTimer: number;
    isInvincible: boolean;
    /** Random value at the end of the run — proves the RNG sequence is deterministic. */
    finalRng: number;
}

export interface SimOptions {
    /** String seed (matches store.seed format). */
    seed: string;
    /** Ordered list of input events (by frame). */
    inputs?: SimInput[];
    /** Total number of fixed-timestep frames to simulate. */
    frames: number;
}

/**
 * Run a deterministic simulation of the core gameplay loop.
 *
 * Delegates per-frame logic to `core/update.ts` so simulator and runtime share
 * exactly the same code path.
 *
 * @returns Final SimState after `frames` ticks. Two calls with the same options
 *          MUST return structurally equal states — this is enforced by the replay tests.
 */
export function simulate(options: SimOptions): SimState {
    const { seed, inputs = [], frames } = options;

    // Seed the RNG from the string seed
    const rng = createSeededRng(seedFromString(seed));

    // Build a frame-indexed input map for O(1) lookup
    const inputMap = new Map<number, CoreInput[]>();
    for (const input of inputs) {
        const list = inputMap.get(input.frame) ?? [];
        list.push(input.action);
        inputMap.set(input.frame, list);
    }

    // --- Main loop (delegates to core/update.ts) ---
    let state = initialCoreState();
    for (let frame = 0; frame < frames; frame++) {
        const frameInputs = inputMap.get(frame) ?? [];
        state = update(state, frameInputs, FIXED_DT);

        // Consume a random value each frame so the RNG sequence can be validated
        rng();
    }

    // One final RNG draw — used to validate the full sequence is identical across runs
    const finalRng = rng();

    const speed = computeEffectiveSpeed(state.baseSpeed, state.speedBoostActive, state.slowEffects);

    return {
        frame: frames,
        gameClock: state.gameClock,
        timePlayed: state.timePlayed,
        speed,
        baseSpeed: state.baseSpeed,
        score: state.score,
        distance: state.distance,
        lives: state.lives,
        combo: state.combo,
        momentum: state.momentum,
        slowEffects: state.slowEffects,
        speedBoostActive: state.speedBoostActive,
        speedBoostTimer: state.speedBoostTimer,
        invincibilityTimer: state.invincibilityTimer,
        isInvincible: state.isInvincible,
        finalRng,
    };
}
