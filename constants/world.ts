/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * world.ts - World/rendering constants: LOD, safety, assets, biomes
 */

import { BiomeType, BiomeConfig } from '../types';

const isLowQuality = typeof window !== 'undefined' && (window as unknown as { __TOLOVERUNNER_LOW_QUALITY?: boolean }).__TOLOVERUNNER_LOW_QUALITY === true;

export const LOD_CONFIG = {
  DRAW_DISTANCE: isLowQuality ? 400 : 2000,
  TRACK_CHUNKS: 120,
  PARTICLE_COUNT: isLowQuality ? 0.1 : 0.5,
  SHADOW_UPDATE_SKIP: isLowQuality ? 4 : 2,
} as const;

export const SAFETY_CONFIG = {
  MAX_DELTA_TIME: 0.05,
  MIN_DELTA_TIME: 0.001,
  MAX_PHYSICS_DELTA: 0.05,
  MAX_OBJECTS: 300,
  MAX_PARTICLES: 50,
  SAFE_NUMBER_FALLBACK: 0,
  LANE_LIMIT: 2,
  MAX_VELOCITY: 100,
  MAX_SCALE: 10,
  MIN_SCALE: 0.1,
  MAX_DELTA_TIME_INV: 1 / 0.05,
  LANE_LIMIT_SQ: 1 * 1,
} as const;

export const ASSET_CONFIG = {
  SPAWN_DISTANCE: 15,
  VISIBILITY_DISTANCE: 100,
};

export const BIOME_CONFIG: Record<BiomeType, BiomeConfig> = {
  [BiomeType.FALLOPIAN_TUBE]: {
    color: '#1a0a2a', fogDensity: 0.004, roadColor: '#3d1a4d', wallColor: '#2a1a3d',
    glowColor: '#5d4037', accentColor: '#6B8E23', ambientColor: '#8B7355', fogColor: '#1a0a2a',
  },
  [BiomeType.BIO_JUNGLE]: {
    color: '#0a2a1a', fogDensity: 0.005, roadColor: '#1a4d2a', wallColor: '#1a3d2a',
    glowColor: '#405d37', accentColor: '#8EAD23', ambientColor: '#738B55', fogColor: '#0a2a1a',
  },
  [BiomeType.VEIN_TUNNEL]: {
    color: '#2a0a1a', fogDensity: 0.006, roadColor: '#4d1a2a', wallColor: '#3d1a2a',
    glowColor: '#5d3740', accentColor: '#AD2337', ambientColor: '#8B5573', fogColor: '#2a0a1a',
  },
  [BiomeType.EGG_ZONE]: {
    color: '#2a2a0a', fogDensity: 0.003, roadColor: '#4d4d1a', wallColor: '#3d3d2a',
    glowColor: '#5d5d37', accentColor: '#D4AD23', ambientColor: '#8B8B55', fogColor: '#2a2a0a',
  },
  [BiomeType.SPERM_DUCT]: {
    color: '#1a1a2a', fogDensity: 0.004, roadColor: '#2a2a4d', wallColor: '#2a2a3d',
    glowColor: '#37405d', accentColor: '#238EAD', ambientColor: '#55738B', fogColor: '#1a1a2a',
  },
  [BiomeType.OVARY_CORRIDOR]: {
    color: '#2a1a2a', fogDensity: 0.005, roadColor: '#4d2a4d', wallColor: '#3d2a3d',
    glowColor: '#5d375d', accentColor: '#AD238E', ambientColor: '#8B558B', fogColor: '#2a1a2a',
  },
  [BiomeType.FALLOPIAN_EXPRESS]: {
    color: '#1a2a2a', fogDensity: 0.004, roadColor: '#2a4d4d', wallColor: '#2a3d3d',
    glowColor: '#375d5d', accentColor: '#238E6E', ambientColor: '#557B8B', fogColor: '#1a2a2a',
  },
  [BiomeType.IMMUNE_SYSTEM]: {
    color: '#2a2a1a', fogDensity: 0.005, roadColor: '#4d4d2a', wallColor: '#3d3d2a',
    glowColor: '#5d5d37', accentColor: '#AD6E23', ambientColor: '#8B6E55', fogColor: '#2a2a1a',
  },
};