/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Vector3, Points, BufferGeometry, PointsMaterial, NormalBlending, Float32BufferAttribute } from 'three';
import { safeDeltaTime } from '../../utils/safeMath';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';

interface DustParticle {
    position: [number, number, number];
    velocity: [number, number, number];
    life: number;
    size: number;
}

export interface DustCloudsHandle {
    spawn: (position: Vector3) => void;
}

export const DustClouds = forwardRef<DustCloudsHandle>((_, ref) => {
    const pointsRef = useRef<Points>(null);
    const particles = useRef<DustParticle[]>([]);
    const MAX_PARTICLES = 100;

    const positionsBuffer = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 3));
    const colorsBuffer = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 3));
    const sizesBuffer = useRef<Float32Array>(new Float32Array(MAX_PARTICLES));

    const geometry = useMemo(() => new BufferGeometry(), []);
    const material = useMemo(() => new PointsMaterial({
        size: 1.0,
        transparent: true,
        opacity: 0.6,
        color: '#ffffff',
        blending: NormalBlending,
        depthWrite: false,
        sizeAttenuation: true
    }), []);

    useEffect(() => {
        return () => {
            safeDispose(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        geometry.setAttribute('position', new Float32BufferAttribute(positionsBuffer.current, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colorsBuffer.current, 3));
        geometry.setAttribute('size', new Float32BufferAttribute(sizesBuffer.current, 1));
    }, [geometry]);

    const spawn = useCallback((position: Vector3) => {
        for (let i = 0; i < 10; i++) {
            if (particles.current.length >= MAX_PARTICLES) return;
            particles.current.push({
                position: [position.x, position.y, position.z],
                velocity: [
                    (Math.random() - 0.5) * 4.0,
                    Math.random() * 2.0,
                    (Math.random() - 0.5) * 2.0
                ],
                life: 1.0,
                size: 0.5 + Math.random() * 1.0
            });
        }
    }, []);

    useImperativeHandle(ref, () => ({ spawn }));

    useEffect(() => {
        const callback = (delta: number) => {
            const safeDelta = safeDeltaTime(delta);

            // Update particles
            for (let i = particles.current.length - 1; i >= 0; i--) {
                const p = particles.current[i];
                if (!p) continue;

                p.life -= safeDelta * 2.0;

                if (p.life <= 0) {
                    particles.current.splice(i, 1);
                    continue;
                }

                p.position[0] += p.velocity[0] * safeDelta;
                p.position[1] += p.velocity[1] * safeDelta;
                p.position[2] += p.velocity[2] * safeDelta;
                p.velocity[0] *= 0.9;
                p.velocity[1] *= 0.9;
                p.velocity[2] *= 0.9;
            }

            // Update buffers
            const count = particles.current.length;
            for (let i = 0; i < count; i++) {
                const p = particles.current[i];
                if (!p) continue;
                const i3 = i * 3;
                positionsBuffer.current[i3] = p.position[0];
                positionsBuffer.current[i3 + 1] = p.position[1];
                positionsBuffer.current[i3 + 2] = p.position[2];

                const alpha = p.life;
                colorsBuffer.current[i3] = 1;
                colorsBuffer.current[i3 + 1] = 1;
                colorsBuffer.current[i3 + 2] = 1;

                sizesBuffer.current[i] = p.size * alpha;
            }

            if (pointsRef.current && geometry.attributes.position && geometry.attributes.size) {
                geometry.setDrawRange(0, count);
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.size.needsUpdate = true;
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [geometry]);

    return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
});

DustClouds.displayName = 'DustClouds';
