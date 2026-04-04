/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * useRoadMaterial — Factory hook for road/wall ShaderMaterial
 * Single instance per type, shared across all segment instances
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  roadVertexShader,
  roadFragmentShader,
} from '../components/World/shaders/roadShaders';
import {
  wallVertexShader,
  wallFragmentShader,
} from '../components/World/shaders/wallShaders';
import type { BioPalette, ShaderConfig } from '../components/World/shaders/roadTypes';

type MaterialType = 'road' | 'wall';

export function useRoadMaterial(
  type: MaterialType,
  palette: BioPalette,
  config: ShaderConfig
): THREE.ShaderMaterial {
  return useMemo(() => {
    const vertexShader = type === 'road' ? roadVertexShader : wallVertexShader;
    const fragmentShader =
      type === 'road' ? roadFragmentShader : wallFragmentShader;

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: 0 },
        uSpeed: { value: 10 },
        uColor1: { value: palette.deepViolet },
        uColor2: { value: palette.royalPurple },
        uColor3: { value: palette.hotPink },
        uAccent: { value: palette.slimyTeal },
        uBioCyan: { value: palette.bioCyan },
        uPulseSpeed: { value: config.pulseSpeed },
        uStripeFreq: { value: config.stripeFrequency },
        uCellScale: { value: config.cellScale },
        uGlossiness: { value: config.glossiness },
        uFresnelPower: { value: config.fresnelPower },
        uWaveIntensity: { value: config.waveIntensity },
      },
      side: type === 'road' ? THREE.DoubleSide : THREE.FrontSide,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
  }, [
    type,
    palette.deepViolet,
    palette.royalPurple,
    palette.hotPink,
    palette.slimyTeal,
    palette.bioCyan,
    config.pulseSpeed,
    config.stripeFrequency,
    config.cellScale,
    config.glossiness,
    config.fresnelPower,
    config.waveIntensity,
  ]);
}
