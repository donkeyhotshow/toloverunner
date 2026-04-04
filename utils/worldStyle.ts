/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorldStyle — единая стилистика мира: палитра биома для дороги, стен, декора, препятствий и пикапов.
 * Гарантирует визуальную согласованность и одну цветовую гамму на биом.
 */

import { Color } from 'three';
import type { MeshToonMaterial } from 'three';
import { BIOME_CONFIG } from '../constants';
import type { BiomeType } from '../types';

export interface WorldStyleColors {
  /** Основной цвет поверхности (дорога, стены) */
  base: string;
  /** Подсветка / rim / emissive */
  glow: string;
  /** Акцент (декор, препятствия) */
  accent: string;
  /** Тень / тёмный вариант */
  shadow: string;
}

const _color = new Color();
const _accent = new Color();

/**
 * Возвращает согласованную палитру для текущего биома.
 * Все объекты мира должны использовать эти цвета для единого стиля.
 */
export function getWorldStyleColors(biome: BiomeType): WorldStyleColors {
  const cfg = BIOME_CONFIG[biome];
  _color.set(cfg.wallColor);
  const shadow = _color.clone().multiplyScalar(0.5).getStyle();
  return {
    base: cfg.roadColor,
    glow: cfg.glowColor,
    accent: cfg.accentColor,
    shadow
  };
}

/** Эмиссия для объектов в стиле «органика» (низкая, не неон) */
export const WORLD_EMISSIVE_INTENSITY = 0.15;

/**
 * Применяет цвета биома к MeshToonMaterial с единой интенсивностью эмиссии.
 * Используется для препятствий, декора и пикапов.
 */
export function applyWorldStyleToMaterial(
  material: MeshToonMaterial,
  biome: BiomeType,
  options: { useAccent?: boolean; emissiveIntensity?: number } = {}
): void {
  const colors = getWorldStyleColors(biome);
  const intensity = options.emissiveIntensity ?? WORLD_EMISSIVE_INTENSITY;
  material.color.set(options.useAccent ? colors.accent : colors.base);
  material.emissive.set(colors.glow);
  material.emissiveIntensity = intensity;
  if ('dithering' in material) {
    (material as unknown as { dithering: boolean }).dithering = true;
  }
}

/**
 * Вариация цвета в рамках биома (для разнообразия при сохранении стиля).
 * factor 0 = base, 1 = accent.
 */
export function getWorldStyleColorVariant(biome: BiomeType, factor: number): string {
  const c = getWorldStyleColors(biome);
  _color.set(c.base).lerp(_accent.set(c.accent), Math.max(0, Math.min(1, factor)));
  return _color.getStyle();
}
