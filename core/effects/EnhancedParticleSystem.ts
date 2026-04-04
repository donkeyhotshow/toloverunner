/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EnhancedParticleSystem - Расширенная система частиц (OPTIMIZED)
 *
 * Функции:
 * - Dash trails
 * - Attack impact effects
 * - Destruction debris
 * - Power-up activation bursts
 * - Combo level-up effects
 * - Optimized particle pooling
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Reduced pool size to 250 (was 500)
 * - Default quality 50% (was 100%)
 * - Reduced particle counts across all effects
 */

import * as THREE from 'three';

export enum ParticleEffectType {
    DASH_TRAIL = 'dash_trail',
    ATTACK_IMPACT = 'attack_impact',
    DESTRUCTION = 'destruction',
    POWERUP_BURST = 'powerup_burst',
    COMBO_LEVELUP = 'combo_levelup',
    COIN_COLLECT = 'coin_collect',
    SPEED_TRAIL = 'speed_trail',
    SHIELD_SPARKLE = 'shield_sparkle'
}

interface ParticleConfig {
    count: number;
    lifetime: number;        // seconds
    speed: number;
    spreadAngle: number;     // radians
    size: number;
    color: string;
    gravity: number;
    fadeOut: boolean;
}

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    lifetime: number;
    maxLifetime: number;
    size: number;
    color: THREE.Color;
    active: boolean;
}

const PARTICLE_CONFIGS: Record<ParticleEffectType, ParticleConfig> = {
    [ParticleEffectType.DASH_TRAIL]: {
        count: 10,  // Reduced from 20
        lifetime: 0.5,
        speed: 5.0,
        spreadAngle: Math.PI * 0.3,
        size: 0.3,
        color: '#00ffff',
        gravity: 0,
        fadeOut: true
    },
    [ParticleEffectType.ATTACK_IMPACT]: {
        count: 8,  // Reduced from 15
        lifetime: 0.3,
        speed: 8.0,
        spreadAngle: Math.PI,
        size: 0.4,
        color: '#ff6b35',
        gravity: -5,
        fadeOut: true
    },
    [ParticleEffectType.DESTRUCTION]: {
        count: 15,  // Reduced from 30
        lifetime: 0.8,
        speed: 6.0,
        spreadAngle: Math.PI * 0.5,
        size: 0.2,
        color: '#8b008b',
        gravity: -10,
        fadeOut: true
    },
    [ParticleEffectType.POWERUP_BURST]: {
        count: 20,  // Reduced from 40
        lifetime: 1.0,
        speed: 7.0,
        spreadAngle: Math.PI * 2,
        size: 0.5,
        color: '#ffd700',
        gravity: -3,
        fadeOut: true
    },
    [ParticleEffectType.COMBO_LEVELUP]: {
        count: 25,  // Reduced from 50
        lifetime: 1.2,
        speed: 10.0,
        spreadAngle: Math.PI * 2,
        size: 0.6,
        color: '#ff9800',
        gravity: 0,
        fadeOut: true
    },
    [ParticleEffectType.COIN_COLLECT]: {
        count: 5,  // Reduced from 10
        lifetime: 0.4,
        speed: 4.0,
        spreadAngle: Math.PI * 0.5,
        size: 0.25,
        color: '#ffd700',
        gravity: 0,
        fadeOut: true
    },
    [ParticleEffectType.SPEED_TRAIL]: {
        count: 3,  // Reduced from 5
        lifetime: 0.6,
        speed: 2.0,
        spreadAngle: Math.PI * 0.1,
        size: 0.4,
        color: '#ff9800',
        gravity: 0,
        fadeOut: true
    },
    [ParticleEffectType.SHIELD_SPARKLE]: {
        count: 4,  // Reduced from 8
        lifetime: 0.5,
        speed: 3.0,
        spreadAngle: Math.PI * 2,
        size: 0.3,
        color: '#4fc3f7',
        gravity: 0,
        fadeOut: true
    }
};

export class EnhancedParticleSystem {
    private particles: Particle[] = [];
    private maxParticles = 250; // Reduced from 500 for performance
    private activeParticles = 0;

    // Performance settings - default to 50% quality
    private qualityLevel = 0.5;
    private enabled = true;

    constructor(qualityLevel = 0.5) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, qualityLevel));
        this.initializePool();
    }

    /**
     * Initialize particle pool
     */
    private initializePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                lifetime: 0,
                maxLifetime: 1,
                size: 0.5,
                color: new THREE.Color(),
                active: false
            });
        }
    }

    /**
     * Emit particle effect
     */
    emit(
        type: ParticleEffectType,
        position: THREE.Vector3 | [number, number, number],
        customConfig?: Partial<ParticleConfig>
    ) {
        if (!this.enabled) return;

        const config = { ...PARTICLE_CONFIGS[type], ...customConfig };
        const count = Math.floor(config.count * this.qualityLevel);

        const pos = Array.isArray(position)
            ? new THREE.Vector3(...position)
            : position;

        for (let i = 0; i < count; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) break; // Pool exhausted

            // Position
            particle.position.copy(pos);

            // Velocity with spread
            const angle = Math.random() * config.spreadAngle;
            const elevation = (Math.random() - 0.5) * config.spreadAngle * 0.5;
            const speed = config.speed * (0.8 + Math.random() * 0.4);

            particle.velocity.set(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );

            // Properties
            particle.lifetime = config.lifetime;
            particle.maxLifetime = config.lifetime;
            particle.size = config.size * (0.8 + Math.random() * 0.4);
            particle.color.set(config.color);
            particle.active = true;

            this.activeParticles++;
        }
    }

    /**
     * Get inactive particle from pool
     */
    private getInactiveParticle(): Particle | null {
        for (const particle of this.particles) {
            if (!particle.active) {
                return particle;
            }
        }
        return null;
    }

    /**
     * Update particles
     */
    update(deltaTime: number) {
        if (!this.enabled) return;

        for (const particle of this.particles) {
            if (!particle.active) continue;

            // Update lifetime
            particle.lifetime -= deltaTime;
            if (particle.lifetime <= 0) {
                particle.active = false;
                this.activeParticles--;
                continue;
            }

            // Update physics
            particle.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );

            // Apply gravity
            particle.velocity.y -= 9.8 * deltaTime;

            // Damping
            particle.velocity.multiplyScalar(0.98);
        }
    }

    /**
     * Get active particles for rendering
     */
    getActiveParticles(): Particle[] {
        return this.particles.filter(p => p.active);
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            active: this.activeParticles,
            poolSize: this.maxParticles,
            usage: (this.activeParticles / this.maxParticles * 100).toFixed(1) + '%',
            qualityLevel: this.qualityLevel
        };
    }

    /**
     * Set quality level (0-1)
     */
    setQualityLevel(level: number) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, level));
    }

    /**
     * Enable/disable particles
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles.forEach(p => p.active = false);
        this.activeParticles = 0;
    }

    /**
     * Get debug info
     */
    getDebugInfo(): string {
        return [
            '=== Particle System ===',
            `Active: ${this.activeParticles}/${this.maxParticles}`,
            `Quality: ${(this.qualityLevel * 100).toFixed(0)}%`,
            `Enabled: ${this.enabled ? 'YES' : 'NO'}`
        ].join('\n');
    }
}

// Singleton
let particleSystemInstance: EnhancedParticleSystem | null = null;

export const getEnhancedParticleSystem = (): EnhancedParticleSystem => {
    if (!particleSystemInstance) {
        particleSystemInstance = new EnhancedParticleSystem();
    }
    return particleSystemInstance;
};

export const destroyEnhancedParticleSystem = () => {
    particleSystemInstance = null;
};
