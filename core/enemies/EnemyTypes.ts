/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enemy Types Configuration - 15 unique enemy types
 */

export enum EnemyType {
    // 🪱 ГЕЛЬМІНТИ
    GLOBUS_VULGARIS = 'GLOBUS_VULGARIS',
    GLOBUS_IRRITATUS = 'GLOBUS_IRRITATUS',
    GLOBUS_MAXIMUS = 'GLOBUS_MAXIMUS',
    VERMIS_ELECTRICUS = 'VERMIS_ELECTRICUS',
    VERMIS_OSCILLANS = 'VERMIS_OSCILLANS',
    
    // 🦠 ПРОКАРІОТИ
    COCCUS_SIMPLEX = 'COCCUS_SIMPLEX',
    BACILLUS_MAGNUS = 'BACILLUS_MAGNUS',
    STREPTOCOCCUS_CHAIN = 'STREPTOCOCCUS_CHAIN',
    BACTERIUM_FELIX = 'BACTERIUM_FELIX',
    BACTERIUM_SPORE = 'BACTERIUM_SPORE',
    BACTERIUM_FLAGELLUM = 'BACTERIUM_FLAGELLUM',
    
    // 🔴 ПАТОГЕНИ
    VIRUS_CORONA = 'VIRUS_CORONA',
    VIRUS_MOBILIS = 'VIRUS_MOBILIS',
    VIRUS_GIGANTUS = 'VIRUS_GIGANTUS',
    VIRUS_INVISIBLE = 'VIRUS_INVISIBLE',
    
    // ⚪ ЗАХИСНИКИ
    LEUKOCYTE_PATROL = 'LEUKOCYTE_PATROL',
    NEUTROPHIL_AGGRESSIVE = 'NEUTROPHIL_AGGRESSIVE',
    MACROPHAGE_GIANT = 'MACROPHAGE_GIANT',
    MAST_CELL = 'MAST_CELL',
    
    // 🔵 СТРУКТУРИ
    MEMBRANA_SIMPLEX = 'MEMBRANA_SIMPLEX',
    MEMBRANA_GLUTINOSA = 'MEMBRANA_GLUTINOSA',
    MEMBRANA_ROTANS = 'MEMBRANA_ROTANS',
    MEMBRANA_OBSCURA = 'MEMBRANA_OBSCURA',

    // Технічні/архівні (можна поступово перевести або залишити для сумісності)
    SPIKE_VIRUS = 'spike_virus',
    HEX_BLOCKER = 'hex_blocker',
    STAR_SPIKER = 'star_spiker',
    THROMBUS_BLOB = 'thrombus_blob',
    DART_SHOOTER = 'dart_shooter',
    JUMP_POD = 'jump_pod',
    MINI_BOSS = 'mini_boss'
}

export enum EyeEmotion {
    NEUTRAL = 'neutral',
    ANGRY = 'angry',
    SHOCKED = 'shocked'
}

export enum SpawnTier {
    EARLY = 'early',   // 70% spawn rate
    MID = 'mid',       // 20% spawn rate
    LATE = 'late',     // 10% spawn rate
    BOSS = 'boss'      // Special waves only
}

export interface EnemyConfig {
    type: EnemyType;
    name: string;

    // Visual
    baseColor: string;
    emissiveColor: string;
    emissiveIntensity: number;
    scale: number;

    // Geometry
    geometryType: 'icosahedron' | 'cylinder' | 'sphere' | 'custom';
    subdivisions: number;
    noiseAmplitude: number;
    spikeCount?: number;
    spikeLength?: number;

    // Eyes
    eyeSize: number;
    eyeEmotion: EyeEmotion;
    eyeBlinkInterval: number; // seconds

    // Animation
    rotationSpeed: [number, number, number]; // X, Y, Z rad/s
    pulseScale: number; // 1.0 = no pulse
    pulseSpeed: number;

    // Behavior
    damage: number;
    health: number;
    spawnTier: SpawnTier;
    behavior: 'static' | 'spin' | 'hop' | 'shoot' | 'split';

    // Effects
    glowIntensity: number;
    trailEnabled: boolean;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
    // --- 🪱 ГЕЛЬМІНТИ ---
    [EnemyType.GLOBUS_VULGARIS]: {
        type: EnemyType.GLOBUS_VULGARIS, name: 'Globus Vulgaris',
        baseColor: '#FFB6C1', emissiveColor: '#FFC0CB', emissiveIntensity: 0.2, scale: 1.0,
        geometryType: 'icosahedron', subdivisions: 2, noiseAmplitude: 0.1,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 4.0,
        rotationSpeed: [0, 0.2, 0], pulseScale: 1.05, pulseSpeed: 1.0,
        damage: 1, health: 3, spawnTier: SpawnTier.EARLY, behavior: 'static',
        glowIntensity: 0.5, trailEnabled: false
    },
    [EnemyType.GLOBUS_IRRITATUS]: {
        type: EnemyType.GLOBUS_IRRITATUS, name: 'Globus Irritatus',
        baseColor: '#FF69B4', emissiveColor: '#FF1493', emissiveIntensity: 0.4, scale: 1.1,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.25,
        eyeSize: 0.35, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 2.0,
        rotationSpeed: [0, 0.5, 0], pulseScale: 1.1, pulseSpeed: 3.0,
        damage: 1, health: 5, spawnTier: SpawnTier.MID, behavior: 'spin',
        glowIntensity: 1.0, trailEnabled: true
    },
    [EnemyType.GLOBUS_MAXIMUS]: {
        type: EnemyType.GLOBUS_MAXIMUS, name: 'Globus Maximus',
        baseColor: '#DB7093', emissiveColor: '#C71585', emissiveIntensity: 0.6, scale: 2.5,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.15,
        eyeSize: 0.5, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 5.0,
        rotationSpeed: [0, 0.1, 0], pulseScale: 1.02, pulseSpeed: 0.5,
        damage: 2, health: 50, spawnTier: SpawnTier.BOSS, behavior: 'static',
        glowIntensity: 1.5, trailEnabled: false
    },
    [EnemyType.VERMIS_ELECTRICUS]: {
        type: EnemyType.VERMIS_ELECTRICUS, name: 'Vermis Electricus',
        baseColor: '#00FFFF', emissiveColor: '#E0FFFF', emissiveIntensity: 0.8, scale: 0.9,
        geometryType: 'cylinder', subdivisions: 2, noiseAmplitude: 0.05,
        eyeSize: 0.25, eyeEmotion: EyeEmotion.SHOCKED, eyeBlinkInterval: 1.0,
        rotationSpeed: [0.5, 0, 0.5], pulseScale: 1.2, pulseSpeed: 5.0,
        damage: 2, health: 2, spawnTier: SpawnTier.MID, behavior: 'spin',
        glowIntensity: 2.0, trailEnabled: true
    },
    [EnemyType.VERMIS_OSCILLANS]: {
        type: EnemyType.VERMIS_OSCILLANS, name: 'Vermis Oscillans',
        baseColor: '#20B2AA', emissiveColor: '#48D1CC', emissiveIntensity: 0.3, scale: 1.0,
        geometryType: 'icosahedron', subdivisions: 2, noiseAmplitude: 0.1,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 3.0,
        rotationSpeed: [0.2, 0.2, 0.2], pulseScale: 1.05, pulseSpeed: 2.0,
        damage: 1, health: 3, spawnTier: SpawnTier.MID, behavior: 'hop',
        glowIntensity: 0.7, trailEnabled: true
    },

    // --- 🦠 ПРОКАРІОТИ ---
    [EnemyType.COCCUS_SIMPLEX]: {
        type: EnemyType.COCCUS_SIMPLEX, name: 'Coccus Simplex',
        baseColor: '#7CFC00', emissiveColor: '#ADFF2F', emissiveIntensity: 0.2, scale: 0.8,
        geometryType: 'sphere', subdivisions: 2, noiseAmplitude: 0.05,
        eyeSize: 0.4, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 4.0,
        rotationSpeed: [0.1, 0.1, 0.1], pulseScale: 1.03, pulseSpeed: 1.0,
        damage: 1, health: 1, spawnTier: SpawnTier.EARLY, behavior: 'static',
        glowIntensity: 0.3, trailEnabled: false
    },
    [EnemyType.BACILLUS_MAGNUS]: {
        type: EnemyType.BACILLUS_MAGNUS, name: 'Bacillus Magnus',
        baseColor: '#32CD32', emissiveColor: '#228B22', emissiveIntensity: 0.2, scale: 1.5,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0.1,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 3.0,
        rotationSpeed: [0, 0.3, 0], pulseScale: 1.05, pulseSpeed: 1.5,
        damage: 1, health: 5, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 0.5, trailEnabled: false
    },
    [EnemyType.STREPTOCOCCUS_CHAIN]: {
        type: EnemyType.STREPTOCOCCUS_CHAIN, name: 'Streptococcus Chain',
        baseColor: '#ADFF2F', emissiveColor: '#9ACD32', emissiveIntensity: 0.3, scale: 0.9,
        geometryType: 'sphere', subdivisions: 2, noiseAmplitude: 0.1,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 2.5,
        rotationSpeed: [0.5, 0, 0], pulseScale: 1.1, pulseSpeed: 2.0,
        damage: 1, health: 3, spawnTier: SpawnTier.MID, behavior: 'spin',
        glowIntensity: 0.6, trailEnabled: true
    },
    [EnemyType.BACTERIUM_FELIX]: {
        type: EnemyType.BACTERIUM_FELIX, name: 'Bacterium Felix',
        baseColor: '#FFD700', emissiveColor: '#DAA520', emissiveIntensity: 0.5, scale: 0.8,
        geometryType: 'sphere', subdivisions: 3, noiseAmplitude: 0.2,
        eyeSize: 0.45, eyeEmotion: EyeEmotion.SHOCKED, eyeBlinkInterval: 1.5,
        rotationSpeed: [1.0, 1.0, 1.0], pulseScale: 1.15, pulseSpeed: 4.0,
        damage: 1, health: 1, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 1.2, trailEnabled: true
    },
    [EnemyType.BACTERIUM_SPORE]: {
        type: EnemyType.BACTERIUM_SPORE, name: 'Bacterium Spore',
        baseColor: '#2F4F4F', emissiveColor: '#000000', emissiveIntensity: 0.1, scale: 0.4,
        geometryType: 'sphere', subdivisions: 1, noiseAmplitude: 0.3,
        eyeSize: 0, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 0,
        rotationSpeed: [0, 0, 0], pulseScale: 1.0, pulseSpeed: 0,
        damage: 1, health: 1, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 0, trailEnabled: false
    },
    [EnemyType.BACTERIUM_FLAGELLUM]: {
        type: EnemyType.BACTERIUM_FLAGELLUM, name: 'Bacterium Flagellum',
        baseColor: '#556B2F', emissiveColor: '#6B8E23', emissiveIntensity: 0.4, scale: 1.0,
        geometryType: 'icosahedron', subdivisions: 2, noiseAmplitude: 0.15,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 2.0,
        rotationSpeed: [0, 0, 1.5], pulseScale: 1.08, pulseSpeed: 3.0,
        damage: 1, health: 4, spawnTier: SpawnTier.MID, behavior: 'shoot',
        glowIntensity: 0.8, trailEnabled: true
    },

    // --- 🔴 ПАТОГЕНИ ---
    [EnemyType.VIRUS_CORONA]: {
        type: EnemyType.VIRUS_CORONA, name: 'Virus Corona',
        baseColor: '#FF0000', emissiveColor: '#8B0000', emissiveIntensity: 0.8, scale: 1.2,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.2,
        eyeSize: 0.4, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 1.0,
        rotationSpeed: [1.0, 1.0, 1.0], pulseScale: 1.1, pulseSpeed: 5.0,
        damage: 9999, health: 10, spawnTier: SpawnTier.LATE, behavior: 'static',
        glowIntensity: 2.0, trailEnabled: true
    },
    [EnemyType.VIRUS_MOBILIS]: {
        type: EnemyType.VIRUS_MOBILIS, name: 'Virus Mobilis',
        baseColor: '#FF4500', emissiveColor: '#FF0000', emissiveIntensity: 0.9, scale: 1.0,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.3,
        eyeSize: 0.35, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 1.5,
        rotationSpeed: [2.0, 2.0, 2.0], pulseScale: 1.15, pulseSpeed: 6.0,
        damage: 9999, health: 5, spawnTier: SpawnTier.LATE, behavior: 'hop',
        glowIntensity: 2.5, trailEnabled: true
    },
    [EnemyType.VIRUS_GIGANTUS]: {
        type: EnemyType.VIRUS_GIGANTUS, name: 'Virus Gigantus',
        baseColor: '#8B0000', emissiveColor: '#FF0000', emissiveIntensity: 1.0, scale: 3.0,
        geometryType: 'icosahedron', subdivisions: 4, noiseAmplitude: 0.1,
        eyeSize: 0.6, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 3.0,
        rotationSpeed: [0.5, 0.5, 0.5], pulseScale: 1.05, pulseSpeed: 2.0,
        damage: 9999, health: 100, spawnTier: SpawnTier.BOSS, behavior: 'static',
        glowIntensity: 3.0, trailEnabled: true
    },
    [EnemyType.VIRUS_INVISIBLE]: {
        type: EnemyType.VIRUS_INVISIBLE, name: 'Virus Invisible',
        baseColor: '#4B0082', emissiveColor: '#8A2BE2', emissiveIntensity: 0.5, scale: 1.2,
        geometryType: 'icosahedron', subdivisions: 2, noiseAmplitude: 0.4,
        eyeSize: 0.2, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 5.0,
        rotationSpeed: [0.1, 0.1, 0.1], pulseScale: 1.3, pulseSpeed: 0.5,
        damage: 9999, health: 1, spawnTier: SpawnTier.LATE, behavior: 'static',
        glowIntensity: 0.2, trailEnabled: false
    },

    // --- ⚪ ЗАХИСНИКИ ---
    [EnemyType.LEUKOCYTE_PATROL]: {
        type: EnemyType.LEUKOCYTE_PATROL, name: 'Leukocyte Patrol',
        baseColor: '#F0F8FF', emissiveColor: '#FFFFFF', emissiveIntensity: 0.5, scale: 1.5,
        geometryType: 'sphere', subdivisions: 3, noiseAmplitude: 0.2,
        eyeSize: 0.5, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 2.0,
        rotationSpeed: [0.2, 0.2, 0], pulseScale: 1.1, pulseSpeed: 1.5,
        damage: 0, health: 20, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 1.0, trailEnabled: false
    },
    [EnemyType.NEUTROPHIL_AGGRESSIVE]: {
        type: EnemyType.NEUTROPHIL_AGGRESSIVE, name: 'Neutrophil Aggressive',
        baseColor: '#FAFAD2', emissiveColor: '#FFFF00', emissiveIntensity: 0.4, scale: 1.2,
        geometryType: 'icosahedron', subdivisions: 2, noiseAmplitude: 0.3,
        eyeSize: 0.4, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 1.5,
        rotationSpeed: [1.0, 1.0, 0], pulseScale: 1.2, pulseSpeed: 3.0,
        damage: 1, health: 10, spawnTier: SpawnTier.MID, behavior: 'hop',
        glowIntensity: 1.2, trailEnabled: true
    },
    [EnemyType.MACROPHAGE_GIANT]: {
        type: EnemyType.MACROPHAGE_GIANT, name: 'Macrophage Giant',
        baseColor: '#FFFFFF', emissiveColor: '#F5F5F5', emissiveIntensity: 0.3, scale: 4.0,
        geometryType: 'sphere', subdivisions: 4, noiseAmplitude: 0.4,
        eyeSize: 0.8, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 4.0,
        rotationSpeed: [0.1, 0.1, 0], pulseScale: 1.2, pulseSpeed: 0.8,
        damage: 0.5, health: 200, spawnTier: SpawnTier.BOSS, behavior: 'static',
        glowIntensity: 0.8, trailEnabled: false
    },
    [EnemyType.MAST_CELL]: {
        type: EnemyType.MAST_CELL, name: 'Mast Cell',
        baseColor: '#FFFFE0', emissiveColor: '#FFD700', emissiveIntensity: 0.6, scale: 1.3,
        geometryType: 'sphere', subdivisions: 2, noiseAmplitude: 0.5,
        eyeSize: 0.3, eyeEmotion: EyeEmotion.SHOCKED, eyeBlinkInterval: 1.0,
        rotationSpeed: [0.5, 0.5, 0.5], pulseScale: 1.4, pulseSpeed: 4.0,
        damage: 1, health: 5, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 1.5, trailEnabled: false
    },

    // --- 🔵 СТРУКТУРИ ---
    [EnemyType.MEMBRANA_SIMPLEX]: {
        type: EnemyType.MEMBRANA_SIMPLEX, name: 'Membrana Simplex',
        baseColor: '#00BFFF', emissiveColor: '#1E90FF', emissiveIntensity: 0.4, scale: 1.0,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0,
        eyeSize: 0, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 0,
        rotationSpeed: [0, 0, 0], pulseScale: 1.02, pulseSpeed: 0.5,
        damage: 99, health: 100, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 0.8, trailEnabled: false
    },
    [EnemyType.MEMBRANA_GLUTINOSA]: {
        type: EnemyType.MEMBRANA_GLUTINOSA, name: 'Membrana Glutinosa',
        baseColor: '#FFD700', emissiveColor: '#DAA520', emissiveIntensity: 0.3, scale: 1.0,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0.2,
        eyeSize: 0, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 0,
        rotationSpeed: [0, 0, 0], pulseScale: 1.05, pulseSpeed: 1.0,
        damage: 0, health: 100, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 0.5, trailEnabled: false
    },
    [EnemyType.MEMBRANA_ROTANS]: {
        type: EnemyType.MEMBRANA_ROTANS, name: 'Membrana Rotans',
        baseColor: '#1E90FF', emissiveColor: '#0000FF', emissiveIntensity: 0.5, scale: 1.0,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0,
        eyeSize: 0, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 0,
        rotationSpeed: [0, 0, 2.0], pulseScale: 1.0, pulseSpeed: 0,
        damage: 99, health: 100, spawnTier: SpawnTier.MID, behavior: 'spin',
        glowIntensity: 1.0, trailEnabled: false
    },
    [EnemyType.MEMBRANA_OBSCURA]: {
        type: EnemyType.MEMBRANA_OBSCURA, name: 'Membrana Obscura',
        baseColor: '#000000', emissiveColor: '#1A1A1A', emissiveIntensity: 0.1, scale: 1.0,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0,
        eyeSize: 0, eyeEmotion: EyeEmotion.NEUTRAL, eyeBlinkInterval: 0,
        rotationSpeed: [0, 0, 0], pulseScale: 1.0, pulseSpeed: 0,
        damage: 0, health: 100, spawnTier: SpawnTier.MID, behavior: 'static',
        glowIntensity: 0, trailEnabled: false
    },
    
    // Технічні / legacy
    [EnemyType.SPIKE_VIRUS]: {
        type: EnemyType.SPIKE_VIRUS,
        name: 'Spike Virus',
        baseColor: '#00FF00',
        emissiveColor: '#00FF00',
        emissiveIntensity: 0.2,
        scale: 1.0,
        geometryType: 'icosahedron',
        subdivisions: 2,
        noiseAmplitude: 0.1,
        spikeCount: 8,
        spikeLength: 0.3,
        eyeSize: 0.3,
        eyeEmotion: EyeEmotion.ANGRY,
        eyeBlinkInterval: 3.0,
        rotationSpeed: [0, 0.5, 0],
        pulseScale: 1.02,
        pulseSpeed: 2.0,
        damage: 1,
        health: 1,
        spawnTier: SpawnTier.EARLY,
        behavior: 'static',
        glowIntensity: 1.0,
        trailEnabled: false
    },
    [EnemyType.HEX_BLOCKER]: {
        type: EnemyType.HEX_BLOCKER,
        name: 'Hex Blocker',
        baseColor: '#006400',
        emissiveColor: '#003200',
        emissiveIntensity: 0.15,
        scale: 1.2,
        geometryType: 'cylinder',
        subdivisions: 1,
        noiseAmplitude: 0.05,
        eyeSize: 0.25,
        eyeEmotion: EyeEmotion.NEUTRAL,
        eyeBlinkInterval: 4.0,
        rotationSpeed: [0, 0.5, 0],
        pulseScale: 1.05,
        pulseSpeed: 1.5,
        damage: 1,
        health: 1,
        spawnTier: SpawnTier.EARLY,
        behavior: 'spin',
        glowIntensity: 0.5,
        trailEnabled: false
    },
    [EnemyType.STAR_SPIKER]: {
        type: EnemyType.STAR_SPIKER,
        name: 'Star Spiker',
        baseColor: '#32CD32',
        emissiveColor: '#32CD32',
        emissiveIntensity: 0.3,
        scale: 0.8,
        geometryType: 'custom',
        subdivisions: 2,
        noiseAmplitude: 0.15,
        spikeCount: 5,
        spikeLength: 0.4,
        eyeSize: 0.28,
        eyeEmotion: EyeEmotion.SHOCKED,
        eyeBlinkInterval: 2.5,
        rotationSpeed: [0.5, 0.5, 0],
        pulseScale: 1.08,
        pulseSpeed: 3.0,
        damage: 1,
        health: 1,
        spawnTier: SpawnTier.EARLY,
        behavior: 'spin',
        glowIntensity: 1.5,
        trailEnabled: true
    },
    [EnemyType.THROMBUS_BLOB]: {
        type: EnemyType.THROMBUS_BLOB,
        name: 'Thrombus Blob',
        baseColor: '#8B0000',
        emissiveColor: '#4B0000',
        emissiveIntensity: 0.25,
        scale: 1.8,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.3,
        eyeSize: 0.35, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 5.0,
        rotationSpeed: [0.1, 0.2, 0.1], pulseScale: 1.15, pulseSpeed: 1.0,
        damage: 2, health: 2, spawnTier: SpawnTier.LATE, behavior: 'static',
        glowIntensity: 0.8, trailEnabled: false
    },
    [EnemyType.DART_SHOOTER]: {
        type: EnemyType.DART_SHOOTER, name: 'Dart Shooter',
        baseColor: '#FF6600', emissiveColor: '#CC4400', emissiveIntensity: 0.4, scale: 1.0,
        geometryType: 'cylinder', subdivisions: 1, noiseAmplitude: 0.08,
        eyeSize: 0.22, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 2.0,
        rotationSpeed: [0, 1.0, 0], pulseScale: 1.03, pulseSpeed: 4.0,
        damage: 1, health: 1, spawnTier: SpawnTier.MID, behavior: 'shoot',
        glowIntensity: 1.2, trailEnabled: false
    },
    [EnemyType.JUMP_POD]: {
        type: EnemyType.JUMP_POD, name: 'Jump Pod',
        baseColor: '#FFAA00', emissiveColor: '#FF8800', emissiveIntensity: 0.3, scale: 0.9,
        geometryType: 'sphere', subdivisions: 2, noiseAmplitude: 0.12,
        eyeSize: 0.26, eyeEmotion: EyeEmotion.SHOCKED, eyeBlinkInterval: 1.5,
        rotationSpeed: [0.2, 0, 0], pulseScale: 1.1, pulseSpeed: 2.5,
        damage: 1, health: 1, spawnTier: SpawnTier.MID, behavior: 'hop',
        glowIntensity: 0.9, trailEnabled: true
    },
    [EnemyType.MINI_BOSS]: {
        type: EnemyType.MINI_BOSS, name: 'Mini Boss',
        baseColor: '#800080', emissiveColor: '#FF00FF', emissiveIntensity: 0.5, scale: 2.0,
        geometryType: 'icosahedron', subdivisions: 3, noiseAmplitude: 0.2,
        eyeSize: 0.5, eyeEmotion: EyeEmotion.ANGRY, eyeBlinkInterval: 3.0,
        rotationSpeed: [0, 0.5, 0], pulseScale: 1.1, pulseSpeed: 2.0,
        damage: 2, health: 20, spawnTier: SpawnTier.BOSS, behavior: 'spin',
        glowIntensity: 1.5, trailEnabled: true
    }
};

// Spawn weights by distance progression
export function getSpawnWeight(type: EnemyType, progress: number): number {
    const config = ENEMY_CONFIGS[type];

    switch (config.spawnTier) {
        case SpawnTier.EARLY:
            return progress < 0.3 ? 0.7 : progress < 0.6 ? 0.2 : 0.1;
        case SpawnTier.MID:
            return progress < 0.3 ? 0.2 : progress < 0.7 ? 0.5 : 0.3;
        case SpawnTier.LATE:
            return progress < 0.5 ? 0.05 : progress < 0.8 ? 0.3 : 0.65;
        case SpawnTier.BOSS:
            return progress > 0.9 ? 0.8 : 0.0;
        default:
            return 0.1;
    }
}
