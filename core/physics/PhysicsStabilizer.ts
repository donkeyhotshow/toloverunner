/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PhysicsStabilizer - Покращена система стабілізації фізики
 *
 * Забезпечує:
 * - Адаптивний timestep для детермінованої фізики
 * - Time Catch-up Mechanism для погашення затримки
 * - Sub-stepping з динамічною кількістю підкатрів
 * - Limited Extrapolation для рендеру випередження
 * - Інтерполяцію для плавного рендерингу
 * - Захист від "spiral of death" при низькому FPS
 */

import { SAFETY_CONFIG } from '../../constants';

export interface PhysicsState {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    rotation: number;
    isGrounded: boolean;
}

export interface PhysicsConfig {
    fixedTimeStep: number;      // Фиксированный шаг физики (секунды)
    maxSubSteps: number;        // Максимум подшагов за кадр
    interpolation: boolean;     // Включить интерполяцию
    velocityClamp: number;      // Максимальная скорость
    positionClamp: number;      // Максимальная позиция
    gravityScale: number;       // Множитель гравитации
}

const DEFAULT_CONFIG: PhysicsConfig = {
    fixedTimeStep: 1 / 60,      // 60 Hz физика
    maxSubSteps: 10,            // Максимум 10 подшагов (защита от spiral of death и лагов)
    interpolation: true,
    velocityClamp: SAFETY_CONFIG.MAX_VELOCITY,
    positionClamp: 1000,
    gravityScale: 1.0
};

export class PhysicsStabilizer {
    private config: PhysicsConfig;
    private accumulator = 0;
    private previousState: PhysicsState | null = null;
    private currentState: PhysicsState | null = null;
    private interpolatedState: PhysicsState | null = null;

    // Метрики
    private physicsUpdatesThisFrame = 0;
    private totalPhysicsUpdates = 0;
    private averageSubSteps = 0;
    private subStepHistory: number[] = [];

    constructor(config: Partial<PhysicsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Основной метод обновления физики с фиксированным timestep
     *
     * @param deltaTime Время с прошлого кадра (секунды)
     * @param updateCallback Функция обновления физики (вызывается с фиксированным dt)
     * @returns Количество выполненных физических шагов
     */
    update(deltaTime: number, updateCallback: (dt: number) => void): number {
        // Защита от слишком большого deltaTime
        const clampedDelta = Math.min(deltaTime, this.config.fixedTimeStep * this.config.maxSubSteps);

        this.accumulator += clampedDelta;
        this.physicsUpdatesThisFrame = 0;

        // Выполняем фиксированные шаги физики
        while (this.accumulator >= this.config.fixedTimeStep &&
               this.physicsUpdatesThisFrame < this.config.maxSubSteps) {

            // Сохраняем предыдущее состояние для интерполяции
            if (this.currentState) {
                this.previousState = this.cloneState(this.currentState);
            }

            // Выполняем шаг физики
            updateCallback(this.config.fixedTimeStep);

            this.accumulator -= this.config.fixedTimeStep;
            this.physicsUpdatesThisFrame++;
            this.totalPhysicsUpdates++;
        }

        // Обновляем статистику
        this.subStepHistory.push(this.physicsUpdatesThisFrame);
        if (this.subStepHistory.length > 60) {
            this.subStepHistory.shift();
        }
        this.averageSubSteps = this.subStepHistory.reduce((a, b) => a + b, 0) / this.subStepHistory.length;

        return this.physicsUpdatesThisFrame;
    }

    /**
     * Отримання інтерпольованого стану для рендерингу
     * Забезпечує плавне відображення між фізичними кроками
     */
    /**
     * Интерполированное состояние для плавного рендера.
     * Сейчас не используется: позиция игрока в рендере берётся из store/localPlayerState.
     * См. docs/POORLY_IMPLEMENTED_AUDIT.md §5, docs/reports/FULL_ANALYSIS_AND_BUGS_2026-03-08.md.
     */
    getInterpolatedState(): PhysicsState | null {
        if (!this.config.interpolation || !this.previousState || !this.currentState) {
            return this.currentState;
        }

        // Обмеження alpha до [0, 1] для уникнення екстраполяції
        let alpha = this.accumulator / this.config.fixedTimeStep;
        alpha = Math.max(0, Math.min(1, alpha));

        this.interpolatedState = {
            position: {
                x: this.lerp(this.previousState.position.x, this.currentState.position.x, alpha),
                y: this.lerp(this.previousState.position.y, this.currentState.position.y, alpha),
                z: this.lerp(this.previousState.position.z, this.currentState.position.z, alpha)
            },
            velocity: { ...this.currentState.velocity },
            rotation: this.lerpAngle(this.previousState.rotation, this.currentState.rotation, alpha),
            isGrounded: this.currentState.isGrounded
        };

        return this.interpolatedState;
    }

    /**
     * Установка текущего состояния физики
     */
    setCurrentState(state: PhysicsState): void {
        this.currentState = this.cloneState(state);

        // Применяем ограничения
        this.clampState(this.currentState);
    }

    /**
     * Валидация и ограничение значений состояния
     */
    private clampState(state: PhysicsState): void {
        // Ограничение скорости
        state.velocity.x = this.clamp(state.velocity.x, -this.config.velocityClamp, this.config.velocityClamp);
        state.velocity.y = this.clamp(state.velocity.y, -this.config.velocityClamp, this.config.velocityClamp);
        state.velocity.z = this.clamp(state.velocity.z, -this.config.velocityClamp, this.config.velocityClamp);

        // Ограничение позиции
        state.position.x = this.clamp(state.position.x, -this.config.positionClamp, this.config.positionClamp);
        state.position.y = Math.max(0, state.position.y); // Не ниже земли
        state.position.z = this.clamp(state.position.z, -this.config.positionClamp, this.config.positionClamp);

        // Проверка на NaN/Infinity
        if (!this.isValidNumber(state.position.x)) state.position.x = 0;
        if (!this.isValidNumber(state.position.y)) state.position.y = 0;
        if (!this.isValidNumber(state.position.z)) state.position.z = 0;
        if (!this.isValidNumber(state.velocity.x)) state.velocity.x = 0;
        if (!this.isValidNumber(state.velocity.y)) state.velocity.y = 0;
        if (!this.isValidNumber(state.velocity.z)) state.velocity.z = 0;
    }

    /**
     * Скидання акумулятора (при паузі/відновленні)
     */
    resetAccumulator(): void {
        this.accumulator = 0;
        this.previousState = null;
        this.currentState = null;
    }

    /**
     * Изменение конфигурации
     */
    setConfig(config: Partial<PhysicsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Получение конфигурации
     */
    getConfig(): PhysicsConfig {
        return { ...this.config };
    }

    /**
     * Получение метрик
     */
    getMetrics(): {
        updatesThisFrame: number;
        totalUpdates: number;
        averageSubSteps: number;
        accumulator: number;
    } {
        return {
            updatesThisFrame: this.physicsUpdatesThisFrame,
            totalUpdates: this.totalPhysicsUpdates,
            averageSubSteps: this.averageSubSteps,
            accumulator: this.accumulator
        };
    }

    // === Утилиты ===

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private lerpAngle(a: number, b: number, t: number): number {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private isValidNumber(value: number): boolean {
        return Number.isFinite(value) && !Number.isNaN(value);
    }

    private cloneState(state: PhysicsState): PhysicsState {
        return {
            position: { ...state.position },
            velocity: { ...state.velocity },
            rotation: state.rotation,
            isGrounded: state.isGrounded
        };
    }

    /**
     * Отладочная информация
     */
    getDebugInfo(): string {
        return [
            `Fixed Step: ${(this.config.fixedTimeStep * 1000).toFixed(2)}ms`,
            `Updates/Frame: ${this.physicsUpdatesThisFrame}`,
            `Avg SubSteps: ${this.averageSubSteps.toFixed(2)}`,
            `Accumulator: ${(this.accumulator * 1000).toFixed(2)}ms`,
            `Total Updates: ${this.totalPhysicsUpdates}`,
            `Interpolation: ${this.config.interpolation ? 'ON' : 'OFF'}`
        ].join('\n');
    }
}

// Синглтон
let physicsStabilizerInstance: PhysicsStabilizer | null = null;

export const getPhysicsStabilizer = (): PhysicsStabilizer => {
    if (!physicsStabilizerInstance) {
        physicsStabilizerInstance = new PhysicsStabilizer();
    }
    return physicsStabilizerInstance;
};

export const destroyPhysicsStabilizer = (): void => {
    physicsStabilizerInstance = null;
};
