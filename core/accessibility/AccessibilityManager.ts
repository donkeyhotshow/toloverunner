/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Accessibility Manager - Система доступности
 * Решает проблемы:
 * - Отсутствие поддержки screen readers
 * - Отсутствие альтернативного управления
 * - Отсутствие настроек для дальтоников
 */

import { i18n } from '../i18n/I18nManager';

// Типы режимов дальтонизма
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Настройки доступности
export interface AccessibilitySettings {
    screenReaderEnabled: boolean;
    reducedMotion: boolean;
    colorblindMode: ColorblindMode;
    highContrast: boolean;
    largeText: boolean;
    autoPlay: boolean;
    keyboardOnly: boolean;
    customControls: Record<string, string>;
}

// Значения по умолчанию
const DEFAULT_SETTINGS: AccessibilitySettings = {
    screenReaderEnabled: false,
    reducedMotion: false,
    colorblindMode: 'none',
    highContrast: false,
    largeText: false,
    autoPlay: false,
    keyboardOnly: false,
    customControls: {}
};

// CSS фильтры для режимов дальтонизма
const COLORBLIND_FILTERS: Record<ColorblindMode, string> = {
    none: 'none',
    // Протанопия (красный)
    protanopia: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='protanopia'><feColorMatrix type='matrix' values='0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0'/></filter></svg>#protanopia")`,
    // Дейтеранопия (зелёный)
    deuteranopia: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='deuteranopia'><feColorMatrix type='matrix' values='0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0'/></filter></svg>#deuteranopia")`,
    // Тританопия (синий)
    tritanopia: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='tritanopia'><feColorMatrix type='matrix' values='0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0'/></filter></svg>#tritanopia")`,
    // Ахроматопсия (полная)
    achromatopsia: 'grayscale(100%)'
};

// Названия режимов дальтонизма
export const COLORBLIND_MODE_NAMES: Record<ColorblindMode, string> = {
    none: 'None',
    protanopia: 'Protanopia (Red-Blind)',
    deuteranopia: 'Deuteranopia (Green-Blind)',
    tritanopia: 'Tritanopia (Blue-Blind)',
    achromatopsia: 'Achromatopsia (Monochrome)'
};

// Стандартные клавиши управления
export const DEFAULT_CONTROLS: Record<string, string[]> = {
    moveLeft: ['ArrowLeft', 'KeyA'],
    moveRight: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyS'],
    pause: ['Escape', 'KeyP'],
    confirm: ['Enter', 'Space'],
    cancel: ['Escape', 'Backspace']
};

class AccessibilityManager {
    private static instance: AccessibilityManager;
    private settings: AccessibilitySettings;
    private liveRegion: HTMLElement | null = null;
    private listeners: Set<() => void> = new Set();
    private announcementQueue: string[] = [];
    private isAnnouncing = false;
    private isDisposed = false; // CRITICAL FIX: Flag to track disposal state
    private announcementTimeoutId: number | null = null; // Track timeout for cleanup
    private queueProcessTimeoutId: number | null = null; // Track queue process timeout

    private constructor() {
        this.settings = this.loadSettings();
        this.setupLiveRegion();
        this.detectSystemPreferences();
        this.applySettings();
    }

    public static getInstance(): AccessibilityManager {
        if (!AccessibilityManager.instance) {
            AccessibilityManager.instance = new AccessibilityManager();
        }
        return AccessibilityManager.instance;
    }

    /**
     * Загрузка настроек из localStorage
     */
    private loadSettings(): AccessibilitySettings {
        try {
            const saved = localStorage.getItem('accessibility_settings');
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load accessibility settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Сохранение настроек
     */
    private saveSettings(): void {
        try {
            localStorage.setItem('accessibility_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save accessibility settings:', e);
        }
    }

    /**
     * Определение системных предпочтений
     */
    private detectSystemPreferences(): void {
        // Проверяем предпочтение уменьшенной анимации
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.settings.reducedMotion = true;
        }

        // Проверяем предпочтение высокой контрастности
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.settings.highContrast = true;
        }

        // Слушаем изменения
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.setReducedMotion(e.matches);
        });
    }

    /**
     * Создание live region для screen readers
     */
    private setupLiveRegion(): void {
        if (typeof document === 'undefined') return;

        // Удаляем существующий если есть
        const existing = document.getElementById('game-live-region');
        if (existing) existing.remove();

        // Создаём новый
        this.liveRegion = document.createElement('div');
        this.liveRegion.id = 'game-live-region';
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';

        // Стили для скрытия визуально, но доступности для screen readers
        this.liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;

        document.body.appendChild(this.liveRegion);
    }

    /**
     * Применение настроек к DOM
     */
    private applySettings(): void {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;

        // Режим дальтонизма
        if (this.settings.colorblindMode !== 'none') {
            root.style.filter = COLORBLIND_FILTERS[this.settings.colorblindMode];
        } else {
            root.style.filter = '';
        }

        // Высокая контрастность
        root.classList.toggle('high-contrast', this.settings.highContrast);

        // Крупный текст
        root.classList.toggle('large-text', this.settings.largeText);

        // Уменьшенная анимация
        root.classList.toggle('reduced-motion', this.settings.reducedMotion);

        // CSS переменные для доступности
        root.style.setProperty('--a11y-animation-duration', this.settings.reducedMotion ? '0.01ms' : '');
        root.style.setProperty('--a11y-font-scale', this.settings.largeText ? '1.25' : '1');
    }

    // ==================== PUBLIC API ====================

    /**
     * Получение текущих настроек
     */
    public getSettings(): AccessibilitySettings {
        return { ...this.settings };
    }

    /**
     * Обновление настроек
     */
    public updateSettings(updates: Partial<AccessibilitySettings>): void {
        this.settings = { ...this.settings, ...updates };
        this.saveSettings();
        this.applySettings();
        this.notifyListeners();
    }

    /**
     * Установка режима дальтонизма
     */
    public setColorblindMode(mode: ColorblindMode): void {
        this.updateSettings({ colorblindMode: mode });
    }

    /**
     * Установка уменьшенной анимации
     */
    public setReducedMotion(enabled: boolean): void {
        this.updateSettings({ reducedMotion: enabled });
    }

    /**
     * Установка высокой контрастности
     */
    public setHighContrast(enabled: boolean): void {
        this.updateSettings({ highContrast: enabled });
    }

    /**
     * Установка крупного текста
     */
    public setLargeText(enabled: boolean): void {
        this.updateSettings({ largeText: enabled });
    }

    /**
     * Включение/выключение screen reader режима
     */
    public setScreenReaderEnabled(enabled: boolean): void {
        this.updateSettings({ screenReaderEnabled: enabled });
    }

    /**
     * Проверка уменьшенной анимации
     */
    public shouldReduceMotion(): boolean {
        return this.settings.reducedMotion;
    }

    /**
     * Анонс для screen readers
     */
    public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.settings.screenReaderEnabled || !this.liveRegion) return;

        this.announcementQueue.push(message);
        this.liveRegion.setAttribute('aria-live', priority);

        if (!this.isAnnouncing) {
            this.processAnnouncementQueue();
        }
    }

    private processAnnouncementQueue(): void {
        // CRITICAL FIX: Check if disposed before processing
        if (this.isDisposed || this.announcementQueue.length === 0 || !this.liveRegion) {
            this.isAnnouncing = false;
            return;
        }

        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;

        // Очищаем и устанавливаем новое сообщение
        this.liveRegion.textContent = '';

        // Небольшая задержка для screen readers
        this.announcementTimeoutId = window.setTimeout(() => {
            if (this.isDisposed || !this.liveRegion) return;
            this.liveRegion.textContent = message;

            // Обрабатываем следующее сообщение
            this.queueProcessTimeoutId = window.setTimeout(() => this.processAnnouncementQueue(), 500);
        }, 100);
    }

    /**
     * Анонс игровых событий
     */
    public announceGameEvent(event: string, data?: Record<string, any>): void {
        if (!this.settings.screenReaderEnabled) return;

        let message = '';

        switch (event) {
            case 'score':
                message = i18n.t('a11y.scoreDisplay', { score: data?.score ?? 0 });
                break;
            case 'lives':
                message = i18n.t('a11y.livesDisplay', { lives: data?.lives ?? 0 });
                break;
            case 'combo':
                message = i18n.t('a11y.comboDisplay', { combo: data?.combo ?? 0 });
                break;
            case 'powerup':
                message = `Power-up collected: ${data?.type ?? 'unknown'}`;
                break;
            case 'damage':
                message = 'Damage taken!';
                this.announce(message, 'assertive');
                return;
            case 'gameOver':
                message = `Game over! Final score: ${data?.score ?? 0}`;
                this.announce(message, 'assertive');
                return;
            case 'newRecord':
                message = 'New high score!';
                this.announce(message, 'assertive');
                return;
            default:
                message = event;
        }

        this.announce(message);
    }

    /**
     * Получение ARIA атрибутов для элемента
     */
    public getAriaAttributes(element: string): Record<string, string> {
        const attrs: Record<string, string> = {};

        switch (element) {
            case 'jumpButton':
                attrs['aria-label'] = i18n.t('a11y.jumpButton');
                attrs['role'] = 'button';
                break;
            case 'leftButton':
                attrs['aria-label'] = i18n.t('a11y.leftButton');
                attrs['role'] = 'button';
                break;
            case 'rightButton':
                attrs['aria-label'] = i18n.t('a11y.rightButton');
                attrs['role'] = 'button';
                break;
            case 'pauseButton':
                attrs['aria-label'] = i18n.t('a11y.pauseButton');
                attrs['role'] = 'button';
                break;
            case 'gameCanvas':
                attrs['role'] = 'application';
                attrs['aria-label'] = 'Game canvas';
                break;
        }

        return attrs;
    }

    /**
     * Проверка клавиши для действия
     */
    public isActionKey(action: string, key: string): boolean {
        const customKey = this.settings.customControls[action];
        if (customKey) {
            return key === customKey;
        }

        const defaultKeys = DEFAULT_CONTROLS[action];
        return defaultKeys ? defaultKeys.includes(key) : false;
    }

    /**
     * Установка кастомной клавиши
     */
    public setCustomControl(action: string, key: string): void {
        this.settings.customControls[action] = key;
        this.saveSettings();
    }

    /**
     * Сброс клавиш к значениям по умолчанию
     */
    public resetControls(): void {
        this.settings.customControls = {};
        this.saveSettings();
    }

    /**
     * Получение клавиш для действия
     */
    public getControlKeys(action: string): string[] {
        const customKey = this.settings.customControls[action];
        if (customKey) {
            return [customKey];
        }
        return DEFAULT_CONTROLS[action] || [];
    }

    /**
     * Подписка на изменения настроек
     */
    public subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback());
    }

    /**
     * Получение CSS для режима дальтонизма
     */
    public getColorblindCSS(): string {
        return COLORBLIND_FILTERS[this.settings.colorblindMode];
    }

    /**
     * Получение доступных режимов дальтонизма
     */
    public getColorblindModes(): Array<{ mode: ColorblindMode; name: string }> {
        return Object.entries(COLORBLIND_MODE_NAMES).map(([mode, name]) => ({
            mode: mode as ColorblindMode,
            name
        }));
    }

    /**
     * Фокус на игровом элементе
     */
    public focusGameElement(elementId: string): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.focus();
        }
    }

    /**
     * Создание skip link для навигации
     */
    public createSkipLink(targetId: string, text: string): HTMLElement {
        const link = document.createElement('a');
        link.href = `#${targetId}`;
        link.className = 'skip-link';
        link.textContent = text;
        link.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: #000;
            color: #fff;
            padding: 8px;
            z-index: 10000;
            transition: top 0.3s;
        `;

        link.addEventListener('focus', () => {
            link.style.top = '0';
        });

        link.addEventListener('blur', () => {
            link.style.top = '-40px';
        });

        return link;
    }

    /**
     * CRITICAL FIX: Очистка ресурсов при уничтожении (для предотвращения утечек памяти)
     */
    public dispose(): void {
        this.isDisposed = true;

        // Clear pending timeouts
        if (this.announcementTimeoutId !== null) {
            clearTimeout(this.announcementTimeoutId);
            this.announcementTimeoutId = null;
        }
        if (this.queueProcessTimeoutId !== null) {
            clearTimeout(this.queueProcessTimeoutId);
            this.queueProcessTimeoutId = null;
        }

        // Clear queue
        this.announcementQueue = [];
        this.isAnnouncing = false;

        // Remove live region
        if (this.liveRegion) {
            this.liveRegion.remove();
            this.liveRegion = null;
        }

        console.log('🛑 AccessibilityManager disposed');
    }
}

// Экспорт синглтона
export const accessibility = AccessibilityManager.getInstance();
