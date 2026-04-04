/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToonShadowMaterial - MeshToonMaterial with gradientMap for stylized shadows
 * Provides comic-style toon shading with customizable gradient maps
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
    MeshToonMaterial,
    Color,
    Texture,
    Vector2,
    CanvasTexture,
    NearestFilter,
    LinearFilter,
    RepeatWrapping
} from 'three';
import { useFrame } from '@react-three/fiber';

// Gradient map presets for toon shading
export const GRADIENT_PRESETS = {
    // 3-step gradient for classic toon look
    classic3: {
        steps: 3,
        colors: ['#333333', '#888888', '#ffffff'],
    },
    // 4-step gradient for smoother transitions
    smooth4: {
        steps: 4,
        colors: ['#222222', '#666666', '#aaaaaa', '#ffffff'],
    },
    // 5-step gradient with more detail
    detailed5: {
        steps: 5,
        colors: ['#1a1a1a', '#444444', '#777777', '#aaaaaa', '#ffffff'],
    },
    // 2-step for extreme comic look
    extreme2: {
        steps: 2,
        colors: ['#000000', '#ffffff'],
    },
    // Soft gradient for subtle toon
    soft: {
        steps: 8,
        colors: ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a', '#6a6a6a', '#7a7a7a', '#8a8a8a', '#9a9a9a', '#aaaaaa', '#ffffff'],
    },
    // Colored toon (for enemies/powerups)
    colored: {
        steps: 4,
        colors: ['#220000', '#880000', '#cc4444', '#ff8888'],
    },
    // Golden toon (for boss/luxury items)
    golden: {
        steps: 4,
        colors: ['#332200', '#996600', '#cc9900', '#ffcc00'],
    },
    // Blue toon (for ice/water themes)
    ice: {
        steps: 4,
        colors: ['#001122', '#004488', '#0088cc', '#44ccff'],
    },
    // Green toon (for poison/bio themes)
    bio: {
        steps: 4,
        colors: ['#002200', '#006600', '#00aa00', '#44ff44'],
    },
} as const;

export type GradientPresetKey = keyof typeof GRADIENT_PRESETS;

export interface ToonShadowMaterialProps {
    /** Base color of the material */
    color?: string;
    /** Map for base color texture */
    map?: Texture | null;
    /** Gradient map for toon shading */
    gradientMap?: Texture | null;
    /** Gradient preset to use */
    gradientPreset?: GradientPresetKey;
    /** Custom gradient colors (overrides preset) */
    customGradientColors?: string[];
    /** Number of gradient steps (if using custom) */
    gradientSteps?: number;
    /** Light direction for toon calculation */
    lightDirection?: Vector2;
    /** Emissive color for glow effect */
    emissive?: string;
    /** Emissive intensity */
    emissiveIntensity?: number;
    /** Opacity */
    opacity?: number;
    /** Transparent */
    transparent?: boolean;
    /** Side to render */
    side?: 'front' | 'back' | 'double';
    /** Enable gradient map filtering */
    nearestFilter?: boolean;
    /** Custom uniforms for advanced effects */
    customUniforms?: Record<string, { value: unknown }>;
    /** Callback when material is created */
    onCreated?: (material: MeshToonMaterial) => void;
}

/**
 * Create a gradient texture for toon shading
 */
export function createGradientTexture(
    steps: number,
    colors: readonly string[],
    nearestFilter: boolean = true
): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, steps);
    canvas.height = 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        // Fallback to a simple 2-pixel texture
        const canvas2 = document.createElement('canvas');
        canvas2.width = 2;
        canvas2.height = 1;
        const ctx2 = canvas2.getContext('2d');
        if (ctx2) {
            ctx2.fillStyle = (colors[0] as string) || '#888888';
            ctx2.fillRect(0, 0, 1, 1);
            ctx2.fillStyle = (colors[colors.length - 1] as string) || '#ffffff';
            ctx2.fillRect(1, 0, 1, 1);
        }
        const texture = new CanvasTexture(canvas2);
        texture.minFilter = NearestFilter;
        texture.magFilter = NearestFilter;
        return texture;
    }

    const stepWidth = canvas.width / steps;

    for (let i = 0; i < steps; i++) {
        const colorIndex = Math.min(
            Math.floor((i / steps) * colors.length),
            colors.length - 1
        );
        const color = (colors[colorIndex] as string) || '#888888';
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(i * stepWidth), 0, Math.ceil(stepWidth) + 1, canvas.height);
    }

    const texture = new CanvasTexture(canvas);
    texture.minFilter = nearestFilter ? NearestFilter : LinearFilter;
    texture.magFilter = nearestFilter ? NearestFilter : LinearFilter;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
}

/**
 * Enhanced Toon Material with gradient map support
 * Provides stylized comic-style shading
 */
export const ToonShadowMaterial: React.FC<ToonShadowMaterialProps> = ({
    color = '#B22222',
    map = null,
    gradientMap: providedGradientMap = null,
    gradientPreset = 'classic3',
    customGradientColors,
    gradientSteps,
    lightDirection = new Vector2(0.5, 0.5),
    emissive = '#000000',
    emissiveIntensity = 0,
    opacity = 1,
    transparent = false,
    side = 'front',
    nearestFilter = true,
    customUniforms = {},
    onCreated,
}) => {
    const materialRef = useRef<MeshToonMaterial>(null);

    // Generate gradient texture
    const gradientTexture = useMemo(() => {
        if (providedGradientMap) {
            return providedGradientMap;
        }

        const preset = GRADIENT_PRESETS[gradientPreset];
        const colors = customGradientColors || preset.colors;
        const steps = gradientSteps || preset.steps;

        return createGradientTexture(steps, colors, nearestFilter);
    }, [providedGradientMap, gradientPreset, customGradientColors, gradientSteps, nearestFilter]);

    // Create the material
    const material = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: new Color(color),
            map: map,
            gradientMap: gradientTexture,
            emissive: new Color(emissive),
            emissiveIntensity: emissiveIntensity,
            opacity: opacity,
            transparent: transparent,
            side: side === 'front' ? 0 : side === 'back' ? 1 : 2,
        });

        // Call onCreated callback
        if (onCreated) {
            onCreated(mat);
        }

        return mat;
    }, [color, map, gradientTexture, emissive, emissiveIntensity, opacity, transparent, side, onCreated]);

    // Update material when props change
    useEffect(() => {
        if (material) {
            material.color.set(color);
            material.gradientMap = gradientTexture;
            material.emissive.set(emissive);
            material.emissiveIntensity = emissiveIntensity;
            material.opacity = opacity;
            material.transparent = transparent;
            material.needsUpdate = true;
        }
    }, [material, color, gradientTexture, emissive, emissiveIntensity, opacity, transparent]);

    // Cleanup
    useEffect(() => {
        return () => {
            // Don't dispose the texture if it was provided externally
            if (!providedGradientMap && gradientTexture) {
                gradientTexture.dispose();
            }
        };
    }, [providedGradientMap, gradientTexture]);

    return <primitive object={material} ref={materialRef} attach="material" />;
};

// Shadow-receiving material (for ground/objects that receive shadows)
export const ToonShadowReceiver: React.FC<{
    color?: string;
    gradientPreset?: GradientPresetKey;
}> = ({
    color = '#666666',
    gradientPreset = 'soft',
}) => {
        const preset = GRADIENT_PRESETS[gradientPreset];
        const gradientTexture = useMemo(() => {
            return createGradientTexture(preset.steps, preset.colors, true);
        }, [gradientPreset]);

        return (
            <meshToonMaterial
                color={color}
                gradientMap={gradientTexture}
            />
        );
    };

// Factory function to create specific toon materials
export const createToonMaterial = (
    preset: GradientPresetKey,
    color: string
): MeshToonMaterial => {
    const presetConfig = GRADIENT_PRESETS[preset];
    const gradientTexture = createGradientTexture(
        presetConfig.steps,
        presetConfig.colors,
        true
    );

    return new MeshToonMaterial({
        color: new Color(color),
        gradientMap: gradientTexture,
    });
};

// Preset colors for different object types
export const TOON_COLORS = {
    player: '#B22222',       // Dark red (sperm head)
    enemy: '#444444',       // Gray (enemies)
    boss: '#8B0000',        // Dark red (boss)
    obstacle: '#228B22',    // Forest green (obstacles)
    powerup: '#FFD700',     // Gold (powerups)
    ground: '#4a4a4a',       // Dark gray (ground)
    background: '#2a2a2a',   // Very dark gray (background)
    highlight: '#FFFFFF',    // White (highlights)
    shadow: '#000000',      // Black (shadows)
} as const;

// Utility hook for animating toon materials
export const useToonAnimation = (
    material: MeshToonMaterial | null,
    options?: {
        pulseSpeed?: number;
        pulseColor?: string;
        baseColor?: string;
    }
) => {
    const {
        pulseSpeed = 2.0,
        pulseColor = '#ff0000',
        baseColor = '#B22222',
    } = options || {};

    useFrame((state) => {
        if (!material) return;

        const time = state.clock.elapsedTime;
        const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5;

        // Interpolate between base and pulse color
        const base = new Color(baseColor);
        const pulseCol = new Color(pulseColor);

        material.emissive.copy(base).lerp(pulseCol, pulse * 0.3);
        material.emissiveIntensity = pulse * 0.2;
    });
};

export default ToonShadowMaterial;
