/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shield Component - Blue glow sphere вокруг игрока с пульсирующим эффектом
 */

import React, { useRef, useMemo, useEffect } from 'react';

import { Mesh, MeshStandardMaterial } from 'three';
import { useStore } from '../../store';
import { selectShieldData } from '../../store/selectors';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

/**
 * Shield визуальный эффект
 *
 * Отображает синюю пульсирующую сферу вокруг игрока при активации щита.
 * Использует emissive material для свечения и анимирует opacity и intensity.
 *
 * @example
 * ```tsx
 * <Shield />
 * ```
 */
export const Shield: React.FC = () => {
  const shieldRef = useRef<Mesh>(null);
  // OPTIMIZATION: Combined selector instead of 2 separate subscriptions
  const { shieldActive } = useStore(selectShieldData);

  const geometry = useMemo(() => getGeometryPool().getSphereGeometry(0.9, 24, 24), []);
  const material = useMemo(() => new MeshStandardMaterial({
    color: '#00BFFF',
    emissive: '#00BFFF',
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  }), []);

  useEffect(() => {
    return () => {
      getGeometryPool().release(geometry);
      safeDispose(material);
    };
  }, [geometry, material]);

  useEffect(() => {
    const callback = (_delta: number, time: number) => {
      if (!shieldRef.current || !shieldActive) {
        if (shieldRef.current) {
          shieldRef.current.visible = false;
        }
        return;
      }

      const mat = shieldRef.current.material as MeshStandardMaterial;

      // Pulsing opacity: 0.3 + sin(time * 5) * 0.2
      mat.opacity = 0.3 + Math.sin(time * 5) * 0.2;

      // Emissive pulsing: 0.5 + sin(time * 8) * 0.5
      mat.emissiveIntensity = 0.5 + Math.sin(time * 8) * 0.5;

      // Gentle scale pulse
      const scale = 1.0 + Math.sin(time * 6) * 0.05;
      shieldRef.current.scale.set(scale, scale, scale);

      shieldRef.current.visible = true;
    };

    registerGameLoopCallback('renderUpdate', callback);
    return () => unregisterGameLoopCallback('renderUpdate', callback);
  }, [shieldActive]);



  if (!shieldActive) return null;

  return (
    <mesh ref={shieldRef} geometry={geometry} material={material} />
  );
};
