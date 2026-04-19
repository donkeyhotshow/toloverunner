import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimState } from './PlayerController';

export interface ToonSpermProps {
  speed?: number;
  scale?: number;
  isJumping?: boolean;
  animState?: React.MutableRefObject<AnimState>;
  landSquash?: React.MutableRefObject<number>;
  lateralTilt?: React.MutableRefObject<number>;
}

const TAIL_COUNT = 18;
const SEG_SPACING = 0.19;
const HIST_SIZE = 120;

export const ToonSperm: React.FC<ToonSpermProps> = ({
  speed = 1,
  scale = 1,
  isJumping = false,
  animState,
  landSquash,
  lateralTilt,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const tailGroupRef = useRef<THREE.Group>(null);
  const tailSegRefs = useRef<(THREE.Mesh | null)[]>(Array(TAIL_COUNT).fill(null));

  // History buffer for chain-follow tail
  const xHistRef = useRef(new Float32Array(HIST_SIZE));
  const yHistRef = useRef(new Float32Array(HIST_SIZE));
  const histPtrRef = useRef(0);

  // ── GEOMETRIES ──
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.52, 32, 32), []);
  const headOutlineGeo = useMemo(() => new THREE.SphereGeometry(0.52, 32, 32), []);
  const eyeGeo = useMemo(() => new THREE.SphereGeometry(0.09, 16, 16), []);
  const pupilGeo = useMemo(() => new THREE.SphereGeometry(0.048, 10, 10), []);
  const hlGeo = useMemo(() => new THREE.SphereGeometry(0.022, 8, 8), []);
  // Tail segments — round spheres, tapered
  const tailGeos = useMemo(
    () =>
      Array.from({ length: TAIL_COUNT }, (_, i) => {
        const r = 0.18 * Math.pow(0.88, i);
        return new THREE.SphereGeometry(r, 14, 10);
      }),
    []
  );

  // ── MATERIALS ──
  // White toon body
  const bodyMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#FFFFFF',
        emissive: '#DDDDFF',
        emissiveIntensity: 0.05,
      }),
    []
  );

  // Black outline — BackSide, scale up slightly
  const outlineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#000000',
        side: THREE.BackSide,
      }),
    []
  );

  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), []);
  const eyeBlackMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#111111' }), []);
  const eyeHlMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), []);

  // Tail material — white, matching body
  const tailMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#FFFFFF',
        emissive: '#CCCCFF',
        emissiveIntensity: 0.04,
      }),
    []
  );

  // ── ANIMATION LOOP ──
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const spd = Math.max(speed, 0.5);

    // Push current lateral offset into history
    const lx = (lateralTilt?.current ?? 0);
    const ptr = (histPtrRef.current + 1) % HIST_SIZE;
    histPtrRef.current = ptr;
    xHistRef.current[ptr] = lx;
    // Vertical bob of head
    const headBob = Math.sin(t * 2.2 * spd) * 0.04;
    yHistRef.current[ptr] = headBob;

    // Head gentle bob
    if (headRef.current) {
      headRef.current.position.y = 0.0 + headBob;
      headRef.current.rotation.z = Math.sin(t * 2.0 * spd) * 0.05;
    }

    // Squash & stretch on body group
    if (bodyRef.current) {
      const anim = animState?.current ?? (isJumping ? 'jump' : 'run');
      const squeeze = landSquash?.current ?? 0;

      let targetScaleY = 1.0;
      let targetScaleXZ = 1.0;

      if (anim === 'jump') {
        targetScaleY = 1.3;
        targetScaleXZ = 0.8;
      } else if (anim === 'fall') {
        targetScaleY = 0.92;
        targetScaleXZ = 1.08;
      } else if (anim === 'land' && squeeze > 0) {
        targetScaleY = 1.0 - squeeze * 0.4;
        targetScaleXZ = 1.0 + squeeze * 0.45;
      }

      const lerpF = anim === 'land' ? 0.25 : 0.12;
      bodyRef.current.scale.y += (targetScaleY - bodyRef.current.scale.y) * lerpF;
      bodyRef.current.scale.x += (targetScaleXZ - bodyRef.current.scale.x) * lerpF;
      bodyRef.current.scale.z += (targetScaleXZ - bodyRef.current.scale.z) * lerpF;

      // Lean into lateral movement
      const tilt = lx * 0.13;
      bodyRef.current.rotation.z = -tilt;
    }

    // ── TAIL CHAIN FOLLOW ──
    // Each segment reads from history with increasing delay
    // This makes the tail "follow behind" the head with lag
    if (tailGroupRef.current) {
      let prevX = 0;
      let prevY = 0;
      let prevZ = 0;

      for (let i = 0; i < TAIL_COUNT; i++) {
        const seg = tailSegRefs.current[i];
        if (!seg) continue;

        // How many frames behind: each segment is 5 frames behind the previous
        const delay = (i + 1) * 5;
        const histI = ((ptr - delay) % HIST_SIZE + HIST_SIZE) % HIST_SIZE;
        const sampledLX = xHistRef.current[histI];
        const sampledBob = yHistRef.current[histI];

        // Convert lateral offset to X displacement (scaled by how far back)
        const relX = (sampledLX - lx) * 1.4;
        const relY = sampledBob * (1 - i * 0.05);

        // Position: extend behind head (+Z = toward camera)
        const segZ = 0.35 + i * SEG_SPACING;
        const segX = relX;
        const segY = relY;

        seg.position.set(segX, segY, segZ);

        // Rotate each segment to point TOWARD the previous segment
        // (creates smooth curved spine)
        if (i === 0) {
          const dx = segX - 0;
          const dy = segY - (headRef.current?.position.y ?? 0);
          const dz = segZ - 0;
          seg.rotation.z = Math.atan2(dx, dz) * 0.6;
          seg.rotation.x = Math.atan2(dy, dz) * 0.6 + Math.PI / 2;
        } else {
          const dx = segX - prevX;
          const dy = segY - prevY;
          const dz = segZ - prevZ;
          seg.rotation.z = Math.atan2(dx, dz) * 0.8;
          seg.rotation.x = Math.atan2(dy, dz) * 0.8 + Math.PI / 2;
        }

        prevX = segX;
        prevY = segY;
        prevZ = segZ;
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale} frustumCulled={false}>
      {/* BODY GROUP */}
      <group ref={bodyRef}>

        {/* HEAD — white sphere with black outline */}
        <mesh ref={headRef} geometry={headGeo} material={bodyMat} position={[0, 0.0, -0.05]} frustumCulled={false}>

          {/* Black outline */}
          <mesh geometry={headOutlineGeo} material={outlineMat} scale={[1.10, 1.10, 1.10]} frustumCulled={false} />

          {/* Left eye */}
          <group position={[-0.20, 0.15, 0.40]}>
            <mesh geometry={eyeGeo} material={eyeWhiteMat} frustumCulled={false}>
              <mesh geometry={pupilGeo} material={eyeBlackMat} position={[0.01, -0.015, 0.06]} frustumCulled={false} />
              <mesh geometry={hlGeo} material={eyeHlMat} position={[-0.025, 0.035, 0.08]} frustumCulled={false} />
            </mesh>
          </group>

          {/* Right eye */}
          <group position={[0.20, 0.15, 0.40]}>
            <mesh geometry={eyeGeo} material={eyeWhiteMat} frustumCulled={false}>
              <mesh geometry={pupilGeo} material={eyeBlackMat} position={[0.01, -0.015, 0.06]} frustumCulled={false} />
              <mesh geometry={hlGeo} material={eyeHlMat} position={[-0.025, 0.035, 0.08]} frustumCulled={false} />
            </mesh>
          </group>
        </mesh>

      </group>

      {/* TAIL — chain-following segments */}
      <group ref={tailGroupRef} position={[0, 0, 0]}>
        {Array.from({ length: TAIL_COUNT }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => { tailSegRefs.current[i] = el; }}
            geometry={tailGeos[i]}
            material={tailMat}
            frustumCulled={false}
          >
            {/* Outline on each tail segment */}
            <mesh
              geometry={tailGeos[i]}
              material={outlineMat}
              scale={[1.15, 1.15, 1.15]}
              frustumCulled={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export default ToonSperm;
