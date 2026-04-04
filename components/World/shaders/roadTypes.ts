/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * roadTypes — Configuration types for bio-organic infinite road
 */

import * as THREE from 'three';

export interface RoadConfig {
  /** Road width (X-axis) */
  width: number;
  /** Single segment length */
  segmentLength: number;
  /** Number of segments in pool */
  segmentCount: number;
  /** Geometry grid width subdivisions */
  segmentsW: number;
  /** Geometry grid length subdivisions */
  segmentsL: number;
  /** Tunnel wall height */
  wallHeight: number;
  /** Gap from road edge to wall */
  wallGap: number;
}

export const DEFAULT_ROAD_CONFIG: RoadConfig = {
  width: 12,
  segmentLength: 200,
  segmentCount: 7,
  segmentsW: 4,
  segmentsL: 256,
  wallHeight: 10,
  wallGap: 0.5,
};

export interface ShaderConfig {
  pulseSpeed: number;
  stripeFrequency: number;
  cellScale: number;
  glossiness: number;
  fresnelPower: number;
  waveIntensity: number;
}

export const DEFAULT_SHADER_CONFIG: ShaderConfig = {
  pulseSpeed: 1.5,
  stripeFrequency: 20.0,
  cellScale: 10.0,
  glossiness: 0.6,
  fresnelPower: 3.0,
  waveIntensity: 0.3,
};

export interface BioPalette {
  deepViolet: THREE.Color;
  royalPurple: THREE.Color;
  hotPink: THREE.Color;
  magenta: THREE.Color;
  slimyTeal: THREE.Color;
  bioCyan: THREE.Color;
}

export const DEFAULT_PALETTE: BioPalette = {
  deepViolet: new THREE.Color('#4A1A6B'),
  royalPurple: new THREE.Color('#6B2D8B'),
  hotPink: new THREE.Color('#C75BC4'),
  magenta: new THREE.Color('#A83279'),
  slimyTeal: new THREE.Color('#2A9D8F'),
  bioCyan: new THREE.Color('#00F5D4'),
};
