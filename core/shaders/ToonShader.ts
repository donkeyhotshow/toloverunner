/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Toon Shader для Three.js - мультяшный стиль с outline
 */

import * as THREE from 'three';

// Toon Shader Material
export const createToonMaterial = (color: string = '#ffffff') => {
    // Используем MeshToonMaterial для базового toon эффекта
    const material = new THREE.MeshToonMaterial({
        color: color,
        gradientMap: null, // Можно добавить градиентную карту для более выраженного toon эффекта
    });

    return material;
};

// Outline Shader (GLSL)
export const outlineShader = {
    vertexShader: `
        uniform float outlineWidth;
        uniform vec3 outlineColor;
        
        void main() {
            vec4 pos = modelViewMatrix * vec4(position + normal * outlineWidth, 1.0);
            gl_Position = projectionMatrix * pos;
        }
    `,
    fragmentShader: `
        uniform vec3 outlineColor;
        
        void main() {
            gl_FragColor = vec4(outlineColor, 1.0);
        }
    `,
    uniforms: {
        outlineWidth: { value: 0.02 },
        outlineColor: { value: new THREE.Color(0x000000) }
    }
};

// Toon Shader с outline (комбинированный)
export const createToonOutlineMaterial = (color: string = '#ffffff', outlineColor: string = '#000000', outlineWidth: number = 0.02) => {
    const toonMat = createToonMaterial(color);

    // Outline material (используется как второй pass)
    const outlineMat = new THREE.ShaderMaterial({
        uniforms: {
            outlineWidth: { value: outlineWidth },
            outlineColor: { value: new THREE.Color(outlineColor) }
        },
        vertexShader: outlineShader.vertexShader,
        fragmentShader: outlineShader.fragmentShader,
        side: THREE.BackSide
    });

    return { toon: toonMat, outline: outlineMat };
};

