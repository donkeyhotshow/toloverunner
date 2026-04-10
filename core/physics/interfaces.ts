/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Public API contracts for the `physics` bounded context (ADR-0003).
 *
 * Rules:
 *  - Other bounded contexts (multiplayer, biomes, leaderboard) depend on these
 *    interfaces, never on concrete implementations in this folder.
 *  - `physics` itself does NOT import from store/, src/multiplayer/, or src/biomes/.
 */

import type { GameObject } from '../../types';

// ── Canonical player physics state ───────────────────────────────────────────

/**
 * Minimal, serialisable snapshot of the player's physical state.
 * This is the Anti-Corruption Layer value object shared across bounded contexts.
 *
 * - `store/playerSlice`  writes to this shape via `setLocalPlayerState`
 * - `src/multiplayer`    maps this to `INetworkPlayerSnapshot` for wire transport
 * - `core/physics`       produces this from `PlayerPhysics.update()`
 */
export interface IPlayerState {
    /** World position [x, y, z] */
    position: Readonly<[number, number, number]>;
    /** Velocity vector [vx, vy, vz] */
    velocity: Readonly<[number, number, number]>;
    /** Active lane index (-2 … +2) */
    lane: number;
    /** Is the player touching the ground */
    isGrounded: boolean;
    /** Is the player in a jump arc */
    isJumping: boolean;
    /** Is the player in a double-jump arc */
    isDoubleJumping: boolean;
    /** Is the player sliding / crouching */
    isSliding: boolean;
    /** Character skin identifier */
    characterType: string;
}

// ── Collision result ──────────────────────────────────────────────────────────

export interface ICollisionResult {
    hit: boolean;
    graze: boolean;
    object: GameObject | null;
    jumpedOverObject?: GameObject | null;
    trampolineObject?: GameObject | null;
}

// ── Player input ──────────────────────────────────────────────────────────────

export interface IPlayerInput {
    targetLane: number;
    jumpRequested: boolean;
    slideRequested: boolean;
    dashRequested: boolean;
}

// ── ACL adapter: bridge between IPlayerState and store's PlayerState ─────────

import type { PlayerState } from '../../types';

/**
 * Maps the physics bounded-context `IPlayerState` to the store's `PlayerState`.
 * Use this whenever physics output needs to be written into the Zustand store.
 * Fields that exist only in `PlayerState` (isDead, rotation, etc.) are preserved
 * from the previous store value via `prev`.
 */
export function physicsStateToPlayerState(
    physics: IPlayerState,
    prev: PlayerState,
): PlayerState {
    return {
        ...prev,
        position: physics.position,
        velocity: physics.velocity,
        lane: physics.lane,
        isGrounded: physics.isGrounded,
        isJumping: physics.isJumping,
        isDoubleJumping: physics.isDoubleJumping,
        isSliding: physics.isSliding,
        characterType: prev.characterType,
    };
}

/**
 * Maps the store's `PlayerState` to `IPlayerState` for physics input.
 */
export function playerStateToPhysicsState(state: PlayerState): IPlayerState {
    return {
        position: state.position,
        velocity: state.velocity,
        lane: state.lane,
        isGrounded: state.isGrounded,
        isJumping: state.isJumping,
        isDoubleJumping: state.isDoubleJumping,
        isSliding: state.isSliding,
        characterType: String(state.characterType ?? ''),
    };
}

// ── Physics system contract ───────────────────────────────────────────────────

/**
 * Public interface for the physics bounded context (ADR-0003).
 * Consumers call `update()` each frame and read back `IPlayerState`.
 * Collision checking is a separate concern exposed via `checkCollisions()`.
 */
export interface IPhysicsSystem {
    /**
     * Advance physics simulation by `delta` seconds given player `input`.
     * Returns the new canonical player state.
     */
    update(delta: number, input: IPlayerInput): IPlayerState;

    /**
     * Check collisions between the current player state and world objects.
     * Pure function — does not mutate internal state.
     */
    checkCollisions(
        state: IPlayerState,
        objects: readonly GameObject[],
        currentDistance: number,
        previousDistance: number,
    ): ICollisionResult;

    /** Reset physics to initial state (e.g. on game restart). */
    reset(): void;
}
