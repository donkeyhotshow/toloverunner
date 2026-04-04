import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface FogMaskProps {
  fogColor?: string;
  fogDensity?: number;
  biomeColor?: string;
}

export const FogMask: React.FC<FogMaskProps> = ({
  fogColor = '#2E1065',
  fogDensity = 0.035,
  biomeColor,
}) => {
  const fogRef = useRef<THREE.FogExp2>(null);
  const vignetteRef = useRef<THREE.Mesh>(null);
  const clock = useRef(new THREE.Clock());

  useFrame(() => {
    const time = clock.current.getElapsedTime();
    
    // Плавная смена цвета тумана при смене биома
    if (fogRef.current && biomeColor) {
      const targetColor = new THREE.Color(biomeColor);
      fogRef.current.color.lerp(targetColor, 0.02);
    }
    
    // Пульсация плотности для "живого" эффекта
    if (fogRef.current) {
      fogRef.current.density = fogDensity + Math.sin(time * 0.5) * 0.005;
    }
  });

  return (
    <>
      {/* Туман */}
      <fogExp2
        ref={fogRef}
        attach="fog"
        args={[fogColor, fogDensity]}
      />

      {/* Виньетка по краям экрана */}
      <mesh ref={vignetteRef} position={[0, 0, -50]} frustumCulled={false}>
        <circleGeometry args={[50, 64]} />
        <shaderMaterial
          transparent
          side={THREE.DoubleSide}
          uniforms={{
            uColor: { value: new THREE.Color(fogColor) },
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
              float dist = length(vUv - 0.5) * 2.0;
              float alpha = smoothstep(0.6, 1.0, dist);
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>
    </>
  );
};

export default FogMask;