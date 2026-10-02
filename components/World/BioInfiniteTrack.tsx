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
} from './shaders/roadShaders';import {
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

  // PlaneGeometry is authored in the XY plane: local X is road width and
  // local Y is track length. The instance matrix rotates it onto XZ while
  // preserving the full segment length; collapsing local Y would create a
  // degenerate line and make the road disappear.
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function createWallGeometry(
  height: number,
  segmentLength: number,
  segL: number
): THREE.BoxGeometry {
  // A thin box keeps the tunnel walls physically side-on to the road. A plane
  // can become a camera-facing billboard when its instanced rotation changes.
  const geo = new THREE.BoxGeometry(0.6, height, segmentLength, 1, 4, segL);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// Safe Float32Array access
function _getPosition(positions: Float32Array, index: number): number {
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
    wallHeight = 6,
  }) => {
    // --- Config ---
    const segmentsW = 4;
    // The road shaders provide the visual detail; keep geometry subdivisions
    // low so the infinite track does not dominate startup or frame time.
    const segmentsL = 64;
    const wallGap = 0.5;
    // Keep the visual road on the same ground plane as physics.groundY = 0.
    const roadLift = 0.02;

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
            uColor1: { value: new THREE.Color('#17162D') },
            uColor2: { value: new THREE.Color('#342458') },
            uColor3: { value: new THREE.Color('#5B3C84') },
            uAccent: { value: new THREE.Color('#67E8F9') },
            uBioCyan: { value: new THREE.Color('#FF6FB5') },
            uPulseSpeed: { value: 1.5 },
            uStripeFreq: { value: 20.0 },
            uCellScale: { value: 10.0 },
            uGlossiness: { value: 0.6 },
            uFresnelPower: { value: 3.0 },
            uWaveIntensity: { value: 0.3 },
            uCameraPos: { value: new THREE.Vector3() },
          },
          side: THREE.DoubleSide,
          depthWrite: true,
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
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
            uColor1: { value: new THREE.Color('#C06878') },
            uColor2: { value: new THREE.Color('#D8908A') },
            uColor3: { value: new THREE.Color('#E8B090') },
            uAccent: { value: new THREE.Color('#F5C4A8') },
            uBioCyan: { value: new THREE.Color('#7A1A2A') },
            uPulseSpeed: { value: 1.5 },
            uCellScale: { value: 5.0 },
            uGlossiness: { value: 0.3 },
            uFresnelPower: { value: 2.0 },
            uWaveIntensity: { value: 0.2 },
          },
          side: THREE.DoubleSide,
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
        dummy.position.set(0, 0.5 + roadLift, positions[i]!);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        roadMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      roadMeshRef.current.instanceMatrix.needsUpdate = true;

      // Init walls — instance matrices define full placement (no offset on the
      // parent instancedMesh), rotated to stand vertically facing inward.
      if (leftWallRef.current && rightWallRef.current) {
        const wX = width / 2 + wallGap;
        for (let i = 0; i < segmentCount; i++) {
          dummy.position.set(-wX, wallHeight / 2, positions[i]!);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          leftWallRef.current.setMatrixAt(i, dummy.matrix);

          dummy.position.set(wX, wallHeight / 2, positions[i]!);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          rightWallRef.current.setMatrixAt(i, dummy.matrix);
        }
        leftWallRef.current.instanceMatrix.needsUpdate = true;
        rightWallRef.current.instanceMatrix.needsUpdate = true;
      }
    }, [segmentCount, width, wallHeight, wallGap, roadLift, dummy]);

    // --- Game loop ---
    const elapsedRef = useRef(0);

    useFrame(({ camera }, rawDelta) => {
      // A tab switch or debugger pause can produce a multi-second delta. Clamp
      // it so the track cannot teleport through several recycle boundaries.
      const delta = Math.min(rawDelta, 1 / 20);
      elapsedRef.current += delta;
      const elapsed = elapsedRef.current;

      // Update uniforms — UV scroll driven by elapsed time, not mesh position
      const ru = roadMaterial.uniforms;
      if (ru.uTime) ru.uTime.value = elapsed;
      if (ru.uOffset) ru.uOffset.value = elapsed * speed;
      if (ru.uSpeed) ru.uSpeed.value = speed;
      if (ru.uCameraPos) ru.uCameraPos.value.copy(camera.position);

      const wu = wallMaterial.uniforms;
      if (wu.uTime) wu.uTime.value = elapsed;
      if (wu.uOffset) wu.uOffset.value = elapsed * speed;
      if (wu.uSpeed) wu.uSpeed.value = speed;

      // Move segments and calculate the recycle target once per frame.
      const positions = positionsRef.current;
      const segLen = segmentLength;
      const movement = speed * delta;
      let maxZ = -Infinity;
      for (let i = 0; i < segmentCount; i++) {
        const nextZ = (positions[i] ?? 0) - movement;
        positions[i] = nextZ;
        if (nextZ > maxZ) maxZ = nextZ;
      }

      for (let i = 0; i < segmentCount; i++) {
        if ((positions[i] ?? 0) < playerZ - segLen * 2) {
          // Snap-to-grid: eliminate float32 accumulation error on recycle.
          positions[i] = Math.round((maxZ + segLen) * 1000) / 1000;
          maxZ = positions[i]!;
        }
      }

      // Keep matrices synchronized with the moving segment positions. Updating
      // only on recycle leaves the visible road frozen between recycle events.
      if (roadMeshRef.current) {
        for (let i = 0; i < segmentCount; i++) {
          dummy.position.set(0, 0.5 + roadLift, positions[i]!);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.updateMatrix();
          roadMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
        roadMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      if (leftWallRef.current && rightWallRef.current) {
        const wX = width / 2 + wallGap;
        for (let i = 0; i < segmentCount; i++) {
          dummy.position.set(-wX, wallHeight / 2, positions[i]!);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          leftWallRef.current.setMatrixAt(i, dummy.matrix);

          dummy.position.set(wX, wallHeight / 2, positions[i]!);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          rightWallRef.current.setMatrixAt(i, dummy.matrix);
        }
        leftWallRef.current.instanceMatrix.needsUpdate = true;
        rightWallRef.current.instanceMatrix.needsUpdate = true;
      }
    });

    return (
      <group>
        {/* Road — 1 draw call */}
        <instancedMesh
          ref={roadMeshRef}
          args={[roadGeometry, roadMaterial, segmentCount]}
          frustumCulled={false}
        />

        {/* Left wall — 1 draw call (placement fully defined by instance matrices) */}
        {enableWalls && (
          <instancedMesh
            ref={leftWallRef}
            args={[wallGeometry, wallMaterial, segmentCount]}
            frustumCulled={false}
          />
        )}

        {/* Right wall — 1 draw call (placement fully defined by instance matrices) */}
        {enableWalls && (
          <instancedMesh
            ref={rightWallRef}
            args={[wallGeometry, wallMaterial, segmentCount]}
            frustumCulled={false}
          />
        )}
      </group>
    );
  }
);

BioInfiniteTrack.displayName = 'BioInfiniteTrack';
export default BioInfiniteTrack;
