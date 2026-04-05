/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Enhanc Controls - Advanced Input System with Haptic Feedback
 */

import React, { useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { debugLog } from '../../utils/debug';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { useCombatSystem } from '../Gameplay/Combat/useCombatSystem';

interface InputState {
    keys: Set<string>;
    mouse: { x: number; y: number; buttons: number };
    touch: { active: boolean; startX: number; startY: number; currentX: number; currentY: number };
    gamepad: Gamepad | null;
}

interface HapticPattern {
    duration: number;
    strongMagnitude: number;
    weakMagnitude: number;
}

type InputCallback = (...args: unknown[]) => void;

export class EnhancedInputManager {
    private inputState: InputState = {
        keys: new Set(),
        mouse: { x: 0, y: 0, buttons: 0 },
        touch: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 },
        gamepad: null
    };

    private callbacks: Map<string, InputCallback[]> = new Map();
    private hapticSupported = false;
    private lastInputTime = 0;
    private inputBuffer: string[] = [];
    private comboSequences: Map<string, InputCallback> = new Map();
    private _listenersAttached = false;

    // Bound handlers for proper cleanup
    private boundHandlers: {
        keydown: (e: KeyboardEvent) => void;
        keyup: (e: KeyboardEvent) => void;
        mousemove: (e: MouseEvent) => void;
        mousedown: (e: MouseEvent) => void;
        mouseup: (e: MouseEvent) => void;
        touchstart: (e: TouchEvent) => void;
        touchmove: (e: TouchEvent) => void;
        touchend: (e: TouchEvent) => void;
        gamepadconnected: (e: GamepadEvent) => void;
        gamepaddisconnected: (e: GamepadEvent) => void;
    };

    constructor() {
        // Pre-bind handlers to ensure proper cleanup
        this.boundHandlers = {
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            touchstart: this.handleTouchStart.bind(this),
            touchmove: this.handleTouchMove.bind(this),
            touchend: this.handleTouchEnd.bind(this),
            gamepadconnected: this.handleGamepadConnected.bind(this),
            gamepaddisconnected: this.handleGamepadDisconnected.bind(this)
        };

        this.setupEventListeners();
        this.checkHapticSupport();
        this.setupComboSequences();
    }

    private setupEventListeners() {
        if (this._listenersAttached) return;
        window.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('keyup', this.boundHandlers.keyup);
        window.addEventListener('mousemove', this.boundHandlers.mousemove);
        window.addEventListener('mousedown', this.boundHandlers.mousedown);
        window.addEventListener('mouseup', this.boundHandlers.mouseup);
        window.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
        window.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
        window.addEventListener('touchend', this.boundHandlers.touchend, { passive: false });
        window.addEventListener('gamepadconnected', this.boundHandlers.gamepadconnected);
        window.addEventListener('gamepaddisconnected', this.boundHandlers.gamepaddisconnected);
        this._listenersAttached = true;
    }

    /** Регистрация слушателей (вызывать после destroy() при повторном монтировании). */
    public init() {
        this.setupEventListeners();
        if (this.comboSequences.size === 0) this.setupComboSequences();
    }

    private checkHapticSupport() {
        this.hapticSupported = 'vibrate' in navigator;
        debugLog('🎮 Haptic feedback support:', this.hapticSupported);
    }

    private setupComboSequences() {
        // Комбо для специальных действий
        this.comboSequences.set('ArrowUp,ArrowUp,ArrowDown,ArrowDown', () => {
            this.triggerEvent('konami-code');
            this.playHaptic({ duration: 500, strongMagnitude: 1.0, weakMagnitude: 0.5 });
        });

        this.comboSequences.set('KeyA,KeyS,KeyD,KeyF', () => {
            this.triggerEvent('speed-combo');
            this.playHaptic({ duration: 200, strongMagnitude: 0.8, weakMagnitude: 0.3 });
        });
    }

    // Обработчики клавиатуры
    private handleKeyDown(event: KeyboardEvent) {
        // Игнорируем автоповтор для игровых управляющих клавиш
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];

        if (event.repeat && gameKeys.includes(event.code)) {
            return;
        }

        this.inputState.keys.add(event.code);
        this.addToInputBuffer(event.code);
        this.triggerEvent('keydown', { code: event.code, key: event.key });

        // Предотвращаем стандартное поведение для игровых клавиш
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private handleKeyUp(event: KeyboardEvent) {
        this.inputState.keys.delete(event.code);
        this.triggerEvent('keyup', { code: event.code, key: event.key });
    }

    // Обработчики мыши
    private handleMouseMove(event: MouseEvent) {
        this.inputState.mouse.x = event.clientX;
        this.inputState.mouse.y = event.clientY;
        this.triggerEvent('mousemove', { x: event.clientX, y: event.clientY });
    }

    private handleMouseDown(event: MouseEvent) {
        this.inputState.mouse.buttons = event.buttons;
        this.triggerEvent('mousedown', { button: event.button, x: event.clientX, y: event.clientY });
    }

    private handleMouseUp(event: MouseEvent) {
        this.inputState.mouse.buttons = event.buttons;
        this.triggerEvent('mouseup', { button: event.button, x: event.clientX, y: event.clientY });
    }

    // Обработчики тач-событий
    private handleTouchStart(event: TouchEvent) {
        event.preventDefault();
        const touch = event.touches[0];
        if (!touch) return;
        this.inputState.touch = {
            active: true,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY
        };
        this.triggerEvent('touchstart', { x: touch.clientX, y: touch.clientY });
    }

    private handleTouchMove(event: TouchEvent) {
        event.preventDefault();
        if (!this.inputState.touch.active) return;

        const touch = event.touches[0];
        if (!touch) return;
        this.inputState.touch.currentX = touch.clientX;
        this.inputState.touch.currentY = touch.clientY;

        const deltaX = touch.clientX - this.inputState.touch.startX;
        const deltaY = touch.clientY - this.inputState.touch.startY;

        this.triggerEvent('touchmove', { x: touch.clientX, y: touch.clientY, deltaX, deltaY });
    }

    private handleTouchEnd(event: TouchEvent) {
        event.preventDefault();
        if (!this.inputState.touch.active) return;

        const startX = this.inputState.touch.startX;
        const startY = this.inputState.touch.startY;
        const currentX = this.inputState.touch.currentX;
        const currentY = this.inputState.touch.currentY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // Определяем тип жеста
        const swipeThreshold = 50;
        const tapThreshold = 10;

        if (Math.abs(deltaX) < tapThreshold && Math.abs(deltaY) < tapThreshold) {
            this.triggerEvent('tap', { x: this.inputState.touch.currentX, y: this.inputState.touch.currentY });
        } else if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
            const direction = this.getSwipeDirection(deltaX, deltaY);
            this.triggerEvent('swipe', { direction, deltaX, deltaY });
            this.playHaptic({ duration: 100, strongMagnitude: 0.5, weakMagnitude: 0.2 });
        }

        this.inputState.touch.active = false;
        this.triggerEvent('touchend', { deltaX, deltaY });
    }

    private getSwipeDirection(deltaX: number, deltaY: number): string {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }

    // Обработчики геймпада
    private handleGamepadConnected(event: GamepadEvent) {
        this.inputState.gamepad = event.gamepad;
        this.triggerEvent('gamepad-connected', { gamepad: event.gamepad });
        debugLog('🎮 Gamepad connected:', event.gamepad.id);
    }

    private handleGamepadDisconnected(event: GamepadEvent) {
        this.inputState.gamepad = null;
        this.triggerEvent('gamepad-disconnected', { gamepad: event.gamepad });
        debugLog('🎮 Gamepad disconnected');
    }

    // Обновление состояния геймпада (нужно вызывать в игровом цикле)
    updateGamepad() {
        if (!this.inputState.gamepad) return;

        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.inputState.gamepad.index];

        if (!gamepad) return;

        // Проверяем кнопки
        gamepad.buttons.forEach((button, index) => {
            if (button.pressed) {
                this.triggerEvent('gamepad-button', { index, value: button.value });
            }
        });

        // Проверяем стики
        gamepad.axes.forEach((axis, index) => {
            if (Math.abs(axis) > 0.1) { // Мертвая зона
                this.triggerEvent('gamepad-axis', { index, value: axis });
            }
        });
    }

    // Система комбо
    private addToInputBuffer(input: string) {
        const currentTime = Date.now();

        // Очищаем старые входы (старше 2 секунд)
        if (currentTime - this.lastInputTime > 2000) {
            this.inputBuffer = [];
        }

        this.inputBuffer.push(input);
        this.lastInputTime = currentTime;

        // Ограничиваем размер буфера
        if (this.inputBuffer.length > 10) {
            // We drop the oldest input; record as missed input for telemetry
            this.inputBuffer.shift();
            try {
                getPerformanceManager().incrementMissedInputs(1);
            } catch {
                // ignore in non-browser env
            }
        }

        // Проверяем комбо
        this.checkComboSequences();
    }

    private checkComboSequences() {
        const inputString = this.inputBuffer.join(',');

        for (const [sequence, callback] of this.comboSequences) {
            if (inputString.includes(sequence)) {
                callback();
                this.inputBuffer = []; // Очищаем буфер после успешного комбо
                break;
            }
        }
    }

    // Тактильная обратная связь
    playHaptic(pattern: HapticPattern) {
        if (!this.hapticSupported) return;

        // Простая вибрация для мобильных устройств
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern.duration);
        }

        // Геймпад вибрация (если поддерживается)
        if (this.inputState.gamepad && 'vibrationActuator' in this.inputState.gamepad) {
            const actuator = (this.inputState.gamepad as Gamepad & { vibrationActuator?: { playEffect: (name: string, opts: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<unknown> } }).vibrationActuator;
            if (actuator && actuator.playEffect) {
                actuator.playEffect('dual-rumble', {
                    duration: pattern.duration,
                    strongMagnitude: pattern.strongMagnitude,
                    weakMagnitude: pattern.weakMagnitude
                });
            }
        }
    }

    // Система событий
    on(event: string, callback: InputCallback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event)!.push(callback);
    }

    off(event: string, callback: InputCallback) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private triggerEvent(event: string, data?: unknown) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    // Проверка состояния клавиш
    isKeyPressed(key: string): boolean {
        return this.inputState.keys.has(key);
    }

    // Получение состояния мыши
    getMouseState() {
        return { ...this.inputState.mouse };
    }

    // Получение состояния тача
    getTouchState() {
        return { ...this.inputState.touch };
    }

    /** Снять все слушатели и очистить состояние (вызывать при размонтировании компонента). */
    destroy() {
        if (!this._listenersAttached) return;
        window.removeEventListener('keydown', this.boundHandlers.keydown);
        window.removeEventListener('keyup', this.boundHandlers.keyup);
        window.removeEventListener('mousemove', this.boundHandlers.mousemove);
        window.removeEventListener('mousedown', this.boundHandlers.mousedown);
        window.removeEventListener('mouseup', this.boundHandlers.mouseup);
        window.removeEventListener('touchstart', this.boundHandlers.touchstart);
        window.removeEventListener('touchmove', this.boundHandlers.touchmove);
        window.removeEventListener('touchend', this.boundHandlers.touchend);
        window.removeEventListener('gamepadconnected', this.boundHandlers.gamepadconnected);
        window.removeEventListener('gamepaddisconnected', this.boundHandlers.gamepaddisconnected);
        this._listenersAttached = false;
        this.callbacks.clear();
        this.comboSequences.clear();
        this.inputBuffer = [];
    }
}

// Глобальный экземпляр менеджера ввода
const inputManager = new EnhancedInputManager();

// React компонент для інтеграції з грою
export const EnhancedControls: React.FC = () => {
    const setLocalPlayerState = useStore(s => s.setLocalPlayerState);
    const dash = useStore(s => s.dash);
    const { triggerAttack } = useCombatSystem(); // ⚔️ Combat Hook

    // Define all callbacks at the top level
    const handleMovement = useCallback((data: { code: string }) => {
        // Use store getter to get fresh state and avoid stale closures
        const store = useStore.getState();
        const { localPlayerState, laneCount } = store;
        let newLane = localPlayerState.lane;

        if (data.code === 'ArrowLeft' || data.code === 'KeyA') {
            newLane = Math.max(-Math.floor(laneCount / 2), localPlayerState.lane - 1);
        } else if (data.code === 'ArrowRight' || data.code === 'KeyD') {
            newLane = Math.min(Math.floor(laneCount / 2), localPlayerState.lane + 1);
        }

        if (newLane !== localPlayerState.lane) {
            setLocalPlayerState({ lane: newLane });
            inputManager.playHaptic({ duration: 50, strongMagnitude: 0.3, weakMagnitude: 0.1 });
        }

        // Стрибок + Атака UP
        if (data.code === 'Space' || data.code === 'ArrowUp' || data.code === 'KeyW') {
            setLocalPlayerState({ isJumping: true });
            store.jump(); // Trigger physics jump
            triggerAttack('up'); // ⚔️ Trigger UP Attack
            inputManager.playHaptic({ duration: 100, strongMagnitude: 0.5, weakMagnitude: 0.2 });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('player-jump'));
        }

        // Скольження + Атака DOWN
        if (data.code === 'ArrowDown' || data.code === 'KeyS') {
            setLocalPlayerState({ isSliding: true });
            triggerAttack('down'); // ⚔️ Trigger DOWN Attack
            inputManager.playHaptic({ duration: 50, strongMagnitude: 0.2, weakMagnitude: 0.1 });
        }

        // Ривок
        if (data.code === 'ShiftLeft' || data.code === 'ShiftRight') {
            dash();
        }
    }, [setLocalPlayerState, triggerAttack, dash]);

    const handleKeyUp = useCallback((data: { code: string }) => {
        // Allow key up to reset state even during countdown
        const store = useStore.getState();
        if (data.code === 'Space' || data.code === 'ArrowUp' || data.code === 'KeyW') {
            store.setLocalPlayerState({ isJumping: false });
            store.stopJump(); // Stop physics jump
        }
        if (data.code === 'ArrowDown' || data.code === 'KeyS') {
            store.setLocalPlayerState({ isSliding: false });
        }
    }, []);

    // Обробники свайпів для мобільних пристроїв
    const handleSwipe = useCallback((data: { direction: string }) => {
        const store = useStore.getState();
        switch (data.direction) {
            case 'up':
                store.setLocalPlayerState({ isJumping: true });
                triggerAttack('up');
                setTimeout(() => store.setLocalPlayerState({ isJumping: false }), 200);
                break;
            case 'down':
                // If in air, trigger the "DOWN" part of Jump Attack
                if (store.localPlayerState.isJumping) {
                    triggerAttack('down');
                } else {
                    store.setLocalPlayerState({ isSliding: true });
                    triggerAttack('down');
                }
                break;
            case 'forward':
                store.dash();
                break;
        }
    }, [triggerAttack]);

    const handleTap = useCallback(() => {
        const store = useStore.getState();
        store.setLocalPlayerState({ isJumping: true });
        setTimeout(() => store.setLocalPlayerState({ isJumping: false }), 150);
    }, []);

    const handleGamepadButton = useCallback((data: { index: number }) => {
        const store = useStore.getState();
        // A button (index 0) or B button (index 1) for jump/dash
        if (data.index === 0) store.setLocalPlayerState({ isJumping: true });
        if (data.index === 1) store.dash();
    }, []);

    const handleSpeedCombo = useCallback(() => dash(), [dash]);

    // Initialize input manager
    useEffect(() => {
        inputManager.init();
        return () => inputManager.destroy();
    }, []);

    // Register gamepad update in game loop
    useEffect(() => {
        const callback = () => {
            if (useStore.getState().status === GameStatus.PLAYING) {
                inputManager.updateGamepad();
            }
        };

        registerGameLoopCallback('worldUpdate', callback);
        return () => unregisterGameLoopCallback('worldUpdate', callback);
    }, []);

    // Subscribe to one-shot input events
    useEffect(() => {
        const handleKeyDownInternal = (data: { code: string }) => {
            // Allow jump/slide input even during countdown for responsive controls
            const store = useStore.getState();
            const isGameKey = data.code === 'Space' || data.code === 'ArrowUp' || data.code === 'KeyW' ||
                data.code === 'ArrowDown' || data.code === 'KeyS' || data.code === 'ShiftLeft' || data.code === 'ShiftRight';

            if (isGameKey || store.status === GameStatus.PLAYING) {
                handleMovement(data);
            }
        };

        const handleSwipeInternal = (data: { direction: string }) => {
            if (useStore.getState().status === GameStatus.PLAYING) {
                handleSwipe(data);
            }
        };

        inputManager.on('keydown', handleKeyDownInternal as InputCallback);
        inputManager.on('keyup', handleKeyUp as InputCallback);
        inputManager.on('swipe', handleSwipeInternal as InputCallback);
        inputManager.on('tap', handleTap);
        inputManager.on('gamepad-button', handleGamepadButton as InputCallback);
        inputManager.on('speed-combo', handleSpeedCombo);

        return () => {
            inputManager.off('keydown', handleKeyDownInternal as InputCallback);
            inputManager.off('keyup', handleKeyUp as InputCallback);
            inputManager.off('swipe', handleSwipeInternal as InputCallback);
            inputManager.off('tap', handleTap);
            inputManager.off('gamepad-button', handleGamepadButton as InputCallback);
            inputManager.off('speed-combo', handleSpeedCombo);

            // Сбрасываем состояния при размонтировании
            setLocalPlayerState({ isJumping: false, isSliding: false });
        };
    }, [handleMovement, handleSwipe, handleTap, handleGamepadButton, handleSpeedCombo, setLocalPlayerState]);

    // Robust Polling for "Is Down" states - moved to playerUpdate callback
    // This ensures correct execution order relative to physics (Logic -> Physics -> Render)
    useEffect(() => {
        const playerUpdateCallback = () => {
            const store = useStore.getState();
            // Allow polling during countdown and playing for responsive controls
            if (store.status !== GameStatus.PLAYING && store.status !== GameStatus.COUNTDOWN) return;

            const isCurrentlySliding = inputManager.isKeyPressed('KeyS') || inputManager.isKeyPressed('ArrowDown');
            const isCurrentlyJumping = inputManager.isKeyPressed('Space') || inputManager.isKeyPressed('KeyW') || inputManager.isKeyPressed('ArrowUp');

            // Only update store if the logical state changed to avoid redundant set() calls
            if (isCurrentlySliding !== store.localPlayerState.isSliding) {
                store.setLocalPlayerState({ isSliding: isCurrentlySliding });
            }

            // For jumping, we also let stopJump() be handled by physics if needed, 
            // but syncing the boolean here ensures visual consistency.
            if (isCurrentlyJumping !== store.localPlayerState.isJumping) {
                store.setLocalPlayerState({ isJumping: isCurrentlyJumping });
                if (!isCurrentlyJumping) {
                    store.stopJump();
                }
            }
        };

        registerGameLoopCallback('playerUpdate', playerUpdateCallback);
        return () => unregisterGameLoopCallback('playerUpdate', playerUpdateCallback);
    }, []);

    return null;
};

// Экспорт менеджера для использования в других компонентах (singleton, не компонент)
// eslint-disable-next-line react-refresh/only-export-components -- inputManager — синглтон, не React-компонент
export { inputManager };
