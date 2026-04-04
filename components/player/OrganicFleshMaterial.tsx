/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Color } from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// 🩸 Organic Flesh Shader - PURE CEL-SHADING STYLE
// Matte colors, hard edges, comic print effect
const OrganicFleshMaterial = shaderMaterial(
  {
    uColor: new Color('#F5F5DC'), // Beige
    uRimColor: new Color('#8B7355'), // MATTE Brown (not cyan)
    uRimPower: 3.5, // Harder falloff
    uRimIntensity: 0.8,
    uTime: 0,
    uPulse: 0.4,
    uSSSColor: new Color('#8B4513'), // MATTE Sienna
    uAmbient: 0.4, // 💡 NEW: Ambient baseline
    uEmissive: 0.2, // 💡 NEW: Self-illumination
    uOpacity: 1.0,
    uCurvature: 0.001, // 🌍 Added to sync with road curvature
  },
  // VERTEX SHADER
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    uniform highp float uCurvature; // 🌍
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate world position
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      
      // 🌍 Apply World Bending (Sync with OrganicRoadMaterial)
      float distFromCamera = worldPos.z - cameraPosition.z;
      worldPos.y -= distFromCamera * distFromCamera * uCurvature;
      
      vWorldPosition = worldPos.xyz;
      
      // Calculate view position after bending
      vec4 mvPosition = viewMatrix * worldPos;
      vViewPosition = -mvPosition.xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // FRAGMENT SHADER
  `
    precision mediump float;

    uniform vec3 uColor;
    uniform vec3 uRimColor;
    uniform vec3 uSSSColor;
    uniform float uRimPower;
    uniform float uRimIntensity;
    uniform highp float uTime;
    uniform float uPulse;
    uniform float uAmbient;
    uniform float uEmissive;
    uniform float uOpacity;


    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);

      // 1. CEL-SHADING: Stepped lighting (2-3 levels only)
      float diffuseWrap = dot(N, vec3(0.0, 1.0, 0.5)) * 0.5 + 0.5;
      // Hard step for comic look
      diffuseWrap = floor(diffuseWrap * 3.0) / 3.0;
      vec3 baseColor = uColor * (0.6 + diffuseWrap * 0.4);

      // 2. HARD FRESNEL / RIM - Comic edge
      float fresnel = max(0.0, 1.0 - max(dot(V, N), 0.0));
      float rimFactor = pow(fresnel, uRimPower);
      // Hard cutoff
      rimFactor = step(0.3, rimFactor);
      
      // 3. MATTE SSS - Subtle, no glow
      float thickness = 1.0 - fresnel; 
      float sssFactor = pow(thickness, 2.0) * diffuseWrap * uPulse;
      sssFactor = step(0.2, sssFactor) * 0.3; // Hard step
      
      // 4. NO SPECULAR - Matte finish

      // Final Composite - BRIGHT MATTE
      vec3 color = baseColor;
      
      // Add ambient and emissive to ensure player is never black
      color += uColor * uAmbient;
      color += uColor * uEmissive;

      // Add subtle SSS inside
      color = mix(color, uSSSColor, sssFactor);
      
      // Add hard Rim
      color = mix(color, uRimColor, rimFactor * uRimIntensity * 0.5);
      
      // Final clamp to keep it within range
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), uOpacity);
    }
  `
);

extend({ OrganicFleshMaterial });

export type OrganicFleshMaterialInstance = InstanceType<typeof OrganicFleshMaterial> & {
  uColor: import('three').Color;
  uRimColor: import('three').Color;
  uRimIntensity: number;
  uRimPower: number;
  uOpacity: number;
  uCurvature: number;
};

export { OrganicFleshMaterial };
