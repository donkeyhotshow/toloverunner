/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PlayerController - Pure renderer for the player character.
 * Reads position from store every frame via useStore.getState() to avoid
 * stale closure bugs. Input handling is owned by EnhancedControls (App.tsx).
 *
 * VISUAL ↔ PHYSICS ALIGNMENT (v2.5):
 *   physics.groundY = 0, so physics.position.y = 0 when grounded.
 *   We read the interpolated physics Y directly and apply a model-only
 *   MODEL_Y_OFFSET inside the group so the visual character sits correctly
 *   on the ground without adding offsets to the position logic.
 */

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ToonSperm } from './ToonSperm';
import { useStore } from '../../store';
import { getPhysicsStabilizer } from '../../core/physics/PhysicsStabilizer';

interface PlayerControllerProps {
  visible?: boolean;
  speed?: number;
}

/**
 * Visual-only Y offset to position the model mesh above the physics origin.
 * Physics groundY = 0, but the model\'s visual "feet" are 0.5 units below
 * its centre — so we shift the mesh group by this amount without touching
 * any gameplay logic.
 */
const MODEL_Y_OFFSET = 0.5;
const BOB_AMPLITUDE = 0.02;
const BOB_SPEED = 1.8;

/** Animation state derived from physics velocity + grounded flag. */
export type AnimState = 'run' | 'jump' | 'fall' | 'land';

export const PlayerController: React.FC<PlayerControllerProps> = ({
  visible = true,
  speed = 1.0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const animStateRef = useRef<AnimState>('run');
  const landSquashRef = useRef(0); // 0 = no squash, 1 = full squash (decays to 0)
  // isJumping for ToonSperm squash & stretch (React render, not useFrame)
  const isJumping = useStore(s => s.localPlayerState.isJumping);

  // Read physics-interpolated position every frame — no stale closures
  useFrame(({ clock }, delta) => {

    // Prefer interpolated physics state for sub-frame-smooth rendering
    const interpolated = getPhysicsStabilizer().getInterpolatedState();
    const storeState = useStore.getState().localPlayerState;

    const physX = interpolated ? interpolated.position.x : storeState.position[0];
    const physY = interpolated ? interpolated.position.y : storeState.position[1];
    const velY  = interpolated ? interpolated.velocity.y  : 0;
    const onGround = interpolated ? interpolated.isGrounded : !storeState.isJumping;

    // ── Animation FSM (derived from physics, never from events) ──
    const prev = animStateRef.current;
    let next: AnimState;
    if (!onGround && velY > 0.5)       next = 'jump';
    else if (!onGround && velY < -0.5) next = 'fall';
    else                               next = 'run';

    // Detect landing: was falling, now grounded → trigger squash
    if (prev === 'fall' && onGround) {
      next = 'land';
      landSquashRef.current = 1.0;
    }
    animStateRef.current = next;

    // Decay landing squash (frame-rate independent)
    if (landSquashRef.current > 0) {
      landSquashRef.current = Math.max(0, landSquashRef.current - delta * 8);
    }

    // ── Position: physics Y + model-only visual offset ──
    if (!groupRef.current) return;
    groupRef.current.position.x = physX;

    const bob = onGround
      ? Math.sin(clock.elapsedTime * BOB_SPEED) * BOB_AMPLITUDE
      : 0;

    // physY is the physics body Y (0 at ground). MODEL_Y_OFFSET lifts the
    // visual character so its feet touch the ground plane, matching physics.
    groupRef.current.position.y = physY + MODEL_Y_OFFSET + bob;
    // Z stays at 0 — world moves, player stays centred
  });


  if (!visible) return null;

  return (
    <group ref={groupRef} name="PlayerController" frustumCulled={false}>
      <ToonSperm
        speed={speed}
        scale={1}
        isJumping={isJumping}
        animState={animStateRef}
        landSquash={landSquashRef}
      />
    </group>
  );
};

PlayerController.displayName = 'PlayerController';
