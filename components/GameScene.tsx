/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GameScene - Main game scene integration with all components
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { BioInfiniteTrack } from './World/BioInfiniteTrack';
import { ParallaxTunnel } from './World/ParallaxTunnel';
import { FogMask } from './World/FogMask';
import { PlayerController } from './player/PlayerController';
import { DebugOverlay } from './UI/DebugOverlay';

export const GameScene: React.FC = () => {
  return (
    <>
      {/* Main 3D Scene */}
      <Canvas
        camera={{
          position: [0, 3, 8],
          fov: 70,
          near: 0.1,
          far: 3000
        }}
        gl={{
          logarithmicDepthBuffer: true,
          precision: 'highp',
          antialias: true
        }}
        dpr={[1, 2]}
      >
        {/* Environment */}
        <FogMask />

        {/* World Geometry */}
        <BioInfiniteTrack playerZ={0} />
        <ParallaxTunnel totalDistance={0} />

        {/* Player */}
        <PlayerController visible={true} speed={1.0} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight
          position={[0, 5, 0]}
          intensity={1}
          color="#a78bfa"
          castShadow
        />
      </Canvas>

      {/* UI Overlay */}
      <DebugOverlay />
    </>
  );
};

GameScene.displayName = 'GameScene';