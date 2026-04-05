import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface TunnelChunk {
  position: number;
  mesh: THREE.InstancedMesh | null;
  active: boolean;
}

export interface TunnelSystemProps {
  playerZ: number;
  chunkSize?: number;
  renderDistance?: number;
}

export const TunnelSystem: React.FC<TunnelSystemProps> = ({
  playerZ,
  chunkSize = 100,
  renderDistance = 2000,
}) => {
  const chunkRefs = useRef<Map<number, THREE.InstancedMesh>>(new Map());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const clock = useRef(new THREE.Clock());

  const _CHUNK_COUNT = Math.ceil((renderDistance * 2) / chunkSize);

  useFrame(() => {
    const _time = clock.current.getElapsedTime();
    const currentChunk = Math.floor(playerZ / chunkSize);
    
    // Активные чанки вокруг игрока
    const minChunk = currentChunk - Math.floor(renderDistance / chunkSize);
    const maxChunk = currentChunk + Math.floor(renderDistance / chunkSize);

    // Удаляем невидимые чанки
    for (const [key, mesh] of chunkRefs.current) {
      if (key < minChunk || key > maxChunk) {
        mesh.visible = false;
        chunkRefs.current.delete(key);
      } else {
        mesh.visible = true;
      }
    }

    // Создаем новые чанки
    for (let i = minChunk; i <= maxChunk; i++) {
      if (!chunkRefs.current.has(i)) {
        createChunk(i);
      }
    }
  });

  const createChunk = (chunkIndex: number) => {
    const positionZ = chunkIndex * chunkSize;
    
    // Создаем InstancedMesh для чанка
    const segmentCount = 10;
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(8, 8, chunkSize / segmentCount, 16, 1, true),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color('#5b21b6') },
          uColor2: { value: new THREE.Color('#2e1065') },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying vec2 vUv;
          void main() {
            float pattern = step(0.5, fract(vUv.x * 16.0));
            vec3 color = mix(uColor2, uColor1, pattern);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.BackSide,
      }),
      segmentCount
    );

    // Позиционируем сегменты
    for (let i = 0; i < segmentCount; i++) {
      dummy.position.set(0, 0, positionZ + i * (chunkSize / segmentCount));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false; // Отключаем для стабильности
    
    chunkRefs.current.set(chunkIndex, mesh);
  };

  return (
    <group>
      {Array.from(chunkRefs.current.values()).map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  );
};

export default TunnelSystem;