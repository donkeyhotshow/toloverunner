/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Gesture Ma- Улучшенная система мобильного управления
 * Решает проблемы:
 * - Отсутствие gesture recognition (swipe для смены полосы)
 * - Отсутствие haptic feedback API интеграции
 * - Фиксированные размеры кнопок (не адаптивные)
 */

import { unifiedAudio, HAPTIC_PATTERNS } from '../audio/UnifiedAudioManager';

// Типы жестов
export type GestureType =
    | 'tap' | 'doubleTap' | 'longPress'
    | 'swipeLeft' | 'swipeRight' | 'swipeUp' | 'swipeDown'
    | 'pinchIn' | 'pinchOut'
    | 'pan' | 'panEnd';

// Данные жеста
export interface GestureData {
    type: GestureType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    deltaX: number;
    deltaY: number;
    velocity: number;
    direction: 'left' | 'right' | 'up' | 'down' | 'none';
    duration: number;
    timestamp: number;
    fingers: number;
    scale?: number; // Для pinch
}

// Настройки жестов
export interface GestureSettings {
    swipeThreshold: number;      // Минимальное расстояние для свайпа (px)
    swipeVelocityThreshold: number; // Минимальная скорость для свайпа (px/ms)
    tapMaxDuration: number;      // Максимальная длительность тапа (ms)
    doubleTapMaxDelay: number;   // Максимальная задержка между тапами (ms)
    longPressMinDuration: number; // Минимальная длительность долгого нажатия (ms)
    hapticEnabled: boolean;
    sensitivity: number;         // 0.5 - 2.0
}

// Значения по умолчанию
const DEFAULT_SETTINGS: GestureSettings = {
    swipeThreshold: 50,
    swipeVelocityThreshold: 0.3,
    tapMaxDuration: 200,
    doubleTapMaxDelay: 300,
    longPressMinDuration: 500,
    hapticEnabled: true,
    sensitivity: 1.0
};

// Состояние касания
interface TouchState {
    isActive: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
    lastTapTime: number;
    fingers: number;
    initialDistance: number; // Для pinch
}

// Callback тип
type GestureCallback = (data: GestureData) => void;

class GestureManager {
    private static instance: GestureManager;

    private settings: GestureSettings;
    private touchState: TouchState;
    private callbacks: Map<GestureType | 'any', Set<GestureCallback>> = new Map();
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private isInitialized = false;
    private targetElement: HTMLElement | null = null;

    // Адаптивные размеры
    private screenWidth = 0;
    private screenHeight = 0;
    private scaleFactor = 1;

    private constructor() {
        this.settings = this.loadSettings();
        this.touchState = this.createInitialTouchState();
        this.updateScreenDimensions();
    }

    public static getInstance(): GestureManager {
        if (!GestureManager.instance) {
            GestureManager.instance = new GestureManager();
        }
        return GestureManager.instance;
    }

    private createInitialTouchState(): TouchState {
        return {
            isActive: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            lastTapTime: 0,
            fingers: 0,
            initialDistance: 0
        };
    }

    private loadSettings(): GestureSettings {
        try {
            const saved = localStorage.getItem('gesture_settings');
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load gesture settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    private saveSettings(): void {
        try {
            localStorage.setItem('gesture_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save gesture settings:', e);
        }
    }

    /**
     * Инициализация на элементе
     */
    public init(element?: HTMLElement): void {
        if (this.isInitialized) {
            this.destroy();
        }

        this.targetElement = element || document.body;

        // Touch events
        this.targetElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.targetElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.targetElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.targetElement.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

        // Resize listener
        window.addEventListener('resize', this.handleResize);

        this.isInitialized = true;
        if (import.meta.env.DEV) {
            console.log('🎮 Gesture Manager initialized');
        }
    }

    /**
     * Очистка
     */
    public destroy(): void {
        if (!this.isInitialized || !this.targetElement) return;

        this.targetElement.removeEventListener('touchstart', this.handleTouchStart);
        this.targetElement.removeEventListener('touchmove', this.handleTouchMove);
        this.targetElement.removeEventListener('touchend', this.handleTouchEnd);
        this.targetElement.removeEventListener('touchcancel', this.handleTouchCancel);
        window.removeEventListener('resize', this.handleResize);

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

        this.isInitialized = false;
        this.targetElement = null;
    }

    // ==================== EVENT HANDLERS ====================

    private handleTouchStart = (e: TouchEvent): void => {
        const touch = e.touches[0];
        if (!touch) return;
        const now = Date.now();

        this.touchState = {
            isActive: true,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            startTime: now,
            lastTapTime: this.touchState.lastTapTime,
            fingers: e.touches.length,
            initialDistance: e.touches.length >= 2 ? this.getTouchDistance(e.touches) : 0
        };

        // Запускаем таймер долгого нажатия
        this.longPressTimer = setTimeout(() => {
            if (this.touchState.isActive) {
                const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
                const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);

                // Если палец не двигался значительно
                if (deltaX < 10 && deltaY < 10) {
                    this.emitGesture('longPress');
                    this.playHaptic('heavy');
                }
            }
        }, this.settings.longPressMinDuration);
    };

    private handleTouchMove = (e: TouchEvent): void => {
        if (!this.touchState.isActive) return;

        const touch = e.touches[0];
        if (!touch) return;
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;

        // Pinch detection
        if (e.touches.length >= 2) {
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.touchState.initialDistance;

            if (scale > 1.2) {
                this.emitGesture('pinchOut', { scale });
            } else if (scale < 0.8) {
                this.emitGesture('pinchIn', { scale });
            }
        }

        // Pan event
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const deltaY = this.touchState.currentY - this.touchState.startY;

        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            this.emitGesture('pan', { deltaX, deltaY });

            // Отменяем long press если начали двигаться
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
    };

    private handleTouchEnd = (_e: TouchEvent): void => {
        if (!this.touchState.isActive) return;

        // Отменяем таймер долгого нажатия
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        const now = Date.now();
        const duration = now - this.touchState.startTime;
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const deltaY = this.touchState.currentY - this.touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / duration;

        // Применяем чувствительность
        const adjustedThreshold = this.settings.swipeThreshold / this.settings.sensitivity;
        const adjustedVelocityThreshold = this.settings.swipeVelocityThreshold / this.settings.sensitivity;

        // Определяем тип жеста
        if (distance < 10 && duration < this.settings.tapMaxDuration) {
            // Tap или Double Tap
            if (now - this.touchState.lastTapTime < this.settings.doubleTapMaxDelay) {
                this.emitGesture('doubleTap');
                this.playHaptic('medium');
                this.touchState.lastTapTime = 0;
            } else {
                this.emitGesture('tap');
                this.playHaptic('light');
                this.touchState.lastTapTime = now;
            }
        } else if (distance >= adjustedThreshold || velocity >= adjustedVelocityThreshold) {
            // Swipe
            const direction = this.getSwipeDirection(deltaX, deltaY);

            switch (direction) {
                case 'left':
                    this.emitGesture('swipeLeft');
                    break;
                case 'right':
                    this.emitGesture('swipeRight');
                    break;
                case 'up':
                    this.emitGesture('swipeUp');
                    break;
                case 'down':
                    this.emitGesture('swipeDown');
                    break;
            }

            this.playHaptic('medium');
        }

        // Pan end
        this.emitGesture('panEnd', { deltaX, deltaY });

        this.touchState.isActive = false;
    };

    private handleTouchCancel = (): void => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.touchState.isActive = false;
    };

    private handleResize = (): void => {
        this.updateScreenDimensions();
    };

    // ==================== HELPERS ====================

    private getTouchDistance(touches: TouchList): number {
        if (touches.length < 2) return 0;
        const t0 = touches[0];
        const t1 = touches[1];
        if (!t0 || !t1) return 0;
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getSwipeDirection(deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }

    private updateScreenDimensions(): void {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        // Вычисляем масштаб для адаптивных элементов
        const baseWidth = 375; // iPhone SE width
        this.scaleFactor = Math.min(Math.max(this.screenWidth / baseWidth, 0.8), 1.5);
    }

    private emitGesture(type: GestureType, extra?: Partial<GestureData>): void {
        const now = Date.now();
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const deltaY = this.touchState.currentY - this.touchState.startY;
        const duration = now - this.touchState.startTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const data: GestureData = {
            type,
            startX: this.touchState.startX,
            startY: this.touchState.startY,
            endX: this.touchState.currentX,
            endY: this.touchState.currentY,
            deltaX,
            deltaY,
            velocity: distance / Math.max(duration, 1),
            direction: this.getSwipeDirection(deltaX, deltaY),
            duration,
            timestamp: now,
            fingers: this.touchState.fingers,
            ...extra
        };

        // Вызываем специфичные callbacks
        const typeCallbacks = this.callbacks.get(type);
        if (typeCallbacks) {
            typeCallbacks.forEach(cb => cb(data));
        }

        // Вызываем общие callbacks
        const anyCallbacks = this.callbacks.get('any');
        if (anyCallbacks) {
            anyCallbacks.forEach(cb => cb(data));
        }
    }

    private playHaptic(pattern: keyof typeof HAPTIC_PATTERNS): void {
        if (this.settings.hapticEnabled) {
            unifiedAudio.playHaptic(pattern);
        }
    }

    // ==================== PUBLIC API ====================

    /**
     * Подписка на жест
     */
    public on(type: GestureType | 'any', callback: GestureCallback): () => void {
        if (!this.callbacks.has(type)) {
            this.callbacks.set(type, new Set());
        }
        this.callbacks.get(type)!.add(callback);

        return () => {
            this.callbacks.get(type)?.delete(callback);
        };
    }

    /**
     * Отписка от жеста
     */
    public off(type: GestureType | 'any', callback: GestureCallback): void {
        this.callbacks.get(type)?.delete(callback);
    }

    /**
     * Получение настроек
     */
    public getSettings(): GestureSettings {
        return { ...this.settings };
    }

    /**
     * Обновление настроек
     */
    public updateSettings(updates: Partial<GestureSettings>): void {
        this.settings = { ...this.settings, ...updates };
        this.saveSettings();
    }

    /**
     * Установка чувствительности
     */
    public setSensitivity(value: number): void {
        this.settings.sensitivity = Math.max(0.5, Math.min(2.0, value));
        this.saveSettings();
    }

    /**
     * Включение/выключение haptic
     */
    public setHapticEnabled(enabled: boolean): void {
        this.settings.hapticEnabled = enabled;
        this.saveSettings();
    }

    /**
     * Получение масштаба для адаптивных элементов
     */
    public getScaleFactor(): number {
        return this.scaleFactor;
    }

    /**
     * Получение адаптивного размера
     */
    public getAdaptiveSize(baseSize: number): number {
        return Math.round(baseSize * this.scaleFactor);
    }

    /**
     * Получение размеров экрана
     */
    public getScreenDimensions(): { width: number; height: number } {
        return { width: this.screenWidth, height: this.screenHeight };
    }

    /**
     * Проверка мобильного устройства
     */
    public isMobile(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Проверка планшета
     */
    public isTablet(): boolean {
        return this.isMobile() && Math.min(this.screenWidth, this.screenHeight) >= 600;
    }

    /**
     * Получение зон экрана для управления
     */
    public getControlZones(): {
        left: { x: number; y: number; width: number; height: number };
        right: { x: number; y: number; width: number; height: number };
        jump: { x: number; y: number; width: number; height: number };
    } {
        const zoneHeight = this.screenHeight * 0.4;
        const zoneY = this.screenHeight - zoneHeight;

        return {
            left: {
                x: 0,
                y: zoneY,
                width: this.screenWidth * 0.33,
                height: zoneHeight
            },
            right: {
                x: this.screenWidth * 0.67,
                y: zoneY,
                width: this.screenWidth * 0.33,
                height: zoneHeight
            },
            jump: {
                x: this.screenWidth * 0.33,
                y: zoneY,
                width: this.screenWidth * 0.34,
                height: zoneHeight
            }
        };
    }

    /**
     * Проверка попадания в зону
     */
    public isInZone(x: number, y: number, zone: { x: number; y: number; width: number; height: number }): boolean {
        return x >= zone.x && x <= zone.x + zone.width &&
               y >= zone.y && y <= zone.y + zone.height;
    }
}

// Экспорт синглтона
export const gestureManager = GestureManager.getInstance();
