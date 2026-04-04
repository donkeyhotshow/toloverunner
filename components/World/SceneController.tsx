/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * SceneController — Single physics instance, components read from store
 * FIX: useGamePhysics called ONCE, syncs to store, components subscribe independently
 */

import React from 'react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';

import WorldLevelManager from './WorldLevelManager';
import { PlayerController } from '../player/PlayerController';
import CameraController from './CameraController';
import { GameLoopRunner } from '../System/GameLoopRunner';
import { RemotePlayer } from './RemotePlayer';
import { ParallaxTunnel } from './ParallaxTunnel';
import { useGamePhysics } from '../../hooks/useGamePhysics';

// Inner component so useGamePhysics runs inside Canvas context
const PhysicsDriver: React.FC<{ speed: number }> = ({ speed }) => {
  const { jump, switchLane } = useGamePhysics(speed);

  return (
    <PlayerController
      visible={true}
      speed={speed}
      jump={jump}
      switchLane={switchLane}
    />
  );
};

// Tunnel only — BioInfiniteTrack is rendered by WorldLevelManager (single source of truth)
const TunnelOnly: React.FC = () => {
  const position = useStore(s => s.localPlayerState.position);
  const totalDistance = position ? Math.abs(position[2]) : 0;

  return <ParallaxTunnel totalDistance={totalDistance} />;
};

export const SceneController: React.FC = () => {
  const status = useStore(s => s.status);
  const speed = useStore(s => s.speed || 1.0);
  const showWorld = status !== GameStatus.MENU;

  return (
    <>
      <GameLoopRunner />

      {showWorld && <TunnelOnly />}
      {showWorld && <PhysicsDriver speed={speed} />}
      {showWorld && <CameraController />}
      {showWorld && <WorldLevelManager />}

      <RemotePlayer />
    </>
  );
};

export default SceneController;
