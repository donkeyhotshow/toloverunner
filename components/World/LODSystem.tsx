/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdvancedLODSystem - Full Level of Detail system with dynamic mesh switching
 * Provides multiple LOD levels based on distance from camera
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { safeDispose } from '../../utils/errorHandler';

// LOD Level configurations
export interface LODLevel {
    /** Distance threshold for this LOD level */
    distance: number;
    /** Quality multiplier for segments */
    segmentsMultiplier: number;
    /** Whether to enable shadows at this level */
    shadows: boolean;
    /** Color override for lower LODs */
    color?: string;
}

export interface LODConfig {
    /** Unique identifier for this LOD group */
    id: string;
    /** All LOD levels, sorted by distance (closest first) */
    levels: LODLevel[];
    /** Base geometry type */
    geometryType: 'sphere' | 'cylinder' | 'box' | 'cone' | 'torus' | 'custom';
    /** Base geometry parameters */
    geometryArgs?: number[];
    /** Custom geometry factory function */
    customGeometry?: () => THREE.BufferGeometry;
    /** Whether to enable automatic LOD switching */
    autoSwitch?: boolean;
    /** Interval in ms for LOD checks (default: 100ms) */
    checkInterval?: number;
    /** Transition smoothness (default: 0.1) */
    transitionSpeed?: number;
}

// Default LOD configurations for common geometries
export const DEFAULT_LOD_CONFIGS: Record<string, LODConfig> = {
    // High detail for player characters
    player: {
        id: 'player',
        levels: [
            { distance: 0, segmentsMultiplier: 1.0, shadows: true },
            { distance: 30, segmentsMultiplier: 0.7, shadows: true },
            { distance: 60, segmentsMultiplier: 0.4, shadows: false },
            { distance: 100, segmentsMultiplier: 0.2, shadows: false },
        ],
        geometryType: 'sphere',
        geometryArgs: [1, 32, 32],
        autoSwitch: true,
    },
    // Medium detail for enemies
    enemy: {
        id: 'enemy',
        levels: [
            { distance: 0, segmentsMultiplier: 1.0, shadows: true },
            { distance: 25, segmentsMultiplier: 0.6, shadows: true },
            { distance: 50, segmentsMultiplier: 0.35, shadows: false },
            { distance: 80, segmentsMultiplier: 0.15, shadows: false },
        ],
        geometryType: 'sphere',
        geometryArgs: [1, 24, 24],
        autoSwitch: true,
    },
    // Low detail for background objects
    background: {
        id: 'background',
        levels: [
            { distance: 0, segmentsMultiplier: 0.8, shadows: false },
            { distance: 40, segmentsMultiplier: 0.5, shadows: false },
            { distance: 80, segmentsMultiplier: 0.25, shadows: false },
            { distance: 150, segmentsMultiplier: 0.1, shadows: false },
        ],
        geometryType: 'cylinder',
        geometryArgs: [40, 40, 100, 32, 1],
        autoSwitch: true,
    },
    // Boss - high detail throughout
    boss: {
        id: 'boss',
        levels: [
            { distance: 0, segmentsMultiplier: 1.0, shadows: true },
            { distance: 40, segmentsMultiplier: 0.8, shadows: true },
            { distance: 80, segmentsMultiplier: 0.5, shadows: false },
        ],
        geometryType: 'sphere',
        geometryArgs: [2.5, 48, 48],
        autoSwitch: true,
    },
};

// Create geometry based on type and args
function createGeometry(type: string, args?: number[]): THREE.BufferGeometry {
    const pool = getGeometryPool();

    switch (type) {
        case 'sphere':
            return pool.getSphereGeometry(
                args?.[0] || 1,
                Math.max(8, Math.round((args?.[1] || 32))),
                Math.max(6, Math.round((args?.[2] || 32)))
            );
        case 'cylinder':
            return pool.getCylinderGeometry(
                args?.[0] || 1,
                args?.[1] || 1,
                args?.[2] || 1,
                Math.max(6, Math.round(args?.[3] || 16)),
                Math.max(1, Math.round(args?.[4] || 1)),
                args?.[5] !== undefined ? Boolean(args?.[5]) : false
            );
        case 'box':
            return new THREE.BoxGeometry(
                args?.[0] || 1,
                args?.[1] || 1,
                args?.[2] || 1,
                Math.max(1, Math.round(args?.[3] || 1)),
                Math.max(1, Math.round(args?.[4] || 1)),
                Math.max(1, Math.round(args?.[5] || 1))
            );
        case 'cone':
            return new THREE.ConeGeometry(
                args?.[0] || 1,
                args?.[1] || 2,
                Math.max(6, Math.round(args?.[2] || 16))
            );
        case 'torus':
            return new THREE.TorusGeometry(
                args?.[0] || 1,
                args?.[1] || 0.4,
                Math.max(4, Math.round(args?.[2] || 16)),
                Math.max(6, Math.round(args?.[3] || 32))
            );
        default:
            return new THREE.SphereGeometry(1, 16, 16);
    }
}

interface LODMeshProps {
    /** LOD configuration */
    config: LODConfig;
    /** Position of the object */
    position?: [number, number, number];
    /** Rotation */
    rotation?: [number, number, number];
    /** Scale */
    scale?: [number, number, number];
    /** Material to apply */
    material?: THREE.Material | THREE.Material[];
    /** Children to render inside */
    children?: React.ReactNode;
    /** Override current LOD level (for testing) */
    forceLODLevel?: number;
    /** Callback when LOD level changes */
    onLODChange?: (level: number, distance: number) => void;
    /** Enable debug visualization */
    debug?: boolean;
}

export const LODMesh: React.FC<LODMeshProps> = ({
    config,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    material,
    children,
    forceLODLevel,
    onLODChange,
    debug = false,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRefs = useRef<THREE.Mesh[]>([]);
    const { camera } = useThree();
    const [currentLevel, setCurrentLevel] = useState(0);
    const lastLevelRef = useRef(0);

    // Performance manager reference
    const _perfManager = useMemo(() => getPerformanceManager(), []);

    // Check interval for LOD switching
    const _checkInterval = config.checkInterval || 100;
    const _transitionSpeed = config.transitionSpeed || 0.1;

    // Create geometries for each LOD level
    const geometries = useMemo(() => {
        if (config.customGeometry) {
            // For custom geometry, create one and scale it
            const baseGeo = config.customGeometry();
            return config.levels.map((level, index) => {
                if (index === 0) return baseGeo;
                // Clone and mark as LOD variant
                const cloned = baseGeo.clone();
                return cloned;
            });
        }

        return config.levels.map((level, _index) => {
            const args = config.geometryArgs ? [...config.geometryArgs] : [1];

            // Adjust segments based on LOD level
            if (config.geometryType === 'sphere' && args.length >= 2) {
                const baseSegs = config.geometryArgs?.[1] || 32;
                args[1] = Math.max(4, Math.round(baseSegs * level.segmentsMultiplier));
                args[2] = Math.max(4, Math.round((config.geometryArgs?.[2] || 32) * level.segmentsMultiplier));
            } else if (config.geometryType === 'cylinder' && args.length >= 4) {
                args[3] = Math.max(4, Math.round((config.geometryArgs?.[3] || 16) * level.segmentsMultiplier));
                args[4] = Math.max(1, Math.round((config.geometryArgs?.[4] || 1) * level.segmentsMultiplier));
            } else if (config.geometryType === 'torus' && args.length >= 2) {
                args[2] = Math.max(4, Math.round((config.geometryArgs?.[2] || 16) * level.segmentsMultiplier));
                args[3] = Math.max(6, Math.round((config.geometryArgs?.[3] || 32) * level.segmentsMultiplier));
            }

            return createGeometry(config.geometryType, args);
        });
    }, [config]);

    // Clean up geometries on unmount
    useEffect(() => {
        return () => {
            geometries.forEach((geo, index) => {
                if (index > 0) { // Skip first if it's from pool
                    safeDispose(geo);
                }
            });
        };
    }, [geometries]);

    // LOD switching logic
    useFrame(() => {
        if (!groupRef.current || !config.autoSwitch) return;

        // Check if forced LOD level is set
        if (forceLODLevel !== undefined) {
            if (forceLODLevel !== lastLevelRef.current) {
                updateVisibility(forceLODLevel);
                lastLevelRef.current = forceLODLevel;
            }
            return;
        }

        // Get world position of the object
        const worldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(worldPos);

        // Calculate distance to camera
        const distance = worldPos.distanceTo(camera.position);

        // Find appropriate LOD level
        let newLevel = 0;
        for (let i = 0; i < config.levels.length; i++) {
            if (distance >= (config.levels[i]?.distance ?? 0)) {
                newLevel = i;
            }
        }

        // Update if level changed
        if (newLevel !== lastLevelRef.current) {
            updateVisibility(newLevel);
            lastLevelRef.current = newLevel;
            onLODChange?.(newLevel, distance);

            // Update shadow settings based on LOD
            const currentLevelConfig = config.levels[newLevel];

            // Adjust quality based on LOD capability
            if (currentLevelConfig && !currentLevelConfig.shadows) {
                // Could trigger shadow quality reduction here
            }
        }
    });

    const updateVisibility = (level: number) => {
        setCurrentLevel(level);

        meshRefs.current.forEach((mesh, index) => {
            if (mesh) {
                mesh.visible = index === level;
            }
        });
    };

    // Initialize visibility
    useEffect(() => {
        updateVisibility(0);
    }, []);

    // Get current LOD level config
    const currentConfig = config.levels[Math.min(currentLevel, config.levels.length - 1)];

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {geometries.map((geo, index) => (
                <mesh
                    key={`${config.id}-lod-${index}`}
                    ref={(el) => { if (el) meshRefs.current[index] = el; }}
                    geometry={geo}
                    material={material}
                    visible={index === 0}
                    castShadow={currentConfig?.shadows ?? true}
                    receiveShadow={currentConfig?.shadows ?? true}
                    frustumCulled={index > 0} // Only frustum cull lower LODs
                >
                    {index === 0 && children}
                </mesh>
            ))}

            {/* Debug visualization */}
            {debug && (
                <DebugLODVisualizer
                    config={config}
                    currentLevel={currentLevel}
                    position={position}
                />
            )}
        </group>
    );
};

// Debug component to visualize LOD boundaries
const DebugLODVisualizer: React.FC<{
    config: LODConfig;
    currentLevel: number;
    position: [number, number, number];
}> = ({ config, currentLevel: _currentLevel, position }) => {
    const { camera } = useThree();
    const lineRef = useRef<THREE.Line>(null);

    useFrame(() => {
        if (!lineRef.current) return;

        const _dist = new THREE.Vector3(...position).distanceTo(camera.position);
        lineRef.current.visible = true;

        // Update debug text
    });

    const _points = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        config.levels.forEach((level) => {
            const angle = (level.distance / 50) * Math.PI;
            pts.push(new THREE.Vector3(
                Math.cos(angle) * level.distance,
                Math.sin(angle) * level.distance,
                0
            ));
        });
        return pts;
    }, [config]);

    return null; // Debug visualization disabled by default
};

// Higher-order component for automatic LOD management
export const withLOD = <P extends object>(
    Component: React.ComponentType<P>,
    lodConfig: LODConfig | string
) => {
    return (props: P) => {
        const config = typeof lodConfig === 'string'
            ? DEFAULT_LOD_CONFIGS[lodConfig]
            : lodConfig;

        if (!config) {
            console.warn(`[LOD] Unknown LOD config: ${lodConfig}`);
            return <Component {...props} />;
        }

        return (
            <LODMesh
                config={config}
                position={(props as unknown as { position?: [number, number, number] }).position}
            >
                <Component {...props} />
            </LODMesh>
        );
    };
};

// Hook for manual LOD control
export const useLOD = (_config: LODConfig) => {
    const [lodLevel, setLodLevel] = useState(0);
    const { camera: _camera } = useThree();
    const [distance, setDistance] = useState(0);
    const distanceRef = useRef(0);

    useFrame(() => {
        // This would be connected to actual object positions in practice
        if (distanceRef.current !== distance) {
            setDistance(distanceRef.current);
        }
    });

    return {
        lodLevel,
        setLodLevel,
        distance,
    };
};

// Manager for global LOD settings
class LODManager {
    private static instance: LODManager;
    private globalQualityMultiplier: number = 1.0;
    private listeners: Set<() => void> = new Set();

    private constructor() { }

    static getInstance(): LODManager {
        if (!LODManager.instance) {
            LODManager.instance = new LODManager();
        }
        return LODManager.instance;
    }

    setGlobalQuality(multiplier: number): void {
        this.globalQualityMultiplier = Math.max(0.1, Math.min(1.0, multiplier));
        this.notifyListeners();
    }

    getGlobalQuality(): number {
        return this.globalQualityMultiplier;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    // Calculate effective LOD level based on distance and quality
    calculateLODLevel(distance: number, levels: LODLevel[]): number {
        const adjustedDistance = distance / this.globalQualityMultiplier;

        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            if (level && adjustedDistance >= level.distance) {
                return i;
            }
        }
        return levels.length - 1;
    }
}

export const getLODManager = LODManager.getInstance;

export default LODMesh;
