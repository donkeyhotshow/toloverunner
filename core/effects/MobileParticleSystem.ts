/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mobile Particle System - Оптимізована система частинок для мобільних пристроїв
 * 
 * Особливості:
 * - Adaptive particle count залежно від якості
 * - Instanced rendering для продуктивності
 * - Object pooling
 * - Simple physics
 */

import * as THREE from 'three';
import { QualityLevel } from '../../infrastructure/performance/PerformanceManager';

// Particle effect types
export type ParticleEffectType = 
  | 'player_trail'
  | 'dust_cloud'
  | 'speed_lines'
  | 'collect_sparkle'
  | 'obstacle_hit'
  | 'wall_scrape'
  | 'jump_dust'
  | 'landing_impact'
  | 'powerup_glow'
  | 'ambient_float';

// Particle configuration
export interface ParticleConfig {
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  startSize: { min: number; max: number };
  endSize: { min: number; max: number };
  startColor: THREE.Color;
  endColor: THREE.Color;
  gravity: number;
  velocity: THREE.Vector3;
  velocityVariance: THREE.Vector3;
  sizeVariance: number;
  opacity: { start: number; end: number };
  useGPU: boolean;
  blendMode: THREE.Blending;
}

// Preset configurations
export const PARTICLE_EFFECT_CONFIGS: Record<ParticleEffectType, ParticleConfig> = {
  player_trail: {
    maxParticles: 80,
    emissionRate: 25,
    lifetime: { min: 0.5, max: 0.8 },
    startSize: { min: 0.1, max: 0.15 },
    endSize: { min: 0.02, max: 0.05 },
    startColor: new THREE.Color('#ffffff'),
    endColor: new THREE.Color('#ff69b4'),
    gravity: -0.5,
    velocity: new THREE.Vector3(0, 0, -2),
    velocityVariance: new THREE.Vector3(0.5, 0.5, 1),
    sizeVariance: 0.3,
    opacity: { start: 0.6, end: 0 },
    useGPU: false,
    blendMode: THREE.AdditiveBlending
  },
  
  dust_cloud: {
    maxParticles: 40,
    emissionRate: 15,
    lifetime: { min: 0.3, max: 0.6 },
    startSize: { min: 0.2, max: 0.4 },
    endSize: { min: 0.1, max: 0.2 },
    startColor: new THREE.Color('#d4a574'),
    endColor: new THREE.Color('#8b7355'),
    gravity: -1,
    velocity: new THREE.Vector3(0, 1, 0),
    velocityVariance: new THREE.Vector3(1, 0.5, 1),
    sizeVariance: 0.5,
    opacity: { start: 0.5, end: 0 },
    useGPU: false,
    blendMode: THREE.NormalBlending
  },
  
  speed_lines: {
    maxParticles: 60,
    emissionRate: 40,
    lifetime: { min: 0.2, max: 0.35 },
    startSize: { min: 0.01, max: 0.02 },
    endSize: { min: 0.005, max: 0.01 },
    startColor: new THREE.Color('#00ffff'),
    endColor: new THREE.Color('#0088aa'),
    gravity: 0,
    velocity: new THREE.Vector3(0, 0, -20),
    velocityVariance: new THREE.Vector3(0.2, 0.2, 5),
    sizeVariance: 0.2,
    opacity: { start: 0.7, end: 0 },
    useGPU: true,
    blendMode: THREE.AdditiveBlending
  },
  
  collect_sparkle: {
    maxParticles: 25,
    emissionRate: 0, // One-shot
    lifetime: { min: 0.4, max: 0.7 },
    startSize: { min: 0.15, max: 0.25 },
    endSize: { min: 0, max: 0 },
    startColor: new THREE.Color('#ffff00'),
    endColor: new THREE.Color('#ff8800'),
    gravity: 2,
    velocity: new THREE.Vector3(0, 3, 0),
    velocityVariance: new THREE.Vector3(2, 1, 2),
    sizeVariance: 0.4,
    opacity: { start: 1, end: 0 },
    useGPU: false,
    blendMode: THREE.AdditiveBlending
  },
  
  obstacle_hit: {
    maxParticles: 30,
    emissionRate: 0, // One-shot
    lifetime: { min: 0.3, max: 0.5 },
    startSize: { min: 0.1, max: 0.2 },
    endSize: { min: 0.02, max: 0.05 },
    startColor: new THREE.Color('#ff3333'),
    endColor: new THREE.Color('#ff0000'),
    gravity: -2,
    velocity: new THREE.Vector3(0, 2, 2),
    velocityVariance: new THREE.Vector3(3, 2, 2),
    sizeVariance: 0.3,
    opacity: { start: 0.8, end: 0 },
    useGPU: false,
    blendMode: THREE.AdditiveBlending
  },
  
  wall_scrape: {
    maxParticles: 20,
    emissionRate: 10,
    lifetime: { min: 0.2, max: 0.4 },
    startSize: { min: 0.05, max: 0.1 },
    endSize: { min: 0.01, max: 0.03 },
    startColor: new THREE.Color('#aaaaaa'),
    endColor: new THREE.Color('#666666'),
    gravity: -1,
    velocity: new THREE.Vector3(0, 0, 0),
    velocityVariance: new THREE.Vector3(1, 1, 1),
    sizeVariance: 0.2,
    opacity: { start: 0.4, end: 0 },
    useGPU: false,
    blendMode: THREE.NormalBlending
  },
  
  jump_dust: {
    maxParticles: 25,
    emissionRate: 20,
    lifetime: { min: 0.3, max: 0.5 },
    startSize: { min: 0.15, max: 0.25 },
    endSize: { min: 0.05, max: 0.1 },
    startColor: new THREE.Color('#ffffff'),
    endColor: new THREE.Color('#cccccc'),
    gravity: -0.5,
    velocity: new THREE.Vector3(0, 0.5, 0),
    velocityVariance: new THREE.Vector3(1, 0.5, 1),
    sizeVariance: 0.4,
    opacity: { start: 0.5, end: 0 },
    useGPU: false,
    blendMode: THREE.NormalBlending
  },
  
  landing_impact: {
    maxParticles: 35,
    emissionRate: 0, // One-shot
    lifetime: { min: 0.25, max: 0.45 },
    startSize: { min: 0.2, max: 0.35 },
    endSize: { min: 0.05, max: 0.1 },
    startColor: new THREE.Color('#ffffff'),
    endColor: new THREE.Color('#aaaaaa'),
    gravity: -1.5,
    velocity: new THREE.Vector3(0, 1.5, 0),
    velocityVariance: new THREE.Vector3(2, 1, 2),
    sizeVariance: 0.5,
    opacity: { start: 0.7, end: 0 },
    useGPU: false,
    blendMode: THREE.NormalBlending
  },
  
  powerup_glow: {
    maxParticles: 40,
    emissionRate: 30,
    lifetime: { min: 0.6, max: 1.0 },
    startSize: { min: 0.2, max: 0.3 },
    endSize: { min: 0.1, max: 0.15 },
    startColor: new THREE.Color('#ff00ff'),
    endColor: new THREE.Color('#8800ff'),
    gravity: 0,
    velocity: new THREE.Vector3(0, 0.5, 0),
    velocityVariance: new THREE.Vector3(0.5, 0.3, 0.5),
    sizeVariance: 0.3,
    opacity: { start: 0.6, end: 0 },
    useGPU: true,
    blendMode: THREE.AdditiveBlending
  },
  
  ambient_float: {
    maxParticles: 50,
    emissionRate: 10,
    lifetime: { min: 2, max: 4 },
    startSize: { min: 0.02, max: 0.05 },
    endSize: { min: 0.01, max: 0.03 },
    startColor: new THREE.Color('#88ccff'),
    endColor: new THREE.Color('#4488cc'),
    gravity: 0.05,
    velocity: new THREE.Vector3(0, 0.2, 0),
    velocityVariance: new THREE.Vector3(0.3, 0.1, 0.3),
    sizeVariance: 0.2,
    opacity: { start: 0.3, end: 0 },
    useGPU: false,
    blendMode: THREE.AdditiveBlending
  }
};

// Quality-based particle counts
export const PARTICLE_COUNT_BY_QUALITY: Record<QualityLevel, Record<ParticleEffectType, number>> = {
  [QualityLevel.LOW]: {
    player_trail: 20,
    dust_cloud: 10,
    speed_lines: 15,
    collect_sparkle: 8,
    obstacle_hit: 8,
    wall_scrape: 5,
    jump_dust: 8,
    landing_impact: 10,
    powerup_glow: 10,
    ambient_float: 15
  },
  [QualityLevel.MEDIUM]: {
    player_trail: 40,
    dust_cloud: 20,
    speed_lines: 30,
    collect_sparkle: 15,
    obstacle_hit: 15,
    wall_scrape: 10,
    jump_dust: 15,
    landing_impact: 20,
    powerup_glow: 20,
    ambient_float: 25
  },
  [QualityLevel.HIGH]: {
    player_trail: 60,
    dust_cloud: 30,
    speed_lines: 45,
    collect_sparkle: 20,
    obstacle_hit: 22,
    wall_scrape: 15,
    jump_dust: 22,
    landing_impact: 30,
    powerup_glow: 30,
    ambient_float: 40
  },
  [QualityLevel.ULTRA]: {
    player_trail: 80,
    dust_cloud: 40,
    speed_lines: 60,
    collect_sparkle: 25,
    obstacle_hit: 30,
    wall_scrape: 20,
    jump_dust: 25,
    landing_impact: 35,
    powerup_glow: 40,
    ambient_float: 50
  }
};

// Single particle instance
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  endSize: number;
  color: THREE.Color;
  endColor: THREE.Color;
  opacity: number;
  active: boolean;
}

// Particle System клас
export class MobileParticleSystem {
  private config: ParticleConfig;
  private particles: Particle[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private dummy: THREE.Object3D = new THREE.Object3D();
  /** Current quality level (used by setQuality and getQuality). */
  private _quality: QualityLevel = QualityLevel.MEDIUM;
  private emissionAccumulator: number = 0;

  getQuality(): QualityLevel {
    return this._quality;
  }
  private isEmitting: boolean = true;
  private emissionPosition: THREE.Vector3 = new THREE.Vector3();
  private maxParticles: number;

  constructor(effectType: ParticleEffectType, quality: QualityLevel = QualityLevel.MEDIUM) {
    this._quality = quality;
    const baseConfig = PARTICLE_EFFECT_CONFIGS[effectType];
    this.maxParticles = PARTICLE_COUNT_BY_QUALITY[quality][effectType] || baseConfig.maxParticles;
    
    this.config = {
      ...baseConfig,
      maxParticles: this.maxParticles
    };

    // Create geometry
    this.geometry = new THREE.PlaneGeometry(1, 1);
    
    // Create material
    this.material = new THREE.MeshBasicMaterial({
      color: this.config.startColor,
      transparent: true,
      opacity: this.config.opacity.start,
      blending: this.config.blendMode,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createInactiveParticle());
    }

    // Create instanced mesh if high quality
    if (this.config.useGPU && quality >= QualityLevel.HIGH) {
      this.createInstancedMesh();
    }
  }

  private createInactiveParticle(): Particle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      size: 0,
      endSize: 0,
      color: this.config.startColor.clone(),
      endColor: this.config.endColor.clone(),
      opacity: 0,
      active: false
    };
  }

  private createInstancedMesh(): void {
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxParticles
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  // Update quality
  setQuality(quality: QualityLevel): void {
    this._quality = quality;
    this.maxParticles = PARTICLE_COUNT_BY_QUALITY[quality][this.getCurrentEffectType()] || this.config.maxParticles;
  }

  private getCurrentEffectType(): ParticleEffectType {
    // Find effect type by config (simplified)
    return 'player_trail';
  }

  // Set emission position
  setEmissionPosition(position: THREE.Vector3): void {
    this.emissionPosition.copy(position);
  }

  // Start/Stop emitting
  startEmitting(): void {
    this.isEmitting = true;
  }

  stopEmitting(): void {
    this.isEmitting = false;
  }

  // Emit particles (for one-shot effects)
  emit(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    // Find inactive particle
    const particle = this.particles.find(p => !p.active);
    if (!particle) return;

    // Random lifetime
    const lifetime = THREE.MathUtils.lerp(
      this.config.lifetime.min,
      this.config.lifetime.max,
      Math.random()
    );

    // Random size
    const size = THREE.MathUtils.lerp(
      this.config.startSize.min,
      this.config.startSize.max,
      Math.random()
    );

    const endSize = THREE.MathUtils.lerp(
      this.config.endSize.min,
      this.config.endSize.max,
      Math.random()
    );

    // Initialize particle
    particle.position.copy(this.emissionPosition);
    particle.position.x += (Math.random() - 0.5) * 0.5;
    particle.position.y += (Math.random() - 0.5) * 0.5;
    particle.position.z += (Math.random() - 0.5) * 0.5;

    particle.velocity.copy(this.config.velocity);
    particle.velocity.x += (Math.random() - 0.5) * this.config.velocityVariance.x;
    particle.velocity.y += (Math.random() - 0.5) * this.config.velocityVariance.y;
    particle.velocity.z += (Math.random() - 0.5) * this.config.velocityVariance.z;

    particle.life = 0;
    particle.maxLife = lifetime;
    particle.size = size;
    particle.endSize = endSize;
    particle.color.copy(this.config.startColor);
    particle.endColor.copy(this.config.endColor);
    particle.opacity = this.config.opacity.start;
    particle.active = true;
  }

  // Main update
  update(delta: number): void {
    const safeDelta = Math.min(delta, 0.05);

    // Emit new particles
    if (this.isEmitting && this.config.emissionRate > 0) {
      this.emissionAccumulator += this.config.emissionRate * safeDelta;
      
      while (this.emissionAccumulator >= 1) {
        this.spawnParticle();
        this.emissionAccumulator -= 1;
      }
    }

    // Update particles
    for (const particle of this.particles) {
      if (!particle.active) continue;

      // Update life
      particle.life += safeDelta;

      // Check if dead
      if (particle.life >= particle.maxLife) {
        particle.active = false;
        continue;
      }

      // Calculate progress (0 to 1)
      const progress = particle.life / particle.maxLife;
      const invProgress = 1 - progress;

      // Apply gravity
      particle.velocity.y += this.config.gravity * safeDelta;

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(safeDelta));

      // Update size
      particle.size = THREE.MathUtils.lerp(particle.endSize, particle.size, invProgress);

      // Update color
      particle.color.lerpColors(particle.endColor, this.config.startColor, invProgress);

      // Update opacity
      particle.opacity = THREE.MathUtils.lerp(
        this.config.opacity.end,
        this.config.opacity.start,
        invProgress
      );
    }

    // Update mesh
    this.updateMesh();
  }

  private updateMesh(): void {
    if (this.mesh) {
      let index = 0;
      
      for (const particle of this.particles) {
        if (!particle.active) continue;
        
        this.dummy.position.copy(particle.position);
        this.dummy.scale.setScalar(particle.size);
        this.dummy.lookAt(
          particle.position.x,
          particle.position.y,
          particle.position.z + 1
        );
        this.dummy.updateMatrix();
        
        this.mesh.setMatrixAt(index++, this.dummy.matrix);
      }
      
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.count = index;
    }
  }

  // Get mesh for rendering
  getMesh(): THREE.InstancedMesh | null {
    return this.mesh;
  }

  // Get particles for custom rendering
  getParticles(): Particle[] {
    return this.particles.filter(p => p.active);
  }

  // Cleanup
  dispose(): void {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) {
      this.material.dispose();
    }
    if (this.mesh) {
      this.mesh.dispose();
    }
    this.particles = [];
  }
}

// Factory function
export const createParticleSystem = (
  effectType: ParticleEffectType,
  quality: QualityLevel = QualityLevel.MEDIUM
): MobileParticleSystem => {
  return new MobileParticleSystem(effectType, quality);
};

// Global particle system manager
class ParticleSystemManager {
  private systems: Map<ParticleEffectType, MobileParticleSystem> = new Map();
  private quality: QualityLevel = QualityLevel.MEDIUM;

  setQuality(quality: QualityLevel): void {
    this.quality = quality;
    this.systems.forEach(system => system.setQuality(quality));
  }

  getSystem(effectType: ParticleEffectType): MobileParticleSystem {
    let system = this.systems.get(effectType);
    
    if (!system) {
      system = createParticleSystem(effectType, this.quality);
      this.systems.set(effectType, system);
    }
    
    return system;
  }

  update(delta: number): void {
    this.systems.forEach(system => system.update(delta));
  }

  dispose(): void {
    this.systems.forEach(system => system.dispose());
    this.systems.clear();
  }
}

export const particleSystemManager = new ParticleSystemManager();

export default MobileParticleSystem;