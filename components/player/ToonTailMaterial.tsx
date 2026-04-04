/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Color } from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// 🐍 GPU-Animated Tail Shader - Strict Cel-Shading Style
// Moved animation to GPU to save CPU array updates (posAttr.needsUpdate)
const ToonTailMaterial = shaderMaterial(
  {
    uColor: new Color('#FFFFFF'), // White base
    uRimColor: new Color('#FFFFFF'), // White rim
    uRimPower: 2.0, 
    uRimIntensity: 1.0,
    uTime: 0,
    uPulse: 0.4,
    uSSSColor: new Color('#FFFFFF'),
    uAmbient: 0.45,
    uEmissive: 0.25,
    uOpacity: 1.0,
    uCurvature: 0.001,
    uWaveSpeed: 10.0,
    uWaveAmp: 0.22,
    uTailStart: 0.4,
    uTailEnd: 3.9,
  },
  // VERTEX SHADER
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vColor; // Passed from buffer geometry
    
    uniform highp float uCurvature;
    uniform highp float uTime;
    uniform float uWaveSpeed;
    uniform float uWaveAmp;
    uniform float uTailStart;
    uniform float uTailEnd;
    
    void main() {
      vUv = uv;
#ifdef USE_COLOR
      vColor = color;
#else
      vColor = vec3(1.0); // Fallback to white if no vertex colors
#endif
      
      // The wave logic ported exactly from JS to GLSL
      // Calculate normalized position along the tail length (0.0 to 1.0)
      float t = clamp((position.z - uTailStart) / (uTailEnd - uTailStart), 0.0, 1.0);
      
      // Calculate wave offsets based purely on time and position
      float waveX = sin(uTime * uWaveSpeed - t * 10.0) * uWaveAmp * t;
      float waveY = cos(uTime * uWaveSpeed * 0.85 - t * 7.0) * uWaveAmp * 0.7 * t;
      
      // Apply offset locally
      vec3 pos = position;
      pos.x += waveX;
      pos.y += waveY;

      // Calculate normals roughly so lighting works on moving tail
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate world position
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      
      // 🌍 Apply World Bending
      float distFromCamera = worldPos.z - cameraPosition.z;
      worldPos.y -= distFromCamera * distFromCamera * uCurvature;
      
      vWorldPosition = worldPos.xyz;
      
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
    uniform float uPulse;
    uniform float uAmbient;
    uniform float uEmissive;
    uniform float uOpacity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vColor;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);

      float diffuseWrap = dot(N, vec3(0.0, 1.0, 0.5)) * 0.5 + 0.5;
      diffuseWrap = floor(diffuseWrap * 3.0) / 3.0; // Hard step
      
      // Multiply uniform color by vertex color (used for the black tail tip)
      vec3 vertexTintedColor = uColor * vColor;
      vec3 baseColor = vertexTintedColor * (0.6 + diffuseWrap * 0.4);

      float fresnel = max(0.0, 1.0 - max(dot(V, N), 0.0));
      float rimFactor = pow(fresnel, uRimPower);
      rimFactor = step(0.3, rimFactor); // Hard cutoff
      
      float thickness = 1.0 - fresnel; 
      float sssFactor = pow(thickness, 2.0) * diffuseWrap * uPulse;
      sssFactor = step(0.2, sssFactor) * 0.3; // Hard step
      
      vec3 color = baseColor;
      
      // Add ambient and emissive
      color += vertexTintedColor * uAmbient;
      color += vertexTintedColor * uEmissive;

      // Add subtle SSS
      color = mix(color, uSSSColor * vColor, sssFactor);
      
      // Add hard Rim
      color = mix(color, uRimColor, rimFactor * uRimIntensity * 0.5);
      
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), uOpacity);
    }
  `
);

extend({ ToonTailMaterial });

export type ToonTailMaterialInstance = InstanceType<typeof ToonTailMaterial> & {
  uColor: import('three').Color;
  uRimColor: import('three').Color;
  uRimIntensity: number;
  uRimPower: number;
  uOpacity: number;
  uCurvature: number;
  uWaveSpeed: number;
  uWaveAmp: number;
  uTime: number;
};

export { ToonTailMaterial };
