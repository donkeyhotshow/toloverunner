/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DreiOutlines - Outlines component wrapper using @react-three/drei
 * Replaces the custom RoughOutlines implementation with the official Outlines component
 */

import React, { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';

export interface OutlinesWrapperProps {
    /** Outline color */
    color?: THREE.ColorRepresentation;
    /** Outline thickness */
    thickness?: number;
    /** Fixed screen-space thickness */
    screenspace?: boolean;
    /** Children elements */
    children?: React.ReactNode;
}

/**
 * Enhanced Outlines component with backward compatibility support
 * Uses @react-three/drei's Outlines component for correct rendering
 */
export const ToonOutlines: React.FC<OutlinesWrapperProps> = ({
    color = '#000000',
    thickness = 0.05,
    screenspace = false,
    children,
}) => {
    // Validate and normalize props
    const normalizedThickness = useMemo(() => {
        const t = typeof thickness === 'number' ? thickness : 0.05;
        return Math.max(0.001, Math.min(1, t));
    }, [thickness]);

    // @ts-ignore - Outlines props may vary by drei version
    return (
        <Outlines
            color={color}
            thickness={normalizedThickness}
            screenspace={screenspace}
        >
            {children}
        </Outlines>
    );
};

// Backward compatibility alias
export const ComicOutlines = ToonOutlines;

// Preset configurations for different use cases
export const OUTLINE_PRESETS = {
    // Standard comic-style outline
    comic: {
        thickness: 0.08,
        color: '#000000',
        screenspace: false,
    },
    // Thicker outline for important objects
    highlight: {
        thickness: 0.15,
        color: '#000000',
        screenspace: true,
    },
    // Subtle outline for background objects
    subtle: {
        thickness: 0.03,
        color: '#333333',
        screenspace: false,
    },
    // Screen-space outline (constant thickness in screen space)
    screenspace: {
        thickness: 2,
        color: '#000000',
        screenspace: true,
    },
} as const;

// Factory function to create preset-based outlines
export const createOutlines = (preset: keyof typeof OUTLINE_PRESETS = 'comic', overrides?: Partial<OutlinesWrapperProps>) => {
    const baseConfig = OUTLINE_PRESETS[preset];
    return {
        ...baseConfig,
        ...overrides,
    };
};

// Wrapper component for using Outlines in existing code that used RoughOutlines
interface RoughOutlinesReplacementProps {
    color?: string;
    thickness?: number;
    noiseScale?: number;
    noiseAmount?: number;
    isRoad?: boolean;
    children?: React.ReactNode;
}

/**
 * Backward-compatible replacement for RoughOutlines
 * Uses DreiOutlines but maintains similar API to RoughOutlines
 */
export const RoughOutlinesReplacement: React.FC<RoughOutlinesReplacementProps> = ({
    color = '#000000',
    thickness = 0.08,
    noiseAmount = 0.05,
    children,
}) => {
    // The noise effects are not directly supported by Outlines
    // We use a slight thickness adjustment for "rough" effect
    const adjustedThickness = useMemo(() => {
        const baseThickness = typeof thickness === 'number' ? thickness : 0.08;
        const noiseBoost = typeof noiseAmount === 'number' ? noiseAmount * 0.5 : 0.025;
        return baseThickness + noiseBoost;
    }, [thickness, noiseAmount]);

    return (
        <ToonOutlines
            color={color}
            thickness={adjustedThickness}
            screenspace={false}
        >
            {children}
        </ToonOutlines>
    );
};

export default ToonOutlines;
