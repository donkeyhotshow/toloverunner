import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';

/**
 * ParallaxTunnel — Background tunnel with UV-scroll (no mesh movement)
 *
 * STABILITY:
 * - Mesh stays at Z=0; scrolling is purely UV-based in the shader
 * - Breathing pulse is uniform-driven (no scale matrix distortion)
 * - precision highp float in both vertex and fragment shaders
 * - Listens for world:origin-reset to accumulate scroll offset correctly
 */

// UV pattern repeat length in world units (must match shader uScrollScale)
const PATTERN_LENGTH = 200.0;

export const ParallaxTunnel: React.FC<{ totalDistance?: number }> = ({ totalDistance: _totalDistance = 0 }) => {
  const tunnelRef = useRef<THREE.Mesh>(null);

  // Accumulated scroll from floating origin resets
  const scrollAccumRef = useRef(0);

  const tunnelGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(15, 15, 4000, 32, 200, true);
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
        uColor1: { value: new THREE.Color('#C06060') },
        uColor2: { value: new THREE.Color('#804040') },
        uPatternLength: { value: PATTERN_LENGTH },
      },
      vertexShader: `
        precision highp float;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uDistance;
        uniform float uPulse;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uPatternLength;

        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          // UV scroll: modulo over pattern length for seamless tiling
          // uDistance is total world distance traveled
          float scrollV = mod(uDistance, uPatternLength) / uPatternLength;
          uv.y += scrollV;

          // Organic folds pattern
          float pattern = sin(uv.x * 20.0 + sin(uv.y * 10.0)) * 0.5 + 0.5;
          pattern += sin(uv.y * 50.0) * 0.1;

          vec3 color = mix(uColor1, uColor2, pattern);

          // Vignette / Depth effect
          float dist = distance(vUv.x, 0.5);
          color *= smoothstep(0.5, 0.2, dist) * 0.8 + 0.2;

          // Pulsing emissive effect (vitality pulse)
          vec3 pulseColor = color + vec3(1.0, 0.0, 1.0) * uPulse * 0.4;
          float opacity = 0.9 + 0.1 * uPulse;
          gl_FragColor = vec4(pulseColor, opacity);
        }
      `,
    });
  }, []);

  // Listen for floating origin resets — accumulate scroll offset
  useEffect(() => {
    const unsub = (window as unknown as { __eventBus__?: { on: (e: string, h: (d: unknown) => void) => () => void } }).__eventBus__?.on?.(
      'world:origin-reset',
      (data: unknown) => {
        const { offset } = data as { offset: number };
        scrollAccumRef.current += offset;
      }
    );
    return unsub;
  }, []);

  useFrame(({ clock }) => {
    const material = tunnelRef.current?.material as THREE.ShaderMaterial;
    if (!material?.uniforms) return;

    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }

    // Total scroll = store distance + accumulated origin offset
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
