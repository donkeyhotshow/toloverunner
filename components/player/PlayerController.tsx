/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PlayerController - Pure renderer for the player character.
 * Reads position from store every frame via useStore.getState() to avoid
 * stale closure bugs. Input handling is owned by EnhancedControls (App.tsx).
 */

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ToonSperm } from './ToonSperm';
import { useStore } from '../../store';

interface PlayerControllerProps {
  visible?: boolean;
  speed?: number;
}

const BOB_AMPLITUDE = 0.02;
const BOB_SPEED = 1.8;
const BASE_Y = 0.5;

export const PlayerController: React.FC<PlayerControllerProps> = ({
  visible = true,
  speed = 1.0,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // isJumping for ToonSperm squash & stretch (React render, not useFrame)
  const isJumping = useStore(s => s.localPlayerState.isJumping);

  // Read position directly from store every frame - no stale closure
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Always read fresh state - avoids stale closure on position
    const state = useStore.getState().localPlayerState;
    const jumping = state.isJumping;

    groupRef.current.position.x = state.position[0];

    const bob = jumping
      ? 0
      : Math.sin(clock.elapsedTime * BOB_SPEED) * BOB_AMPLITUDE;

    groupRef.current.position.y = BASE_Y + bob;
    // Z stays at 0 - world moves, player stays centered
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} name="PlayerController" frustumCulled={false}>
      <ToonSperm
        speed={speed}
        scale={1}
        isJumping={isJumping}
      />
    </group>
  );
};

PlayerController.displayName = 'PlayerController';