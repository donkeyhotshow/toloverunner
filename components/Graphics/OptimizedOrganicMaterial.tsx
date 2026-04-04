/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface OptimizedOrganicMaterialProps {
    color: string;
    rimColor?: string;
    pulseSpeed?: number;
    pulseIntensity?: number;
    lodDistance?: number;
}

export const OptimizedOrganicMaterial: React.FC<OptimizedOrganicMaterialProps> = React.memo(({
    color,
    rimColor = '#ffffff',
    pulseSpeed: _pulseSpeed = 1.0,
    pulseIntensity: _pulseIntensity = 0.0
}) => {
    // Simple wrapper around MeshToonMaterial for now
    // In future this can be a custom shader material
    return (
        <meshToonMaterial 
            color={color}
            emissive={rimColor}
            emissiveIntensity={0.1}
        />
    );
});
