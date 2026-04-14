
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { LANE_WIDTH } from '../../constants';
import { GRAVITY_Y, JUMP_FORCE_Y, DOUBLE_JUMP_FORCE } from '../../constants/physicsConfig';
import { safeDeltaTime } from '../../utils/safeMath';
import { validateLane } from '../../utils/laneUtils';
import { logger } from '../../utils/logger';
import { eventBus } from '../../utils/eventBus';

/**
 * Система физики игрока (СТАБИЛИЗИРОВАННАЯ ВЕРСИЯ)
 *
 * Управляет движением игрока по полосам, прыжками, гравитацией и приземлением.
 * Использует детерминированную физику для стабильности и предсказуемости.
 *
 * УЛУЧШЕНИЯ v2.0:
 * - Интерполяция позиции для плавного рендеринга
 * - Jump buffering для отзывчивого управления
 * - Coyote time для справедливого геймплея
 * - Защита от NaN/Infinity значений
 * - Стабильное переключение между 5 полосами
 *
 * @example
 * ```typescript
 * const physics = new PlayerPhysics();
 * physics.setLane(1); // Переместиться в правую полосу
 * physics.jump(false); // Обычный прыжок
 * physics.update(deltaTime); // Обновить физику
 * ```
 */
export class PlayerPhysics {
    // Mutable state to avoid GC
    public position = new THREE.Vector3();
    public velocity = new THREE.Vector3();

    // Интерполяция для плавного рендеринга
    public previousPosition = new THREE.Vector3();
    public renderPosition = new THREE.Vector3();

    // Internal tracking
    public targetLane = 0;
    public currentLanePos = 0;

    // State flags
    public isGrounded = true;
    public isJumping = false;
    public isDoubleJumping = false;
    public isSliding = false;
    public jumpsRemaining = 2; // Double jump support

    // Jump buffering & Coyote time
    private jumpBufferTimer = 0;
    private coyoteTimer = 0;
    private wasGrounded = true;
    private slideTimer = 0;

    // СТАБІЛІЗОВАНА ФІЗИКА УЛУЧШЕНА v2.5 - Покращена плавність
    public config = {
        gravity: GRAVITY_Y,
        jumpForce: JUMP_FORCE_Y,
        doubleJumpForce: DOUBLE_JUMP_FORCE,
        laneSpeed: 28,
        laneDamping: 0.88,
        maxVelocity: 200,
        groundY: 0,
        jumpBuffer: 0.15,         // ⬇ було 0.2
        coyoteTime: 0.12,         // ⬇ було 0.18
        airControl: 0.75,
        recoilForce: 18,
        recoilDamping: 0.90,
        slideDuration: 0.7
    };

    // Spring physics for lanes
    private laneVelocity = 0;
    private recoilVelocity = new THREE.Vector3();

    // Метрики для отладки
    private updateCount = 0;

    constructor() {
        this.reset();
    }

    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.previousPosition.set(0, 0, 0);
        this.renderPosition.set(0, 0, 0);
        this.targetLane = 0;
        this.currentLanePos = 0;
        this.laneVelocity = 0;
        this.recoilVelocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isJumping = false;
        this.isDoubleJumping = false;
        this.isSliding = false;
        this.jumpsRemaining = 2;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
        this.slideTimer = 0;
        this.wasGrounded = true;
        this.updateCount = 0;
    }

    setLane(laneIndex: number) {
        const oldLane = this.targetLane;
        this.targetLane = validateLane(laneIndex);

        // Add a little extra "kick" when changing lanes for more punchy feel
        if (oldLane !== this.targetLane) {
            const direction = Math.sign(this.targetLane - oldLane);
            this.laneVelocity += direction * 5;
        }
    }

    applyRecoil(force: THREE.Vector3) {
        // Cap accumulated recoil to prevent runaway knockback on rapid hits
        const MAX_RECOIL = 40;
        this.recoilVelocity.add(force);
        if (this.recoilVelocity.lengthSq() > MAX_RECOIL * MAX_RECOIL) {
            this.recoilVelocity.normalize().multiplyScalar(MAX_RECOIL);
        }
    }

    requestJump(): void {
        this.jumpBufferTimer = this.config.jumpBuffer;
    }

    requestSlide(): void {
        // Only reset timer if not already sliding, prevents "infinite" sliding while holding key
        if (!this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.config.slideDuration;
            // If in air - quick descent
            if (!this.isGrounded) {
                this.velocity.y -= 10;
            }
        }
        // If already sliding, do NOT reset timer - allows natural slide duration
    }

    stopSlide(): void {
        // Allow ending a slide before the timer expires
        if (this.isSliding) {
            this.isSliding = false;
            this.slideTimer = 0;
        }
    }

    jump(isDouble: boolean): boolean {
        // Нельзя прыгать во время слайда, если мы хотим, чтобы слайд был "crouch"
        // Но обычно можно прервать слайд прыжком? Да.

        const canJumpFromGround = this.isGrounded || this.coyoteTimer > 0;

        if (canJumpFromGround && this.jumpsRemaining === 2) {
            this.velocity.y = this.config.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.isSliding = false; // Прыжок прерывает слайд
            this.slideTimer = 0;
            this.jumpsRemaining = 1;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            return true;
        } else if (this.jumpsRemaining > 0 && (isDouble || !canJumpFromGround)) {
            this.velocity.y = this.config.doubleJumpForce;
            this.isDoubleJumping = true;
            this.isSliding = false;
            this.slideTimer = 0;
            this.jumpsRemaining--;
            this.jumpBufferTimer = 0;
            return true;
        }
        return false;
    }

    stopJump(): void {
        // Прерываем прыжок (для переменной высоты прыжка)
        if (this.isJumping && this.velocity.y > 0) {
            this.velocity.y *= 0.5; // Уменьшаем скорость подъема
        }
    }

    update(dt: number) {
        // Guard: reject invalid delta to prevent NaN/Infinity propagation
        if (!Number.isFinite(dt) || dt <= 0) return;
        const safeDt = safeDeltaTime(dt, 0.05, 0.0001);
        this.updateCount++;

        this.previousPosition.copy(this.position);

        // 1. Timers
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= safeDt;
        if (this.wasGrounded && !this.isGrounded && !this.isJumping) {
            // Only set coyote time when walking off an edge, not after a jump
            this.coyoteTimer = this.config.coyoteTime;
        } else if (this.coyoteTimer > 0) {
            this.coyoteTimer -= safeDt;
        }
        this.wasGrounded = this.isGrounded;

        if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0 || this.jumpsRemaining > 0)) {
            this.jump(false);
        }

        // Update Slide Timer
        if (this.slideTimer > 0) {
            this.slideTimer -= safeDt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.slideTimer = 0;
            }
        }

        // 2. Lane Movement (Spring-based) - покращена плавність
        const targetX = this.targetLane * LANE_WIDTH;
        const airMult = this.isGrounded ? 1.0 : this.config.airControl;

        // Spring acceleration: F = -k*x - d*v
        const springK = Math.pow(this.config.laneSpeed, 2);
        const dampingD = 2 * this.config.laneSpeed * this.config.laneDamping;

        const accel = (springK * (targetX - this.currentLanePos) - dampingD * this.laneVelocity) * airMult;
        this.laneVelocity += accel * safeDt;
        this.currentLanePos += this.laneVelocity * safeDt;

        // Покращений bounds з плавним обмеженням
        const maxLaneX = (LANE_WIDTH * 2); // 5 смуг: -2 до +2
        this.currentLanePos = Math.max(-maxLaneX, Math.min(maxLaneX, this.currentLanePos));
        this.position.x = this.currentLanePos;

        // 3. Recoil / Knockback
        this.position.addScaledVector(this.recoilVelocity, safeDt);
        this.recoilVelocity.multiplyScalar(this.config.recoilDamping);
        if (this.recoilVelocity.lengthSq() < 0.01) this.recoilVelocity.set(0, 0, 0);

        // 4. Vertical Movement - покращена фізика
        if (!this.isGrounded) {
            const isFalling = this.velocity.y < 0;
            // Покращена гравітація: плавніша дуга
            const gravityMult = isFalling ? 2.2 : 1.2;
            this.velocity.y -= (this.config.gravity * gravityMult) * safeDt;

            // terminal velocity - обмеження максимальної швидкості падіння
            this.velocity.y = Math.max(this.velocity.y, -60);
        }

        this.position.y += this.velocity.y * safeDt;

        // --- STABILITY LOGGING (For Automated Stress Test) ---
        if (this.updateCount % 100 === 0) {
            logger.log(`[STABILITY] Dist: ${this.position.z.toFixed(2)} | PlayerY: ${this.position.y.toFixed(6)} | Grounded: ${this.isGrounded}`);
        }

        // 5. Ground Collision — ✨ STRICT ZERO Y DISPLACEMENT ✨
        // The road is now an infinite, perfectly flat PlaneGeometry at Y=0.
        // The spherical player model (radius 0.42) has its own offset +0.1.
        const currentGroundY = 0.0;
        const TOLERANCE = 0.01;

        if (this.position.y <= currentGroundY + TOLERANCE) {
            this.position.y = currentGroundY;
            this.velocity.y = 0;

            if (!this.isGrounded) {
                this.isGrounded = true;
                this.isJumping = false;
                this.isDoubleJumping = false;
                this.jumpsRemaining = 2;
                this.coyoteTimer = 0;
                // Clear slide when landing
                this.isSliding = false;
                this.slideTimer = 0;
                // Reset recoil on landing to prevent accumulated knockback
                this.recoilVelocity.set(0, 0, 0);
                eventBus.emit('player:landed', { squashIntensity: Math.abs(this.velocity.y) / 20 });
            }
        } else {
            this.isGrounded = false;
        }

        // Safety reset: if somehow we became grounded but flags are wrong
        if (this.isGrounded) {
            this.isJumping = false;
            this.isDoubleJumping = false;
        }

        // 6. Safety Checks - розширена перевірка
        if (!Number.isFinite(this.position.x)) this.position.x = targetX;
        if (!Number.isFinite(this.position.y)) this.position.y = currentGroundY;
        if (!Number.isFinite(this.position.z)) this.position.z = 0;

        // Перевірка NaN для всіх компонент швидкості
        if (!Number.isFinite(this.velocity.x)) this.velocity.x = 0;
        if (!Number.isFinite(this.velocity.y)) this.velocity.y = 0;
        if (!Number.isFinite(this.velocity.z)) this.velocity.z = 0;

        // Обмеження швидкості
        this.velocity.x = Math.max(-this.config.maxVelocity, Math.min(this.config.maxVelocity, this.velocity.x));
        this.velocity.y = Math.max(-this.config.maxVelocity, Math.min(this.config.maxVelocity, this.velocity.y));
        this.velocity.z = Math.max(-this.config.maxVelocity, Math.min(this.config.maxVelocity, this.velocity.z));
    }

    getInterpolatedPosition(alpha: number): THREE.Vector3 {
        // We include a tiny bit of the lane velocity for smoother look during fast switches
        this.renderPosition.lerpVectors(this.previousPosition, this.position, alpha);
        return this.renderPosition;
    }

    getDebugInfo(): string {
        return [
            `Pos: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)})`,
            `Lane: ${this.targetLane} (v: ${this.laneVelocity.toFixed(2)})`,
            `Grounded: ${this.isGrounded}, Slide: ${this.isSliding}`,
            `Recoil: ${this.recoilVelocity.length().toFixed(2)}`
        ].join('\n');
    }
}

