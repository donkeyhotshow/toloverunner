/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThreeElements } from '@react-three/fiber';
import React from 'react';

/**
 * Re-export ThreeElements from R3F for JSX intrinsic elements
 * This provides proper typing for all Three.js elements in JSX
 *
 * Usage in components is automatic - R3F handles the JSX namespace augmentation
 * We only need to ensure the types are available globally
 */
declare global {
  namespace JSX {
    // Extend IntrinsicElements with ThreeElements from R3F
    interface IntrinsicElements extends ThreeElements { }
  }
  // Global debug flag (defined in vite.config.ts). Расширения Window/Performance — в types/global.d.ts
  const __DEBUG__: boolean;
}

// --- Game Status ---
export enum GameStatus {
  MENU = 'MENU',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  STATS = 'STATS',
  SHOWCASE = 'SHOWCASE'
}

// --- Object Types ---
export enum ObjectType {
  // Obstacles
  OBSTACLE = 'OBSTACLE',
  OBSTACLE_JUMP = 'OBSTACLE_JUMP',     // Low barriers - jump over only
  OBSTACLE_DODGE = 'OBSTACLE_DODGE',   // High walls - dodge sideways only
  OBSTACLE_SLIDE = 'OBSTACLE_SLIDE',   // Hanging obstacles - slide under only

  // Worms (Helminths) - Globus Wormius
  GLOBUS_NORMAL = 'GLOBUS_NORMAL',
  GLOBUS_ANGRY = 'GLOBUS_ANGRY',
  GLOBUS_BOSS = 'GLOBUS_BOSS',
  GLOBUS_WORM = 'GLOBUS_WORM',
  GLOBUS_VULGARIS = 'GLOBUS_VULGARIS',
  GLOBUS_IRRITATUS = 'GLOBUS_IRRITATUS',
  GLOBUS_MAXIMUS = 'GLOBUS_MAXIMUS',

  // Electric Worms (Vermis)
  VERMIS_ELECTRICUS = 'VERMIS_ELECTRICUS',
  VERMIS_OSCILLANS = 'VERMIS_OSCILLANS',

  // Bacteria (Prokaryotes) - Blockers
  BACTERIA_LOW = 'BACTERIA_LOW',
  BACTERIA_MID = 'BACTERIA_MID',
  BACTERIA_WALL = 'BACTERIA_WALL',
  BACTERIA_HAPPY = 'BACTERIA_HAPPY',
  BACTERIA_BLOCKER = 'BACTERIA_BLOCKER',
  COCCUS_SIMPLEX = 'COCCUS_SIMPLEX',
  BACILLUS_MAGNUS = 'BACILLUS_MAGNUS',
  STREPTOCOCCUS_CHAIN = 'STREPTOCOCCUS_CHAIN',
  BACTERIUM_FELIX = 'BACTERIUM_FELIX',
  BACTERIUM_SPORE = 'BACTERIUM_SPORE',
  BACTERIUM_FLAGELLUM = 'BACTERIUM_FLAGELLUM',

  // Viruses (Pathogens) - Coronus Jokus
  VIRUS_KILLER_LOW = 'VIRUS_KILLER_LOW',
  VIRUS_KILLER_HIGH = 'VIRUS_KILLER_HIGH',
  VIRUS_CORONA = 'VIRUS_CORONA',
  VIRUS_MOBILIS = 'VIRUS_MOBILIS',
  VIRUS_GIGANTUS = 'VIRUS_GIGANTUS',
  VIRUS_INVISIBLE = 'VIRUS_INVISIBLE',

  // Immune Cells (Defenders)
  IMMUNE_PATROL = 'IMMUNE_PATROL',
  IMMUNE_CELL = 'IMMUNE_CELL',
  LEUKOCYTE_PATROL = 'LEUKOCYTE_PATROL',
  NEUTROPHIL_AGGRESSIVE = 'NEUTROPHIL_AGGRESSIVE',
  MACROPHAGE_GIANT = 'MACROPHAGE_GIANT',
  MAST_CELL = 'MAST_CELL',

  // Membranes (Structures)
  MEMBRANE_WALL = 'MEMBRANE_WALL',
  CELL_MEMBRANE = 'CELL_MEMBRANE',
  MEMBRANA_SIMPLEX = 'MEMBRANA_SIMPLEX',
  MEMBRANA_GLUTINOSA = 'MEMBRANA_GLUTINOSA',
  MEMBRANA_ROTANS = 'MEMBRANA_ROTANS',
  MEMBRANA_OBSCURA = 'MEMBRANA_OBSCURA',

  // Combat v2.4.0
  LOW = 'LOW',       // Low obstacle (jump)
  HIGH = 'HIGH',     // High obstacle (slide)
  COMBAT = 'COMBAT', // Combat enemy (Jump Attack UP+DOWN)

  // Powerups
  COIN = 'COIN',
  MAGNET = 'MAGNET',
  MEMBRANE_SHIELD = 'MEMBRANE_SHIELD',
  SPEED_BOOST = 'SPEED_BOOST',

  // Legacy aliases
  GENE = 'GENE',
  DNA_HELIX = 'DNA_HELIX',
  SHOP_PORTAL = 'SHOP_PORTAL',
  JUMP_BAR = 'JUMP_BAR',

  /** @deprecated Use MEMBRANE_SHIELD */
  SHIELD = 'MEMBRANE_SHIELD',
  /** @deprecated Use VIRUS_KILLER_LOW */
  VIRUS_KILLER = 'VIRUS_KILLER_LOW',
}

// --- ObjectType Category Groups ---
export const ObstacleTypes = [
  ObjectType.OBSTACLE,
  ObjectType.OBSTACLE_JUMP,
  ObjectType.OBSTACLE_DODGE,
  ObjectType.OBSTACLE_SLIDE,
] as const;

export const WormTypes = [
  ObjectType.GLOBUS_NORMAL,
  ObjectType.GLOBUS_ANGRY,
  ObjectType.GLOBUS_BOSS,
  ObjectType.GLOBUS_WORM,
  ObjectType.GLOBUS_VULGARIS,
  ObjectType.GLOBUS_IRRITATUS,
  ObjectType.GLOBUS_MAXIMUS,
  ObjectType.VERMIS_ELECTRICUS,
  ObjectType.VERMIS_OSCILLANS,
] as const;

export const BacteriumTypes = [
  ObjectType.BACTERIA_LOW,
  ObjectType.BACTERIA_MID,
  ObjectType.BACTERIA_WALL,
  ObjectType.BACTERIA_HAPPY,
  ObjectType.BACTERIA_BLOCKER,
  ObjectType.COCCUS_SIMPLEX,
  ObjectType.BACILLUS_MAGNUS,
  ObjectType.STREPTOCOCCUS_CHAIN,
  ObjectType.BACTERIUM_FELIX,
  ObjectType.BACTERIUM_SPORE,
  ObjectType.BACTERIUM_FLAGELLUM,
] as const;

export const VirusTypes = [
  ObjectType.VIRUS_KILLER_LOW,
  ObjectType.VIRUS_KILLER_HIGH,
  ObjectType.VIRUS_CORONA,
  ObjectType.VIRUS_MOBILIS,
  ObjectType.VIRUS_GIGANTUS,
  ObjectType.VIRUS_INVISIBLE,
] as const;

export const ImmuneTypes = [
  ObjectType.IMMUNE_PATROL,
  ObjectType.IMMUNE_CELL,
  ObjectType.LEUKOCYTE_PATROL,
  ObjectType.NEUTROPHIL_AGGRESSIVE,
  ObjectType.MACROPHAGE_GIANT,
  ObjectType.MAST_CELL,
] as const;

export const MembraneTypes = [
  ObjectType.MEMBRANE_WALL,
  ObjectType.CELL_MEMBRANE,
  ObjectType.MEMBRANA_SIMPLEX,
  ObjectType.MEMBRANA_GLUTINOSA,
  ObjectType.MEMBRANA_ROTANS,
  ObjectType.MEMBRANA_OBSCURA,
] as const;

export const PowerupTypes = [
  ObjectType.COIN,
  ObjectType.MAGNET,
  ObjectType.MEMBRANE_SHIELD,
  ObjectType.SPEED_BOOST,
] as const;

export const CombatTypes = [
  ObjectType.LOW,
  ObjectType.HIGH,
  ObjectType.COMBAT,
] as const;

// --- Obstacle Behavior Types ---
export enum ObstacleType {
  JUMP_ONLY = 'JUMP_ONLY',     // Низкие барьеры - только прыжок
  DODGE_ONLY = 'DODGE_ONLY',   // Высокие стены - только обход сбоку
  SLIDE_ONLY = 'SLIDE_ONLY',   // Висячие препятствия - только скольжение
  FATAL = 'FATAL',             // Миттєва смерть (Virus)
  TRAMPOLINE = 'TRAMPOLINE'    // Можна застрибнути зверху (Globus)
}

// --- Maze Pattern Types (like Subway Surf) ---
export enum MazePatternType {
  SINGLE_BARRIER = 'SINGLE_BARRIER',           // Одиночное препятствие
  DOUBLE_CHOICE = 'DOUBLE_CHOICE',             // Выбор из 2 путей
  TRIPLE_CHALLENGE = 'TRIPLE_CHALLENGE',       // Сложная комбинация на 3 полосах
  ZIGZAG_SEQUENCE = 'ZIGZAG_SEQUENCE',         // Зигзаг последовательность
  TUNNEL_SQUEEZE = 'TUNNEL_SQUEEZE',           // Сужение туннеля
  VERTICAL_COMBO = 'VERTICAL_COMBO',           // Вертикальная комбинация (прыжок+скольжение)
  SIDE_TO_SIDE = 'SIDE_TO_SIDE',              // Из стороны в сторону
  ESCALATING_DIFFICULTY = 'ESCALATING_DIFFICULTY' // Нарастающая сложность
}

// --- Game Modes ---
export enum GameMode {
  ENDLESS = 'ENDLESS',  // Singleplayer Standard
  TIME_ATTACK = 'TIME_ATTACK', // Race against clock
  TRAINING = 'TRAINING', // No death
  RACE = 'RACE', // Multiplayer Race
  COOP = 'COOP'  // Multiplayer Co-op
}

// --- Character Types ---
export enum CharacterType {
  X = 'X', // Graceful, Shield focused
  Y = 'Y'  // Speed, Dash focused
}

// --- Biome Configuration ---
export interface BiomeConfig {
  color: string;
  fogDensity: number;
  roadColor: string;
  wallColor: string;
  glowColor: string;
  accentColor: string;
  ambientColor?: string;
  fogColor?: string;
  light?: string;
  speed?: number;
  intensity?: number;
}

// --- Biomes ---
export enum BiomeType {
  FALLOPIAN_TUBE = 'FALLOPIAN_TUBE',
  BIO_JUNGLE = 'BIO_JUNGLE',
  VEIN_TUNNEL = 'VEIN_TUNNEL',
  EGG_ZONE = 'EGG_ZONE',
  SPERM_DUCT = 'SPERM_DUCT',
  OVARY_CORRIDOR = 'OVARY_CORRIDOR',
  FALLOPIAN_EXPRESS = 'FALLOPIAN_EXPRESS',
  IMMUNE_SYSTEM = 'IMMUNE_SYSTEM'
}

// --- Game Object ---
export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number];
  active: boolean;
  color?: string;
  points?: number;
  rotationSpeed?: number;
  scale?: [number, number, number];
  // 🚧 NEW: Obstacle-specific properties
  obstacleType?: ObstacleType;
  mazePatternId?: string;
  requiredAction?: 'jump' | 'dodge' | 'slide';
  height?: number;  // For different obstacle heights
  width?: number;   // For different obstacle widths
  properties?: Record<string, unknown>;
  collecting?: number; // 🎯 SPEC: Time remaining for "suck-in" animation (0..1)
}

// --- Shop Item ---
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ComponentType<unknown>;
  oneTime?: boolean;
}

// --- Player State ---
export interface PlayerState {
  lane: number;
  isJumping: boolean;
  isDoubleJumping: boolean;
  isGrounded: boolean;
  isSliding: boolean;
  isDead: boolean;
  rotation: number;
  characterType?: CharacterType;
  timestamp?: number;
  position: readonly [number, number, number];
  velocity: readonly [number, number, number];
  // === COMBAT SYSTEM v2.4.0 ===
  attackState?: 'none' | 'attacking_up' | 'attacking_down'; // Стан атаки
  combatScore?: number; // Очки за знищення ворогів
}

// --- Game State ---
export interface GameState {
  // === Combat & Combo v2.4.0 ===
  combo: number;
  comboTimer: number;
  multiplier: number;
  maxCombo: number;
  attackState: 'none' | 'up' | 'down';
  attackTimer: number;
  speedLinesActive: boolean;
  dnaCards: DNACard[];
  isDashing: boolean;
}

// --- Gameplay Actions ---
export interface GameplayActions {
  setAttack: (state: 'none' | 'up' | 'down') => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  updateCombo: (delta: number) => void;
  collectDNACard: (card: DNACard) => void;
}

// --- Combat Types ---
export interface CombatAttack {
    type: 'up' | 'down' | 'left' | 'right';
    hitbox: {
        width: number;
        height: number;
        depth: number;
        offsetX: number;
        offsetY: number;
        offsetZ: number;
    };
    duration: number; // ms
    damage: number;
}

export interface DNACard {
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    color: string;
    effect: {
        type: 'magnet_duration' | 'double_jump' | 'shield_interval' | 'speed_boost' | 'score_multiplier';
        value: number;
    };
    starLevel: number; // 1-5
    owned: boolean;
}

// --- Obstacle Pattern System ---
export interface ObstaclePattern {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  length: number; // Длина паттерна в единицах
  objects: PatternObject[];
  tags: string[]; // Теги для фильтрации (jump, dodge, speed, etc.)
  description?: string;
  minSpeed?: number; // Минимальная скорость для использования
  maxSpeed?: number; // Максимальная скорость для использования
}

export interface PatternObject {
  type: ObjectType;
  lane: number; // -2 to 2 (5 полос)
  offset: number; // Смещение по Z относительно начала паттерна
  height?: number; // Высота для прыжковых препятствий (0 = ground, 1 = jump height, 2 = high jump)
  timing?: number; // Тайминг для движущихся объектов
  requiredAction?: 'jump' | 'dodge' | 'slide' | 'none';
  properties?: Record<string, unknown>; // Дополнительные свойства
}

// --- Pattern Categories ---
export enum PatternCategory {
  TUTORIAL = 'TUTORIAL',           // Обучающие паттерны
  BASIC = 'BASIC',                 // Базовые паттерны
  COMBO = 'COMBO',                 // Комбинированные действия
  SPEED = 'SPEED',                 // Для высокой скорости
  PRECISION = 'PRECISION',         // Требуют точности
  ENDURANCE = 'ENDURANCE',         // Длинные последовательности
  BOSS = 'BOSS'                    // Особо сложные паттерны
}

// --- Pattern Generation Config ---
export interface PatternGenerationConfig {
  difficulty: number; // 0-1
  speed: number;
  playerSkill: number; // 0-1 based on performance
  recentPatterns: string[]; // Избегать повторений
  preferredCategories: PatternCategory[];
  maxLength: number;
  minGap: number; // Минимальный зазор между паттернами
}

// --- NETWORK MESSAGES ---

export enum NetworkMessageType {
  HANDSHAKE = 'handshake',
  INPUT = 'input',
  SNAPSHOT = 'snapshot',
  TDI_TELEMETRY = 'tdi_telemetry',
  EVENT = 'event'
}

export interface HandshakePacket {
  type: NetworkMessageType.HANDSHAKE;
  clientId: string;
  version: string;
  authToken?: string;
}

export interface InputPacket {
  type: NetworkMessageType.INPUT;
  tick: number;
  clientId: string;
  lane: number;
  action: 'none' | 'left' | 'right' | 'jump' | 'slide' | 'dash';
  timestamp: number;
}

export interface RemotePlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  vel: number;
}

export interface RemoteObstacleState {
  id: string;
  lane: number;
  type: string;
  state: string;
}

export interface SnapshotPacket {
  type: NetworkMessageType.SNAPSHOT;
  tick: number;
  players: RemotePlayerState[];
  obstacles: RemoteObstacleState[];
  globalTdi: number;
}

export interface TDITelemetryPacket {
  type: NetworkMessageType.TDI_TELEMETRY;
  clientId: string;
  tick: number;
  tdi: number;
  visibleObstacles: number;
  localFps: number;
  timestamp: number;
}

export interface GameEventPacket {
  type: NetworkMessageType.EVENT;
  eventId: string;
  tick: number;
  eventType: string;
  payload: Record<string, unknown>;
}

export type NetworkPacket = 
  | HandshakePacket 
  | InputPacket 
  | SnapshotPacket 
  | TDITelemetryPacket 
  | GameEventPacket;

// Note: public runtime scripts are loaded dynamically; avoid static module declarations for absolute paths.
