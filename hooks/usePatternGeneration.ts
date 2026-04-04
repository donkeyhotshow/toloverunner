import { useMemo } from 'react';
import * as THREE from 'three';

export const usePatternGeneration = (trackLength: number, segmentLength: number) => {
  const roadGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, segmentLength, 1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [segmentLength]);

  const poolSize = Math.ceil(trackLength / segmentLength);
  
  const segments = useMemo(() => {
    return Array.from({ length: poolSize }, (_, i) => ({
      id: i,
      baseZ: -i * segmentLength,
    }));
  }, [poolSize, segmentLength]);

  return {
    roadGeometry,
    segments,
    poolSize,
  };
};
