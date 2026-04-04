/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ParticleSystem - Background particle effects
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Vector3, Color, InstancedMesh, RepeatWrapping, Object3D, MeshBasicMaterial } from 'three';
import { RootState } from '@react-three/fiber';
import { useTexture, TextureType } from '../System/useTexture';
import { safeDeltaTime } from '../../utils/safeMath';
import { SAFETY_CONFIG } from '../../constants';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { scheduleMatrixUpdate, scheduleColorUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

const shouldDisableParticles = () => {
  try {
    const perf = getPerformanceManager();
    const win = window as unknown as { __TOLOVERUNNER_MINIMAL_RENDER__?: boolean };
    if (typeof win.__TOLOVERUNNER_MINIMAL_RENDER__ !== 'undefined' && win.__TOLOVERUNNER_MINIMAL_RENDER__ === true) return true;
    if (perf.getCurrentQuality && perf.getCurrentQuality() === QualityLevel.LOW) return true;
  } catch { }
  return false;
};

const COUNT = Math.min(80, SAFETY_CONFIG.MAX_PARTICLES); // Increased to support 40+ burst count
const GRAVITY = -18;

interface ParticleBurstEvent extends CustomEvent {
  detail: {
    position: [number, number, number];
    color?: string;
    type: 'hit' | 'powerup' | 'dust' | 'combat-kill';
    count?: number;
  };
}

interface Particle {
  active: boolean;
  pos: Vector3;
  vel: Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: Color;
}

export const ParticleSystem: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const lastActiveCountRef = useRef(0);

  // Упрощенная загрузка - только одна текстура
  const particleTexture = useTexture(TextureType.FX_PARTICLE, {
    repeat: [1, 1],
    wrapS: RepeatWrapping,
    wrapT: RepeatWrapping
  });

  // Упрощенный пул частиц - только базовые свойства
  const particles = useRef<Particle[]>(Array.from({ length: COUNT }, () => ({
    active: false,
    pos: new Vector3(),
    vel: new Vector3(),
    life: 0,
    maxLife: 1,
    scale: 1,
    color: new Color()
  })));

  const dummy = useMemo(() => new Object3D(), []);

  // Use useState for material to ensure stability without re-renders on property mutation
  // Use useMemo for material to allow safe mutation
  const material = useMemo(() => {
    const mat = new MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      toneMapped: false
    });

    // Apply texture if loaded
    if (particleTexture) {
      mat.map = particleTexture;
    }

    return mat;
  }, [particleTexture]);

  useEffect(() => {
    const handleBurst = (e: Event) => {
      const burstEvent = e as ParticleBurstEvent;
      const { position, color, type, count = 12 } = burstEvent.detail;
      if (type === 'dust') return; // Disable smoke/dust effect
      const [px, py, pz] = position || [0, 0, 0];

      let spawned = 0;
      for (let i = 0; i < COUNT; i++) {
        if (spawned >= count) break;
        const p = particles.current[i];
        if (!p || p.active) continue;

        p.active = true;
        p.life = 0;
        p.pos.set(px, py, pz);
        p.color.set(color || 'white');

        // Упрощенная логика частиц - единый тип для всех
        const speed = type === 'hit' ? 6 : type === 'combat-kill' ? 12 : type === 'powerup' ? 3 : 2;
        p.vel.set(
          (Math.random() - 0.5) * speed,
          (type === 'dust' as any) ? 0.5 + Math.random() : (Math.random() - 0.5) * (speed * 0.8),
          (Math.random() - 0.5) * speed
        );
        p.maxLife = type === 'hit' ? 0.5 : type === 'combat-kill' ? 0.4 : type === 'powerup' ? 0.6 : 0.4;
        p.scale = type === 'combat-kill' ? 0.6 + Math.random() * 0.5 : 0.5 + Math.random() * 0.3;
        p.color.set(color || (type === 'combat-kill' ? '#00ffff' : '#ffffff'));

        spawned++;
      }
    };

    window.addEventListener('particle-burst', handleBurst);
    return () => window.removeEventListener('particle-burst', handleBurst);
  }, []);

  const planeGeo = useMemo(() => getGeometryPool().getPlaneGeometry(0.35, 0.35), []);

  useEffect(() => {
    const callback = (delta: number, _time: number, state: RootState) => {
      const perfManager = getPerformanceManager();

      // Early exit if particles are disabled for performance
      if (shouldDisableParticles()) {
        if (meshRef.current && lastActiveCountRef.current > 0) {
          // Hide all particles if they were active
          for (let i = 0; i < COUNT; i++) {
            dummy.position.set(0, -999, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
          }
          scheduleMatrixUpdate(meshRef.current);
          lastActiveCountRef.current = 0;
        }
        return;
      }

      perfManager.beginSystem('particles');

      const mesh = meshRef.current;
      if (!mesh) {
        perfManager.endSystem('particles');
        return;
      }

      const safeDt = safeDeltaTime(delta, SAFETY_CONFIG.MAX_DELTA_TIME, SAFETY_CONFIG.MIN_DELTA_TIME);
      const cameraPos = state.camera.position;
      const particleArr = particles.current;

      let activeCount = 0;
      let hasActiveParticles = false;

      // Pre-compute air resistance factor
      const airResistance = Math.pow(0.96, safeDt * 60); // Frame-rate independent
      const gravityDelta = GRAVITY * safeDt;

      for (let i = 0; i < COUNT; i++) {
        const p = particleArr[i];
        if (!p) continue;

        if (!p.active) {
          // Only update matrix if this particle was previously active
          if (lastActiveCountRef.current > i || i < activeCount) {
            dummy.position.set(0, -999, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
          continue;
        }

        // Physics update
        p.life += safeDt;
        if (p.life >= p.maxLife) {
          p.active = false;
          // Hide immediately
          dummy.position.set(0, -999, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        // Velocity update (frame-rate independent)
        p.vel.y += gravityDelta;
        p.vel.multiplyScalar(airResistance);
        p.pos.addScaledVector(p.vel, safeDt);

        // Ground collision
        if (p.pos.y < 0.1) {
          p.pos.y = 0.1;
          p.vel.y *= -0.3;
          p.vel.x *= 0.9;
          p.vel.z *= 0.9;
        }

        // Render - simplified billboard
        const fade = 1.0 - (p.life / p.maxLife);
        const currentScale = p.scale * fade;

        dummy.position.copy(p.pos);
        dummy.lookAt(cameraPos);
        dummy.scale.setScalar(currentScale);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, p.color);
        activeCount++;
        hasActiveParticles = true;
      }

      // Only schedule updates if we have active particles or count changed
      if (hasActiveParticles || lastActiveCountRef.current !== activeCount) {
        scheduleMatrixUpdate(mesh);
        if (mesh.instanceColor) scheduleColorUpdate(mesh);
        lastActiveCountRef.current = activeCount;
      }

      perfManager.endSystem('particles');
    };

    registerGameLoopCallback('renderUpdate', callback);
    return () => {
      unregisterGameLoopCallback('renderUpdate', callback);
      getGeometryPool().release(planeGeo);
      safeDispose(material);
    };
  }, [planeGeo, material, dummy]);



  return (
    <instancedMesh ref={meshRef} args={[planeGeo, material, COUNT]} frustumCulled={false} />
  );
};
export default ParticleSystem;
