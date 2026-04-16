/**
 * CameraController
 * Uses projection mathematics to guarantee player stays at fixed screen position.
 * Subscribes to game events via eventBus only (no window events).
 * FOV dynamically reacts to gameplay speed for sense of velocity.
 */

import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, MathUtils, PerspectiveCamera } from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getPhysicsStabilizer } from '../../core/physics/PhysicsStabilizer';
import { useCameraShake } from '../../store/cameraShakeStore';
import { eventBus } from '../../utils/eventBus';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../../constants';

// FIXED POSITION CAMERA CONFIGURATION
const CAMERA_CONFIG = {
  // Fixed screen position (NDC coordinates: -1 to 1)
  FIXED_SCREEN_X: 0.0,    // Center horizontally
  FIXED_SCREEN_Y: -0.2,   // Slightly below center

  // Distance settings
  BASE_DISTANCE: 12,
  BOOST_DISTANCE: 15,
  DASH_DISTANCE: 18,

  // Height offset from player
  HEIGHT_OFFSET: 3.0,
  BOOST_HEIGHT_OFFSET: 4.0,

  // FOV settings — dynamically lerped based on speed
  BASE_FOV: 60,   // FOV at minimum speed
  MAX_FOV: 82,    // FOV at maximum speed
  DASH_FOV: 95,   // FOV during dash
  BOOST_FOV: 85,  // FOV during speed boost

  // Smoothing
  POSITION_LERP: 8.0,
  FOV_LERP: 4.0,

  // Look-ahead distance
  LOOK_AHEAD: 5.0
};

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const dutchTilt = useRef(0);
  const targetDutchTilt = useRef(0);
  const dutchResetTimerA = useRef(0); // countdown for combat Dutch tilt reset (replaces setTimeout 200ms)
  const dutchResetTimerB = useRef(0); // countdown for combo Dutch tilt reset (replaces setTimeout 400ms)
  const impactLag = useRef(0);
  const playerPosRef = useRef(new Vector3());
  const currentPos = useRef(new Vector3());
  const targetPos = useRef(new Vector3());
  const shakeDirection = useRef(new Vector3());
  const lookAtTarget = useRef(new Vector3());

  const calculateCameraPosition = (playerPos: Vector3, distance: number, heightOffset: number) => {
    // 🎥 STRICT CAMERA: Camera completely locks horizontally
    targetPos.current.set(
      playerPos.x, // Perfect X follow, no horizontal offset
      playerPos.y + heightOffset,
      playerPos.z + distance
    );
  };

  useEffect(() => {
    // Subscribe via eventBus — single event system, no window events
    const unsubHit = eventBus.on('player:hit', () => {
      useCameraShake.getState().shake(1.2, 0.6);
      impactLag.current = 1.0;
    });
    const unsubCollect = eventBus.on('player:collect', () => {
      // Micro-pulse on coin collect for tactile feedback
      useCameraShake.getState().shake(0.08, 0.08);
    });
    const unsubGraze = eventBus.on('player:graze', () => {
      useCameraShake.getState().shake(0.2, 0.2);
    });
    const unsubFear = eventBus.on('player:fear', () => {
      useCameraShake.getState().shake(0.15, 0.15);
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.05;
      dutchResetTimerA.current = 0.15;
    });
    const unsubAttackUp = eventBus.on('combat:attack_up', () => {
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.15;
      dutchResetTimerA.current = 0.2;
    });
    const unsubAttackDown = eventBus.on('combat:attack_down', () => {
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.15;
      dutchResetTimerA.current = 0.2;
    });
    const unsubCombo = eventBus.on('combat:combo_milestone', () => {
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.25;
      useCameraShake.getState().shake(0.5, 0.3);
      dutchResetTimerB.current = 0.4;
    });

    return () => {
      unsubHit();
      unsubCollect();
      unsubGraze();
      unsubFear();
      unsubAttackUp();
      unsubAttackDown();
      unsubCombo();
    };
  }, []);

  useEffect(() => {
    const updateCamera = (delta: number, _time: number) => {
      const state = useStore.getState();
      const { status, localPlayerState } = state;

      // Allow camera updates in MENU, COUNTDOWN, PLAYING, etc.
      // Only skip heavy UI states or showcasing
      const isIngameState = 
        status === GameStatus.MENU || 
        status === GameStatus.COUNTDOWN || 
        status === GameStatus.PLAYING || 
        status === GameStatus.PAUSED || 
        status === GameStatus.GAME_OVER || 
        status === GameStatus.VICTORY;

      if (!isIngameState) return;
      if (status === GameStatus.PAUSED) return; // Prevent drift while paused if needed, but usually we want to keep looking

      // Dutch Angle Smoothing
      dutchTilt.current = MathUtils.lerp(dutchTilt.current, targetDutchTilt.current, delta * 10);

      // Decrement Dutch tilt reset timers (frame-rate-independent replacement for setTimeout)
      if (dutchResetTimerA.current > 0) {
        dutchResetTimerA.current -= delta;
        if (dutchResetTimerA.current <= 0) {
          dutchResetTimerA.current = 0;
          targetDutchTilt.current = 0;
        }
      }
      if (dutchResetTimerB.current > 0) {
        dutchResetTimerB.current -= delta;
        if (dutchResetTimerB.current <= 0) {
          dutchResetTimerB.current = 0;
          targetDutchTilt.current = 0;
        }
      }

      // Handle Impact Lag decay
      impactLag.current = Math.max(0, impactLag.current - delta * 3.0);

      const physicsStabilizer = getPhysicsStabilizer();
      const interpolated = physicsStabilizer.getInterpolatedState();

      playerPosRef.current.set(
        localPlayerState.position[0],
        localPlayerState.position[1],
        localPlayerState.position[2]
      );
      if (interpolated) {
        playerPosRef.current.set(interpolated.position.x, interpolated.position.y, interpolated.position.z);
      }
      const playerPos = playerPosRef.current;

      const gameState = useStore.getState();
      const targetDistance = CAMERA_CONFIG.BASE_DISTANCE;
      const targetHeightOffset = CAMERA_CONFIG.HEIGHT_OFFSET;

      // ── Speed-driven FOV: maps speed progression to BASE_FOV..MAX_FOV ──
      let targetFOV: number;
      if (gameState.isDashing) {
        targetFOV = CAMERA_CONFIG.DASH_FOV;
        // High-frequency shake during dash for kinetic energy feel
        useCameraShake.getState().shake(0.18, 0.05);
      } else if (gameState.speedBoostActive) {
        targetFOV = CAMERA_CONFIG.BOOST_FOV;
        // Continuous micro-shake during speed boost (re-triggered each frame, short duration)
        useCameraShake.getState().shake(0.12, 0.06);
      } else {
        const speedRange = Math.max(1, GAMEPLAY_CONFIG.MAX_SPEED - RUN_SPEED_BASE);
        const speedT = Math.min(1, Math.max(0, (gameState.speed - RUN_SPEED_BASE) / speedRange));
        targetFOV = CAMERA_CONFIG.BASE_FOV + speedT * (CAMERA_CONFIG.MAX_FOV - CAMERA_CONFIG.BASE_FOV);
      }

      calculateCameraPosition(playerPos, targetDistance, targetHeightOffset);

      // Smooth follow — high lerp speed for near-instant follow
      currentPos.current.lerp(targetPos.current, delta * 25.0);

      // Apply camera shake offset (zero when no shake active)
      const shakeMag = useCameraShake.getState().update(delta);
      if (shakeMag > 0) {
        shakeDirection.current.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          0
        ).normalize().multiplyScalar(shakeMag * 0.3);
      } else {
        shakeDirection.current.set(0, 0, 0);
      }

      camera.position.copy(currentPos.current).add(shakeDirection.current);

      const perspectiveCamera = camera as PerspectiveCamera;
      if (perspectiveCamera.isPerspectiveCamera) {
        perspectiveCamera.fov = MathUtils.lerp(
          perspectiveCamera.fov,
          targetFOV,
          delta * CAMERA_CONFIG.FOV_LERP
        );
        perspectiveCamera.updateProjectionMatrix();
      }

      // Look slightly ahead of the player, with dutch tilt applied
      lookAtTarget.current.set(
        playerPos.x,
        playerPos.y + 1.0,
        playerPos.z - CAMERA_CONFIG.LOOK_AHEAD
      );
      camera.lookAt(lookAtTarget.current);
      camera.rotation.z += dutchTilt.current;
    };

    registerGameLoopCallback('lateUpdate', updateCamera);
    return () => unregisterGameLoopCallback('lateUpdate', updateCamera);
  }, [camera]);

  return null;
};

export default CameraController;
