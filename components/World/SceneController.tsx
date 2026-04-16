/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * SceneController - Single physics instance, components read from store.
 * Physics is driven exclusively by WorldLevelManager -> World/hooks/useGamePhysics.
 * PlayerController is a pure renderer - reads position from store only.
 * EnhancedControls (mounted in App.tsx) owns all input handling.
 */

import React from 'react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';

import WorldLevelManager from './WorldLevelManager';
import { Environment } from './Environment';
import { PlayerController } from '../player/PlayerController';
import CameraController from './CameraController';
import { GameLoopRunner } from '../System/GameLoopRunner';
import { RemotePlayer } from './RemotePlayer';
import { ParallaxTunnel } from './ParallaxTunnel';

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
      {showWorld && <Environment />}
      {showWorld && <PlayerController visible={true} speed={speed} />}
      {showWorld && <CameraController />}
      {showWorld && <WorldLevelManager />}
      <RemotePlayer />
    </>
  );
};

export default SceneController;
