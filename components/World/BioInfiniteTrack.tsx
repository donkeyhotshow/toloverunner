/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BioInfiniteTrack — Infinite road with InstancedMesh pooling
 * Architecture:
 *   - InstancedMesh: 1 draw call for road, 2 for walls
 *   - Ring buffer recycling: segments that pass behind camera move to front
 *   - Shared geometry + material across all instances
 *   - Flat geometry (Y=0) for stable physics
 *   - All visual effects in fragment shader (zero CPU cost)
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  roadVertexShader,
  roadFragmentShader,
} from './shaders/roadShaders';
import {
  wallVertexShader,
  wallFragmentShader,
} from './shaders/wallShaders';

export interface BioInfiniteTrackProps {
  playerZ: number;
  /** Movement speed (units/sec) */
  speed?: number;
  /** Road width */
  width?: number;
  /** Single segment length */
  segmentLength?: number;
  /** Number of segments in pool */
  segmentCount?: number;
  /** Enable tunnel walls */
  enableWalls?: boolean;
  /** Tunnel wall height */
  wallHeight?: number;
}

// ============================================
// GEOMETRY FACTORIES
// ============================================

function createRoadGeometry(
  width: number,
  segmentLength: number,
  segW: number,
  segL: number
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, segmentLength, segW, segL);

  // FORCE Y=0.5 for all vertices (FLAT ROAD)
  const posAttr = geo.attributes.position;
  if (posAttr) {
    const positions = posAttr.array as Float32Array;
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] = 0.5;
    }
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function createWallGeometry(
  height: number,
  segmentLength: number,
  segL: number
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(height, segmentLength, 4, segL);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// Safe Float32Array access
function getPosition(positions: Float32Array, index: number): number {
  return positions[index] ?? 0;
}

// ============================================
// COMPONENT
// ============================================

export const BioInfiniteTrack: React.FC<BioInfiniteTrackProps> = React.memo(
  ({
    playerZ,
    speed = 10,
    width = 12,
    segmentLength = 200,
    segmentCount = 7,
    enableWalls = true,
    wallHeight = 10,
  }) => {
    // --- Config ---
    const segmentsW = 4;
    const segmentsL = 256;
    const wallGap = 0.5;

    // --- Refs ---
    const roadMeshRef = useRef<THREE.InstancedMesh>(null);
    const leftWallRef = useRef<THREE.InstancedMesh>(null);
    const rightWallRef = useRef<THREE.InstancedMesh>(null);

    // Pool positions (use regular array for safe indexing)
    const positionsRef = useRef<number[]>(
      Array.from({ length: segmentCount }, (_, i) => -i * segmentLength)
    );
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // --- Geometries (created once) ---
    const roadGeometry = useMemo(
      () => createRoadGeometry(width, segmentLength, segmentsW, segmentsL),
      [width, segmentLength]
    );

    const wallGeometry = useMemo(
      () => createWallGeometry(wallHeight, segmentLength, segmentsL),
      [wallHeight, segmentLength]
    );

    // --- Materials (created once, shared across instances) ---
    const roadMaterial = useMemo(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: roadVertexShader,
          fragmentShader: roadFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uOffset: { value: 0 },
            uSpeed: { value: speed },
            uColor1: { value: new THREE.Color('#8B00FF') },
            uColor2: { value: new THREE.Color('#9400D3') },
            uColor3: { value: new THREE.Color('#FF69B4') },
            uAccent: { value: new THREE.Color('#00FF88') },
            uBioCyan: { value: new THREE.Color('#E0FFFF') },
            uPulseSpeed: { value: 1.5 },
            uStripeFreq: { value: 20.0 },
            uCellScale: { value: 10.0 },
            uGlossiness: { value: 0.6 },
            uFresnelPower: { value: 3.0 },
            uWaveIntensity: { value: 0.3 },
          },
          side: THREE.DoubleSide,
          depthWrite: true,
          depthTest: true,
        }),
      []
    );

    const wallMaterial = useMemo(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: wallVertexShader,
          fragmentShader: wallFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uOffset: { value: 0 },
            uSpeed: { value: speed },
            uColor1: { value: new THREE.Color('#FF69B4') },
            uColor2: { value: new THREE.Color('#9932CC') },
            uColor3: { value: new THREE.Color('#8B00FF') },
            uAccent: { value: new THREE.Color('#00FF88') },
            uBioCyan: { value: new THREE.Color('#E0FFFF') },
            uPulseSpeed: { value: 1.5 },
            uCellScale: { value: 10.0 },
            uGlossiness: { value: 0.6 },
            uFresnelPower: { value: 3.0 },
            uWaveIntensity: { value: 0.4 },
          },
          side: THREE.FrontSide,
          depthWrite: true,
          depthTest: true,
        }),
      []
    );

    // Cleanup materials on unmount
    useEffect(() => {
      return () => {
        roadMaterial.dispose();
        wallMaterial.dispose();
      };
    }, [roadMaterial, wallMaterial]);

    // --- Init instance matrices ---
    useEffect(() => {
      if (!roadMeshRef.current) return;

      const positions = positionsRef.current;
      for (let i = 0; i < segmentCount; i++) {
        dummy.position.set(0, 0, positions[i]!);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        roadMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      roadMeshRef.current.instanceMatrix.needsUpdate = true;

      // Init walls
      if (leftWallRef.current && rightWallRef.current) {
        const wX = width / 2 + wallGap;
        for (let i = 0; i < segmentCount; i++) {
          dummy.position.set(-wX, wallHeight / 2, positions[i]!);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          leftWallRef.current.setMatrixAt(i, dummy.matrix);

          dummy.position.set(wX, wallHeight / 2, positions[i]!);
          dummy.updateMatrix();
          rightWallRef.current.setMatrixAt(i, dummy.matrix);
        }
        leftWallRef.current.instanceMatrix.needsUpdate = true;
        rightWallRef.current.instanceMatrix.needsUpdate = true;
      }
    }, [segmentCount, width, wallHeight, wallGap, dummy]);

    // --- Game loop ---
    const elapsedRef = useRef(0);

    useFrame((_, delta) => {
      elapsedRef.current += delta;
      const elapsed = elapsedRef.current;

      // Update uniforms — UV scroll driven by elapsed time, not mesh position
      const ru = roadMaterial.uniforms;
      if (ru.uTime) ru.uTime.value = elapsed;
      if (ru.uOffset) ru.uOffset.value = elapsed * speed;
      if (ru.uSpeed) ru.uSpeed.value = speed;

      const wu = wallMaterial.uniforms;
      if (wu.uTime) wu.uTime.value = elapsed;
      if (wu.uOffset) wu.uOffset.value = elapsed * speed;
      if (wu.uSpeed) wu.uSpeed.value = speed;

      // Move segments
      const positions = positionsRef.current;
      let recycled = false;
      const segLen = segmentLength;

      for (let i = 0; i < segmentCount; i++) {
        positions[i] = (positions[i] ?? 0) - speed * delta;

        // Recycle segment that passed behind player
        if ((positions[i] ?? 0) < playerZ - segLen * 2) {
          // Find the furthest segment
          let maxZ = -Infinity;
          for (let j = 0; j < segmentCount; j++) {
            const pz = positions[j] ?? 0;
            if (pz > maxZ) maxZ = pz;
          }
          // Snap-to-grid: eliminate float32 accumulation error on recycle
          const rawPos = maxZ + segLen;
          positions[i] = Math.round(rawPos * 1000) / 1000;
          recycled = true;
        }
      }

      // Only update matrices when recycling occurred
      if (recycled) {
        // Road
        if (roadMeshRef.current) {
          for (let i = 0; i < segmentCount; i++) {
            dummy.position.set(0, 0, positions[i]!);
            dummy.rotation.set(-Math.PI / 2, 0, 0);
            dummy.updateMatrix();
            roadMeshRef.current.setMatrixAt(i, dummy.matrix);
          }
          roadMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // Walls
        if (leftWallRef.current && rightWallRef.current) {
          const wX = width / 2 + wallGap;
          for (let i = 0; i < segmentCount; i++) {
            dummy.position.set(-wX, wallHeight / 2, positions[i]!);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            leftWallRef.current.setMatrixAt(i, dummy.matrix);

            dummy.position.set(wX, wallHeight / 2, positions[i]!);
            dummy.updateMatrix();
            rightWallRef.current.setMatrixAt(i, dummy.matrix);
          }
          leftWallRef.current.instanceMatrix.needsUpdate = true;
          rightWallRef.current.instanceMatrix.needsUpdate = true;
        }
      }
    });

    // --- Wall X position ---
    const wX = width / 2 + wallGap;

    return (
      <group>
        {/* Road — 1 draw call */}
        <instancedMesh
          ref={roadMeshRef}
          args={[roadGeometry, roadMaterial, segmentCount]}
          frustumCulled={false}
        />

        {/* Left wall — 1 draw call */}
        {enableWalls && (
          <instancedMesh
            ref={leftWallRef}
            args={[wallGeometry, wallMaterial, segmentCount]}
            position={[-wX, wallHeight / 2, 0]}
            frustumCulled={false}
          />
        )}

        {/* Right wall — 1 draw call */}
        {enableWalls && (
          <instancedMesh
            ref={rightWallRef}
            args={[wallGeometry, wallMaterial, segmentCount]}
            position={[wX, wallHeight / 2, 0]}
            frustumCulled={false}
          />
        )}
      </group>
    );
  }
);

BioInfiniteTrack.displayName = 'BioInfiniteTrack';
export default BioInfiniteTrack;
