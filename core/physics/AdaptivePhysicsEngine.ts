/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdaptivePhysicsEngine - Покращена система фізичного рушія
 *
 * Функції:
 * - Адаптивний timestep на основі FPS
 * - Time Catch-up Mechanism для погашення затримки
 * - Limited Extrapolation для випередження рендеру
 * - CCD (Continuous Collision Detection) для швидких об'єктів
 * - Адаптивний Sub-stepping
 * - Динамічний mp Buffer
 */

import { Vector3 } from 'three';
import { GameObject, ObjectType } from '../../types';
import { COLLISION_CONFIG } from '../../constants/physicsConfig';

export interface CollisionResult {
    hit: boolean;
    graze: boolean;
    object: GameObject | null;
}

export interface AdaptivePhysicsConfig {
    // Адаптивний timestep
    fpsThresholds: {
        low: number;      // < 30 FPS -> 1/30
        medium: number;   // 30-60 FPS -> 1/60
        high: number;      // 60-90 FPS -> 1/90
        ultra: number;     // > 90 FPS -> 1/120
    };
    
    // Time Catch-up Mechanism
    catchUpConfig: {
        lagThresholdMs: number;    // 100ms - поріг затримки
        minCatchUpMultiplier: number; // 1.5x
        maxCatchUpMultiplier: number; // 3x максимальне прискорення
        catchUpDecay: number;      // Швидкість зменшення прискорення
    };
    
    // Extrapolation
    extrapolationConfig: {
        maxAlpha: number;          // 1.5 - максимальний коефіцієнт екстраполяції
        maxDistancePercent: number; // 0.1 - максимум 10% від швидкості за кадр
    };
    
    // CCD
    ccdConfig: {
        minVelocityThreshold: number; // 10 одиниць/секунду - мінімальна швидкість для CCD
        maxRaySteps: number;         // Максимальна кількість кроків raycast
    };
    
    // Sub-stepping
    subStepConfig: {
        minSubSteps: number;    // 1
        maxSubSteps: number;    // 4
        maxDeltaTime: number;   // Максимальний deltaTime для стабільності
    };
    
    // Плавне перемикання
    smoothTransitionConfig: {
        interpolationSpeed: number; // Швидкість інтерполяції між режимами
    };
}

const DEFAULT_CONFIG: AdaptivePhysicsConfig = {
    fpsThresholds: {
        low: 30,
        medium: 60,
        high: 90,
        ultra: 120
    },
    catchUpConfig: {
        lagThresholdMs: 100,
        minCatchUpMultiplier: 1.5,
        maxCatchUpMultiplier: 3.0,
        catchUpDecay: 0.95
    },
    extrapolationConfig: {
        maxAlpha: 1.5,
        maxDistancePercent: 0.1
    },
    ccdConfig: {
        minVelocityThreshold: 10,
        maxRaySteps: 8
    },
    subStepConfig: {
        minSubSteps: 1,
        maxSubSteps: 4,
        maxDeltaTime: 0.1 // 100ms max
    },
    smoothTransitionConfig: {
        interpolationSpeed: 2.0 // Швидкість переходу між режимами
    }
};

// Named constants for magic numbers
const TARGET_FPS = 60;
const TARGET_FRAME_TIME_MS = 1000 / TARGET_FPS; // ~16.67ms

interface PhysicsState {
    position: Vector3;
    velocity: Vector3;
    rotation: number;
    isGrounded: boolean;
}

interface MotionPrediction {
    positions: Vector3[];
    velocities: Vector3[];
    timestamps: number[];
}

export class AdaptivePhysicsEngine {
    private config: AdaptivePhysicsConfig;
    
    // Поточний стан фізики
    private currentState: PhysicsState = {
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rotation: 0,
        isGrounded: true
    };
    
    private previousState: PhysicsState | null = null;
    private interpolatedState: PhysicsState | null = null;
    
    // Адаптивний timestep
    private targetTimeStep: number = 1 / 60;
    private smoothedTimeStep: number = 1 / 60;
    
    // Accumulator для fixed timestep
    private accumulator: number = 0;
    
    // Time Catch-up
    private catchUpMultiplier: number = 1.0;
    private frameTimes: number[] = [];
    private lastFrameTime: number = 0;
    private averageFrameTime: number = 16.67; // ~60 FPS
    
    // Extrapolation
    private extrapolationAlpha: number = 1.0;
    private maxExtrapolationDistance: number = 0;
    
    // Motion prediction buffer (mp Buffer)
    private motionPredictions: Map<number, MotionPrediction> = new Map();
    private predictionMemoryMs: number = 100; // Зберігаємо 100ms даних
    
    // Метрики
    private physicsUpdatesThisFrame: number = 0;
    private totalPhysicsUpdates: number = 0;
    private subStepHistory: number[] = [];
    private averageSubSteps: number = 1;
    private currentFPS: number = 60;
    private lagDebt: number = 0; // Накопичена затримка
    
    // 🆕 TDI Metric
    private currentTDI: number = 0;
    private activeThreatsCount: number = 0;
    
    // Collision
    private static readonly PLAYER_RADIUS = COLLISION_CONFIG.PLAYER_RADIUS;
    private static readonly OBSTACLE_RADIUS = COLLISION_CONFIG.OBSTACLE_RADIUS;
    private static readonly PICKUP_RADIUS = COLLISION_CONFIG.PICKUP_RADIUS;
    private static readonly GRAZE_RADIUS = COLLISION_CONFIG.GRAZE_RADIUS;
    private static readonly OBSTACLE_DEPTH_Z = COLLISION_CONFIG.OBSTACLE_DEPTH_Z;
    private static readonly OBSTACLE_SPECIAL_DEPTH_Z = COLLISION_CONFIG.OBSTACLE_SPECIAL_DEPTH_Z;
    
    private readonly result: CollisionResult = { hit: false, graze: false, object: null };
    
    constructor(config: Partial<AdaptivePhysicsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.targetTimeStep = 1 / 60;
        this.smoothedTimeStep = 1 / 60;
    }
    
    /**
     * Оновлення фізики з адаптивним timestep та catch-up механізмом
     */
    update(
        deltaTime: number,
        gameObjects: GameObject[],
        currentDistance: number,
        moveDist: number,
        playerVelocity: Vector3,
        isDashing: boolean = false,
        isSliding: boolean = false
    ): CollisionResult {
        // 1. Оновлюємо FPS та середній час кадру
        this.updateFrameMetrics(deltaTime);

        // 1.5. Оновлюємо TDI метрику (GDD)
        const speedLength = playerVelocity.length();
        const visibleDistance = 60; // Видимість вперед
        this.activeThreatsCount = gameObjects.filter(obj => 
            obj.active && 
            obj.type !== ObjectType.COIN && 
            obj.type !== ObjectType.MAGNET &&
            obj.type !== ObjectType.SPEED_BOOST &&
            obj.type !== ObjectType.SHIELD &&
            obj.position[2] + currentDistance > -5 && 
            obj.position[2] + currentDistance < visibleDistance
        ).length;
        
        // TDI формула. Беремо середнє вікно 0.65с
        this.currentTDI = (this.activeThreatsCount * speedLength) / 0.65;
        if (isDashing) {
            this.currentTDI *= 0.6; // Dash: -40% TDI на час дії
        }
        
        // 2. Визначаємо цільовий timestep на основі FPS
        this.calculateTargetTimeStep();
        
        // 3. Плавне перемикання між режимами
        this.smoothTimeStepTransition(deltaTime);
        
        // 4. Обчислюємо catch-up множник
        this.calculateCatchUp(deltaTime);
        
        // 5. Оновлюємо максимальну відстань екстраполяції
        this.updateMaxExtrapolation(playerVelocity);
        
        // 6. Виконуємо sub-stepping
        const adjustedDelta = Math.min(
            deltaTime * this.catchUpMultiplier,
            this.config.subStepConfig.maxDeltaTime
        );
        
        this.accumulator += adjustedDelta;
        this.physicsUpdatesThisFrame = 0;
        
        let lastCollision: CollisionResult = { hit: false, graze: false, object: null };
        
        // Адаптивний sub-stepping
        const subSteps = this.calculateSubSteps(adjustedDelta);
        const subStepTime = adjustedDelta / subSteps;
        
        // Зберігаємо попередній стан для інтерполяції
        if (this.currentState) {
            this.previousState = {
                position: this.currentState.position.clone(),
                velocity: this.currentState.velocity.clone(),
                rotation: this.currentState.rotation,
                isGrounded: this.currentState.isGrounded
            };
        }
        
        // Виконуємо підкакри
        for (let i = 0; i < subSteps && this.accumulator >= this.smoothedTimeStep; i++) {
            // Оновлюємо позицію гравця
            this.updatePlayerPhysics(subStepTime, moveDist / subSteps);
            
            // CCD перевірка колізій
            const collision = this.checkCollisionWithCCD(
                this.currentState.position.x,
                this.currentState.position.y,
                gameObjects,
                currentDistance,
                currentDistance - (moveDist / subSteps) * (i + 1),
                playerVelocity,
                isDashing,
                isSliding
            );
            
            if (collision.hit || collision.graze) {
                lastCollision = collision;
            }
            
            this.accumulator -= this.smoothedTimeStep;
            this.physicsUpdatesThisFrame++;
            this.totalPhysicsUpdates++;
            
            // Оновлюємо motion prediction
            this.updateMotionPrediction();
        }
        
        // Оновлюємо статистику
        this.subStepHistory.push(this.physicsUpdatesThisFrame);
        if (this.subStepHistory.length > 60) {
            this.subStepHistory.shift();
        }
        this.averageSubSteps = this.subStepHistory.reduce((a, b) => a + b, 0) / this.subStepHistory.length;
        
        // Очищуємо старі motion predictions
        this.cleanupOldPredictions();
        
        return lastCollision;
    }
    
    /**
     * Оновлення метрик FPS
     */
    private updateFrameMetrics(_deltaTime: number): void {
        const now = performance.now();
        
        if (this.lastFrameTime > 0) {
            const frameTime = (now - this.lastFrameTime);
            this.frameTimes.push(frameTime);
            
            // Зберігаємо тільки останні 60 кадрів
            if (this.frameTimes.length > 60) {
                this.frameTimes.shift();
            }
            
            // Обчислюємо середній час кадру
            if (this.frameTimes.length > 0) {
                this.averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
                this.currentFPS = 1000 / this.averageFrameTime;
            }
        }
        
        this.lastFrameTime = now;
    }
    
    /**
     * Обчислення цільового timestep на основі FPS
     */
    private calculateTargetTimeStep(): void {
        const fps = this.currentFPS;
        
        if (fps < this.config.fpsThresholds.low) {
            this.targetTimeStep = 1 / this.config.fpsThresholds.low;
        } else if (fps < this.config.fpsThresholds.medium) {
            this.targetTimeStep = 1 / this.config.fpsThresholds.medium;
        } else if (fps < this.config.fpsThresholds.high) {
            this.targetTimeStep = 1 / this.config.fpsThresholds.high;
        } else {
            this.targetTimeStep = 1 / this.config.fpsThresholds.ultra;
        }
    }
    
    /**
     * Плавне перемикання між режимами timestep
     */
    private smoothTimeStepTransition(deltaTime: number): void {
        const speed = this.config.smoothTransitionConfig.interpolationSpeed * deltaTime;
        this.smoothedTimeStep = this.smoothedTimeStep + (this.targetTimeStep - this.smoothedTimeStep) * speed;
    }
    
    /**
     * Time Catch-up Mechanism
     * При виявленні затримки понад 100ms прискорюємо симуляцію
     */
    private calculateCatchUp(deltaTime: number): void {
        const lagMs = this.averageFrameTime - TARGET_FRAME_TIME_MS;
        
        if (lagMs > this.config.catchUpConfig.lagThresholdMs) {
            // Є затримка - збільшуємо catch-up
            const lagRatio = Math.min(lagMs / 100, 2); // 0-2x额外 прискорення
            const targetMultiplier = this.config.catchUpConfig.minCatchUpMultiplier + 
                (this.config.catchUpConfig.maxCatchUpMultiplier - this.config.catchUpConfig.minCatchUpMultiplier) * lagRatio;
            
            // Плавне наростання прискорення
            this.catchUpMultiplier = Math.min(
                this.catchUpMultiplier + 0.1,
                Math.min(targetMultiplier, this.config.catchUpConfig.maxCatchUpMultiplier)
            );
            
            this.lagDebt += (lagMs - this.config.catchUpConfig.lagThresholdMs) * deltaTime;
        } else {
            // Немає затримки - зменшуємо catch-up
            this.catchUpMultiplier = Math.max(1.0, this.catchUpMultiplier * this.config.catchUpConfig.catchUpDecay);
            
            // Погашаємо борг
            if (this.lagDebt > 0) {
                this.lagDebt = Math.max(0, this.lagDebt - deltaTime * 0.5);
            }
        }
        
        // Обмежуємо максимальне прискорення
        this.catchUpMultiplier = Math.min(this.catchUpMultiplier, this.config.catchUpConfig.maxCatchUpMultiplier);
    }
    
    /**
     * Оновлення максимальної відстані екстраполяції
     */
    private updateMaxExtrapolation(playerVelocity: Vector3): void {
        const speed = playerVelocity.length();
        this.maxExtrapolationDistance = speed * this.config.extrapolationConfig.maxDistancePercent;
    }
    
    /**
     * Обчислення оптимальної кількості підкатрів
     */
    private calculateSubSteps(_deltaTime: number): number {
        // Базова кількість підкатрів залежить від швидкості
        const speed = this.currentState.velocity.length();
        
        let baseSteps: number;
        if (speed > 50) {
            baseSteps = this.config.subStepConfig.maxSubSteps;
        } else if (speed > 20) {
            baseSteps = Math.floor(this.config.subStepConfig.maxSubSteps / 2);
        } else {
            baseSteps = this.config.subStepConfig.minSubSteps;
        }
        
        // Адаптивна кількість на основі lag
        if (this.lagDebt > 0.1) {
            baseSteps = Math.min(baseSteps + 1, this.config.subStepConfig.maxSubSteps);
        }
        
        return baseSteps;
    }
    
    /**
     * Оновлення фізики гравця
     */
    private updatePlayerPhysics(_dt: number, moveDist: number): void {
        // Просте оновлення позиції на основі руху
        const newZ = this.currentState.position.z + moveDist;
        
        // Оновлюємо Z позицію (рух вперед)
        this.currentState.position.z = newZ;
    }
    
    /**
     * Перевірка колізій з CCD (Continuous Collision Detection)
     */
    private checkCollisionWithCCD(
        playerX: number,
        playerY: number,
        objects: GameObject[],
        currentDistance: number,
        previousDistance: number,
        playerVelocity: Vector3,
        isDashing: boolean = false,
        isSliding: boolean = false
    ): CollisionResult {
        const result = this.result;
        result.hit = false;
        result.graze = false;
        result.object = null;
        
        const count = objects.length;
        if (count === 0) return result;
        
        const speed = playerVelocity.length();
        const useCCD = speed >= this.config.ccdConfig.minVelocityThreshold;
        
        const playerRadius = isDashing ? AdaptivePhysicsEngine.PLAYER_RADIUS * 0.5 : AdaptivePhysicsEngine.PLAYER_RADIUS;
        
        for (let i = 0; i < count; i++) {
            const obj = objects[i];
            if (!obj || !obj.active) continue;
            
            const isObstacle = obj.type === ObjectType.OBSTACLE;
            const isSpecialObstacle = obj.type === ObjectType.OBSTACLE_JUMP ||
                obj.type === ObjectType.OBSTACLE_SLIDE ||
                obj.type === ObjectType.OBSTACLE_DODGE;
            
            let objDepth: number = AdaptivePhysicsEngine.OBSTACLE_DEPTH_Z;
            if (isSpecialObstacle) {
                objDepth = AdaptivePhysicsEngine.OBSTACLE_SPECIAL_DEPTH_Z;
            }
            
            // Z-axis Sweep (CCD base)
            const zStart = obj.position[2] + previousDistance;
            const zEnd = obj.position[2] + currentDistance;
            const collisionDepth = playerRadius + objDepth;
            
            const minZ = Math.min(zStart, zEnd);
            const maxZ = Math.max(zStart, zEnd);
            const zOverlap = (minZ <= collisionDepth && maxZ >= -collisionDepth);
            
            if (!zOverlap) {
                if (minZ > 20 || maxZ < -5) continue;
                continue;
            }
            
            // CCD Raycast для швидких об'єктів
            if (useCCD && !this.checkRayCollision(
                this.currentState.position,
                playerVelocity,
                obj,
                objDepth,
                playerRadius
            )) {
                continue;
            }
            
            // Y-axis check
            const objY = obj.position[1];
            const obstacleHeight = (obj.height != null && obj.height > 0) ? obj.height : 1.0;
            
            if (obj.type === ObjectType.OBSTACLE_SLIDE) {
                if (isDashing || isSliding) continue;
            } else if (obj.type === ObjectType.OBSTACLE_JUMP || obj.type === ObjectType.OBSTACLE) {
                const clearHeight = (obj.type === ObjectType.OBSTACLE_JUMP ? 
                    COLLISION_CONFIG.JUMP_CLEAR_HEIGHT : COLLISION_CONFIG.JUMP_CLEAR_HEIGHT) * obstacleHeight;
                if (playerY > objY + clearHeight) continue;
            }
            
            // X-axis check
            const objX = obj.position[0];
            const dx = Math.abs(objX - playerX);
            const isPickup = !isObstacle && !isSpecialObstacle;
            
            let hitDistX = isPickup ? 
                (AdaptivePhysicsEngine.PICKUP_RADIUS + playerRadius) : 
                (AdaptivePhysicsEngine.OBSTACLE_RADIUS + playerRadius);
            
            if (obj.type === ObjectType.OBSTACLE_DODGE && obj.width != null) {
                hitDistX = obj.width * 0.5 + playerRadius;
            }
            
            if (dx < hitDistX) {
                result.hit = true;
                result.object = obj;
                if (!isPickup) return result;
            } else if (!isPickup) {
                const grazeDistance = AdaptivePhysicsEngine.GRAZE_RADIUS + playerRadius;
                if (dx < grazeDistance && Math.abs(zEnd) < 1.0) {
                    result.graze = true;
                    result.object = obj;
                }
            }
        }
        
        return result;
    }
    
    /**
     * Raycast CCD для швидких об'єктів
     */
    private checkRayCollision(
        startPos: Vector3,
        velocity: Vector3,
        obj: GameObject,
        objDepth: number,
        playerRadius: number
    ): boolean {
        const dt = this.smoothedTimeStep;
        const raySteps = Math.min(
            Math.ceil(velocity.length() * dt / (playerRadius * 0.5)),
            this.config.ccdConfig.maxRaySteps
        );
        
        if (raySteps <= 1) return true; // Повільний об'єкт - звичайна перевірка
        
        const stepDt = dt / raySteps;
        
        for (let i = 0; i < raySteps; i++) {
            const t = (i + 1) / raySteps;
            const checkPos = startPos.clone().add(velocity.clone().multiplyScalar(stepDt * t));
            
            const dx = Math.abs(obj.position[0] - checkPos.x);
            const dy = Math.abs(obj.position[1] - checkPos.y);
            
            const hitDistX = AdaptivePhysicsEngine.OBSTACLE_RADIUS + playerRadius;
            const hitDistY = objDepth + playerRadius;
            
            if (dx < hitDistX && dy < hitDistY) {
                return true; // Знайдено зіткнення на проміжку
            }
        }
        
        return false;
    }
    
    /**
     * Отримання інтерпольованого/екстрапольованого стану для рендерингу
     */
    getRenderState(extrapolate: boolean = false): PhysicsState {
        if (!this.previousState || !this.currentState) {
            return this.currentState;
        }
        
        // Обчислюємо alpha для інтерполяції/екстраполяції
        let alpha = this.accumulator / this.smoothedTimeStep;
        
        if (extrapolate && alpha >= 1.0) {
            // Limited Extrapolation
            const extraAlpha = Math.min(
                alpha,
                this.config.extrapolationConfig.maxAlpha
            );
            
            // Обмежуємо екстрапольовану відстань
            const maxExtraDistance = this.maxExtrapolationDistance;
            
            this.extrapolationAlpha = extraAlpha;
            
            const renderPos = new Vector3(
                this.lerp(this.previousState.position.x, this.currentState.position.x, extraAlpha),
                this.lerp(this.previousState.position.y, this.currentState.position.y, extraAlpha),
                this.currentState.position.z // Z не екстраполюємо
            );
            
            // Обмежуємо екстраполяцію
            const extraDist = renderPos.distanceTo(this.currentState.position);
            if (extraDist > maxExtraDistance) {
                const dir = renderPos.clone().sub(this.currentState.position).normalize();
                renderPos.copy(this.currentState.position).add(dir.multiplyScalar(maxExtraDistance));
            }
            
            this.interpolatedState = {
                position: renderPos,
                velocity: this.currentState.velocity.clone(),
                rotation: this.lerpAngle(this.previousState.rotation, this.currentState.rotation, extraAlpha),
                isGrounded: this.currentState.isGrounded
            };
        } else {
            // Стандартна інтерполяція
            alpha = Math.max(0, Math.min(1, alpha));
            this.extrapolationAlpha = alpha;
            
            this.interpolatedState = {
                position: new Vector3(
                    this.lerp(this.previousState.position.x, this.currentState.position.x, alpha),
                    this.lerp(this.previousState.position.y, this.currentState.position.y, alpha),
                    this.lerp(this.previousState.position.z, this.currentState.position.z, alpha)
                ),
                velocity: this.currentState.velocity.clone(),
                rotation: this.lerpAngle(this.previousState.rotation, this.currentState.rotation, alpha),
                isGrounded: this.currentState.isGrounded
            };
        }
        
        return this.interpolatedState!;
    }
    
    /**
     * Оновлення motion prediction (mp Buffer)
     */
    private updateMotionPrediction(): void {
        const timestamp = performance.now();
        const prediction: MotionPrediction = {
            positions: [this.currentState.position.clone()],
            velocities: [this.currentState.velocity.clone()],
            timestamps: [timestamp]
        };
        
        // Зберігаємо передбачення для кожного об'єкта
        const objectId = this.totalPhysicsUpdates % 100; // Простий ID
        this.motionPredictions.set(objectId, prediction);
        
        // Обмежуємо розмір буфера
        const maxMemory = this.predictionMemoryMs;
        this.motionPredictions.forEach((pred, id) => {
            if (!pred || !pred.timestamps[0]) return;
            const age = timestamp - pred.timestamps[0];
            if (age > maxMemory) {
                this.motionPredictions.delete(id);
            }
        });
    }
    
    /**
     * Очищення старих даних motion prediction
     */
    private cleanupOldPredictions(): void {
        const now = performance.now();
        const maxAge = this.predictionMemoryMs;
        
        this.motionPredictions.forEach((pred, id) => {
            if (!pred || !pred.timestamps[0]) return;
            if (now - pred.timestamps[0] > maxAge) {
                this.motionPredictions.delete(id);
            }
        });
    }
    
    /**
     * Встановлення поточної позиції гравця
     */
    setPlayerState(position: Vector3, velocity: Vector3, isGrounded: boolean): void {
        this.currentState.position.copy(position);
        this.currentState.velocity.copy(velocity);
        this.currentState.isGrounded = isGrounded;
    }
    
    /**
     * Отримання поточного стану фізики
     */
    getCurrentState(): PhysicsState {
        return this.currentState;
    }
    
    /**
     * Отримання метрик продуктивності
     */
    getMetrics() {
        return {
            currentFPS: this.currentFPS,
            timeStep: this.smoothedTimeStep,
            targetTimeStep: this.targetTimeStep,
            catchUpMultiplier: this.catchUpMultiplier,
            lagDebt: this.lagDebt,
            extrapolationAlpha: this.extrapolationAlpha,
            subStepsThisFrame: this.physicsUpdatesThisFrame,
            averageSubSteps: this.averageSubSteps,
            totalUpdates: this.totalPhysicsUpdates,
            accumulator: this.accumulator,
            motionPredictionCount: this.motionPredictions.size,
            currentTDI: this.currentTDI,
            activeThreatsCount: this.activeThreatsCount
        };
    }
    
    /**
     * Зміна конфігурації
     */
    setConfig(config: Partial<AdaptivePhysicsConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Скидання стану
     */
    reset(): void {
        this.accumulator = 0;
        this.catchUpMultiplier = 1.0;
        this.lagDebt = 0;
        this.currentState = {
            position: new Vector3(0, 0, 0),
            velocity: new Vector3(0, 0, 0),
            rotation: 0,
            isGrounded: true
        };
        this.previousState = null;
        this.motionPredictions.clear();
    }
    
    // Утиліти
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
    
    private lerpAngle(a: number, b: number, t: number): number {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }
}

export default AdaptivePhysicsEngine;