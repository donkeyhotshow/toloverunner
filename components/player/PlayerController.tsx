/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PlayerController — Renders ToonSperm, reads position from store
 * FIX: Position read from store (synced by useGamePhysics), not from stale ref
 * FIX: isJumping passed to ToonSperm for squash & stretch
 * ADD: Mobile touch controls (swipe left/right, tap jump, double-tap boost)
 * ADD: Shift key for speed boost (dash)
 * ADD: Sin bob on Y for idle float feel (stabilized frequency, no drift)
 * FIX: Floating origin handled by WorldLevelManager only (single source of truth)
 */

import React, { useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ToonSperm } from './ToonSperm';
import { useStore } from '../../store';

interface PlayerControllerProps {
  visible?: boolean;
  speed?: number;
  jump?: () => void;
  switchLane?: (dir: number) => void;
}

// Touch state for swipe/tap detection
interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
}

const SWIPE_THRESHOLD = 30; // px
const TAP_THRESHOLD = 15; // px
const DOUBLE_TAP_MS = 300; // ms

const BOB_AMPLITUDE = 0.02; // Reduced: subtle bobbing without motion sickness
const BOB_SPEED = 1.8; // Hz — used directly (no 2π multiplication)
const BASE_Y = 0.5;

export const PlayerController: React.FC<PlayerControllerProps> = ({
  visible = true,
  speed = 1.0,
  jump,
  switchLane,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const touchRef = useRef<TouchState>({ startX: 0, startY: 0, startTime: 0, active: false });
  const lastTapTimeRef = useRef(0);

  // Read live position from store (updated every physics tick)
  const position = useStore(s => s.localPlayerState.position);
  // isJumping needed for ToonSperm squash & stretch in JSX render
  const isJumping = useStore(s => s.localPlayerState.isJumping);

  // Sync group position every frame for smooth motion
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Read isJumping from store directly in useFrame to avoid re-render subscriptions
    const jumping = useStore.getState().localPlayerState.isJumping;

    if (position) {
      groupRef.current.position.x = position[0];

      // Stabilized bob: y = BASE_Y + sin(t * speed) * amplitude
      // No 2π multiplication — BOB_SPEED is the literal angular frequency in rad/s
      // Suppressed while jumping to avoid double-Y conflicts
      const bob = jumping
        ? 0
        : Math.sin(clock.elapsedTime * BOB_SPEED) * BOB_AMPLITUDE;

      // Clamp to prevent float32 drift after long sessions
      groupRef.current.position.y = BASE_Y + bob;

      // Z stays at 0 — world moves, player stays centered
    }
  });

  // Touch handlers (memoized for stable references)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now(),
      active: true,
    };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchRef.current.active) return;
    const t = e.changedTouches[0];
    if (!t) return;

    const deltaX = t.clientX - touchRef.current.startX;
    const deltaY = t.clientY - touchRef.current.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const now = Date.now();

    touchRef.current.active = false;

    if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD) {
      // Tap detected
      const isDoubleTap = (now - lastTapTimeRef.current) < DOUBLE_TAP_MS;
      lastTapTimeRef.current = now;

      if (isDoubleTap) {
        // Double tap = speed boost (dash)
        useStore.getState().dash();
      } else {
        // Single tap = jump
        jump?.();
      }
    } else if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      // Swipe detected
      if (absX > absY) {
        // Horizontal swipe
        switchLane?.(deltaX > 0 ? 1 : -1);
      } else if (deltaY < 0) {
        // Swipe up = jump
        jump?.();
      }
      // Swipe down could trigger slide if needed
    }
  }, [jump, switchLane]);

  // Input handling: keyboard + touch
  useEffect(() => {
    if (!jump && !switchLane) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
          e.preventDefault();
          jump?.();
          break;
        case 'KeyA':
        case 'ArrowLeft':
          e.preventDefault();
          switchLane?.(-1);
          break;
        case 'KeyD':
        case 'ArrowRight':
          e.preventDefault();
          switchLane?.(1);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          useStore.getState().dash();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [jump, switchLane, handleTouchStart, handleTouchEnd]);

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
