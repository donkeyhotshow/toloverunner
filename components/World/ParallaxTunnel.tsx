import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { eventBus } from '../../utils/eventBus';

/**
 * ParallaxTunnel — Cartoon intestine tunnel with UV-scroll (no mesh movement)
 */

const PATTERN_LENGTH = 200.0;

export const ParallaxTunnel: React.FC<{ totalDistance?: number }> = ({ totalDistance: _totalDistance = 0 }) => {
  const tunnelRef = useRef<THREE.Mesh>(null);
  const scrollAccumRef = useRef(0);

  const tunnelGeometry = useMemo(() => {
    // 20 radial segments = smooth round intestine tube
    const geo = new THREE.CylinderGeometry(16, 16, 4000, 20, 400, true);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const tunnelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uTime: { value: 0 },
        uDistance: { value: 0 },
        uPulse: { value: 0 },
        // Intestine flesh colors
        uColorFlesh:  { value: new THREE.Color('#E8906A') }, // warm flesh pink
        uColorDeep:   { value: new THREE.Color('#B54050') }, // deep dark pink/maroon
        uColorHighlight: { value: new THREE.Color('#F5C4A8') }, // light highlight
        uColorGroove: { value: new THREE.Color('#7A1A2A') }, // dark groove between folds
        uPatternLength: { value: PATTERN_LENGTH },
      },
      vertexShader: `
        precision highp float;

        uniform float uTime;
        uniform float uDistance;
        uniform float uPatternLength;

        varying vec2 vUv;
        varying float vAngle;

        void main() {
          vUv = uv;
          // Angular position around the tube (for cross-section shading)
          vAngle = uv.x * 6.28318;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uDistance;
        uniform float uPulse;
        uniform vec3 uColorFlesh;
        uniform vec3 uColorDeep;
        uniform vec3 uColorHighlight;
        uniform vec3 uColorGroove;
        uniform float uPatternLength;

        varying vec2 vUv;
        varying float vAngle;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          // UV scroll — tunnel moves toward viewer
          float scrollV = mod(uDistance, uPatternLength) / uPatternLength;
          vec2 uv = vec2(vUv.x, vUv.y + scrollV);

          // ── INTESTINAL SEGMENTS ──
          // Strong horizontal ring folds — the hallmark of intestines
          float foldFreq = 12.0; // number of folds visible along the tube
          float fv = mod(uv.y * foldFreq, 1.0);

          // Each fold: smooth bulge (peak = 1 in center, 0 at groove edges)
          float foldBulge = sin(fv * 3.14159); // 0→1→0 per fold
          float foldBulge2 = pow(foldBulge, 1.5); // sharpen peaks
          float groove = 1.0 - smoothstep(0.0, 0.12, fv) * smoothstep(1.0, 0.88, fv); // dark edges

          // ── CROSS-SECTION SHADING (rounded tube feel) ──
          // Top of tube is lighter (ceiling lit), bottom darker (floor shadow)
          // vAngle goes 0→2π around the tube
          // uv.x = 0..1 corresponds to angle 0..2π
          float cosA = cos(vAngle);
          float topLight = cosA * 0.5 + 0.5; // 1 at top, 0 at bottom

          // ── COLOR MIXING ──
          // Groove between folds = very dark maroon
          // Peak of fold = bright flesh with highlight
          vec3 baseColor = mix(uColorGroove, uColorFlesh, foldBulge2);

          // Add highlight on the topmost part of each fold peak
          float highlight = foldBulge2 * topLight;
          baseColor = mix(baseColor, uColorHighlight, highlight * 0.45);

          // Darker at the bottom
          baseColor = mix(baseColor, uColorDeep * 0.6, (1.0 - topLight) * 0.5);

          // ── ORGANIC MICRO VARIATION ──
          // Subtle noise to break up uniformity (cartoon style: keep it small)
          float n = hash(uv * vec2(8.0, 30.0) + uTime * 0.05) * 0.06;
          baseColor += n * uColorHighlight * 0.3;

          // ── DEPTH FADE ──
          // Darker toward the far end to suggest depth
          float depthFade = 1.0 - smoothstep(0.3, 1.0, uv.y) * 0.5;
          baseColor *= depthFade;

          // ── PERISTALSIS PULSE ──
          // Very subtle pulsing, like intestinal motion
          float pulse = sin(uTime * 1.5 - uv.y * 20.0) * 0.03 + 0.97;
          baseColor *= pulse;

          // ── VITALITY PULSE (from game state) ──
          baseColor += uColorHighlight * uPulse * 0.08;

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
    });
  }, []);

  useEffect(() => {
    const handler = (data: { offset: number }) => {
      scrollAccumRef.current += data.offset;
    };
    return eventBus.on('world:origin-reset', handler);
  }, []);

  useFrame(({ clock }) => {
    const material = tunnelRef.current?.material as THREE.ShaderMaterial;
    if (!material?.uniforms) return;

    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }

    const storeDist = useStore.getState().distance || 0;
    if (material.uniforms.uDistance) {
      material.uniforms.uDistance.value = storeDist + scrollAccumRef.current;
    }

    if (material.uniforms.uPulse) {
      material.uniforms.uPulse.value = useStore.getState().vitalityPulse || 0;
    }
  });

  return (
    <mesh
      ref={tunnelRef}
      geometry={tunnelGeometry}
      material={tunnelMaterial}
      position={[0, 0, 0]}
      frustumCulled={false}
      matrixAutoUpdate={false}
    />
  );
};
