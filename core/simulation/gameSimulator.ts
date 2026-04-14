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
 * Usage:
 *   const state1 = simulate({ seed: 'abc', inputs: [], frames: 200 });
 *   const state2 = simulate({ seed: 'abc', inputs: [], frames: 200 });
 *   expect(state1).toEqual(state2);  // determinism guarantee
 */

import { computeEffectiveSpeed } from '../../store/gameplay/speedActions';
import { createSeededRng, seedFromString } from '../../utils/seededRng';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../../constants';
import { safeClamp } from '../../utils/safeMath';

/** Fixed timestep — identical to PhysicsStabilizer default and WorldLevelManager accumulator. */
export const FIXED_DT = 1 / 60;

/** Default slow duration in seconds (matches slowDown() default of 2000ms). */
const DEFAULT_SLOW_DURATION_SEC = 2.0;

/** Possible per-frame inputs for the simulator. */
export interface SimInput {
    /** Frame index on which this input fires. */
    frame: number;
    /** What action happens on this frame. */
    action:
        | 'collect_coin'
        | 'take_damage'
        | 'slow'       // applies slowDown(0.5, 2.0 s)
        | 'boost'      // activates speed boost (5 s)
        | 'graze';
}

/** Minimal deterministic game state produced by the simulator. */
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
 * @returns Final SimState after `frames` ticks. Two calls with the same options
 *          MUST return structurally equal states — this is enforced by the replay tests.
 */
export function simulate(options: SimOptions): SimState {
    const { seed, inputs = [], frames } = options;

    // Seed the RNG from the string seed
    const rng = createSeededRng(seedFromString(seed));

    // --- Initial state (mirrors startGameplay defaults) ---
    let gameClock = 0;
    let timePlayed = 0;
    let baseSpeed = RUN_SPEED_BASE;
    let score = 0;
    let distance = 0;
    let lives = 3;
    let combo = 0;
    let momentum = 1.0;
    let slowEffects: Array<{ factor: number; remainingTime: number }> = [];
    let speedBoostActive = false;
    let speedBoostTimer = 0;
    let invincibilityTimer = 0;
    let isInvincible = false;
    let lastCollectTime = 0;
    let lastGrazeTime = 0;

    // Build a frame-indexed input map for O(1) lookup
    const inputMap = new Map<number, SimInput[]>();
    for (const input of inputs) {
        const list = inputMap.get(input.frame) ?? [];
        list.push(input);
        inputMap.set(input.frame, list);
    }

    // --- Main loop ---
    for (let frame = 0; frame < frames; frame++) {
        const dt = FIXED_DT;

        // 1. Apply inputs for this frame
        const frameInputs = inputMap.get(frame);
        if (frameInputs) {
            for (const inp of frameInputs) {
                switch (inp.action) {
                    case 'collect_coin': {
                        const timeSinceLast = gameClock - lastCollectTime;
                        const perfectTiming = timeSinceLast < 0.5 && timeSinceLast > 0 && lastCollectTime > 0;
                        const bonus = perfectTiming ? 50 : 0;
                        const newCombo = combo + 1;
                        const multiplier = Math.floor(newCombo / 5) + 1;
                        const points = (5 + bonus) * multiplier;
                        score = safeClamp(score + points, 0, GAMEPLAY_CONFIG.MAX_SCORE, score);
                        combo = newCombo;
                        lastCollectTime = gameClock;
                        baseSpeed = Math.min(GAMEPLAY_CONFIG.MAX_SPEED, baseSpeed + 0.012);
                        momentum = Math.min(2.0, momentum + 0.012);
                        break;
                    }
                    case 'take_damage': {
                        if (!isInvincible && lives > 0) {
                            lives = Math.max(0, lives - 1);
                            combo = 0;
                            if (lives > 0) {
                                isInvincible = true;
                                invincibilityTimer = 2.5;
                            }
                        }
                        break;
                    }
                    case 'slow': {
                        const remainingTime = DEFAULT_SLOW_DURATION_SEC;
                        const active = slowEffects.filter(e => e.remainingTime > 0);
                        slowEffects = [...active, { factor: 0.5, remainingTime }];
                        break;
                    }
                    case 'boost': {
                        speedBoostActive = true;
                        speedBoostTimer = 5.0;
                        isInvincible = true;
                        break;
                    }
                    case 'graze': {
                        const timeSinceGraze = gameClock - lastGrazeTime;
                        if (timeSinceGraze >= 0.1) {
                            score = safeClamp(score + 50, 0, GAMEPLAY_CONFIG.MAX_SCORE, score);
                            combo = safeClamp(combo + 1, 0, Number.MAX_SAFE_INTEGER, combo);
                            lastGrazeTime = gameClock;
                            momentum = Math.min(2.0, momentum + 0.05);
                        }
                        break;
                    }
                }
            }
        }

        // 2. Update slow effects (deterministic countdown)
        if (slowEffects.length > 0) {
            const updated = slowEffects.map(e => ({ ...e, remainingTime: e.remainingTime - dt }));
            slowEffects = updated.filter(e => e.remainingTime > 0);
        }

        // 3. Update speed boost timer
        if (speedBoostActive) {
            speedBoostTimer = Math.max(0, speedBoostTimer - dt);
            if (speedBoostTimer === 0) {
                speedBoostActive = false;
            }
        }

        // 4. Update invincibility timer
        if (invincibilityTimer > 0 || isInvincible) {
            invincibilityTimer = Math.max(0, invincibilityTimer - dt);
            isInvincible = invincibilityTimer > 0;
        }

        // 5. Compute effective speed (pure, deterministic)
        const currentSpeed = computeEffectiveSpeed(baseSpeed, speedBoostActive, slowEffects);

        // 6. Update distance and progression
        const moveDist = currentSpeed * dt;
        distance += moveDist;
        score = safeClamp(score + Math.floor(moveDist), 0, GAMEPLAY_CONFIG.MAX_SCORE, score);

        // Speed progression: mirrors increaseDistance formula
        const targetBaseSpeed = RUN_SPEED_BASE * (1 + 0.01 * timePlayed);
        baseSpeed = safeClamp(
            baseSpeed + (targetBaseSpeed - baseSpeed) * 0.05,
            GAMEPLAY_CONFIG.MIN_SPEED,
            GAMEPLAY_CONFIG.MAX_SPEED,
            baseSpeed
        );

        // 7. Momentum decay (mirrors updateGameTimer)
        momentum = safeClamp(momentum - dt * 0.05, 0, 2.0, 1.0);

        // 8. Advance game clock
        gameClock += dt;
        timePlayed += dt;

        // Consume a random value each frame so the RNG sequence can be validated
        rng();
    }

    // One final RNG draw — used to validate the full sequence is identical across runs
    const finalRng = rng();

    const speed = computeEffectiveSpeed(baseSpeed, speedBoostActive, slowEffects);

    return {
        frame: frames,
        gameClock,
        timePlayed,
        speed,
        baseSpeed,
        score,
        distance,
        lives,
        combo,
        momentum,
        slowEffects,
        speedBoostActive,
        speedBoostTimer,
        invincibilityTimer,
        isInvincible,
        finalRng,
    };
}
