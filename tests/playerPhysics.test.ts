import { describe, it, expect } from 'vitest';
import { PlayerPhysics } from '../core/physics/PlayerPhysicsLogic';

describe('PlayerPhysics', () => {
  it('performs jump when requestJump is buffered', () => {
    const physics = new PlayerPhysics();
    // ensure initial grounded state
    physics.isGrounded = true;
    physics.jumpsRemaining = 2;

    // request jump (buffer)
    physics.requestJump();
    // update with small dt
    physics.update(0.016);

    expect(physics.isJumping).toBe(true);
    expect(physics.jumpsRemaining).toBe(1);
    expect(physics.velocity.y).not.toBe(0);
  });

  it('limits lane movement and clamps velocity', () => {
    const physics = new PlayerPhysics();
    physics.setLane(2);
    // simulate a couple of frames
    physics.update(0.016);
    physics.update(0.016);
    expect(Math.abs(physics.position.x)).toBeLessThanOrEqual(physics.config.maxVelocity);
    // lane should be within limits
    expect(Math.abs(physics.targetLane)).toBeLessThanOrEqual(2);
  });
});


