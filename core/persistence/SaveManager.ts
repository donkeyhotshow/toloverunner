/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Save Manager - Система сохранений с версионированием и миграцией
 * Решает проблемы:
 * - Отсутствиеионирования сохранений
 * - Отсутствие миграции при обновлении структуры
 * - Отсутствие валидации данных
 */

import { CharacterType } from '../../types';
import { STORAGE_KEY, PLAYER_COLORS } from '../../constants';

// Текущая версия схемы сохранений
export const CURRENT_SAVE_VERSION = 3;

// Типы данных для сохранения
export interface PlayerStats {
    wins: number;
    losses: number;
    gamesPlayed: number;
    bestScore: number;
    totalScore: number;
    totalPlayTime: number;
    totalCoinsCollected: number;
    totalEnemiesAvoided: number;
    longestCombo: number;
    perfectTimings: number;
}

export interface PlayerUpgrades {
    hasDoubleJump: boolean;
    hasImmortality: boolean;
    magnetLevel: number;
    luckLevel: number;
    maxLives: number;
}

export interface PlayerPreferences {
    playerColor: string;
    characterType: CharacterType;
    musicVolume: number;
    sfxVolume: number;
    hapticEnabled: boolean;
    language: string;
    showPopups: boolean;

}

export interface SaveData {
    version: number;
    timestamp: number;
    checksum: string;
    stats: PlayerStats;
    upgrades: PlayerUpgrades;
    preferences: PlayerPreferences;
    genesCollected: number;
    seed: string;
    achievements: string[];
}

// Значения по умолчанию
const DEFAULT_STATS: PlayerStats = {
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    bestScore: 0,
    totalScore: 0,
    totalPlayTime: 0,
    totalCoinsCollected: 0,
    totalEnemiesAvoided: 0,
    longestCombo: 0,
    perfectTimings: 0
};

const DEFAULT_UPGRADES: PlayerUpgrades = {
    hasDoubleJump: false,
    hasImmortality: false,
    magnetLevel: 0,
    luckLevel: 0,
    maxLives: 3
};

const DEFAULT_PREFERENCES: PlayerPreferences = {
    playerColor: PLAYER_COLORS[0] ?? '#ffffff',
    characterType: CharacterType.X,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    hapticEnabled: true,
    language: 'en',
    showPopups: true

};

// Миграции между версиями (вход — произвольные старые данные, выход — объект для следующей миграции или ensureDefaults)
type MigrationFn = (data: unknown) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationFn> = {
    // Миграция с версии 1 на 2
    1: (data: unknown) => {
        const d = data as Record<string, unknown>;
        return {
            ...d,
            version: 2,
            stats: {
                ...(d.stats as Record<string, unknown>),
                totalCoinsCollected: (d.stats as Record<string, unknown>)?.totalCoinsCollected ?? 0,
                totalEnemiesAvoided: (d.stats as Record<string, unknown>)?.totalEnemiesAvoided ?? 0
            }
        } as Record<string, unknown>;
    },
    // Миграция с версии 2 на 3
    2: (data: unknown) => {
        const d = data as Record<string, unknown> & { stats?: Record<string, unknown>; preferences?: Record<string, unknown>; version?: number; playerColor?: string; characterType?: string; hasDoubleJump?: boolean; hasImmortality?: boolean; magnetLevel?: number; luckLevel?: number; maxLives?: number; achievements?: string[] };
        return {
            ...d,
            version: 3,
            stats: {
                ...d.stats,
                longestCombo: (d.stats?.longestCombo as number | undefined) ?? (d.maxCombo as number | undefined) ?? 0,
                perfectTimings: (d.stats?.perfectTimings as number | undefined) ?? 0
            },
            preferences: {
                playerColor: (d.playerColor as string | undefined) ?? DEFAULT_PREFERENCES.playerColor,
                characterType: (d.characterType as CharacterType | undefined) ?? DEFAULT_PREFERENCES.characterType,
                musicVolume: (d.preferences?.musicVolume as number | undefined) ?? 0.5,
                sfxVolume: (d.preferences?.sfxVolume as number | undefined) ?? 0.8,
                hapticEnabled: (d.preferences?.hapticEnabled as boolean | undefined) ?? true,
                language: (d.preferences?.language as string | undefined) ?? 'en'
            },
            upgrades: {
                hasDoubleJump: (d.hasDoubleJump as boolean | undefined) ?? false,
                hasImmortality: (d.hasImmortality as boolean | undefined) ?? false,
                magnetLevel: (d.magnetLevel as number | undefined) ?? 0,
                luckLevel: (d.luckLevel as number | undefined) ?? 0,
                maxLives: (d.maxLives as number | undefined) ?? 3
            },
            achievements: (d.achievements as string[] | undefined) ?? [],
            timestamp: Date.now(),
            checksum: ''
        } as Record<string, unknown>;
    }
};

class SaveManager {
    private static instance: SaveManager;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingSave: SaveData | null = null;
    private isLoaded = false;
    private currentData: SaveData | null = null;

    private constructor() {}

    public static getInstance(): SaveManager {
        if (!SaveManager.instance) {
            SaveManager.instance = new SaveManager();
        }
        return SaveManager.instance;
    }

    /**
     * Генерация контрольной суммы для валидации данных
     */
    private generateChecksum(data: Omit<SaveData, 'checksum'>): string {
        const str = JSON.stringify({
            version: data.version,
            stats: data.stats,
            upgrades: data.upgrades,
            genesCollected: data.genesCollected
        });

        // Простой хеш для валидации
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Валидация данных сохранения
     */
    private validateSaveData(data: unknown): data is SaveData {
        const o = data as Record<string, unknown>;
        if (!o || typeof o !== 'object') return false;
        if (typeof o.version !== 'number') return false;
        if (!o.stats || typeof o.stats !== 'object') return false;
        if (!o.upgrades || typeof o.upgrades !== 'object') return false;
        if (!o.preferences || typeof o.preferences !== 'object') return false;
        if (typeof o.genesCollected !== 'number') return false;

        return true;
    }

    /**
     * Применение миграций для обновления данных до текущей версии
     */
    private migrateData(data: unknown): SaveData {
        const d = data as Record<string, unknown>;
        let currentData: Record<string, unknown> = { ...d };
        let currentVersion = (d.version ?? d.schemaVersion ?? 1) as number;

        // Применяем миграции последовательно
        while (currentVersion < CURRENT_SAVE_VERSION) {
            const migration = MIGRATIONS[currentVersion];
            if (migration) {
                if (import.meta.env.DEV) {
                    console.log(`📦 Migrating save data from v${currentVersion} to v${currentVersion + 1}`);
                }
                currentData = migration(currentData) as Record<string, unknown>;
                currentVersion++;
            } else {
                console.warn(`No migration found for version ${currentVersion}`);
                break;
            }
        }

        // Убеждаемся, что все поля присутствуют
        return this.ensureDefaults(currentData);
    }

    /**
     * Заполнение отсутствующих полей значениями по умолчанию
     */
    private ensureDefaults(data: unknown): SaveData {
        const o = data as Record<string, unknown>;
        return {
            version: CURRENT_SAVE_VERSION,
            timestamp: (o.timestamp as number | undefined) ?? Date.now(),
            checksum: (o.checksum as string | undefined) ?? '',
            stats: {
                ...DEFAULT_STATS,
                ...(o.stats as Record<string, unknown>)
            },
            upgrades: {
                ...DEFAULT_UPGRADES,
                ...(o.upgrades as Record<string, unknown>)
            },
            preferences: {
                ...DEFAULT_PREFERENCES,
                ...(o.preferences as Record<string, unknown>)
            },
            genesCollected: (o.genesCollected as number | undefined) ?? 0,
            seed: (o.seed as string | undefined) ?? Math.random().toString(36).substring(2, 15),
            achievements: (o.achievements as string[] | undefined) ?? []
        };
    }

    /**
     * Создание нового сохранения с значениями по умолчанию
     */
    private createDefaultSave(): SaveData {
        const data: Omit<SaveData, 'checksum'> = {
            version: CURRENT_SAVE_VERSION,
            timestamp: Date.now(),
            stats: { ...DEFAULT_STATS },
            upgrades: { ...DEFAULT_UPGRADES },
            preferences: { ...DEFAULT_PREFERENCES },
            genesCollected: 0,
            seed: Math.random().toString(36).substring(2, 15),
            achievements: []
        };

        return {
            ...data,
            checksum: this.generateChecksum(data)
        };
    }

    /**
     * Загрузка данных из localStorage
     */
    public load(): SaveData {
        if (this.isLoaded && this.currentData) {
            return this.currentData;
        }

        try {
            let stored = localStorage.getItem(STORAGE_KEY);

            // Fallback: migrate from old storage keys (pre-rebrand)
            if (!stored) {
                const OLD_KEYS = ['sperm_runner_v2', 'sperm_runner'];
                for (const oldKey of OLD_KEYS) {
                    const oldData = localStorage.getItem(oldKey);
                    if (oldData) {
                        localStorage.setItem(STORAGE_KEY, oldData);
                        localStorage.removeItem(oldKey);
                        stored = oldData;
                        if (import.meta.env.DEV) {
                            console.log(`📦 Migrated save data from old key "${oldKey}" to "${STORAGE_KEY}"`);
                        }
                        break;
                    }
                }
            }

            if (!stored) {
                if (import.meta.env.DEV) {
                    console.log('📦 No save data found, creating new save');
                }
                this.currentData = this.createDefaultSave();
                this.isLoaded = true;
                return this.currentData;
            }

            let data = JSON.parse(stored);

            // Проверяем версию и мигрируем при необходимости
            const version = data.version ?? data.schemaVersion ?? 1;
            if (version < CURRENT_SAVE_VERSION) {
                if (import.meta.env.DEV) {
                    console.log(`📦 Save data version ${version} is outdated, migrating...`);
                }
                data = this.migrateData(data);
                // Сохраняем мигрированные данные
                this.saveImmediate(data);
            }

            // Валидация
            if (!this.validateSaveData(data)) {
                console.warn('📦 Invalid save data, creating new save');
                this.currentData = this.createDefaultSave();
            } else {
                // Проверка контрольной суммы
                const expectedChecksum = this.generateChecksum(data);
                if (data.checksum && data.checksum !== expectedChecksum) {
                    console.warn('📦 Save data checksum mismatch, data may be corrupted');
                    // Продолжаем с данными, но логируем предупреждение
                }
                this.currentData = data;
            }

            this.isLoaded = true;
            if (import.meta.env.DEV) {
                console.log('📦 Save data loaded successfully');
            }
            return this.currentData;

        } catch (error) {
            console.error('📦 Failed to load save data:', error);
            this.currentData = this.createDefaultSave();
            this.isLoaded = true;
            return this.currentData;
        }
    }

    /**
     * Немедленное сохранение данных
     */
    private saveImmediate(data: SaveData): void {
        try {
            // Обновляем timestamp и checksum
            data.timestamp = Date.now();
            data.checksum = this.generateChecksum(data);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            this.currentData = data;
            if (import.meta.env.DEV) {
                console.log('📦 Save data saved successfully');
            }
        } catch (error) {
            console.error('📦 Failed to save data:', error);
        }
    }

    /**
     * Отложенное сохранение (debounced)
     */
    public save(data: Partial<SaveData>, force = false): void {
        if (!this.currentData) {
            this.load();
        }

        // Объединяем с текущими данными
        this.pendingSave = {
            ...this.currentData!,
            ...data,
            stats: { ...this.currentData!.stats, ...data.stats },
            upgrades: { ...this.currentData!.upgrades, ...data.upgrades },
            preferences: { ...this.currentData!.preferences, ...data.preferences }
        };

        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        if (force) {
            this.saveImmediate(this.pendingSave);
            this.pendingSave = null;
        } else {
            this.saveTimer = setTimeout(() => {
                if (this.pendingSave) {
                    this.saveImmediate(this.pendingSave);
                    this.pendingSave = null;
                }
            }, 2000);
        }
    }

    /**
     * Обновление статистики
     */
    public updateStats(stats: Partial<PlayerStats>): void {
        if (!this.currentData) this.load();

        this.save({
            stats: { ...this.currentData!.stats, ...stats }
        });
    }

    /**
     * Обновление апгрейдов
     */
    public updateUpgrades(upgrades: Partial<PlayerUpgrades>): void {
        if (!this.currentData) this.load();

        this.save({
            upgrades: { ...this.currentData!.upgrades, ...upgrades }
        }, true);
    }

    /**
     * Обновление настроек
     */
    public updatePreferences(preferences: Partial<PlayerPreferences>): void {
        if (!this.currentData) this.load();

        this.save({
            preferences: { ...this.currentData!.preferences, ...preferences }
        }, true);
    }

    /**
     * Добавление достижения
     */
    public addAchievement(achievementId: string): boolean {
        if (!this.currentData) this.load();

        if (this.currentData!.achievements.includes(achievementId)) {
            return false;
        }

        this.save({
            achievements: [...this.currentData!.achievements, achievementId]
        }, true);

        return true;
    }

    /**
     * Получение текущих данных
     */
    public getData(): SaveData {
        if (!this.currentData) {
            return this.load();
        }
        return { ...this.currentData };
    }

    /**
     * Очистка всех данных
     */
    public clear(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        localStorage.removeItem(STORAGE_KEY);
        this.currentData = null;
        this.pendingSave = null;
        this.isLoaded = false;

        if (import.meta.env.DEV) {
            console.log('📦 Save data cleared');
        }
    }

    /**
     * Экспорт данных для бэкапа
     */
    public export(): string {
        if (!this.currentData) this.load();
        return JSON.stringify(this.currentData, null, 2);
    }

    /**
     * Импорт данных из бэкапа
     * Ограничение размера входа для защиты от DoS через большой JSON.
     */
    private static readonly MAX_IMPORT_SIZE = 500_000; // 500 KB

    public import(jsonString: string): boolean {
        if (typeof jsonString !== 'string' || jsonString.length > SaveManager.MAX_IMPORT_SIZE) {
            console.error('📦 Import data too large or invalid');
            return false;
        }
        try {
            const data = JSON.parse(jsonString);

            // Мигрируем если нужно
            const migratedData = this.migrateData(data);

            if (!this.validateSaveData(migratedData)) {
                console.error('📦 Invalid import data');
                return false;
            }

            this.saveImmediate(migratedData);
            return true;
        } catch (error) {
            console.error('📦 Failed to import data:', error);
            return false;
        }
    }

    /**
     * Проверка наличия сохранения
     */
    public hasSaveData(): boolean {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    /**
     * Получение информации о сохранении
     */
    public getSaveInfo(): { version: number; timestamp: number; gamesPlayed: number } | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            return {
                version: data.version ?? 1,
                timestamp: data.timestamp ?? 0,
                gamesPlayed: data.stats?.gamesPlayed ?? 0
            };
        } catch {
            return null;
        }
    }
}

// Экспорт синглтона
export const saveManager = SaveManager.getInstance();
