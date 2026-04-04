/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BiomeConfig — catalogue of registered biomes (ADR-0003 `biomes` context).
 *
 * TODO v2.5: Add ovarian_labyrinth and bloodstream_rush configs with full spawn rules.
 */

import type { IBiomeConfig } from './interfaces';
import {
    FALLOPIAN_TUBE_PALETTE,
    UTERINE_CHAMBER_PALETTE,
    OVARIAN_LABYRINTH_PALETTE,
    BLOODSTREAM_RUSH_PALETTE,
} from './palette';

export const BIOME_FALLOPIAN_TUBE: IBiomeConfig = {
    id: 'fallopian_tube',
    name: 'Fallopian Tube',
    palette: FALLOPIAN_TUBE_PALETTE,
    objectDensity: 1.0,
    spawnRules: [
        { objectType: 'obstacle',    probability: 0.6, minSpacing: 4.0 },
        { objectType: 'coin',        probability: 0.8, minSpacing: 2.0 },
        { objectType: 'gene_pickup', probability: 0.2, minSpacing: 8.0 },
    ],
    musicTrack: 'track_fallopian',
    transitionDistance: 500,
};

export const BIOME_UTERINE_CHAMBER: IBiomeConfig = {
    id: 'uterine_chamber',
    name: 'Uterine Chamber',
    palette: UTERINE_CHAMBER_PALETTE,
    objectDensity: 1.3,
    spawnRules: [
        { objectType: 'obstacle',    probability: 0.7, minSpacing: 3.5 },
        { objectType: 'coin',        probability: 0.75, minSpacing: 2.0 },
        { objectType: 'gene_pickup', probability: 0.25, minSpacing: 7.0 },
        { objectType: 'virus',       probability: 0.15, minSpacing: 10.0 },
    ],
    musicTrack: 'track_uterine',
    transitionDistance: 600,
};

export const BIOME_OVARIAN_LABYRINTH: IBiomeConfig = {
    id: 'ovarian_labyrinth',
    name: 'Ovarian Labyrinth',
    palette: OVARIAN_LABYRINTH_PALETTE,
    objectDensity: 1.6,
    spawnRules: [
        // TODO v2.5: Define full spawn rules for labyrinth
        { objectType: 'obstacle', probability: 0.8, minSpacing: 3.0 },
        { objectType: 'coin',     probability: 0.7, minSpacing: 2.0 },
        { objectType: 'virus',    probability: 0.25, minSpacing: 8.0 },
    ],
    musicTrack: 'track_ovarian',
    transitionDistance: 700,
};

export const BIOME_BLOODSTREAM_RUSH: IBiomeConfig = {
    id: 'bloodstream_rush',
    name: 'Bloodstream Rush',
    palette: BLOODSTREAM_RUSH_PALETTE,
    objectDensity: 2.0,
    spawnRules: [
        // TODO v2.5: Bloodstream is high-speed — fewer spawn gaps
        { objectType: 'obstacle', probability: 0.5, minSpacing: 2.0 },
        { objectType: 'coin',     probability: 0.9, minSpacing: 1.5 },
        { objectType: 'virus',    probability: 0.3, minSpacing: 6.0 },
    ],
    musicTrack: 'track_bloodstream',
    transitionDistance: 0, // infinite (final zone)
};

/** Ordered progression of biomes */
export const BIOME_PROGRESSION: readonly IBiomeConfig[] = [
    BIOME_FALLOPIAN_TUBE,
    BIOME_UTERINE_CHAMBER,
    BIOME_OVARIAN_LABYRINTH,
    BIOME_BLOODSTREAM_RUSH,
];

/** Look up a biome config by id */
export function getBiomeById(id: string): IBiomeConfig | undefined {
    return BIOME_PROGRESSION.find(b => b.id === id);
}
