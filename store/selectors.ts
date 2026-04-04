/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Оптимизированные селекторы для Zustand store
 * Предотвращают лишние ре-рендеры компонентов
 */

import { GameState } from './storeTypes';
import { GameStatus } from '../types';

/**
 * Селектор для игрового статуса
 */
export const selectStatus = (state: GameState) => state.status;

/**
 * Селектор для проверки, играется ли игра
 */
export const selectIsPlaying = (state: GameState) => state.status === GameStatus.PLAYING;

/**
 * Селектор для состояния игрока (только необходимые поля)
 */
export const selectPlayerState = (state: GameState) => ({
  lane: state.localPlayerState.lane,
  isJumping: state.localPlayerState.isJumping,
  position: state.localPlayerState.position,
  velocity: state.localPlayerState.velocity,
});

/**
 * Селектор для игровых метрик (счет, дистанция, жизни)
 */
export const selectGameMetrics = (state: GameState) => ({
  score: state.score,
  distance: state.distance,
  lives: state.lives,
  combo: state.combo,
  maxCombo: state.maxCombo,
});

/**
 * Селектор для power-ups
 */
export const selectPowerUps = (state: GameState) => ({
  shieldActive: state.shieldActive,
  shieldTimer: state.shieldTimer,
  magnetActive: state.magnetActive,
  magnetTimer: state.magnetTimer,
  speedBoostActive: state.speedBoostActive,
  speedBoostTimer: state.speedBoostTimer,
  isImmortalityActive: state.isImmortalityActive,
  isSpeedBoostActive: state.isSpeedBoostActive,
});

/**
 * Селектор для настроек персонажа
 */
export const selectCharacterSettings = (state: GameState) => ({
  characterType: state.characterType,
  playerColor: state.playerColor,
  laneCount: state.laneCount,
});

/**
 * Селектор для процедурной генерации
 */
export const selectProceduralGen = (state: GameState) => ({
  procGen: state.procGen,
  biome: state.biome,
  seed: state.seed,
});

/**
 * Селектор для скорости и сложности
 */
export const selectGameSpeed = (state: GameState) => ({
  speed: state.speed,
  difficultyMultiplier: state.difficultyMultiplier,
});

/**
 * Селектор для WorldLevelManager - объединяет все необходимые данные
 */
export const selectWorldLevelData = (state: GameState) => ({
  status: state.status,
  speed: state.speed,
  laneCount: state.laneCount,
  speedBoostActive: state.speedBoostActive,
  procGen: state.procGen,
  biome: state.biome,
});

/**
 * Селектор для Player - все данные персонажа
 */
export const selectPlayerVisuals = (state: GameState) => ({
  characterType: state.characterType,
  playerColor: state.playerColor,
  isImmortalityActive: state.isImmortalityActive,
  isSpeedBoostActive: state.isSpeedBoostActive,
});

/**
 * Селектор для TopPanel - lives
 */
export const selectLives = (state: GameState) => ({
  lives: state.lives,
  maxLives: state.maxLives,
});

/**
 * Селектор для TopPanel - power-up timers
 */
export const selectPowerUpTimers = (state: GameState) => ({
  shieldActive: state.shieldActive,
  shieldTimer: state.shieldTimer,
  magnetActive: state.magnetActive,
  magnetTimer: state.magnetTimer,
  speedBoostActive: state.speedBoostActive,
  speedBoostTimer: state.speedBoostTimer,
});

/**
 * Селектор для pause toggle
 */
export const selectPauseState = (state: GameState) => ({
  status: state.status,
  setStatus: state.setStatus,
});


/**
 * Селектор для LobbyUI - все данные лобби
 */
export const selectLobbyData = (state: GameState) => ({
    startGame: state.startGame,
    gameMode: state.gameMode,
    setGameMode: state.setGameMode,
    playerColor: state.playerColor,
    setPlayerColor: state.setPlayerColor,
    characterType: state.characterType,
    setCharacterType: state.setCharacterType,
    metrics: state.metrics,
});

/**
 * Селектор для Shield - данные щита
 */
export const selectShieldData = (state: GameState) => ({
    shieldActive: state.shieldActive,
    shieldTimer: state.shieldTimer,
});

/**
 * Селектор для PostProcessing
 */
export const selectPostProcessingData = (state: GameState) => ({
    status: state.status,
    combo: state.combo,
});

/**
 * Селектор для AdvancedLighting
 */
export const selectLightingData = (state: GameState) => ({
    status: state.status,
    distance: state.distance,
});

/**
 * Селектор для UltraLighting
 */
export const selectUltraLightingData = (state: GameState) => ({
    status: state.status,
    distance: state.distance,
    combo: state.combo,
    speed: state.speed,
});

/**
 * Селектор для ParticleManager
 */
export const selectParticleManagerData = (state: GameState) => ({
    status: state.status,
    combo: state.combo,
    speed: state.speed,
});

/**
 * Селектор для DynamicAudio
 */
export const selectAudioData = (state: GameState) => ({
    status: state.status,
    distance: state.distance,
    speed: state.speed,
    combo: state.combo,
});

/**
 * Селектор для DynamicEvents
 */
export const selectDynamicEventsData = (state: GameState) => ({
    status: state.status,
    distance: state.distance,
    combo: state.combo,
    score: state.score,
    activateSpeedBoost: state.activateSpeedBoost,
    activateMagnet: state.activateMagnet,
});
