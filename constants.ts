/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// === 1. BASIC CONSTANTS (Scalars) ===

export const LANE_WIDTH = 2.0; // Width of a single lane
export const JUMP_HEIGHT = 2.2; // 🐇 Lower jump for better high-speed control
export const JUMP_DURATION = 0.5; // Slightly faster arc

// Base run speed 10 m/s with smooth acceleration
export const RUN_SPEED_BASE = 10.0; 
export const SPAWN_DISTANCE = 200;
export const REMOVE_DISTANCE = 20;
export const WIN_DISTANCE = 3000;
export const INITIAL_LIVES = 1; // 1 life (membrane absorbs 1 hit, viruses kill instantly)
export const MIN_ACTIVE_DISTANCE = 100;

// Physics Specifics
export const GRAVITY_Y = 55; // 🎮 Heavier gravity for "stuck to road" feel
export const JUMP_FORCE_Y = 15.5; // Balanced for JUMP_HEIGHT 2.2

// 🆕 Acceleration & Speed Progression
export const ACCELERATION = 0.8; // Smooth acceleration per second
export const MAX_ACCELERATION = 2.5; // Maximum acceleration
export const SPEED_BOOST_MULTIPLIER = 1.5; // Acceleration multiplier from bonuses
export const DASH_SPEED_BOOST = 8.0; // Acceleration from dash

// 🆕 Improved Jump Physics
export const JUMP_CURVE = 'ease-out'; // Jump curve
export const DOUBLE_JUMP_FORCE = 12.5; // Second jump force
export const FALL_MULTIPLIER = 1.3; // Faster falling for weight feel
export const LOW_JUMP_MULTIPLIER = 2.5; // Accelerated fall on release

export const STORAGE_KEY = 'toloverunner_v2';

/** App version — from package.json at build time (single source of truth), otherwise fallback */
export const APP_VERSION = (import.meta as unknown as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? '2.4.0';

/** UI z-index layers (unified scale, avoids conflicts) */
export const UI_LAYERS = {
  GAME_CANVAS: 1,
  HUD: 100,
  HUD_TOP: 9999,
  OVERLAY: 1000,
  NOTIFICATIONS: 10001,
  MODAL: 10002, // Game Over, Pause, Victory, Countdown — above HUD
  MODAL_CONTENT: 100, // content inside modal (relative order)
  DEBUG: 10000,
  COMIC_VFX_HIT: 90,
  COMIC_VFX: 80,
  GRAZE: 70,
  LOBBY: 100,
  VINTAGE: 1000,
} as const;

// Colors - ORGANIC COMIC PALETTE (Flesh, Blood, Bone)
// Warm, saturated, MATTE tones. NO neon/digital colors.
export const PLAYER_COLORS = [
  '#D2B48C', // Tan/Flesh (Matte)
  '#8B2323', // Blood Red (Matte)
  '#DAA520', // Yolk Yellow (Matte)
  '#8B4513', // Brown/Muscle (Matte)
  '#DEB887', // Pale Skin (Matte)
  '#CD853F'  // Coral/Organ (Matte)
];

export const GEMINI_COLORS = ['#8B2323', '#DAA520', '#CD853F', '#8B4513', '#D2B48C'];

// === 2. GROUPED CONFIGS ===

export const PHYSICS_CONFIG = {
  LANE_WIDTH,
  RUN_SPEED_BASE,
  JUMP_FORCE: 15.5,
  GRAVITY: 55,
  DOUBLE_JUMP_FORCE: 12.5,
  LANE_CHANGE_SPEED: 18 // Faster lane switching
};

import { BiomeType, BiomeConfig } from './types';

// Organic Biomes - "Biological Illustration" feel - MATTE COMIC PALETTE
export const BIOME_CONFIG: Record<BiomeType, BiomeConfig> = {
  [BiomeType.FALLOPIAN_TUBE]: {
    color: '#1a0a2a',     // MATTE dark purple
    fogDensity: 0.004,
    roadColor: '#3d1a4d', // MATTE purple
    wallColor: '#2a1a3d', // MATTE purple walls
    glowColor: '#5d4037', // MATTE brown (not neon)
    accentColor: '#6B8E23', // MATTE olive
    ambientColor: '#8B7355', // Warm brown
    fogColor: '#1a0a2a'
  },
  [BiomeType.BIO_JUNGLE]: {
    color: '#0a2a1a',     // MATTE dark green
    fogDensity: 0.005,
    roadColor: '#1a4d2a', // MATTE green
    wallColor: '#1a3d2a', // MATTE green walls
    glowColor: '#405d37', // MATTE green-brown
    accentColor: '#8EAD23', // MATTE lime
    ambientColor: '#738B55', // Green-brown
    fogColor: '#0a2a1a'
  },
  [BiomeType.VEIN_TUNNEL]: {
    color: '#2a0a1a',     // MATTE dark red
    fogDensity: 0.006,
    roadColor: '#4d1a2a', // MATTE red
    wallColor: '#3d1a2a', // MATTE red walls
    glowColor: '#5d3740', // MATTE red-brown
    accentColor: '#AD2337', // MATTE red
    ambientColor: '#8B5573', // Red-purple
    fogColor: '#2a0a1a'
  },
  [BiomeType.EGG_ZONE]: {
    color: '#2a2a0a',     // MATTE dark yellow
    fogDensity: 0.003,
    roadColor: '#4d4d1a', // MATTE yellow
    wallColor: '#3d3d2a', // MATTE yellow walls
    glowColor: '#5d5d37', // MATTE yellow-brown
    accentColor: '#D4AD23', // MATTE gold
    ambientColor: '#8B8B55', // Yellow-brown
    fogColor: '#2a2a0a'
  },
  [BiomeType.SPERM_DUCT]: {
    color: '#1a1a2a',     // MATTE dark blue
    fogDensity: 0.004,
    roadColor: '#2a2a4d', // MATTE blue
    wallColor: '#2a2a3d', // MATTE blue walls
    glowColor: '#37405d', // MATTE blue-gray
    accentColor: '#238EAD', // MATTE cyan
    ambientColor: '#55738B', // Blue-gray
    fogColor: '#1a1a2a'
  },
  [BiomeType.OVARY_CORRIDOR]: {
    color: '#2a1a2a',     // MATTE dark pink
    fogDensity: 0.005,
    roadColor: '#4d2a4d', // MATTE pink
    wallColor: '#3d2a3d', // MATTE pink walls
    glowColor: '#5d375d', // MATTE pink-purple
    accentColor: '#AD238E', // MATTE magenta
    ambientColor: '#8B558B', // Pink-purple
    fogColor: '#2a1a2a'
  },
  [BiomeType.FALLOPIAN_EXPRESS]: {
    color: '#1a2a2a',     // MATTE dark cyan
    fogDensity: 0.004,
    roadColor: '#2a4d4d', // MATTE cyan
    wallColor: '#2a3d3d', // MATTE cyan walls
    glowColor: '#375d5d', // MATTE cyan-gray
    accentColor: '#238E6E', // MATTE teal
    ambientColor: '#557B8B', // Cyan-gray
    fogColor: '#1a2a2a'
  },
  [BiomeType.IMMUNE_SYSTEM]: {
    color: '#2a2a1a',     // MATTE dark orange-brown
    fogDensity: 0.005,
    roadColor: '#4d4d2a', // MATTE orange
    wallColor: '#3d3d2a', // MATTE orange walls
    glowColor: '#5d5d37', // MATTE orange-brown
    accentColor: '#AD6E23', // MATTE orange
    ambientColor: '#8B6E55', // Orange-brown
    fogColor: '#2a2a1a'
  }
};
// BIOME CONFIGURATION END

export const ASSET_CONFIG = {
  SPAWN_DISTANCE: 15,
  VISIBILITY_DISTANCE: 100
};

// === 3. PERFORMANCE / LOD ===
const isLowQuality = typeof window !== 'undefined' && (window as unknown as { __TOLOVERUNNER_LOW_QUALITY?: boolean }).__TOLOVERUNNER_LOW_QUALITY === true;

export const LOD_CONFIG = {
  DRAW_DISTANCE: isLowQuality ? 400 : 2000,   // 🔥 INCREASED to 2000 for "infinite" road feel
  TRACK_CHUNKS: 120,                          // 🔒 INCREASED to 120 per user request
  PARTICLE_COUNT: isLowQuality ? 0.1 : 0.5,  // Reduced from 0.2/0.8
  SHADOW_UPDATE_SKIP: isLowQuality ? 4 : 2   // Increased skip
} as const;

// === 4. SAFETY CONSTANTS (for stability) ===
export const SAFETY_CONFIG = {
  MAX_DELTA_TIME: 0.05,        // Maximum delta time to prevent jumps
  MIN_DELTA_TIME: 0.001,       // Minimum delta time
  MAX_PHYSICS_DELTA: 0.05,     // Maximum delta for physics
  MAX_OBJECTS: 300,            // Reduced from 500 - maximum object count
  MAX_PARTICLES: 50,           // Reduced from 100 - maximum particle count
  SAFE_NUMBER_FALLBACK: 0,     // Fallback for invalid numbers
  LANE_LIMIT: 2,               // Lane limit (from -2 to 2 = 5 lanes: -2, -1, 0, 1, 2)
  MAX_VELOCITY: 100,           // Maximum velocity
  MAX_SCALE: 10,               // Maximum scale
  MIN_SCALE: 0.1,              // Minimum scale
  // Pre-computed values for hot paths
  MAX_DELTA_TIME_INV: 1 / 0.05,
  LANE_LIMIT_SQ: 1 * 1,
} as const;

// === 4.1 FEATURE FLAGS (UX / HUD — rollback: set false and deploy) ===
export const FEATURE_FLAGS = {
  /** Compact HUD on mobile (smaller padding, denser blocks). Rollback: false */
  HUD_COMPACT_MOBILE: true,
  /** Enlarged touch zone for mobile buttons (min 44px). Rollback: false */
  MOBILE_TOUCH_HIT_AREA: true,
} as const;

// === 4.2 Re-export physics/collisions (single entry point; see docs/ARCHITECTURE.md) ===
export { PLAYER_PHYSICS, COLLISION_CONFIG } from './constants/physicsConfig';

// === 5. GAMEPLAY CONSTANTS (gameplay parameters) ===
export const GAMEPLAY_CONFIG = {
  JUMP_BUFFER_TIME: 0.18,      // Increased for better control responsiveness
  COYOTE_TIME: 0.12,           // Increased for fairer gameplay
  TOUCH_JUMP_BUFFER: 0.25,     // Increased buffer for touch controls
  SPAWN_CHUNK_STEP: 500,       // Object chunk spawn step
  VIRUS_ROTATION_SPEED: 0.35,  // Virus rotation speed
  ORB_ROTATION_SPEED: 1.8,     // Bonus orb rotation speed
  COLLISION_CHECK_INTERVAL: 1, // Collision check interval (1 = every frame, 2 = every other frame)
  MIN_SPEED: 12,               // Minimum speed
  MAX_SPEED: 45,               // Increased ceiling for high-skill play
  MAX_SCORE: 9999999,          // Upper score limit (overflow protection)
  
  // 🆕 Speed Progression
  SPEED_INCREMENT: 0.5,         // Speed increment per second
  SPEED_RAMP_DISTANCE: 500,     // Distance for full speed ramp-up
  DIFFICULTY_SPEED_BONUS: 2.0, // Speed bonus per difficulty level
};
