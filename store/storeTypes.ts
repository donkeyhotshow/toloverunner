/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameStatus, GameMode, CharacterType, PlayerState, BiomeType, SnapshotPacket } from '../types';
import { ProceduralSystem } from '../components/System/Procedural';

// --- UI SLICE ---
export interface UISlice {
   status: GameStatus; // Serves as the master state for menu/shop/playing
   isMusicEnabled: boolean;
   menuOpen: boolean; // Derived/Helper
   shopOpen: boolean; // Derived/Helper
   currentModal: string | null;
   showDebug: boolean;
   /** Единый источник правды: сцена/загрузка приложения готова (App + PostProcessing). См. IMPROVEMENTS_BACKLOG 1.2 */
   gameSceneReady: boolean;
   showPopups: boolean;
   zenMode: boolean;
   /** Pulse value for vitality bar and tunnel synchronization (0-1) */
   vitalityPulse: number;


   setStatus: (status: GameStatus) => void;
   setGameSceneReady: (value: boolean) => void;
   toggleMenu: () => void;
   toggleShop: () => void;
   openModal: (id: string) => void;
   closeModal: () => void;
   toggleMusic: (force?: boolean) => void;
   toggleDebug: () => void;
   setShowPopups: (value: boolean) => void;
   setZenMode: (value: boolean) => void;
   setVitalityPulse: (pulse: number) => void;


   // Helpers
   openShop: () => void;
   closeShop: () => void;
}

// --- SESSION SLICE (Core Gameplay State) ---
export interface SessionSlice {
  // Core Status
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  distance: number;
  status: GameStatus;

  // World & ProcGen
  seed: string;
  procGen: ProceduralSystem;
  biome: BiomeType;
  laneCount: number;

  // Session Stats
  sessionStartTime: number;
  timePlayed: number;
  /** Wall-clock-free game time in seconds. Incremented by fixed dt each tick. Used instead of
   *  performance.now() for all gameplay timing (combo windows, graze debounce, dash chains). */
  gameClock: number;
  nearestEnemyDistance: number;
  difficultyMultiplier: number;

  // 🆕 TDI (Threat Density Index) & Metrics
  tdi: number;
  visibleObstacles: number;
  setVisibleObstacles: (n: number) => void;
  computeTDI: (fps: number) => void;

  // Main Actions
  initGame: () => void;
  startGame: (mode?: GameMode) => void;
  setGameMode: (mode: GameMode) => void;
  startGameplay: () => void;
  restartGame: () => void;
  resetGame: () => void;
  revive: () => boolean;

  increaseDistance: (delta: number, dt: number) => void;
  setDistance: (dist: number) => void;
  updateGameTimer: (dt: number) => void;
  addScore: (amount: number) => void;
  useLife: () => void;
  setNearestEnemyDistance: (distance: number) => void;
  getDifficulty: () => {
    spawnRate: number;
    virusSpeed: number;
    coinRarity: number;
    obstacleDensity: number;
  };
}

// --- GAMEPLAY SLICE (Abilities & Mechanics) ---
export interface GameplaySlice {
  gameMode: GameMode;
  timeLeft: number;
  momentum: number;

  // Progression / upgrades (persisted)
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  luckLevel: number;

  // Combo System
  combo: number;
  comboTimer: number;
  multiplier: number;
  maxCombo: number;
  lastCollectTime: number;
  /** Separate dedup timer for graze scoring (independent from coin collection). */
  lastGrazeTime: number;
  perfectTimingBonus: number;

  // Combat System v2.4.0
  attackState: 'none' | 'up' | 'down';
  attackTimer: number;
  speedLinesActive: boolean;

  // Dash Mechanic
  dashCooldown: number;
  isDashing: boolean;
  isInvincible: boolean;
  invincibilityTimer: number;
  deathTimer: number;
  lastDashTime?: number;
  dashChainCount?: number;

  // Powerups
  magnetActive: boolean;
  magnetTimer: number;
  magnetLevel: number;
  shieldActive: boolean;
  shieldTimer: number;
  speedBoostActive: boolean;
  speedBoostTimer: number;
  isSpeedBoostActive: boolean; // Visual flag
  isImmortalityActive: boolean; // Visual flag

  /**
   * Progression-driven speed without any powerup modifiers.
   * slowDown() and activateSpeedBoost() derive `speed` from this value
   * so that boosts/slows never permanently corrupt the progression curve.
   */
  baseSpeed: number;
  /**
   * Active slow effects from environmental hazards (e.g. immune-cell slow).
   * Each entry stores `remainingTime` in **seconds** (decremented by fixed dt each tick).
   * This is deterministic — no wall-clock timestamps (performance.now) are used.
   * `updateSlowEffects(dt)` decrements and removes expired entries, then recomputes `speed`.
   */
  slowEffects: ReadonlyArray<{ factor: number; remainingTime: number }>;

  // === DNA CARD COLLECTION v2.4.0 ===
  dnaCards: Array<{
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    color: string;
    effect: { type: string; value: number };
    starLevel: number;
    owned: boolean;
  }>;

  // Mechanics Actions
  collectCoin: (points: number) => void;
  collectGene: () => void;
  graze: () => void;
  takeDamage: (obj?: { type?: string | number }) => void;
  slowDown: (factor?: number, duration?: number) => void;
  /** Decrement remainingTime on all slow effects by dt (seconds) and recompute speed. Call once per fixed tick. */
  updateSlowEffects: (dt: number) => void;
  bacteriaJumpBonus: () => void;
  jump: () => void;
  stopJump: () => void;
  dash: () => void;
  updateDashCooldown: (delta: number) => void;
  activateShield: () => void;
  activateSpeedBoost: () => void;
  activateMagnet: () => void;
  updateShieldTimer: (delta: number) => void;
  updateMagnetTimer: (delta: number) => void;
  updateSpeedBoostTimer: (delta: number) => void;
  updateInvincibilityTimer: (delta: number) => void;
  updateDeathTimer: (delta: number) => void;

  // Combat Actions
  setAttack: (state: 'none' | 'up' | 'down') => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  updateCombo: (delta: number) => void;

  // DNA Card Actions
  collectDNACard: (card: { id: string; name: string; rarity: string; color: string; effect: { type: string; value: number }; starLevel: number }) => void;

  /** Отменяет все отложенные таймеры геймплея (invincibility, dash, game over). Вызывать при reset/restart. */
  clearPendingGameplayTimeouts: () => void;
  /** Внутренняя регистрация таймера для последующей отмены. */
  registerGameplayTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

// --- PLAYER SLICE (Visuals & Customization) ---
export interface PlayerSlice {
  localPlayerState: PlayerState;
  characterType: CharacterType;

  // Customization
  ownedSkins: string[];
  currentSkin: string;
  gems: number;
  genesCollected: number;

  // Visual FX
  particlesActive: boolean;
  emitPos: [number, number, number];

  // Player Actions
  setLocalPlayerState: (update: Partial<PlayerState>) => void;
  setCharacterType: (t: CharacterType) => void;
  purchaseSkin: (skinId: string, cost: number) => boolean;
  equipSkin: (skinId: string) => void;
  setParticlesActive: (active: boolean, pos?: [number, number, number]) => void;
}


// --- PERSISTENCE SLICE ---
export interface PlayerStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  bestScore: number;
  totalScore: number;
  totalPlayTime: number; // ms
}

export interface PersistenceSlice {
  stats: PlayerStats;
  playerColor: string;

  loadData: () => void;
  endGameSession: (finalScore: number, durationMs: number) => void;
  saveData: (force?: boolean) => void;
  clearData: () => void;

  setPlayerColor: (color: string) => void;
  buyItem: (itemId: string, cost: number) => void;
}

// --- NETWORK TYPES ---
export interface PredictedPlayerState {
  position: readonly [number, number, number];
  velocity: readonly [number, number, number];
  timestamp: number;
}

export interface PredictionEngine {
  /**
   * Получает предсказанное состояние игрока на основе сетевых данных
   * @returns Предсказанное состояние или null, если данных недостаточно
   */
  getPredictedState(): PredictedPlayerState | null;

  /**
   * Обновляет состояние предсказания на основе полученных данных
   * @param state Полученное состояние от сети
   * @param timestamp Временная метка получения данных
   */
  updateState?(state: PlayerState, timestamp: number): void;

  /**
   * Сбрасывает состояние предсказания
   */
  reset?(): void;
}

// --- NETWORK SLICE ---
export interface NetworkSlice {
  isMultiplayer: boolean;
  roomCode: string | null;
  remotePlayerId: string | null;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  remotePlayerColor: string;
  remotePlayerState: PlayerState;
  predictionEngine: PredictionEngine;

  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  disconnectMultiplayer: () => void;
  sendPlayerUpdate: (
    lane: number,
    isJumping: boolean,
    isDoubleJumping: boolean,
    isDead: boolean,
    position: readonly [number, number, number],
    velocity: readonly [number, number, number]
  ) => void;
  toggleReady: () => void;
  handleSnapshot: (snapshot: SnapshotPacket) => void;
}

import { ProgressionSlice } from './progressionSlice';

// --- COMBINED STORE ---
export type GameState = SessionSlice & GameplaySlice & PlayerSlice & UISlice & PersistenceSlice & ProgressionSlice & NetworkSlice & {
  init: () => void;
  isStoreInitialized: boolean;
  metrics: { fps: number; ping: number };
};
