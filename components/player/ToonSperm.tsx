import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CapsuleGeometry,
  SphereGeometry,
  MeshToonMaterial,
  MeshBasicMaterial,
  Mesh,
  Group,
  BackSide,
} from 'three';

export interface ToonSpermProps {
  speed?: number;
  scale?: number;
  isJumping?: boolean;
}

export const ToonSperm: React.FC<ToonSpermProps> = ({
  speed = 1,
  scale = 1,
  isJumping = false,
}) => {
  // Refs for animation targets
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const bodyRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const nucleusRef = useRef<Mesh>(null);
  const glowOuterRef = useRef<Mesh>(null);
  const glowInnerRef = useRef<Mesh>(null);

   // ─── GEOMETRIES (memoized) ───
   const headGeo = useMemo(() => new SphereGeometry(0.5, 32, 32), []);

  const bodyGeo = useMemo(
    () => new SphereGeometry(0.4, 24, 24),
    []
  );

  const nucleusGeo = useMemo(
    () => new SphereGeometry(0.18, 16, 16),
    []
  );

  const eyeGeo = useMemo(
    () => new SphereGeometry(0.075, 16, 16),
    []
  );

  const pupilGeo = useMemo(
    () => new SphereGeometry(0.038, 8, 8),
    []
  );

  const hlGeo = useMemo(
    () => new SphereGeometry(0.018, 6, 6),
    []
  );

  const tailSegmentGeo = useMemo(
    () => new CapsuleGeometry(0.055, 0.14, 4, 8),
    []
  );

  const outerGlowGeo = useMemo(
    () => new SphereGeometry(0.70, 24, 24),
    []
  );

  const innerGlowGeo = useMemo(
    () => new SphereGeometry(0.54, 24, 24),
    []
  );

  // ─── MATERIALS (memoized) ───
  const bodyMat = useMemo(
    () =>
      new MeshToonMaterial({
        color: '#F5F5FF',
        emissive: '#9999EE',
        emissiveIntensity: 0.3,
      }),
    []
  );

  const nucleusMat = useMemo(
    () =>
      new MeshToonMaterial({
        color: '#CC99FF',
        emissive: '#AA55FF',
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
      }),
    []
  );

  const eyeWhiteMat = useMemo(
    () => new MeshBasicMaterial({ color: '#FFFFFF' }),
    []
  );

  const eyeBlackMat = useMemo(
    () => new MeshBasicMaterial({ color: '#111111' }),
    []
  );

  const eyeHlMat = useMemo(
    () => new MeshBasicMaterial({ color: '#FFFFFF' }),
    []
  );

  const tailMat = useMemo(
    () =>
      new MeshToonMaterial({
        color: '#E0E0FF',
        emissive: '#7777CC',
        emissiveIntensity: 0.2,
      }),
    []
  );

  const outerGlowMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#6D28D9',
        transparent: true,
        opacity: 0.20,
        side: BackSide,
        depthWrite: false,
      }),
    []
  );

  const innerGlowMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#A78BFA',
        transparent: true,
        opacity: 0.12,
        side: BackSide,
        depthWrite: false,
      }),
    []
  );

  // ─── ANIMATION LOOP ───
  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;

    // Head animation — subtle bob and rotation (amplitude clamped)
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(time * 2.5) * 0.06;
      headRef.current.position.y = 0.1 + Math.sin(time * 1.8) * 0.03;
    }

    // Nucleus pulse animation — drives emissive intensity
    if (nucleusRef.current) {
      const pulse = Math.sin(time * 5) * 0.5 + 0.5; // 0-1 range
      const pulseScale = 0.92 + pulse * 0.08;
      nucleusRef.current.scale.setScalar(pulseScale);
      // Emissive pulse tied to scale for visual cohesion
      (nucleusMat as MeshToonMaterial).emissiveIntensity = 0.3 + pulse * 0.3;
    }

    // Body emissive pulse — subtle glow breathing
    const bodyPulse = Math.sin(time * 3) * 0.5 + 0.5;
    (bodyMat as MeshToonMaterial).emissiveIntensity = 0.2 + bodyPulse * 0.15;

    // Tail snake-wave animation (14 segments)
    if (tailRef.current) {
      const children = tailRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const mesh = children[i] as Mesh;
        mesh.rotation.z = Math.sin(time * 9 + i * 0.7) * (0.35 + i * 0.04);
        mesh.rotation.x = Math.PI / 2 + Math.cos(time * 6 + i * 0.5) * 0.12;
      }
    }

    // Squash & stretch on body (smooth lerp)
    if (bodyRef.current) {
      if (isJumping) {
        bodyRef.current.scale.y += (0.7 - bodyRef.current.scale.y) * 0.15;
        bodyRef.current.scale.x += (1.3 - bodyRef.current.scale.x) * 0.15;
        bodyRef.current.scale.z += (1.3 - bodyRef.current.scale.z) * 0.15;
      } else {
        bodyRef.current.scale.y += (1.0 - bodyRef.current.scale.y) * 0.1;
        bodyRef.current.scale.x += (1.0 - bodyRef.current.scale.x) * 0.1;
        bodyRef.current.scale.z += (1.0 - bodyRef.current.scale.z) * 0.1;
      }
    }

    // Glow pulse
    if (glowOuterRef.current && glowInnerRef.current) {
      const glowPulse = 0.15 + Math.sin(time * 3) * 0.05;
      (outerGlowMat as MeshBasicMaterial).opacity = glowPulse + 0.05;
      (innerGlowMat as MeshBasicMaterial).opacity = glowPulse * 0.8;
    }
  });

  // ─── RENDER ───
  return (
    <group ref={groupRef} scale={scale} frustumCulled={false}>
      {/* GLOW EFFECTS (2 layers) */}
      <mesh ref={glowOuterRef} geometry={outerGlowGeo} material={outerGlowMat} position={[0, 0.1, 0]} frustumCulled={false} matrixAutoUpdate={false} />
      <mesh ref={glowInnerRef} geometry={innerGlowGeo} material={innerGlowMat} position={[0, 0.1, 0]} frustumCulled={false} matrixAutoUpdate={false} />

      {/* BODY GROUP (squash/stretch target) */}
      <group ref={bodyRef} position={[0, 0, 0]}>
        {/* HEAD */}
        <mesh ref={headRef} geometry={headGeo} material={bodyMat} position={[0, 0.1, -0.05]} frustumCulled={false}>
          {/* NUCLEUS (inside head) */}
          <mesh ref={nucleusRef} geometry={nucleusGeo} material={nucleusMat} position={[0, 0.04, 0]} frustumCulled={false} />

          {/* EYES */}
          {/* Left Eye */}
          <group position={[-0.19, 0.14, 0.38]}>
            <mesh geometry={eyeGeo} material={eyeWhiteMat} frustumCulled={false} matrixAutoUpdate={false}>
              <mesh geometry={pupilGeo} material={eyeBlackMat} position={[0.01, -0.01, 0.04]} frustumCulled={false} matrixAutoUpdate={false} />
              <mesh geometry={hlGeo} material={eyeHlMat} position={[-0.02, 0.03, 0.07]} frustumCulled={false} matrixAutoUpdate={false} />
            </mesh>
          </group>
          {/* Right Eye */}
          <group position={[0.19, 0.14, 0.38]}>
            <mesh geometry={eyeGeo} material={eyeWhiteMat} frustumCulled={false} matrixAutoUpdate={false}>
              <mesh geometry={pupilGeo} material={eyeBlackMat} position={[0.01, -0.01, 0.04]} frustumCulled={false} matrixAutoUpdate={false} />
              <mesh geometry={hlGeo} material={eyeHlMat} position={[-0.02, 0.03, 0.07]} frustumCulled={false} matrixAutoUpdate={false} />
            </mesh>
          </group>
        </mesh>

        {/* BODY SPHERE */}
        <mesh geometry={bodyGeo} material={bodyMat} position={[0, -0.3, 0]} frustumCulled={false} matrixAutoUpdate={false} />
      </group>

      {/* TAIL (14 segments extending +Z toward camera) */}
      <group ref={tailRef} position={[0, 0.1, 0]}>
        {Array.from({ length: 14 }, (_, i) => {
          const taper = Math.pow(0.87, i);
          return (
            <mesh
              key={i}
              geometry={tailSegmentGeo}
              material={tailMat}
              position={[0, 0, 0.50 + i * 0.17]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[taper, taper, taper]}
              frustumCulled={false}
            />
          );
        })}
      </group>
    </group>
  );
};

export default ToonSperm;
