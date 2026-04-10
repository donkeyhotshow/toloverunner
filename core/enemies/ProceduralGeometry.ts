/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Procedural Geometry Generator on CPU
 * Optimized: Uses singleton Noise instance to prevent allocation churn
 */

import * as THREE from 'three';

/**
 * Simple 3D Simplex Noise implementation
 * Used for organic deformations on enemy geometry
 */
class SimplexNoise3D {
    private perm: Uint8Array;

    constructor(seed: number = Math.random()) {
        this.perm = new Uint8Array(512);
        const p = new Uint8Array(256);

        // Initialize with seed-based random
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Shuffle
        for (let i = 255; i > 0; i--) {
            const n = Math.floor((seed * 1000 + i) % (i + 1));
            const valI = p[i] ?? 0;
            const valN = p[n] ?? 0;
            p[i] = valN;
            p[n] = valI;
        }

        // Duplicate for overflow
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255] ?? 0;
        }
    }

    noise(x: number, y: number, z: number): number {
        // Simplified simplex noise - returns value between -1 and 1
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = (this.perm[X] ?? 0) + Y;
        const AA = (this.perm[A] ?? 0) + Z;
        const AB = (this.perm[A + 1] ?? 0) + Z;
        const B = (this.perm[X + 1] ?? 0) + Y;
        const BA = (this.perm[B] ?? 0) + Z;
        const BB = (this.perm[B + 1] ?? 0) + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u, this.grad(this.perm[AA] ?? 0, x, y, z), this.grad(this.perm[BA] ?? 0, x - 1, y, z)),
                this.lerp(u, this.grad(this.perm[AB] ?? 0, x, y - 1, z), this.grad(this.perm[BB] ?? 0, x - 1, y - 1, z))
            ),
            this.lerp(v,
                this.lerp(u, this.grad(this.perm[AA + 1] ?? 0, x, y, z - 1), this.grad(this.perm[BA + 1] ?? 0, x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.perm[AB + 1] ?? 0, x, y - 1, z - 1), this.grad(this.perm[BB + 1] ?? 0, x - 1, y - 1, z - 1))
            )
        );
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

// Optimization: Single instance to avoid reallocation
const SHARED_NOISE = new SimplexNoise3D(Math.random());

/**
 * Apply noise-based displacement to geometry
 */
export function applyNoiseDisplacement(
    geometry: THREE.BufferGeometry,
    amplitude: number,
    frequency: number = 1.0,
    seed: number = Math.random()
): void {
    const noise = SHARED_NOISE;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    if (!positions) return;

    // Use seed as a domain offset
    const offset = seed * 1024.0;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        // Get displacement using shared noise with offset
        const displacement = noise.noise(
            x * frequency + offset,
            y * frequency + offset,
            z * frequency + offset
        ) * amplitude;

        // Apply displacement along vertex normal
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length > 0) {
            const nx = x / length;
            const ny = y / length;
            const nz = z / length;

            positions.setXYZ(
                i,
                x + nx * displacement,
                y + ny * displacement,
                z + nz * displacement
            );
        }
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create spikes on geometry vertices
 */
export function addSpikes(
    geometry: THREE.BufferGeometry,
    count: number,
    length: number
): THREE.BufferGeometry {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    if (!positions) return geometry;

    const newPositions: number[] = [];
    const indices: number[] = [];

    // Copy original vertices
    for (let i = 0; i < positions.count; i++) {
        newPositions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
    }

    // Select random vertices for spikes
    const selectedVertices: number[] = [];
    for (let i = 0; i < count && i < positions.count; i++) {
        selectedVertices.push(Math.floor(Math.random() * positions.count));
    }

    // Create spikes
    selectedVertices.forEach(vertIndex => {
        const x = positions.getX(vertIndex);
        const y = positions.getY(vertIndex);
        const z = positions.getZ(vertIndex);

        // Spike tip position (extend along normal)
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len;
        const ny = y / len;
        const nz = z / len;

        const tipIndex = newPositions.length / 3;
        newPositions.push(
            x + nx * length,
            y + ny * length,
            z + nz * length
        );

        // Create spike triangle fans (simplified)
        indices.push(vertIndex, tipIndex, (vertIndex + 1) % positions.count);
    });

    const spikedGeo = new THREE.BufferGeometry();
    spikedGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (indices.length > 0) {
        spikedGeo.setIndex(indices);
    }
    spikedGeo.computeVertexNormals();

    return spikedGeo;
}

/**
 * Create star-shaped geometry
 */
export function createStarGeometry(pointCount: number, outerRadius: number, innerRadius: number): THREE.ExtrudeGeometry {
    const shape = new (THREE as any).Shape();

    for (let i = 0; i < pointCount * 2; i++) {
        const angle = (i / (pointCount * 2)) * Math.PI * 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelSegments: 2
    });
}

/**
 * Create halftone dot pattern texture
 */
export function createHalftoneTexture(size: number = 128, dotSize: number = 4): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Black dots
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < size; y += dotSize * 2) {
        for (let x = 0; x < size; x += dotSize * 2) {
            ctx.beginPath();
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
}
