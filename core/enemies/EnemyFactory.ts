/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EnemyFactory - Procedural enemy generation system
 */

import * as THREE from 'three';
import { EnemyType, EnemyConfig, ENEMY_CONFIGS, EyeEmotion } from './EnemyTypes';
import { applyNoiseDisplacement, addSpikes, createStarGeometry, createHalftoneTexture } from './ProceduralGeometry';

/**
 * Enemy instance data for rendering
 */
export interface EnemyInstance {
    type: EnemyType;
    config: EnemyConfig;
    mesh: THREE.Mesh;
    eyes: THREE.Group;
    behavior: {
        rotation: THREE.Vector3;
        pulsePhase: number;
        blinkTimer: number;
        customData: unknown;
    };
}

/**
 * Create eye group with morph targets for emotions
 */
function createEyes(size: number, emotion: EyeEmotion): THREE.Group {
    const group = new THREE.Group();

    // Eye whites (2 spheres)
    const whiteGeo = new THREE.CircleGeometry(size, 16);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    const leftEye = new THREE.Mesh(whiteGeo, whiteMat);
    leftEye.position.set(-size * 1.2, 0, 0);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(whiteGeo, whiteMat);
    rightEye.position.set(size * 1.2, 0, 0);
    group.add(rightEye);

    // Pupils
    const pupilGeo = new THREE.CircleGeometry(size * 0.5, 16);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });

    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-size * 1.2, 0, 0.01);
    group.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(size * 1.2, 0, 0.01);
    group.add(rightPupil);

    // Emotion expression (brows/shape)
    switch (emotion) {
        case EyeEmotion.ANGRY: {
            // Angry brows (downward slant)
            const browGeo = new THREE.PlaneGeometry(size * 1.5, size * 0.2);
            const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

            const leftBrow = new THREE.Mesh(browGeo, browMat);
            leftBrow.position.set(-size * 1.2, size * 0.8, 0);
            leftBrow.rotation.z = -0.3;
            group.add(leftBrow);

            const rightBrow = new THREE.Mesh(browGeo, browMat.clone());
            rightBrow.position.set(size * 1.2, size * 0.8, 0);
            rightBrow.rotation.z = 0.3;
            group.add(rightBrow);
            break;
        }

        case EyeEmotion.SHOCKED:
            // Wide open eyes (scale up whites)
            leftEye.scale.setScalar(1.2);
            rightEye.scale.setScalar(1.2);
            break;

        case EyeEmotion.NEUTRAL:
        default:
            // No modifications
            break;
    }

    // Highlight (rainbow shine)
    const highlightGeo = new THREE.CircleGeometry(size * 0.3, 8);
    const highlightMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
    });

    const leftHighlight = new THREE.Mesh(highlightGeo, highlightMat);
    leftHighlight.position.set(-size * 1.4, size * 0.4, 0.02);
    group.add(leftHighlight);

    const rightHighlight = new THREE.Mesh(highlightGeo, highlightMat.clone());
    rightHighlight.position.set(size * 1.0, size * 0.4, 0.02);
    group.add(rightHighlight);

    return group;
}

/**
 * Create base geometry for enemy type
 */
function createBaseGeometry(config: EnemyConfig): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;

    switch (config.geometryType) {
        case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(1, config.subdivisions);
            break;

        case 'cylinder':
            geometry = new THREE.CylinderGeometry(1, 1, 1.2, 6, 1);
            break;

        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 16, 16);
            break;

        case 'custom':
            // Star shape for Star Spiker
            if (config.type === EnemyType.STAR_SPIKER && config.spikeCount) {
                geometry = createStarGeometry(config.spikeCount, 1.0, 0.5);
            } else {
                geometry = new THREE.IcosahedronGeometry(1, config.subdivisions);
            }
            break;

        default:
            geometry = new THREE.IcosahedronGeometry(1, config.subdivisions);
    }

    // Apply noise displacement for organic look
    if (config.noiseAmplitude > 0) {
        applyNoiseDisplacement(geometry, config.noiseAmplitude, 2.0);
    }

    // Add spikes if specified
    if (config.spikeCount && config.spikeLength && config.geometryType !== 'custom') {
        geometry = addSpikes(geometry, config.spikeCount, config.spikeLength);
    }

    return geometry;
}

/**
 * Create material with halftone texture
 */
function createMaterial(config: EnemyConfig): THREE.Material {
    const halftoneMap = createHalftoneTexture(128, 4);

    return new THREE.MeshToonMaterial({
        color: config.baseColor,
        emissive: config.emissiveColor,
        emissiveIntensity: config.emissiveIntensity,
        map: halftoneMap
    });
}

/**
 * Main factory function
 */
export class EnemyFactory {
    private geometryCache = new Map<string, THREE.BufferGeometry>();
    private materialCache = new Map<string, THREE.Material>();

    /**
     * Create a new enemy instance
     */
    createEnemy(type: EnemyType): EnemyInstance {
        const config = ENEMY_CONFIGS[type];

        // Use cached geometry if available
        let geometry = this.geometryCache.get(type);
        if (!geometry) {
            geometry = createBaseGeometry(config);
            this.geometryCache.set(type, geometry);
        }

        // Use cached material if available
        let material = this.materialCache.get(type);
        if (!material) {
            material = createMaterial(config);
            this.materialCache.set(type, material);
        }

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(config.scale);
        mesh.castShadow = false; // Performance
        mesh.receiveShadow = false;

        // Create eyes
        const eyes = createEyes(config.eyeSize, config.eyeEmotion);
        eyes.position.set(0, 0, mesh.scale.x * 0.7); // Position in front
        mesh.add(eyes);

        // Add glow if needed
        if (config.glowIntensity > 0) {
            const light = new THREE.PointLight(
                config.emissiveColor,
                config.glowIntensity,
                config.scale * 3
            );
            mesh.add(light);
        }

        return {
            type,
            config,
            mesh,
            eyes,
            behavior: {
                rotation: new THREE.Vector3(...config.rotationSpeed),
                pulsePhase: Math.random() * Math.PI * 2,
                blinkTimer: config.eyeBlinkInterval,
                customData: {}
            }
        };
    }

    /**
     * Update enemy animation
     */
    updateEnemy(enemy: EnemyInstance, delta: number): void {
        const { mesh, eyes, config, behavior } = enemy;

        // Rotation
        mesh.rotation.x += behavior.rotation.x * delta;
        mesh.rotation.y += behavior.rotation.y * delta;
        mesh.rotation.z += behavior.rotation.z * delta;

        // Pulse animation
        behavior.pulsePhase += config.pulseSpeed * delta;
        const pulseScale = 1.0 + (config.pulseScale - 1.0) * Math.sin(behavior.pulsePhase);
        mesh.scale.setScalar(config.scale * pulseScale);

        // Blink animation
        behavior.blinkTimer -= delta;
        if (behavior.blinkTimer <= 0) {
            // Trigger blink
            eyes.scale.y = 0.1;
            behavior.blinkTimer = config.eyeBlinkInterval;

            // Reset after 0.1s
            setTimeout(() => {
                eyes.scale.y = 1.0;
            }, 100);
        }
    }

    /**
     * Dispose of enemy resources
     */
    disposeEnemy(enemy: EnemyInstance): void {
        enemy.mesh.removeFromParent();
        // Don't dispose cached geometries/materials
    }

    /**
     * Clear all caches
     */
    dispose(): void {
        this.geometryCache.forEach(geo => geo.dispose());
        this.materialCache.forEach(mat => mat.dispose());
        this.geometryCache.clear();
        this.materialCache.clear();
    }
}

// Singleton instance
export const enemyFactory = new EnemyFactory();
