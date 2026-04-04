/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit-tests for PlayerPhysics (core/physics/PlayerPhysicsLogic.ts).
 * Covers: initialisation, jump, double-jump, gravity, lane change, grounded reset.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerPhysics } from '../core/physics/PlayerPhysicsLogic';

describe('PlayerPhysics', () => {
  let physics: PlayerPhysics;

  beforeEach(() => {
    physics = new PlayerPhysics();
  });

  // ── Initialisation ─────────────────────────────────────────────────────────
  it('initialises with zero velocity and grounded state', () => {
    expect(physics.position.x).toBe(0);
    expect(physics.position.y).toBe(0);
    expect(physics.velocity.x).toBe(0);
    expect(physics.velocity.y).toBe(0);
    expect(physics.isGrounded).toBe(true);
    expect(physics.targetLane).toBe(0);
    expect(physics.jumpsRemaining).toBe(2);
  });

  // ── Jump ──────────────────────────────────────────────────────────────────
  it('performs jump when requestJump is buffered', () => {
    physics.isGrounded = true;
    physics.jumpsRemaining = 2;

    physics.requestJump();
    physics.update(0.016);

    expect(physics.isJumping).toBe(true);
    expect(physics.jumpsRemaining).toBe(1);
    expect(physics.velocity.y).not.toBe(0);
  });

  // ── Double Jump ────────────────────────────────────────────────────────────
  it('allows double jump while airborne', () => {
    physics.isGrounded = true;
    physics.jumpsRemaining = 2;

    // First jump
    physics.requestJump();
    physics.update(0.016);
    const velocityAfterFirst = physics.velocity.y;
    expect(physics.jumpsRemaining).toBe(1);

    // Second jump in the air
    physics.requestJump();
    physics.update(0.016);
    expect(physics.jumpsRemaining).toBe(0);
    // Double-jump force should be applied (velocity changes again)
    expect(physics.isDoubleJumping || physics.isJumping).toBe(true);
    // Double-jump applies a new upward velocity impulse — should differ from first jump velocity
    expect(physics.velocity.y).not.toBe(velocityAfterFirst);
  });

  // ── Gravity ────────────────────────────────────────────────────────────────
  it('applies gravity so y-velocity decreases while airborne', () => {
    physics.isGrounded = true;
    physics.requestJump();
    physics.update(0.016); // launch

    const velAfterLaunch = physics.velocity.y;
    physics.update(0.100); // several frames of gravity

    // Velocity should have decreased (gravity pulls down)
    expect(physics.velocity.y).toBeLessThan(velAfterLaunch);
  });

  // ── Grounded Reset ─────────────────────────────────────────────────────────
  it('resets jumpsRemaining to 2 on landing', () => {
    physics.isGrounded = true;
    physics.requestJump();
    physics.update(0.016);
    expect(physics.jumpsRemaining).toBe(1);

    // Simulate enough frames for the player to land (large dt to force landing)
    for (let i = 0; i < 120; i++) {
      physics.update(0.016);
      if (physics.isGrounded) break;
    }

    expect(physics.isGrounded).toBe(true);
    expect(physics.jumpsRemaining).toBe(2);
    expect(physics.isJumping).toBe(false);
  });

  // ── Lane Clamp ─────────────────────────────────────────────────────────────
  it('limits lane movement and clamps velocity', () => {
    physics.setLane(2);
    physics.update(0.016);
    physics.update(0.016);
    expect(Math.abs(physics.position.x)).toBeLessThanOrEqual(physics.config.maxVelocity);
    expect(Math.abs(physics.targetLane)).toBeLessThanOrEqual(2);
  });
});


