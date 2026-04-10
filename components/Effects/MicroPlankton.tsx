import React, { useRef, useMemo } from 'react';
import { InstancedMesh, Object3D, MeshBasicMaterial, AdditiveBlending, SphereGeometry } from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { useBiomeTransition } from '../../hooks/useBiomeManager';

const COUNT = 500;
const RANGE_Z = 150;
const RANGE_X = 40;
const RANGE_Y = 30;

interface Particle {
    x: number; y: number; z: number;
    speed: number; size: number; phase: number; vSpeed: number;
}

function initParticles(): Particle[] {
    const arr: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
        arr.push({
            x: (Math.random() - 0.5) * RANGE_X,
            y: (Math.random() - 0.5) * RANGE_Y,
            z: Math.random() * -RANGE_Z,
            speed: 0.2 + Math.random() * 0.8,
            size: 0.03 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2,
            vSpeed: 0.1 + Math.random() * 0.2,
        });
    }
    return arr;
}

export const MicroPlankton: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const { colors } = useBiomeTransition();

    // useRef instead of useState: no re-render on mutation, no GC pressure
    const particlesRef = useRef<Particle[]>(null as unknown as Particle[]);
    if (!particlesRef.current) particlesRef.current = initParticles();

    // Reuse single Object3D across all frames - zero GC
    const dummy = useMemo(() => new Object3D(), []);
    const material = useMemo(() => new MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
        depthWrite: false,
    }), []);
    const geo = useMemo(() => new SphereGeometry(1, 4, 4), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const store = useStore.getState();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerZ = (store as any).localPlayerState?.position[2] ?? 0;
        const speed = store.speed || 30;
        const time = state.clock.elapsedTime;

        material.color.lerp(colors.accent, 0.05);

        const particles = particlesRef.current;
        // for-loop avoids closure allocation per iteration
        for (let i = 0; i < COUNT; i++) {
            const p = particles[i];

            const offsetY = Math.sin(time * p.vSpeed + p.phase) * 0.2;
            const offsetX = Math.cos(time * p.vSpeed * 0.8 + p.phase) * 0.2;

            p.z -= p.speed * delta * 5;

            const relativeZ = p.z - playerZ;
            if (relativeZ > 20) {
                p.z -= RANGE_Z;
                p.x = (Math.random() - 0.5) * RANGE_X;
                p.y = (Math.random() - 0.5) * RANGE_Y;
            } else if (relativeZ < -RANGE_Z + 20) {
                p.z += RANGE_Z;
            }

            dummy.position.set(p.x + offsetX, p.y + offsetY, p.z);
            const stretch = 1.0 + speed / 20.0;
            dummy.scale.set(p.size, p.size, p.size * stretch);
            dummy.lookAt(p.x + offsetX, p.y + offsetY, p.z - 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[geo, material, COUNT]} frustumCulled={false} />
    );
};
