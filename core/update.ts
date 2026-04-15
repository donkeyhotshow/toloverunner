/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Pure deterministic gameplay update function.
 *
 * This module is the core gameplay "engine".  It has NO knowledge of React,
 * Zustand, Three.js, or any browser API.  All state transitions are expressed
 * as pure functions (CoreGameState, inputs, dt) → CoreGameState, making the
 * logic:
 *   - testable in isolation (no mocks required),
 *   - replayable (same seed + inputs → same output),
 *   - lockstep-multiplayer-ready (serialize CoreGameState over the wire).
 *
 * The Zustand store remains the UI/render source of truth for now and is
 * updated once per frame from the caller (WorldLevelManager / gameLoop).
 * This module is the *single source of truth* for gameplay logic.
 */

import { computeEffectiveSpeed } from '../store/gameplay/speedActions';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../constants';
import { safeClamp } from '../utils/safeMath';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlowEffect {
    factor: number;
    /** Remaining duration in seconds (counts down via dt). */
    remainingTime: number;
}

/**
 * Serializable, deterministic game state.
 * All wall-clock timestamps have been replaced with `gameClock` (accumulated dt).
 */
export interface CoreGameState {
    /** Accumulated game-time in seconds (sum of fixed dt ticks — no wall clock). */
    gameClock: number;
    /** Total time since the run started (seconds). */
    timePlayed: number;
    /** Current base speed before modifiers (units/s). */
    baseSpeed: number;
    /** Active slow effects with remaining countdown (seconds). */
    slowEffects: SlowEffect[];
    /** Whether the speed-boost powerup is active. */
    speedBoostActive: boolean;
    /** Remaining duration of the speed-boost powerup (seconds). */
    speedBoostTimer: number;
    /** Current score. */
    score: number;
    /** Distance travelled (units). */
    distance: number;
    /** Remaining lives. */
    lives: number;
    /** Current combo counter. */
    combo: number;
    /** Momentum multiplier [0, 2]. */
    momentum: number;
    /** Remaining invincibility duration (seconds). */
    invincibilityTimer: number;
    /** True while invincibilityTimer > 0. */
    isInvincible: boolean;
    /** gameClock value at the last coin collect (for perfect-timing detection). */
    lastCollectTime: number;
    /** gameClock value at the last graze event (for debouncing). */
    lastGrazeTime: number;
}

/**
 * Discrete input events that can occur within a single tick.
 * Identical to SimInput.action from the simulator — kept in sync.
 */
export type CoreInput =
    | 'collect_coin'
    | 'take_damage'
    | 'slow'
    | 'boost'
    | 'graze';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a fresh initial state that mirrors `startGameplay()` defaults.
 */
export function initialCoreState(): CoreGameState {
    return {
        gameClock: 0,
        timePlayed: 0,
        baseSpeed: RUN_SPEED_BASE,
        slowEffects: [],
        speedBoostActive: false,
        speedBoostTimer: 0,
        score: 0,
        distance: 0,
        lives: 3,
        combo: 0,
        momentum: 1.0,
        invincibilityTimer: 0,
        isInvincible: false,
        lastCollectTime: 0,
        lastGrazeTime: 0,
    };
}

/**
 * Apply a single discrete input event to the state.
 * Pure function — no side-effects.
 */
export function applyInput(state: CoreGameState, input: CoreInput): CoreGameState {
    switch (input) {
        case 'collect_coin': {
            const timeSinceLast = state.gameClock - state.lastCollectTime;
            const perfectTiming =
                timeSinceLast < 0.5 && timeSinceLast > 0 && state.lastCollectTime > 0;
            const bonus = perfectTiming ? 50 : 0;
            const newCombo = state.combo + 1;
            const multiplier = Math.floor(newCombo / 5) + 1;
            const points = (5 + bonus) * multiplier;
            return {
                ...state,
                score: safeClamp(state.score + points, 0, GAMEPLAY_CONFIG.MAX_SCORE, state.score),
                combo: newCombo,
                lastCollectTime: state.gameClock,
                baseSpeed: Math.min(GAMEPLAY_CONFIG.MAX_SPEED, state.baseSpeed + 0.012),
                momentum: Math.min(2.0, state.momentum + 0.012),
            };
        }
        case 'take_damage': {
            if (state.isInvincible || state.lives <= 0) return state;
            const newLives = Math.max(0, state.lives - 1);
            const damaged = newLives > 0;
            return {
                ...state,
                lives: newLives,
                combo: 0,
                isInvincible: damaged,
                invincibilityTimer: damaged ? 2.5 : 0,
            };
        }
        case 'slow': {
            const active = state.slowEffects.filter(e => e.remainingTime > 0);
            return {
                ...state,
                slowEffects: [...active, { factor: 0.5, remainingTime: 2.0 }],
            };
        }
        case 'boost': {
            return {
                ...state,
                speedBoostActive: true,
                speedBoostTimer: 5.0,
                isInvincible: true,
            };
        }
        case 'graze': {
            const timeSinceGraze = state.gameClock - state.lastGrazeTime;
            if (timeSinceGraze < 0.1) return state;
            return {
                ...state,
                score: safeClamp(state.score + 50, 0, GAMEPLAY_CONFIG.MAX_SCORE, state.score),
                combo: safeClamp(state.combo + 1, 0, Number.MAX_SAFE_INTEGER, state.combo),
                lastGrazeTime: state.gameClock,
                momentum: Math.min(2.0, state.momentum + 0.05),
            };
        }
    }
}

/**
 * Advance all timers by `dt` seconds.
 * Pure function — no side-effects.
 */
export function updateTimers(state: CoreGameState, dt: number): CoreGameState {
    // Slow effects countdown
    let { slowEffects } = state;
    if (slowEffects.length > 0) {
        const updated = slowEffects.map(e => ({ ...e, remainingTime: e.remainingTime - dt }));
        slowEffects = updated.filter(e => e.remainingTime > 0);
    }

    // Speed-boost timer
    let { speedBoostActive, speedBoostTimer } = state;
    if (speedBoostActive) {
        speedBoostTimer = Math.max(0, speedBoostTimer - dt);
        if (speedBoostTimer === 0) speedBoostActive = false;
    }

    // Invincibility timer
    let { invincibilityTimer, isInvincible } = state;
    if (invincibilityTimer > 0 || isInvincible) {
        invincibilityTimer = Math.max(0, invincibilityTimer - dt);
        isInvincible = invincibilityTimer > 0;
    }

    return { ...state, slowEffects, speedBoostActive, speedBoostTimer, invincibilityTimer, isInvincible };
}

/**
 * Advance gameplay progression (distance, score, speed ramp, momentum) by `dt` seconds.
 * Pure function — no side-effects.
 */
export function updateProgression(state: CoreGameState, dt: number): CoreGameState {
    const currentSpeed = computeEffectiveSpeed(state.baseSpeed, state.speedBoostActive, state.slowEffects);
    const moveDist = currentSpeed * dt;
    const newDistance = state.distance + moveDist;
    const newScore = safeClamp(
        state.score + Math.floor(moveDist),
        0,
        GAMEPLAY_CONFIG.MAX_SCORE,
        state.score
    );

    // Speed progression: ramp toward a target that grows with time played
    const targetBaseSpeed = RUN_SPEED_BASE * (1 + 0.01 * state.timePlayed);
    const newBaseSpeed = safeClamp(
        state.baseSpeed + (targetBaseSpeed - state.baseSpeed) * 0.05,
        GAMEPLAY_CONFIG.MIN_SPEED,
        GAMEPLAY_CONFIG.MAX_SPEED,
        state.baseSpeed
    );

    // Momentum decay
    const newMomentum = safeClamp(state.momentum - dt * 0.05, 0, 2.0, 1.0);

    return {
        ...state,
        distance: newDistance,
        score: newScore,
        baseSpeed: newBaseSpeed,
        momentum: newMomentum,
        gameClock: state.gameClock + dt,
        timePlayed: state.timePlayed + dt,
    };
}

/**
 * Full per-tick update: apply inputs → advance timers → advance progression.
 *
 * This is the single entry point used by both the live game loop and the
 * deterministic replay simulator.
 *
 * @param state  Current CoreGameState (immutable — returns new object).
 * @param inputs Zero or more discrete input events that occurred this tick.
 * @param dt     Fixed timestep in seconds (should always be FIXED_DT = 1/60).
 */
export function update(state: CoreGameState, inputs: CoreInput[], dt: number): CoreGameState {
    let s = state;
    for (const input of inputs) {
        s = applyInput(s, input);
    }
    s = updateTimers(s, dt);
    s = updateProgression(s, dt);
    return s;
}
