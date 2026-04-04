import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';

// Game Constants
const LANE_WIDTH = 3.0; // Distance between lanes
const JUMP_FORCE = 10.0;
const GRAVITY = 30.0;
const GROUND_Y = 0.5;

export const useGamePhysics = (speed: number = 1.0) => {
  const state = useRef({
    totalDistance: 0,
    playerX: 0, // Current lane position (-1, 0, 1 for lanes)
    targetX: 0, // Target lane position
    playerY: GROUND_Y,
    velocityY: 0,
    isJumping: false,
    isGrounded: true,
  });

  const accumulator = useRef(0);
  const TICK_RATE = 1 / 60;

  // Get store actions
  const setLocalPlayerState = useStore(s => s.setLocalPlayerState);

  // Control functions
  const jump = () => {
    if (state.current.isGrounded && !state.current.isJumping) {
      state.current.isJumping = true;
      state.current.isGrounded = false;
      state.current.velocityY = JUMP_FORCE;
      console.log('🎮 JUMP: Started');
    }
  };

  const switchLane = (direction: number) => {
    const newTarget = Math.max(-1, Math.min(1, state.current.targetX + direction));
    if (newTarget !== state.current.targetX) {
      state.current.targetX = newTarget;
      console.log('🎮 LANE SWITCH:', state.current.playerX, '→', newTarget);
    }
  };

  useFrame((_, delta) => {
    // Clamp delta to prevent tunneling
    const dt = Math.min(delta, 0.1);
    accumulator.current += dt;

    while (accumulator.current >= TICK_RATE) {
      // Fixed update - movement forward
      state.current.totalDistance += speed * TICK_RATE * 15.0; // Faster movement

      // Lane switching - smooth interpolation
      const laneDifference = state.current.targetX - state.current.playerX;
      if (Math.abs(laneDifference) > 0.01) {
        state.current.playerX += laneDifference * 0.15; // Smooth lerp
      } else {
        state.current.playerX = state.current.targetX;
      }

      // Jump physics with proper ground detection
      if (state.current.isJumping) {
        state.current.playerY += state.current.velocityY * TICK_RATE;
        state.current.velocityY -= GRAVITY * TICK_RATE;

        // Landing detection
        if (state.current.playerY <= GROUND_Y) {
          state.current.playerY = GROUND_Y;
          state.current.velocityY = 0;
          state.current.isJumping = false;
          state.current.isGrounded = true;
          console.log('🎮 JUMP: Landed');
        }
      }

      // FIX: Remove store read inside useFrame loop — jump is triggered via jump() callback
      // No need to sync from store.isJumping here; jump() sets state directly

      // SYNC TO STORE for Camera/Effects
      setLocalPlayerState({
        position: [state.current.playerX * LANE_WIDTH, state.current.playerY, -state.current.totalDistance] as [number, number, number],
        isJumping: state.current.isJumping
      });
      
      accumulator.current -= TICK_RATE;
    }
  });

  return {
    // Ref to mutable state (read in render via state.current.*)
    state: state.current,

    // Convenience flat values (snapshot at call time — use for initial render)
    totalDistance: state.current.totalDistance,
    playerX: state.current.playerX,
    playerY: state.current.playerY,
    isJumping: state.current.isJumping,
    isGrounded: state.current.isGrounded,

    // Controls
    jump,
    switchLane,
  };
};
