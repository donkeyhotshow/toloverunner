import React, { useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { ToonSperm } from '../player/ToonSperm';

export interface PlayerProps {
  totalDistance?: number;
  playerY?: number;
  isJumping?: boolean;
}

export const Player: React.FC<PlayerProps> = ({ 
  totalDistance = 0, 
  playerY = 0.5, 
  isJumping = false 
}) => {
  const meshRef = useRef<Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Deterministic Y lock and rotation wobble
      meshRef.current.position.y = playerY;
      meshRef.current.rotation.z = Math.sin(totalDistance * 0.05) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      <ToonSperm scale={1} isJumping={isJumping} />
    </group>
  );
};

Player.displayName = 'Player';
