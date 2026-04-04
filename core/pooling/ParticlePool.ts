/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ParticlePool - Specialized pool for particle system optimization
 * Reduces GC pressure by reusing particle objects
 */

import * as THREE from 'three';

export interface PooledParticle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    life: number;
    maxLife: number;
    scale: number;
    color: THREE.Color;
    active: boolean;
    type: 'dust' | 'spark' | 'trail' | 'hit' | 'powerup';
}

export class ParticlePool {
    private pool: PooledParticle[] = [];
    private activeParticles: Set<PooledParticle> = new Set();
    private maxSize: number;
    private geometry: THREE.BufferGeometry | null = null;
    private material: THREE.PointsMaterial | null = null;
    private mesh: THREE.Points | null = null;
    private positions: Float32Array | null = null;
    private colors: Float32Array | null = null;
    private sizes: Float32Array | null = null;
    
    // Optimization: Reusable temporary vector to avoid allocations in update loop
    private _tempVec: THREE.Vector3 = new THREE.Vector3();

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
        this.preAllocatePool();
    }

    /**
     * Pre-allocate particle objects
     */
    private preAllocatePool(): void {
        for (let i = 0; i < this.maxSize; i++) {
            this.pool.push(this.createParticle());
        }
    }

    /**
     * Create a new particle object
     */
    private createParticle(): PooledParticle {
        return {
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            life: 0,
            maxLife: 1,
            scale: 1,
            color: new THREE.Color(),
            active: false,
            type: 'dust',
        };
    }

    /**
     * Get a particle from the pool
     */
    acquire(type: PooledParticle['type'] = 'dust'): PooledParticle {
        let particle: PooledParticle;

        if (this.pool.length > 0) {
            particle = this.pool.pop()!;
        } else if (this.activeParticles.size < this.maxSize) {
            particle = this.createParticle();
        } else {
            // Pool is full, recycle oldest particle
            const oldest = this.getOldestParticle();
            if (oldest) {
                oldest.active = false;
                this.activeParticles.delete(oldest);
                particle = oldest;
            } else {
                particle = this.createParticle();
            }
        }

        particle.active = true;
        particle.type = type;
        particle.life = 0;
        particle.maxLife = 1;
        particle.scale = 1;
        particle.position.set(0, 0, 0);
        particle.velocity.set(0, 0, 0);
        particle.acceleration.set(0, 0, 0);
        particle.color.set(0xffffff);

        this.activeParticles.add(particle);
        return particle;
    }

    /**
     * Return a particle to the pool
     */
    release(particle: PooledParticle): void {
        if (!particle.active) return;

        particle.active = false;
        this.activeParticles.delete(particle);
        this.pool.push(particle);
    }

    /**
     * Get the oldest active particle for recycling
     */
    private getOldestParticle(): PooledParticle | null {
        let oldest: PooledParticle | null = null;
        let oldestLife = -1;

        for (const particle of this.activeParticles) {
            if (particle.life > oldestLife) {
                oldestLife = particle.life;
                oldest = particle;
            }
        }

        return oldest;
    }

    /**
     * Update all active particles - optimized to avoid allocations
     */
    update(deltaTime: number): void {
        const toRelease: PooledParticle[] = [];
        const tempVec = this._tempVec;

        for (const particle of this.activeParticles) {
            // Update life
            particle.life += deltaTime;

            // Update velocity with acceleration (using temp vector to avoid clone())
            // velocity = velocity + acceleration * deltaTime
            tempVec.copy(particle.acceleration).multiplyScalar(deltaTime);
            particle.velocity.add(tempVec);

            // Update position with velocity (using temp vector to avoid clone())
            // position = position + velocity * deltaTime
            tempVec.copy(particle.velocity).multiplyScalar(deltaTime);
            particle.position.add(tempVec);

            // Check if particle is dead
            if (particle.life >= particle.maxLife) {
                toRelease.push(particle);
            }
        }

        // Release dead particles
        for (const particle of toRelease) {
            this.release(particle);
        }
    }

    /**
     * Get all active particles
     */
    getActiveParticles(): PooledParticle[] {
        return Array.from(this.activeParticles);
    }

    /**
     * Get active particle count
     */
    getActiveCount(): number {
        return this.activeParticles.size;
    }

    /**
     * Get pooled (available) particle count
     */
    getPooledCount(): number {
        return this.pool.length;
    }

    /**
     * Clear all particles
     */
    clear(): void {
        for (const particle of this.activeParticles) {
            particle.active = false;
            this.pool.push(particle);
        }
        this.activeParticles.clear();
    }

    /**
     * Create Three.js points mesh for rendering
     */
    createMesh(): THREE.Points {
        if (this.mesh) return this.mesh;

        this.geometry = new THREE.BufferGeometry();
        
        // Allocate buffers
        const maxParticles = this.maxSize;
        this.positions = new Float32Array(maxParticles * 3);
        this.colors = new Float32Array(maxParticles * 3);
        this.sizes = new Float32Array(maxParticles);

        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(this.positions, 3)
        );
        this.geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(this.colors, 3)
        );
        this.geometry.setAttribute(
            'size',
            new THREE.BufferAttribute(this.sizes, 1)
        );

        this.material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        return this.mesh;
    }

    /**
     * Update geometry buffers with current particle data
     */
    updateGeometry(): void {
        if (!this.geometry || !this.positions || !this.colors || !this.sizes) return;

        let index = 0;
        for (const particle of this.activeParticles) {
            if (index >= this.maxSize) break;

            // Position
            this.positions[index * 3] = particle.position.x;
            this.positions[index * 3 + 1] = particle.position.y;
            this.positions[index * 3 + 2] = particle.position.z;

            // Color
            this.colors[index * 3] = particle.color.r;
            this.colors[index * 3 + 1] = particle.color.g;
            this.colors[index * 3 + 2] = particle.color.b;

            // Size (fade out as particle dies)
            const lifeRatio = particle.life / particle.maxLife;
            this.sizes[index] = particle.scale * (1 - lifeRatio);

            index++;
        }

        // Set draw range
        this.geometry.setDrawRange(0, index);

        // Mark attributes for update
        const attrs = this.geometry.attributes;
        if (attrs.position) attrs.position.needsUpdate = true;
        if (attrs.color) attrs.color.needsUpdate = true;
        if (attrs.size) attrs.size.needsUpdate = true;
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        this.clear();
        
        if (this.geometry) {
            this.geometry.dispose();
            this.geometry = null;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        
        this.mesh = null;
        this.positions = null;
        this.colors = null;
        this.sizes = null;
    }

    /**
     * Get statistics
     */
    getStats(): { active: number; pooled: number; maxSize: number } {
        return {
            active: this.activeParticles.size,
            pooled: this.pool.length,
            maxSize: this.maxSize,
        };
    }
}

// Singleton instance
let particlePool: ParticlePool | null = null;

/**
 * Get global particle pool
 */
export function getParticlePool(maxSize?: number): ParticlePool {
    if (!particlePool) {
        particlePool = new ParticlePool(maxSize);
    }
    return particlePool;
}

/**
 * Reset particle pool
 */
export function resetParticlePool(): void {
    if (particlePool) {
        particlePool.dispose();
        particlePool = null;
    }
}