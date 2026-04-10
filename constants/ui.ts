/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ui.ts - UI constants: z-index layers, feature flags, colors
 */

/** UI z-index layers (unified scale, avoids conflicts) */
export const UI_LAYERS = {
  GAME_CANVAS: 1,
  HUD: 100,
  HUD_TOP: 9999,
  OVERLAY: 1000,
  NOTIFICATIONS: 10001,
  MODAL: 10002,
  MODAL_CONTENT: 100,
  DEBUG: 10000,
  COMIC_VFX_HIT: 90,
  COMIC_VFX: 80,
  GRAZE: 70,
  LOBBY: 100,
  VINTAGE: 1000,
} as const;

export const PLAYER_COLORS = [
  '#D2B48C',
  '#8B2323',
  '#DAA520',
  '#8B4513',
  '#DEB887',
  '#CD853F',
];

export const GEMINI_COLORS = ['#8B2323', '#DAA520', '#CD853F', '#8B4513', '#D2B48C'];

export const FEATURE_FLAGS = {
  HUD_COMPACT_MOBILE: true,
  MOBILE_TOUCH_HIT_AREA: true,
} as const;