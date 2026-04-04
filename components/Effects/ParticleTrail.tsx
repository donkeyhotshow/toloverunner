/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Object3D, CanvasTexture, Points, BufferGeometry, PointsMaterial, AdditiveBlending, Float32BufferAttribute } from 'three';
import { safeDeltaTime } from '../../utils/safeMath';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';

interface TrailPoint {
    position: [number, number, number];
    velocity: [number, number, number];
    life: number;
    initialLife: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
}

interface ParticleTrailProps {
    targetRef: React.RefObject<Object3D>;
    enabled?: boolean;
}

// Create a star sprite texture
const createStarTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new CanvasTexture(canvas); // Return empty texture relative to context failure

    ctx.fillStyle = 'white';
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = 30;
    const innerRadius = 12;
    let cx = 32, cy = 32;
    let rot = Math.PI / 2 * 3;
    let x = cx, y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();

    const texture = new CanvasTexture(canvas);
    return texture;
};

export const ParticleTrail: React.FC<ParticleTrailProps> = ({ targetRef, enabled = true }) => {
    const pointsRef = useRef<Points>(null);
    const perf = getPerformanceManager();
    const quality = perf.getCurrentQuality();

    const MAX_PARTICLES = useMemo(() => {
        if (quality === QualityLevel.LOW) return 30;
        if (quality === QualityLevel.MEDIUM) return 80;
        return 150;
    }, [quality]);

    const particles = useRef<TrailPoint[]>([]);
    const positionsBuffer = useRef<Float32Array>(new Float32Array(150 * 3));
    const colorsBuffer = useRef<Float32Array>(new Float32Array(150 * 3));
    const sizesBuffer = useRef<Float32Array>(new Float32Array(150));

    const geometry = useMemo(() => new BufferGeometry(), []);
    const starTexture = useMemo(() => createStarTexture(), []);

    const material = useMemo(() => new PointsMaterial({
        size: 1.0,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.01
    }), [starTexture]);

    useEffect(() => {
        return () => {
            safeDispose(geometry);
            safeDispose(material);
            safeDispose(starTexture);
        };
    }, [geometry, material, starTexture]);

    useEffect(() => {
        geometry.setAttribute('position', new Float32BufferAttribute(positionsBuffer.current, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colorsBuffer.current, 3));
        geometry.setAttribute('size', new Float32BufferAttribute(sizesBuffer.current, 1));
    }, [geometry]);

    useEffect(() => {
        if (!enabled) return;

        const callback = (delta: number, _time: number) => {
            if (!targetRef.current) return;

            const safeDelta = safeDeltaTime(delta);

            // Emit sparks based on movement
            if (particles.current.length < MAX_PARTICLES) {
                const targetPos = targetRef.current.position;
                // Add jitter to spawn position
                const jitter = 0.2;
                particles.current.push({
                    position: [
                        targetPos.x + (Math.random() - 0.5) * jitter,
                        targetPos.y + (Math.random() - 0.5) * jitter,
                        targetPos.z + 0.5
                    ],
                    velocity: [
                        (Math.random() - 0.5) * 2.0,
                        (Math.random() - 0.5) * 2.0,
                        2.0 // Drift backwards
                    ],
                    life: 1.0,
                    initialLife: 0.5 + Math.random() * 0.5,
                    size: 0.5 + Math.random() * 0.8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 10
                });
            }

            // Update particles
            for (let i = particles.current.length - 1; i >= 0; i--) {
                const particle = particles.current[i];
                if (!particle) continue;

                particle.life -= safeDelta / particle.initialLife;

                if (particle.life <= 0) {
                    particles.current.splice(i, 1);
                    continue;
                }

                // Update position
                particle.position[0] += particle.velocity[0] * safeDelta;
                particle.position[1] += particle.velocity[1] * safeDelta;
                particle.position[2] += particle.velocity[2] * safeDelta;

                // Slow down velocity (drag)
                particle.velocity[0] *= 0.95;
                particle.velocity[1] *= 0.95;
                particle.velocity[2] *= 0.95;

                particle.rotation += particle.rotationSpeed * safeDelta;
            }

            // Update buffers
            const posBuf = positionsBuffer.current;
            const colBuf = colorsBuffer.current;
            const sizeBuf = sizesBuffer.current;
            if (!posBuf || !colBuf || !sizeBuf) return;
            const activeParticles = particles.current.length;
            for (let i = 0; i < activeParticles; i++) {
                const particle = particles.current[i];
                if (!particle) continue;
                const i3 = i * 3;

                posBuf[i3] = particle.position[0];
                posBuf[i3 + 1] = particle.position[1];
                posBuf[i3 + 2] = particle.position[2];

                // Comic Colors: Neon Cyan, Yellow, White
                const life = particle.life;
                if (i % 3 === 0) { // Cyan
                    colBuf[i3] = 0.0;
                    colBuf[i3 + 1] = 1.0;
                    colBuf[i3 + 2] = 1.0;
                } else if (i % 3 === 1) { // Yellow
                    colBuf[i3] = 1.0;
                    colBuf[i3 + 1] = 1.0;
                    colBuf[i3 + 2] = 0.0;
                } else { // White
                    colBuf[i3] = 1.0;
                    colBuf[i3 + 1] = 1.0;
                    colBuf[i3 + 2] = 1.0;
                }

                colBuf[i3] = (colBuf[i3] ?? 0) * life;
                colBuf[i3 + 1] = (colBuf[i3 + 1] ?? 0) * life;
                colBuf[i3 + 2] = (colBuf[i3 + 2] ?? 0) * life;

                sizeBuf[i] = particle.size * Math.sin(life * Math.PI);
            }

            const posAttr = geometry.attributes.position;
            const colorAttr = geometry.attributes.color;
            const sizeAttr = geometry.attributes.size;
            if (pointsRef.current && activeParticles > 0 && posAttr != null && colorAttr != null && sizeAttr != null) {
                geometry.setDrawRange(0, activeParticles);
                const p = posAttr;
                const c = colorAttr;
                const s = sizeAttr;
                p.needsUpdate = true;
                c.needsUpdate = true;
                s.needsUpdate = true;
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [enabled, targetRef, geometry, MAX_PARTICLES]);

    if (!enabled) return null;

    return (
        <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    );
};

