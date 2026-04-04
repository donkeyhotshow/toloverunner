import React, { useMemo } from 'react';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, ThreeElements } from '@react-three/fiber';





/**
 * 🖋️ RoughOutlinesMaterial
 * Creates a sketchy, hand-drawn outline effect with vertex displacement.
 */
const RoughOutlinesMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#000000'),
    uThickness: 0.05,
    uTime: 0,
    uNoiseScale: 10.0,
    uNoiseAmount: 0.1,
    uResolution: new THREE.Vector2(1024, 1024),
    uIsRoad: 0.0, // Special handling for road to avoid jagged flat surfaces
  },
  // VERTEX SHADER
  `
    varying vec2 vUv;
    uniform float uThickness;
    uniform float uTime;
    uniform float uNoiseScale;
    uniform float uNoiseAmount;
    uniform float uIsRoad;

    // Standard hash for noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vUv = uv;
      
      // DISPLACEMENT ALONG NORMAL
      vec3 pos = position;
      vec3 norm = normalize(normal);
      
      // Scale thickness based on distance to maintain visual weight
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      float dist = length(mvPos.xyz);
      float thickness = uThickness * (1.0 + dist * 0.02);
      
      // NOISE JITTER (Pencil stroke effect)
      // We use world position for stable noise or local for animated sketch
      float jitter = noise(pos.xy * uNoiseScale + uTime * 0.5) * uNoiseAmount;
      
      // Road specific logic: vertical displacement is flatter
      if (uIsRoad > 0.5) {
          norm.y *= 0.1; 
      }

      pos += norm * (thickness + jitter);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // FRAGMENT SHADER
  `
    precision mediump float;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      gl_FragColor = vec4(uColor, 1.0);
    }
  `
);

extend({ RoughOutlinesMaterial });

interface RoughOutlinesProps {
  geometry?: THREE.BufferGeometry;
  instanceCount?: number;
  color?: string;
  thickness?: number;
  noiseScale?: number;
  noiseAmount?: number;
  isRoad?: boolean;
}

/**
 * Custom Outlines component for ToLoveRunner.
 * Renders a "Comic Ink" sketchy outline.
 */
export const RoughOutlines: React.FC<RoughOutlinesProps> = ({ 
  geometry,
  instanceCount,
  color = '#000000', 
  thickness = 0.08, 
  noiseScale = 12.0, 
  noiseAmount = 0.05,
  isRoad = false
}) => {
  const material = useMemo(() => {
    const mat = new (RoughOutlinesMaterial as any)();
    mat.side = THREE.BackSide; // Render inside out for outline effect
    return mat;
  }, []);

  // Update uniforms without re-creating material
  useMemo(() => {
    material.uColor.set(color);
    material.uThickness = thickness;
    material.uNoiseScale = noiseScale;
    material.uNoiseAmount = noiseAmount;
    material.uIsRoad = isRoad ? 1.0 : 0.0;
  }, [material, color, thickness, noiseScale, noiseAmount, isRoad]);

  // If geometry is provided, render as a separate mesh/instancedMesh
  if (geometry) {
    if (instanceCount !== undefined) {
      return <instancedMesh args={[geometry, material, instanceCount]} />;
    }
    return <mesh geometry={geometry} material={material} />;
  }

  // FALLBACK: Attach to parent (legacy mode, but warned)
  return <primitive object={material} attach="material" />;
};


export default RoughOutlines;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      roughOutlinesMaterial: ThreeElements['shaderMaterial'];
    }
  }
}
