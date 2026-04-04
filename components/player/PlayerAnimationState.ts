/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PlayerAnimationState - Система управления анимациями персонажа
 * Централизованное управление всеми анимациями и реакциями
 */

import { Vector3, Euler } from 'three';

/**
 * Стани анімації персонажа
 */
export enum AnimationState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    JUMPING = 'JUMPING',
    FALLING = 'FALLING',  // Новий стан - падіння
    HIT = 'HIT',
    COLLECT = 'COLLECT',
    BOOST = 'BOOST',
    DASH = 'DASH',
    LANDING = 'LANDING',
    SLIDING = 'SLIDING'   // Новий стан - ковзання
}

/**
 * Параметры анимации
 */
export interface AnimationParams {
    scale: Vector3;
    rotation: Euler;
    color: string;
    shake: number;
    glow: number;
}

/**
 * Менеджер анимаций персонажа
 */
export class PlayerAnimationState {
    private currentState: AnimationState = AnimationState.RUNNING;
    private stateTimer: number = 0;
    private hitShake: number = 0;
    private collectGlow: number = 0;
    private boostIntensity: number = 0;

    // Параметри анімацій
    private readonly ANIMATION_DURATIONS = {
        [AnimationState.HIT]: 0.4,
        [AnimationState.COLLECT]: 0.25,
        [AnimationState.BOOST]: 0.15,
        [AnimationState.DASH]: 0.12,
        [AnimationState.LANDING]: 0.2,
        [AnimationState.SLIDING]: 0.6,
        [AnimationState.IDLE]: 1.0,
        [AnimationState.RUNNING]: 1.0,
        [AnimationState.JUMPING]: 0.4,
        [AnimationState.FALLING]: 0.3,
    };

    /**
     * Оновлює стан анімації
     */
    update(delta: number): void {
        this.stateTimer -= delta;

        // Автоматичний возврат до RUNNING після тимчасових станів
        if (this.stateTimer <= 0 && this.currentState !== AnimationState.RUNNING &&
            this.currentState !== AnimationState.JUMPING && this.currentState !== AnimationState.FALLING) {
            this.currentState = AnimationState.RUNNING;
        }

        // Швидше затухання ефектів
        this.hitShake = Math.max(0, this.hitShake - delta * 6);
        this.collectGlow = Math.max(0, this.collectGlow - delta * 5);
        this.boostIntensity = Math.max(0, this.boostIntensity - delta * 4);
    }

    /**
     * Устанавливает состояние анимации
     */
    setState(state: AnimationState, duration?: number): void {
        this.currentState = state;
        this.stateTimer = duration || this.ANIMATION_DURATIONS[state] || 0.3;

        // Инициализация эффектов
        if (state === AnimationState.HIT) {
            this.hitShake = 1.0;
        } else if (state === AnimationState.COLLECT) {
            this.collectGlow = 1.0;
        } else if (state === AnimationState.BOOST) {
            this.boostIntensity = 1.0;
        }
    }

    /**
     * Получает текущее состояние
     */
    getState(): AnimationState {
        return this.currentState;
    }

    /**
     * Вычисляет параметры анимации на основе состояния
     */
    getAnimationParams(time: number, isGrounded: boolean, velocity: Vector3): AnimationParams {
        const scale = new Vector3(1, 1, 1);
        const rotation = new Euler(0, 0, 0);
        let color = '#ffffff';
        let shake = 0;
        let glow = 0;

        // Базовий стан
        if (!isGrounded) {
            // Визначаємо між стрибком та падінням
            this.currentState = velocity.y > 0 ? AnimationState.JUMPING : AnimationState.FALLING;
        } else if (isGrounded && Math.abs(velocity.y) < 0.1) {
            this.currentState = AnimationState.RUNNING;
        }

        switch (this.currentState) {
            case AnimationState.HIT: {
                // Відскік і тряска при ударі
                const hitProgress = 1 - (this.stateTimer / this.ANIMATION_DURATIONS[AnimationState.HIT]);
                scale.set(
                    1.0 - Math.sin(hitProgress * Math.PI) * 0.35, // Сильніше стискання
                    1.0 + Math.sin(hitProgress * Math.PI) * 0.25, // Більше розтягування
                    1.0 - Math.sin(hitProgress * Math.PI) * 0.35
                );
                shake = this.hitShake;
                rotation.z = Math.sin(time * 35) * shake * 0.25; // Швидша тряска
                color = '#ff8888'; // Більш червоне забарвлення
                break;
            }

            case AnimationState.COLLECT: {
                // Радостная реакция при сборе
                const collectProgress = 1 - (this.stateTimer / this.ANIMATION_DURATIONS[AnimationState.COLLECT]);
                scale.set(
                    1.0 + Math.sin(collectProgress * Math.PI) * 0.15, // Увеличение
                    1.0 + Math.sin(collectProgress * Math.PI) * 0.15,
                    1.0 + Math.sin(collectProgress * Math.PI) * 0.15
                );
                glow = this.collectGlow;
                color = '#ffffaa'; // Легкое пожелтение от радости
                break;
            }

            case AnimationState.BOOST: {
                // Ефект прискорення
                const boostProgress = 1 - (this.stateTimer / this.ANIMATION_DURATIONS[AnimationState.BOOST]);
                scale.set(
                    0.85 + Math.sin(boostProgress * Math.PI * 2) * 0.1,
                    0.85 + Math.sin(boostProgress * Math.PI * 2) * 0.1,
                    1.3 + Math.sin(boostProgress * Math.PI * 2) * 0.25 // Більше розтягування вперед
                );
                glow = this.boostIntensity;
                color = '#88ffff'; // Більш яскраве блакитне світіння
                break;
            }

            case AnimationState.DASH: {
                // Ефект ривка
                const dashProgress = 1 - (this.stateTimer / this.ANIMATION_DURATIONS[AnimationState.DASH]);
                scale.set(
                    0.8,
                    0.8,
                    1.4 + Math.sin(dashProgress * Math.PI) * 0.35 // Сильніше розтягування
                );
                color = '#eeffff';
                glow = 1.2;
                break;
            }

            case AnimationState.LANDING: {
                // Эффект приземления (squash)
                const landingProgress = 1 - (this.stateTimer / this.ANIMATION_DURATIONS[AnimationState.LANDING]);
                scale.set(
                    1.0 + Math.sin(landingProgress * Math.PI) * 0.2, // Растяжение X
                    0.8 + Math.sin(landingProgress * Math.PI) * 0.2, // Сжатие Y
                    1.0 + Math.sin(landingProgress * Math.PI) * 0.1
                );
                break;
            }

            case AnimationState.JUMPING: {
                // Анімація стрибка
                const jumpIntensity = Math.abs(velocity.y) * 0.025;
                scale.set(
                    1.0 - jumpIntensity * 0.15,
                    1.0 + jumpIntensity * 0.25, // Більше розтягування вгору
                    1.0 - jumpIntensity * 0.1
                );
                break;
            }

            case AnimationState.FALLING: {
                // Анімація падіння - стискання
                const fallIntensity = Math.abs(velocity.y) * 0.015;
                scale.set(
                    1.0 + fallIntensity * 0.1,
                    1.0 - fallIntensity * 0.15,
                    1.0 + fallIntensity * 0.1
                );
                break;
            }

            default: {
                // RUNNING - легке покачування
                scale.set(1.0, 1.0, 1.0);
                break;
            }
        }

        return { scale, rotation, color, shake, glow };
    }

    /**
     * Сбрасывает все анимации
     */
    reset(): void {
        this.currentState = AnimationState.RUNNING;
        this.stateTimer = 0;
        this.hitShake = 0;
        this.collectGlow = 0;
        this.boostIntensity = 0;
    }
}

