/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CurvedWorldEffect - Subtle world bending to hide object spawning
 */

import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Object3D, Mesh, Material, ShaderMaterial, WebGLRenderer } from 'three';

// Type for materials that may have optional onBeforeCompile (we read it, so allow undefined)
type ShaderLike = Parameters<Material['onBeforeCompile']>[0];
type MaterialWithOptionalOnBeforeCompile = ShaderMaterial & {
    onBeforeCompile?: (shader: ShaderLike, renderer: WebGLRenderer) => void;
};

export const CurvedWorldEffect: React.FC = () => {
    const { scene } = useThree();
    const originalShaders = useRef(new Map());

    useEffect(() => {
        // Apply curved world effect to all materials in the scene
        const applyCurvedWorld = (object: Object3D) => {
            if (object instanceof Mesh && object.material) {
                const material = object.material as Material;
                
                // Skip if already modified
                if (originalShaders.current.has(material)) return;

                // Store original shader
                if ('onBeforeCompile' in material) {
                    const mat = material as MaterialWithOptionalOnBeforeCompile;
                    const originalOnBeforeCompile = mat.onBeforeCompile;
                    originalShaders.current.set(material, originalOnBeforeCompile);

                    // Apply curved world shader modification
                    mat.onBeforeCompile = (shader: ShaderLike, renderer: WebGLRenderer) => {
                        // Call original if exists
                        if (originalOnBeforeCompile) {
                            originalOnBeforeCompile(shader, renderer);
                        }

                        // Add curved world uniforms
                        shader.uniforms.uCurvature = { value: 0.001 }; // Very subtle curve
                        shader.uniforms.uDistance = { value: 0.0 };

                        // Modify vertex shader to bend world
                        shader.vertexShader = shader.vertexShader.replace(
                            '#include <begin_vertex>',
                            `
                            #include <begin_vertex>
                            
                            // Curved world effect - bend horizon down
                            float curvature = uCurvature;
                            float distance = length(transformed.xz);
                            float bend = curvature * distance * distance;
                            transformed.y -= bend;
                            `
                        );

                        // Add uniforms declaration
                        shader.vertexShader = 'uniform float uCurvature;\nuniform float uDistance;\n' + shader.vertexShader;
                    };

                    // Force material to recompile
                    material.needsUpdate = true;
                }
            }

            // Recursively apply to children
            object.children.forEach(applyCurvedWorld);
        };

        // Apply to entire scene
        // Apply to entire scene
        applyCurvedWorld(scene);

        // Copy ref for cleanup to satisfy React hooks rule
        const shadersMap = originalShaders.current;

        return () => {
            // Cleanup - restore original shaders
            shadersMap.forEach((originalOnBeforeCompile, material) => {
                if ('onBeforeCompile' in material) {
                    const mat = material as MaterialWithOptionalOnBeforeCompile;
                    mat.onBeforeCompile = originalOnBeforeCompile;
                    material.needsUpdate = true;
                }
            });
            shadersMap.clear();
        };
    }, [scene]);

    return null;
};