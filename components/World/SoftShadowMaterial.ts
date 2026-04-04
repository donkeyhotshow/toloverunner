/**
 * SoftShadowMaterial - Мягкая blob shadow с градиентом
 * Для мультяшного стиля (замена real-time shadows)
 * 
 * @license Apache-2.0
 */

import { ShaderMaterial, Color } from 'three';

export class SoftShadowMaterial extends ShaderMaterial {
    constructor() {
        super({
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1.0, // Bring it slightly forward
            polygonOffsetUnits: -4.0,
            uniforms: {
                uOpacity: { value: 0.5 },
                uColor: { value: new Color('#000000') },
                uSoftness: { value: 0.3 }, // 0 = harsh, 1 = very soft
                uCurvature: { value: 0.001 } // 🌍 Match road curvature
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float uCurvature;
                void main() {
                    vUv = uv;
                    // Apply World Bending
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    float distFromCamera = worldPos.z - cameraPosition.z;
                    worldPos.y -= distFromCamera * distFromCamera * uCurvature;
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                uniform float uOpacity;
                uniform vec3 uColor;
                uniform float uSoftness;
                varying vec2 vUv;
                
                void main() {
                    // Distance from center (0.0 = center, 1.0 = edge)
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(vUv, center) * 2.0;
                    
                    // Soft falloff
                    float alpha = 1.0 - smoothstep(1.0 - uSoftness, 1.0, dist);
                    alpha *= uOpacity;
                    
                    gl_FragColor = vec4(uColor, alpha);
                }
            `
        });
    }
}
