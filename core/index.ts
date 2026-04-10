/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Core Systems - Централизованный экспорт всех основных систем
 */

// Audio System
export {
    unifiedAudio,
    audio,
    HAPTIC_PATTERNS,
    type SFXType,
    type MusicIntensity,
    type VolumeSettings,
    type HapticPattern
} from './audio/UnifiedAudioManager';

// Persistence System
export {
    saveManager,
    CURRENT_SAVE_VERSION,
    type SaveData,
    type PlayerStats,
    type PlayerUpgrades,
    type PlayerPreferences
} from './persistence/SaveManager';

// I18n System
export {
    i18n,
    t,
    RTL_LANGUAGES,
    LANGUAGE_NAMES,
    type SupportedLanguage,
    type TranslationKeys
} from './i18n/I18nManager';

// Accessibility System
export {
    accessibility,
    COLORBLIND_MODE_NAMES,
    DEFAULT_CONTROLS,
    type ColorblindMode,
    type AccessibilitySettings
} from './accessibility/AccessibilityManager';

// Gesture/Input System
export {
    gestureManager,
    type GestureType,
    type GestureData,
    type GestureSettings
} from './input/GestureManager';

// Enemy Pool System
export {
    enemyPool,
    type EnemyType,
    type EnemyBehavior,
    type EnemyState,
    type EnemyTypeConfig,
    type SpawnZone,
    type EnemyPoolStats
} from './enemies/EnemyPoolManager';

// Physics bounded context — public API contracts (ADR-0003)
export type {
    IPlayerState,
    ICollisionResult,
    IPlayerInput,
    IPhysicsSystem,
} from './physics/interfaces';
