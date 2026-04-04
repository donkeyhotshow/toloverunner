/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SpermTail - Simplified version for maximum performance
 */

import { MeshBasicMaterial, Object3D, InstancedMesh } from 'three';
import React, { useRef, useMemo } from 'react';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { useEffect } from 'react';

// Tail animation constants
const SPERM_TAIL_CONSTANTS = {
  // Geometry
  DEFAULT_LENGTH: 8,
  SEGMENT_RADIUS: 0.1,
  SEGMENT_SEGMENTS: 8,

  // Animation
  DELAY_PER_SEGMENT: 0.18,
  WIGGLE_FREQ: 10,
  WIGGLE_AMP: 0.3,
  WIGGLE_DECAY: 0.45,
  VERTICAL_WIGGLE_FREQ: 7,
  VERTICAL_WIGGLE_AMP: 0.2,
  VERTICAL_WIGGLE_DECAY: 0.3,

  // Position
  MIN_FLOOR_Y: -0.08,
  Z_SPACING: -0.28,

  // Scale
  MIN_SCALE: 0.08,
  SCALE_DECAY: 0.92,
  Z_SCALE_EXTRA: 1.3,
} as const;

interface SpermTailProps {
  length?: number;
  color?: string;
  isBoosting?: boolean;
  speedMult?: number;
  position?: [number, number, number];
}

// Create material factory function to avoid shared mutation
const createTailMaterial = (color: string = '#ffffff') => new MeshBasicMaterial({ color });

const _dummy = new Object3D();

export const SpermTail: React.FC<SpermTailProps> = React.memo(({
  length = SPERM_TAIL_CONSTANTS.DEFAULT_LENGTH,
  color = '#ffffff',
  isBoosting = false,
  speedMult = 1.0,
  position = [0, 0, 0]
}: SpermTailProps) => {
  const meshRef = useRef<InstancedMesh>(null);

  // Create unique material for each instance to prevent mutation issues
  const tailMaterial = useMemo(() => createTailMaterial(color), [color]);

  const geo = useMemo(() => getGeometryPool().getSphereGeometry(SPERM_TAIL_CONSTANTS.SEGMENT_RADIUS, SPERM_TAIL_CONSTANTS.SEGMENT_SEGMENTS, SPERM_TAIL_CONSTANTS.SEGMENT_SEGMENTS), []);

  useEffect(() => {
    // 🔥 FIXED: Use LateUpdate for tail physics to prevent lag/clipping
    const callback = (_delta: number, time: number) => {
      if (!meshRef.current) return;

      for (let i = 0; i < length; i++) {
        const t = i / length;

        // Improved tail physics with delay and smoothing
        const delay = i * SPERM_TAIL_CONSTANTS.DELAY_PER_SEGMENT;
        const wiggleTime = time - delay;

        // Sinusoidal wave with decreasing amplitude
        const wiggle = Math.sin(wiggleTime * SPERM_TAIL_CONSTANTS.WIGGLE_FREQ - i * 1.0) * (SPERM_TAIL_CONSTANTS.WIGGLE_AMP * (1 - t * SPERM_TAIL_CONSTANTS.WIGGLE_DECAY));
        const verticalWiggle = Math.cos(wiggleTime * SPERM_TAIL_CONSTANTS.VERTICAL_WIGGLE_FREQ - i * 0.7) * (SPERM_TAIL_CONSTANTS.VERTICAL_WIGGLE_AMP * (1 - t * SPERM_TAIL_CONSTANTS.VERTICAL_WIGGLE_DECAY));

        // Smoothing to prevent tail going through floor
        const minY = SPERM_TAIL_CONSTANTS.MIN_FLOOR_Y;
        const finalY = Math.max(minY, verticalWiggle);

        _dummy.position.set(wiggle, finalY, i * SPERM_TAIL_CONSTANTS.Z_SPACING);

        // Smooth scale transition
        const scale = Math.max(SPERM_TAIL_CONSTANTS.MIN_SCALE, 1.0 - t * SPERM_TAIL_CONSTANTS.SCALE_DECAY);
        _dummy.scale.set(scale, scale, scale * SPERM_TAIL_CONSTANTS.Z_SCALE_EXTRA);

        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    };

    // 🔥 FIXED: Register as lateUpdate to prevent clipping through body
    registerGameLoopCallback('lateUpdate', callback);
    return () => {
      unregisterGameLoopCallback('lateUpdate', callback);
      getGeometryPool().release(geo);
      tailMaterial.dispose();
    };
  }, [geo, length, isBoosting, speedMult, tailMaterial]);

  return (
    <group position={position}>
      <instancedMesh
        ref={meshRef}
        args={[geo, tailMaterial, length]}
        frustumCulled={false}
      />
    </group>
  );
});

SpermTail.displayName = 'SpermTail';
export default SpermTail;
