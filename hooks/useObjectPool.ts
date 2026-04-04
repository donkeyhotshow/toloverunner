/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * useObjectPool — Ring buffer for InstancedMesh segment recycling
 * Zero allocation after init — only matrix updates on recycle
 */

import { useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';

interface PoolState {
  positions: number[];
  needsUpdate: boolean;
  recycleCount: number;
}

export function useObjectPool(
  segmentCount: number,
  segmentLength: number,
  speed: number
) {
  const stateRef = useRef<PoolState>({
    positions: Array.from({ length: segmentCount }, (_, i) => -i * segmentLength),
    needsUpdate: true,
    recycleCount: 0,
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const update = useCallback(
    (delta: number, playerZ: number): boolean => {
      const state = stateRef.current;
      const positions = state.positions;
      let recycled = false;

      for (let i = 0; i < segmentCount; i++) {
        positions[i] = (positions[i] ?? 0) - speed * delta;

        if ((positions[i] ?? 0) < playerZ - segmentLength * 2) {
          let maxZ = -Infinity;
          for (let j = 0; j < segmentCount; j++) {
            const pz = positions[j] ?? 0;
            if (pz > maxZ) maxZ = pz;
          }
          positions[i] = maxZ + segmentLength;
          recycled = true;
          state.recycleCount++;
        }
      }

      state.needsUpdate = recycled;
      return recycled;
    },
    [segmentCount, segmentLength, speed]
  );

  const applyToMesh = useCallback(
    (mesh: THREE.InstancedMesh | null, rotation?: THREE.Euler, posX?: number, posY?: number) => {
      if (!mesh) return;
      const state = stateRef.current;

      for (let i = 0; i < segmentCount; i++) {
        dummy.position.set(posX ?? 0, posY ?? 0, state.positions[i] ?? 0);
        if (rotation) dummy.rotation.copy(rotation);
        else dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      state.needsUpdate = false;
    },
    [segmentCount, dummy]
  );

  const needsUpdate = useCallback((): boolean => {
    return stateRef.current.needsUpdate;
  }, []);

  const getRecycleCount = useCallback((): number => {
    return stateRef.current.recycleCount;
  }, []);

  return { update, applyToMesh, needsUpdate, getRecycleCount };
}
