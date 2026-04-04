/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackgroundTunnel - Simplified version for maximum performance
 */

import React from 'react';
import { ShaderMaterial, Color, BackSide } from 'three';
import { useStore } from '../../store';
import { BIOME_CONFIG } from '../../constants';
import { BiomeType } from '../../types';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';
import { applyWorldBending } from './WorldBendingShader';

export const BackgroundTunnel: React.FC = React.memo(() => {
    const biome = useStore(state => state.biome);
    const geometry = React.useMemo(() => getGeometryPool().getCylinderGeometry(80, 80, 1200, 24, 1, true), []); // 📏 Slightly longer: 1000 -> 1200

    // 🌅 СВЕТЛЫЙ ГРАДИЕНТ: Голубой → Нежно-розовый (вертикальный)
    const material = React.useMemo(() => {
        const shaderMaterial = new ShaderMaterial({
            side: BackSide,
            uniforms: {
                topColor: { value: new Color('#4a0000') },    // Dark Blood (Top/Distance)
                middleColor: { value: new Color('#800020') }, // Burgundy (Middle)
                bottomColor: { value: new Color('#2a0000') }, // Almost Black Red (Bottom)
                opacity: { value: 1.0 },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 middleColor;
                uniform vec3 bottomColor;
                uniform float opacity;
                varying vec3 vWorldPosition;
                
                void main() {
                    float y = vWorldPosition.y;
                    float normalizedY = (y + 50.0) / 100.0;
                    normalizedY = clamp(normalizedY, 0.0, 1.0);
                    
                    vec3 color;
                    if (normalizedY > 0.5) {
                        float t = (normalizedY - 0.5) * 2.0;
                        color = mix(middleColor, topColor, t);
                    } else {
                        float t = normalizedY * 2.0;
                        color = mix(bottomColor, middleColor, t);
                    }
                    
                    // 🌫️ DISTANCE FOG: Fade out at the horizon to avoid "hole" look
                    // Distance is -vWorldPosition.z (camera is at 0, world goes into -z)
                    float dist = -vWorldPosition.z;
                    float fogFactor = clamp((dist - 300.0) / 800.0, 0.0, 1.0); // Start fade at 300, end at 1100
                    
                    // Mix with topColor (which matches fog color roughly)
                    color = mix(color, topColor, fogFactor);
                    
                    gl_FragColor = vec4(color, opacity);
                }

            `,
            depthWrite: false, // Keep this to prevent Z-Fighting
            depthTest: true,
            transparent: true,
        });
        return shaderMaterial;
    }, []);

    React.useEffect(() => {
        const config = BIOME_CONFIG[biome as BiomeType] || BIOME_CONFIG[BiomeType.BIO_JUNGLE];
        if (material.uniforms.topColor) {
            material.uniforms.topColor.value.set(config.color).multiplyScalar(0.8);
        }
        if (material.uniforms.middleColor) {
            material.uniforms.middleColor.value.set(config.wallColor).multiplyScalar(0.6);
        }
        if (material.uniforms.bottomColor) {
            material.uniforms.bottomColor.value.set(config.color).multiplyScalar(0.4);
        }

        applyWorldBending(material, { curvature: 0.001 }); // Sync with Track
    }, [biome, material]);

    React.useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    // ✅ RESTORED: Background Tunnel with correct sorting
    return (
        <group rotation={[Math.PI / 2, 0, 0]} renderOrder={-20}>
            <mesh geometry={geometry} material={material} renderOrder={-20} />
        </group>
    );
});

BackgroundTunnel.displayName = 'BackgroundTunnel';
export default BackgroundTunnel;
