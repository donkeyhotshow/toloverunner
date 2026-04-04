/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Predefined biome palettes for ToLOVERunner v2.5+.
 *
 * Colours follow ADR-0002 organic-matte palette rules.
 * New biomes must extend this file and respect the established colour language.
 */

import type { BiomePalette } from './interfaces';

/** Fallopian Tube — warm flesh tones, existing biome from v2.4 */
export const FALLOPIAN_TUBE_PALETTE: BiomePalette = {
    primary:    '#D2B48C',
    accent:     '#8B2323',
    background: '#4A0000',
    emissive:   '#FF6B6B',
    fog:        '#3D0000',
};

/** Uterine Chamber — deeper reds, used in level 2+ */
export const UTERINE_CHAMBER_PALETTE: BiomePalette = {
    primary:    '#C0706A',
    accent:     '#6B0F1A',
    background: '#2D0000',
    emissive:   '#FF4444',
    fog:        '#1A0000',
};

/** Ovarian Labyrinth — purplish tones, v2.5 new biome */
export const OVARIAN_LABYRINTH_PALETTE: BiomePalette = {
    primary:    '#9C7BB5',
    accent:     '#4A2060',
    background: '#1A0A2E',
    emissive:   '#CC88FF',
    fog:        '#0D0518',
};

/** Bloodstream Rush — vibrant crimson, high-speed zone */
export const BLOODSTREAM_RUSH_PALETTE: BiomePalette = {
    primary:    '#CC2200',
    accent:     '#FF6600',
    background: '#1A0000',
    emissive:   '#FF2200',
    fog:        '#0D0000',
};

/** All registered palettes — used for validation and tooling */
export const ALL_PALETTES: Record<string, BiomePalette> = {
    fallopian_tube:    FALLOPIAN_TUBE_PALETTE,
    uterine_chamber:   UTERINE_CHAMBER_PALETTE,
    ovarian_labyrinth: OVARIAN_LABYRINTH_PALETTE,
    bloodstream_rush:  BLOODSTREAM_RUSH_PALETTE,
};
