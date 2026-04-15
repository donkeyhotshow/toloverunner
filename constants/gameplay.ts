/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * gameplay.ts - Gameplay constants: speeds, distances, lives, scoring.
 *
 * GRAVITY_Y, JUMP_FORCE_Y, DOUBLE_JUMP_FORCE are the single source of truth
 * in physicsConfig.ts and re-exported here for backward compatibility.
 */

// Re-export physics scalars — do NOT redeclare values here (ADR-0001)
export { GRAVITY_Y, JUMP_FORCE_Y, DOUBLE_JUMP_FORCE } from './physicsConfig';

export const LANE_WIDTH = 2.0;
export const JUMP_HEIGHT = 2.2;
export const JUMP_DURATION = 0.5;
export const RUN_SPEED_BASE = 10.0;
export const SPAWN_DISTANCE = 200;
export const REMOVE_DISTANCE = 20;
export const WIN_DISTANCE = 3000;
export const INITIAL_LIVES = 1;
export const MIN_ACTIVE_DISTANCE = 100;

export const ACCELERATION = 0.8;
export const MAX_ACCELERATION = 2.5;
export const SPEED_BOOST_MULTIPLIER = 1.5;
/** Multiplier applied to baseSpeed when a speed-boost powerup is active. */
export const SPEED_BOOST_FACTOR = 2.0;
export const DASH_SPEED_BOOST = 8.0;

export const JUMP_CURVE = 'ease-out';
export const FALL_MULTIPLIER = 1.3;
export const LOW_JUMP_MULTIPLIER = 2.5;

export const STORAGE_KEY = 'toloverunner_v2';

/** App version from package.json at build time, otherwise fallback */
export const APP_VERSION = (import.meta as unknown as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? '2.4.0';

import { GRAVITY_Y as _G, JUMP_FORCE_Y as _J, DOUBLE_JUMP_FORCE as _DJ } from './physicsConfig';

export const PHYSICS_CONFIG = {
  LANE_WIDTH,
  RUN_SPEED_BASE,
  JUMP_FORCE: _J,
  GRAVITY: _G,
  DOUBLE_JUMP_FORCE: _DJ,
  LANE_CHANGE_SPEED: 18,
} as const;

export const GAMEPLAY_CONFIG = {
  JUMP_BUFFER_TIME: 0.18,
  COYOTE_TIME: 0.12,
  TOUCH_JUMP_BUFFER: 0.25,
  SPAWN_CHUNK_STEP: 500,
  VIRUS_ROTATION_SPEED: 0.35,
  ORB_ROTATION_SPEED: 1.8,
  COLLISION_CHECK_INTERVAL: 1,
  MIN_SPEED: 12,
  MAX_SPEED: 45,
  MAX_SCORE: 9999999,
  SPEED_INCREMENT: 0.5,
  SPEED_RAMP_DISTANCE: 500,
  DIFFICULTY_SPEED_BONUS: 2.0,
};