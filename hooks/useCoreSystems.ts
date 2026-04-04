/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * React Hooks для Core Systems
 * Удобные хуки для использования новых систем в React компонентах
 */

import { useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    unifiedAudio,
    saveManager,
    i18n,
    accessibility,
    gestureManager,
    enemyPool,
    type VolumeSettings,
    type SaveData,
    type SupportedLanguage,
    type TranslationKeys,
    type AccessibilitySettings,
    type GestureType,
    type GestureData,
    type EnemyState,
    type SFXType
} from '../core';

// ==================== AUDIO HOOK ====================

export interface UseAudioReturn {
    playSFX: (type: SFXType, options?: { volume?: number; pitch?: number }) => void;
    toggleMusic: (play: boolean) => void;
    setMasterVolume: (volume: number) => void;
    setMusicVolume: (volume: number) => void;
    setSFXVolume: (volume: number) => void;
    volumeSettings: VolumeSettings;
    isInitialized: boolean;
}

export function useAudio(): UseAudioReturn {
    const [isInitialized, setIsInitialized] = useState(false);
    const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(unifiedAudio.getVolumeSettings());

    useEffect(() => {
        // Инициализация при первом взаимодействии
        const initOnInteraction = async () => {
            const success = await unifiedAudio.init();
            setIsInitialized(success);
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };

        document.addEventListener('click', initOnInteraction, { once: true });
        document.addEventListener('touchstart', initOnInteraction, { once: true });

        return () => {
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };
    }, []);

    const playSFX = useCallback((type: SFXType, options?: { volume?: number; pitch?: number }) => {
        unifiedAudio.playSFX(type, options);
    }, []);

    const toggleMusic = useCallback((play: boolean) => {
        unifiedAudio.toggleMusic(play);
    }, []);

    const setMasterVolume = useCallback((volume: number) => {
        unifiedAudio.setMasterVolume(volume);
        setVolumeSettings(unifiedAudio.getVolumeSettings());
    }, []);

    const setMusicVolume = useCallback((volume: number) => {
        unifiedAudio.setMusicVolume(volume);
        setVolumeSettings(unifiedAudio.getVolumeSettings());
    }, []);

    const setSFXVolume = useCallback((volume: number) => {
        unifiedAudio.setSFXVolume(volume);
        setVolumeSettings(unifiedAudio.getVolumeSettings());
    }, []);

    return {
        playSFX,
        toggleMusic,
        setMasterVolume,
        setMusicVolume,
        setSFXVolume,
        volumeSettings,
        isInitialized
    };
}

// ==================== SAVE HOOK ====================

export interface UseSaveReturn {
    data: SaveData;
    save: (data: Partial<SaveData>, force?: boolean) => void;
    load: () => SaveData;
    clear: () => void;
    exportData: () => string;
    importData: (_json: string) => boolean;
    hasSaveData: boolean;
}

export function useSave(): UseSaveReturn {
    const [data, setData] = useState<SaveData>(() => saveManager.load());
    const [hasSaveData, setHasSaveData] = useState(() => saveManager.hasSaveData());

    const save = useCallback((updates: Partial<SaveData>, force = false) => {
        saveManager.save(updates, force);
        setData(saveManager.getData());
    }, []);

    const load = useCallback(() => {
        const loaded = saveManager.load();
        setData(loaded);
        return loaded;
    }, []);

    const clear = useCallback(() => {
        saveManager.clear();
        setData(saveManager.load());
        setHasSaveData(false);
    }, []);

    const exportData = useCallback(() => {
        return saveManager.export();
    }, []);

    const importData = useCallback((json: string) => {
        const success = saveManager.import(json);
        if (success) {
            setData(saveManager.getData());
            setHasSaveData(true);
        }
        return success;
    }, []);

    return {
        data,
        save,
        load,
        clear,
        exportData,
        importData,
        hasSaveData
    };
}

// ==================== I18N HOOK ====================

export interface UseI18nReturn {
    t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    isRTL: boolean;
    formatNumber: (_num: number) => string;
    formatTime: (_seconds: number) => string;
    availableLanguages: Array<{ code: SupportedLanguage; name: string }>;
}

export function useI18n(): UseI18nReturn {
    const [language, setLanguageState] = useState<SupportedLanguage>(i18n.getLanguage());
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const unsubscribe = i18n.subscribe(() => {
            setLanguageState(i18n.getLanguage());
            forceUpdate({});
        });
        return unsubscribe;
    }, []);

    const t = useCallback((key: keyof TranslationKeys, params?: Record<string, string | number>) => {
        return i18n.t(key, params);
    }, []);

    const setLanguage = useCallback((lang: SupportedLanguage) => {
        i18n.setLanguage(lang);
    }, []);

    return {
        t,
        language,
        setLanguage,
        isRTL: i18n.isRTL(),
        formatNumber: i18n.formatNumber.bind(i18n),
        formatTime: i18n.formatTime.bind(i18n),
        availableLanguages: i18n.getAvailableLanguages()
    };
}

// ==================== ACCESSIBILITY HOOK ====================

export interface UseAccessibilityReturn {
    settings: AccessibilitySettings;
    updateSettings: (updates: Partial<AccessibilitySettings>) => void;
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
    shouldReduceMotion: boolean;
    getAriaAttributes: (element: string) => Record<string, string>;
    colorblindModes: Array<{ mode: string; name: string }>;
}

export function useAccessibility(): UseAccessibilityReturn {
    const [settings, setSettings] = useState<AccessibilitySettings>(accessibility.getSettings());

    useEffect(() => {
        const unsubscribe = accessibility.subscribe(() => {
            setSettings(accessibility.getSettings());
        });
        return unsubscribe;
    }, []);

    const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
        accessibility.updateSettings(updates);
    }, []);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        accessibility.announce(message, priority);
    }, []);

    return {
        settings,
        updateSettings,
        announce,
        shouldReduceMotion: settings.reducedMotion,
        getAriaAttributes: accessibility.getAriaAttributes.bind(accessibility),
        colorblindModes: accessibility.getColorblindModes()
    };
}

// ==================== GESTURE HOOK ====================

export interface UseGesturesReturn {
    onGesture: (_type: GestureType | 'any', _callback: (data: GestureData) => void) => () => void;
    isMobile: boolean;
    isTablet: boolean;
    scaleFactor: number;
    getAdaptiveSize: (_baseSize: number) => number;
    setSensitivity: (_value: number) => void;
    setHapticEnabled: (_enabled: boolean) => void;
}

export function useGestures(element?: HTMLElement): UseGesturesReturn {
    const [isMobile] = useState(() => gestureManager.isMobile());
    const [isTablet] = useState(() => gestureManager.isTablet());
    const [scaleFactor, setScaleFactor] = useState(() => gestureManager.getScaleFactor());

    useEffect(() => {
        gestureManager.init(element);

        const handleResize = () => {
            setScaleFactor(gestureManager.getScaleFactor());
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [element]);

    const onGesture = useCallback((type: GestureType | 'any', callback: (data: GestureData) => void) => {
        return gestureManager.on(type, callback);
    }, []);

    const getAdaptiveSize = useCallback((baseSize: number) => {
        return gestureManager.getAdaptiveSize(baseSize);
    }, []);

    const setSensitivity = useCallback((value: number) => {
        gestureManager.setSensitivity(value);
    }, []);

    const setHapticEnabled = useCallback((enabled: boolean) => {
        gestureManager.setHapticEnabled(enabled);
    }, []);

    return {
        onGesture,
        isMobile,
        isTablet,
        scaleFactor,
        getAdaptiveSize,
        setSensitivity,
        setHapticEnabled
    };
}

// ==================== ENEMY POOL HOOK ====================

export interface UseEnemyPoolReturn {
    enemies: EnemyState[];
    spawn: (options: Parameters<typeof enemyPool.spawn>[0]) => EnemyState | null;
    despawn: (id: string) => boolean;
    despawnAll: () => void;
    getEnemiesInRadius: (center: THREE.Vector3, radius: number) => EnemyState[];
    stats: ReturnType<typeof enemyPool.getStats>;
}

export function useEnemyPool(): UseEnemyPoolReturn {
    const [enemies, setEnemies] = useState<EnemyState[]>([]);
    const [stats, setStats] = useState(() => enemyPool.getStats());

    useEffect(() => {
        const unsubscribeUpdate = enemyPool.onUpdate((updatedEnemies) => {
            setEnemies([...updatedEnemies]);
            setStats(enemyPool.getStats());
        });

        return () => {
            unsubscribeUpdate();
        };
    }, []);

    const spawn = useCallback((options: Parameters<typeof enemyPool.spawn>[0]) => {
        return enemyPool.spawn(options);
    }, []);

    const despawn = useCallback((id: string) => {
        return enemyPool.despawn(id);
    }, []);

    const despawnAll = useCallback(() => {
        enemyPool.despawnAll();
    }, []);

    const getEnemiesInRadius = useCallback((center: THREE.Vector3, radius: number) => {
        return enemyPool.getEnemiesInRadius(center, radius);
    }, []);

    return {
        enemies,
        spawn,
        despawn,
        despawnAll,
        getEnemiesInRadius,
        stats
    };
}

// ==================== COMBINED HOOK ====================

/**
 * Комбинированный хук для доступа ко всем системам
 */
export function useCoreSystems() {
    const audio = useAudio();
    const save = useSave();
    const i18n = useI18n();
    const a11y = useAccessibility();
    const gestures = useGestures();

    return {
        audio,
        save,
        i18n,
        accessibility: a11y,
        gestures
    };
}
