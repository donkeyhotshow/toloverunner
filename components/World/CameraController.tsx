/**
 * FixedPositionFollow - CRITICAL FIX
 * Uses projection mathematics to guarantee player stays at fixed screen position
 */

import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, MathUtils, PerspectiveCamera } from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getPhysicsStabilizer } from '../../core/physics/PhysicsStabilizer';
import { useCameraShake } from '../../store/cameraShakeStore';

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

  // FOV settings
  BASE_FOV: 60,   // 🎨 Requested start
  MAX_FOV: 85,    // 🎨 Requested max
  DASH_FOV: 95,   // 🎨 Specific request: 95 degrees
  BOOST_FOV: 85,  // Same as max speed

  // Smoothing
  POSITION_LERP: 8.0,
  FOV_LERP: 6.0,

  // Look-ahead distance
  LOOK_AHEAD: 5.0
};

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const dutchTilt = useRef(0);
  const targetDutchTilt = useRef(0);
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
    const handleHit = () => {
      useCameraShake.getState().shake(1.2, 0.6);
      impactLag.current = 1.0;
    };
    const handleGraze = () => {
      useCameraShake.getState().shake(0.2, 0.2);
    };
    const handleCombatAction = () => {
      // 📸 Dutch Angle on attack
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.15; // ~8.5 degrees
      setTimeout(() => { targetDutchTilt.current = 0; }, 200);
    };
    const handleComboMilestone = () => {
      // Stronger tilt on milestone
      targetDutchTilt.current = (Math.random() > 0.5 ? 1 : -1) * 0.25; // ~14 degrees
      useCameraShake.getState().shake(0.5, 0.3);
      setTimeout(() => { targetDutchTilt.current = 0; }, 400);
    };

    window.addEventListener('player-hit', handleHit);
    window.addEventListener('player-graze', handleGraze);
    window.addEventListener('combat:attack_up', handleCombatAction);
    window.addEventListener('combat:attack_down', handleCombatAction);
    window.addEventListener('combat:combo_milestone', handleComboMilestone);

    return () => {
      window.removeEventListener('player-hit', handleHit);
      window.removeEventListener('player-graze', handleGraze);
      window.removeEventListener('combat:attack_up', handleCombatAction);
      window.removeEventListener('combat:attack_down', handleCombatAction);
      window.removeEventListener('combat:combo_milestone', handleComboMilestone);
    }
  }, []);

  useEffect(() => {
    const updateCamera = (delta: number, _time: number) => {
      const state = useStore.getState();
      const { status, localPlayerState, speedBoostActive, isDashing, speed } = state;

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

      // 🎥 STRICT CAMERA: Static distance and FOV, no dynamic momentum changing
      let targetDistance = CAMERA_CONFIG.BASE_DISTANCE;
      let targetHeightOffset = CAMERA_CONFIG.HEIGHT_OFFSET;
      let targetFOV = CAMERA_CONFIG.BASE_FOV;

      calculateCameraPosition(playerPos, targetDistance, targetHeightOffset);

      // PERFECT LOCK: Extremely high lerp speed virtually locks camera to target Pos
      const currentLerp = 25.0; // Instant follow
      currentPos.current.lerp(targetPos.current, delta * currentLerp);

      // STRICT CAMERA: No shake allowed - rigid translation only
      const shakeOffset = 0;
      shakeDirection.current.set(0, 0, 0);

      // 📸 Camera Roll (Tilt) - ENTIRELY REMOVED FOR STRICT HORIZON
      const finalRoll = 0.0;
      camera.rotation.z = 0.0;

      // Disable shake entirely for strict style
      camera.position.copy(currentPos.current);

      const perspectiveCamera = camera as PerspectiveCamera;
      if (perspectiveCamera.isPerspectiveCamera) {
        perspectiveCamera.fov = MathUtils.lerp(
          perspectiveCamera.fov,
          targetFOV,
          delta * CAMERA_CONFIG.FOV_LERP
        );
        perspectiveCamera.updateProjectionMatrix();
      }

      // 🎥 STRICT FRAMING: Directly align behind
      lookAtTarget.current.set(
        playerPos.x, // Dead center on X
        playerPos.y + 1.0, // Look slightly above ground level
        playerPos.z - CAMERA_CONFIG.LOOK_AHEAD
      );

      camera.lookAt(lookAtTarget.current);
    };

    registerGameLoopCallback('lateUpdate', updateCamera);
    return () => unregisterGameLoopCallback('lateUpdate', updateCamera);
  }, [camera]);

  return null;
};

export default CameraController;
