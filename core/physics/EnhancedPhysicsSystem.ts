/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Enhanced Physics System - Покращена фізика для гравця
 * 
 * Особливості:
 * - Layer-based collision detection
 * - Variable jump height
 * - Coyote time
 * - Air control
 * - Dash system
 */

import * as THREE from 'three';
import { QualityLevel } from '../../infrastructure/performance/PerformanceManager';

// Collision Layers
export const COLLISION_LAYERS = {
  PLAYER: 1 << 0,      // 1
  OBSTACLE: 1 << 1,   // 2
  BONUS: 1 << 2,       // 4
  ENVIRONMENT: 1 << 3,  // 8
  TRIGGER: 1 << 4      // 16
} as const;

export type CollisionLayer = typeof COLLISION_LAYERS[keyof typeof COLLISION_LAYERS];

// Collision shape types
export type CollisionShapeType = 'sphere' | 'box' | 'capsule';

export interface CollisionShape {
  type: CollisionShapeType;
  radius?: number;
  halfExtents?: THREE.Vector3;
  height?: number;
  offset?: THREE.Vector3;
}

// Collision response types
export enum CollisionResponse {
  NONE = 'none',
  SLIDE = 'slide',
  BOUNCE = 'bounce',
  STOP = 'stop',
  TRIGGER = 'trigger'
}

// Movement configuration
export interface MovementConfig {
  // Lateral movement
  lateralSpeed: number;
  lateralAcceleration: number;
  lateralDeceleration: number;
  maxLateralVelocity: number;
  
  // Lane changing
  laneChangeDuration: number;
  laneChangeCurve: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  
  // Vertical movement (jump)
  jumpForce: number;
  doubleJumpForce: number;
  gravity: number;
  maxFallSpeed: number;
  jumpCoyoteTime: number;
  
  // Variable jump
  minJumpTime: number;
  maxJumpTime: number;
  jumpCutoff: number;
  
  // Air control
  airControlMultiplier: number;
  
  // Slide
  slideDuration: number;
  slideHeightScale: number;
  
  // Dash
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  
  // Fast fall
  fastFallMultiplier: number;
  fastFallThreshold: number;
}

// Presets для різних рівнів якості
export const MOVEMENT_CONFIGS: Record<QualityLevel, MovementConfig> = {
  [QualityLevel.LOW]: {
    lateralSpeed: 8,
    lateralAcceleration: 25,
    lateralDeceleration: 30,
    maxLateralVelocity: 12,
    laneChangeDuration: 0.25,
    laneChangeCurve: 'linear',
    jumpForce: 15,
    doubleJumpForce: 12,
    gravity: 50,
    maxFallSpeed: 30,
    jumpCoyoteTime: 0.1,
    minJumpTime: 0.08,
    maxJumpTime: 0.35,
    jumpCutoff: 0.4,
    airControlMultiplier: 0.6,
    slideDuration: 0.5,
    slideHeightScale: 0.5,
    dashSpeed: 25,
    dashDuration: 0.2,
    dashCooldown: 1.0,
    fastFallMultiplier: 2.0,
    fastFallThreshold: -3
  },
  [QualityLevel.MEDIUM]: {
    lateralSpeed: 10,
    lateralAcceleration: 35,
    lateralDeceleration: 40,
    maxLateralVelocity: 15,
    laneChangeDuration: 0.2,
    laneChangeCurve: 'ease-out',
    jumpForce: 16,
    doubleJumpForce: 13,
    gravity: 55,
    maxFallSpeed: 35,
    jumpCoyoteTime: 0.12,
    minJumpTime: 0.1,
    maxJumpTime: 0.4,
    jumpCutoff: 0.5,
    airControlMultiplier: 0.7,
    slideDuration: 0.6,
    slideHeightScale: 0.45,
    dashSpeed: 30,
    dashDuration: 0.25,
    dashCooldown: 0.8,
    fastFallMultiplier: 2.2,
    fastFallThreshold: -5
  },
  [QualityLevel.HIGH]: {
    lateralSpeed: 12,
    lateralAcceleration: 45,
    lateralDeceleration: 50,
    maxLateralVelocity: 18,
    laneChangeDuration: 0.15,
    laneChangeCurve: 'ease-in-out',
    jumpForce: 17,
    doubleJumpForce: 14,
    gravity: 58,
    maxFallSpeed: 40,
    jumpCoyoteTime: 0.15,
    minJumpTime: 0.12,
    maxJumpTime: 0.45,
    jumpCutoff: 0.55,
    airControlMultiplier: 0.8,
    slideDuration: 0.7,
    slideHeightScale: 0.4,
    dashSpeed: 35,
    dashDuration: 0.3,
    dashCooldown: 0.6,
    fastFallMultiplier: 2.5,
    fastFallThreshold: -7
  },
  [QualityLevel.ULTRA]: {
    lateralSpeed: 15,
    lateralAcceleration: 55,
    lateralDeceleration: 60,
    maxLateralVelocity: 20,
    laneChangeDuration: 0.12,
    laneChangeCurve: 'ease-in-out',
    jumpForce: 18,
    doubleJumpForce: 15,
    gravity: 60,
    maxFallSpeed: 45,
    jumpCoyoteTime: 0.18,
    minJumpTime: 0.15,
    maxJumpTime: 0.5,
    jumpCutoff: 0.6,
    airControlMultiplier: 0.9,
    slideDuration: 0.8,
    slideHeightScale: 0.35,
    dashSpeed: 40,
    dashDuration: 0.35,
    dashCooldown: 0.5,
    fastFallMultiplier: 3.0,
    fastFallThreshold: -10
  }
};

// Player physics state
export interface PlayerPhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isJumping: boolean;
  isDoubleJumping: boolean;
  isSliding: boolean;
  isDashing: boolean;
  canDoubleJump: boolean;
  canDash: boolean;
  jumpTime: number;
  slideTime: number;
  dashTime: number;
  dashCooldownTime: number;
  coyoteTime: number;
  inputX: number;
  targetLane: number;
  currentLane: number;
}

// Collision result
export interface CollisionResult {
  hit: boolean;
  response: CollisionResponse;
  layer: CollisionLayer;
  object: unknown | null;
  normal: THREE.Vector3;
  penetration: number;
}

// Enhanced Physics System клас
export class EnhancedPhysicsSystem {
  private config: MovementConfig;
  private state: PlayerPhysicsState;
  private currentLanePosition: number = 0;
  
  // Input state
  private inputMoveLeft: boolean = false;
  private inputMoveRight: boolean = false;
  private inputJump: boolean = false;
  private inputJumpPressed: boolean = false;
  private inputSlide: boolean = false;
  private inputDash: boolean = false;

  constructor(quality: QualityLevel = QualityLevel.MEDIUM) {
    this.config = MOVEMENT_CONFIGS[quality];
    this.state = this.createInitialState();
  }

  private createInitialState(): PlayerPhysicsState {
    return {
      position: new THREE.Vector3(0, 0.5, 0),
      velocity: new THREE.Vector3(),
      isGrounded: true,
      isJumping: false,
      isDoubleJumping: false,
      isSliding: false,
      isDashing: false,
      canDoubleJump: true,
      canDash: true,
      jumpTime: 0,
      slideTime: 0,
      dashTime: 0,
      dashCooldownTime: 0,
      coyoteTime: 0,
      inputX: 0,
      targetLane: 0,
      currentLane: 0
    };
  }

  // Отримати конфіг
  getConfig(): MovementConfig {
    return this.config;
  }

  // Отримати стан
  getState(): PlayerPhysicsState {
    return this.state;
  }

  // Оновити конфіг
  setQuality(quality: QualityLevel): void {
    this.config = MOVEMENT_CONFIGS[quality];
  }

  // Input methods
  moveLeft(): void {
    if (!this.state.isSliding && !this.state.isDashing) {
      this.inputMoveLeft = true;
      this.state.targetLane = Math.max(-2, this.state.targetLane - 1);
    }
  }

  moveRight(): void {
    if (!this.state.isSliding && !this.state.isDashing) {
      this.inputMoveRight = true;
      this.state.targetLane = Math.min(2, this.state.targetLane + 1);
    }
  }

  jump(): void {
    if (!this.inputJumpPressed) {
      this.inputJump = true;
      this.inputJumpPressed = true;
    }
  }

  slide(): void {
    if (!this.inputSlide && this.state.isGrounded && !this.state.isSliding) {
      this.inputSlide = true;
      this.state.isSliding = true;
      this.state.slideTime = 0;
    }
  }

  dash(): void {
    if (!this.inputDash && this.state.canDash && !this.state.isDashing) {
      this.inputDash = true;
      this.state.isDashing = true;
      this.state.dashTime = 0;
      this.state.canDash = false;
    }
  }

  // Clear input
  clearInput(): void {
    this.inputMoveLeft = false;
    this.inputMoveRight = false;
    this.inputJump = false;
    this.inputSlide = false;
    this.inputDash = false;
  }

  // Main update
  update(delta: number): PlayerPhysicsState {
    const safeDelta = Math.min(delta, 0.05);

    // Process inputs
    this.processInput(safeDelta);

    // Update physics
    this.updateMovement(safeDelta);
    this.updateJump(safeDelta);
    this.updateSlide(safeDelta);
    this.updateDash(safeDelta);
    this.updateCooldowns(safeDelta);

    // Apply gravity
    this.applyGravity(safeDelta);

    // Apply velocity to position
    this.state.position.add(this.state.velocity.clone().multiplyScalar(safeDelta));

    // Clamp position
    this.clampPosition();

    return this.state;
  }

  private processInput(delta: number): void {
    // Lateral movement
    let targetInputX = 0;
    if (this.inputMoveLeft) targetInputX -= 1;
    if (this.inputMoveRight) targetInputX += 1;
    
    // Apply air control multiplier
    const controlMultiplier = this.state.isGrounded ? 1 : this.config.airControlMultiplier;
    
    // Smooth input
    this.state.inputX = THREE.MathUtils.lerp(
      this.state.inputX,
      targetInputX,
      delta * (this.state.isGrounded 
        ? this.config.lateralAcceleration 
        : this.config.lateralAcceleration * controlMultiplier)
    );

    // Jump input
    if (this.inputJump) {
      this.handleJump();
      this.inputJump = false;
    }

    // Jump release - variable height
    if (!this.inputJumpPressed && this.state.isJumping) {
      this.cutJump();
    }

    // Reset jump pressed on new press
    if (!this.inputJump) {
      this.inputJumpPressed = false;
    }
  }

  private handleJump(): void {
    // Ground jump with coyote time
    if ((this.state.isGrounded || this.state.coyoteTime > 0) && !this.state.isJumping) {
      this.state.isJumping = true;
      this.state.isGrounded = false;
      this.state.jumpTime = 0;
      this.state.velocity.y = this.config.jumpForce;
      this.state.coyoteTime = 0;
    }
    // Double jump
    else if (this.state.canDoubleJump && !this.state.isGrounded) {
      this.state.isDoubleJumping = true;
      this.state.canDoubleJump = false;
      this.state.velocity.y = this.config.doubleJumpForce;
    }
  }

  private cutJump(): void {
    if (this.state.jumpTime > this.config.minJumpTime && this.state.velocity.y > 0) {
      this.state.velocity.y *= this.config.jumpCutoff;
    }
    this.state.isJumping = false;
  }

  private updateJump(delta: number): void {
    if (this.state.isJumping) {
      this.state.jumpTime += delta;
      
      // Hold to jump higher
      if (this.inputJumpPressed && this.state.jumpTime < this.config.maxJumpTime) {
        // Continue applying upward force
        const jumpProgress = this.state.jumpTime / this.config.maxJumpTime;
        const jumpForce = this.config.jumpForce * (1 - jumpProgress * 0.5);
        this.state.velocity.y = Math.max(this.state.velocity.y, jumpForce);
      }
    }

    // Update grounded state
    if (this.state.position.y <= 0.5 && this.state.velocity.y <= 0) {
      this.state.isGrounded = true;
      this.state.isJumping = false;
      this.state.isDoubleJumping = false;
      this.state.canDoubleJump = true;
      this.state.position.y = 0.5;
      this.state.velocity.y = 0;
      this.state.coyoteTime = this.config.jumpCoyoteTime;
    }

    // Coyote time countdown
    if (!this.state.isGrounded && this.state.coyoteTime > 0) {
      this.state.coyoteTime -= delta;
    }
  }

  private updateSlide(delta: number): void {
    if (this.state.isSliding) {
      this.state.slideTime += delta;
      
      // End slide
      if (this.state.slideTime >= this.config.slideDuration) {
        this.state.isSliding = false;
        this.state.position.y = 0.5;
      }
    }
  }

  private updateDash(delta: number): void {
    if (this.state.isDashing) {
      this.state.dashTime += delta;
      
      // Apply dash velocity
      this.state.velocity.z = this.config.dashSpeed;
      this.state.velocity.y = 0;
      
      // End dash
      if (this.state.dashTime >= this.config.dashDuration) {
        this.state.isDashing = false;
      }
    }
  }

  private updateCooldowns(delta: number): void {
    // Dash cooldown
    if (!this.state.canDash && !this.state.isDashing) {
      this.state.dashCooldownTime += delta;
      if (this.state.dashCooldownTime >= this.config.dashCooldown) {
        this.state.canDash = true;
        this.state.dashCooldownTime = 0;
      }
    }
  }

  private applyGravity(delta: number): void {
    if (!this.state.isGrounded && !this.state.isDashing) {
      // Fast fall
      const gravityMultiplier = 
        (this.inputSlide && this.state.velocity.y < this.config.fastFallThreshold)
          ? this.config.fastFallMultiplier 
          : 1;
      
      this.state.velocity.y -= this.config.gravity * gravityMultiplier * delta;
      this.state.velocity.y = Math.max(this.state.velocity.y, -this.config.maxFallSpeed);
    }
  }

  private updateMovement(delta: number): void {
    // Lane position
    const laneWidth = 2.0;
    const targetLaneX = this.state.targetLane * laneWidth;
    
    // Smooth lane transition
    this.currentLanePosition = THREE.MathUtils.lerp(
      this.currentLanePosition,
      targetLaneX,
      delta * this.getLaneChangeSpeed()
    );
    
    this.state.position.x = this.currentLanePosition;
    
    // Lateral velocity
    if (!this.state.isDashing) {
      const targetVelocityX = this.state.inputX * this.config.maxLateralVelocity;
      this.state.velocity.x = THREE.MathUtils.lerp(
        this.state.velocity.x,
        targetVelocityX,
        delta * (this.state.isGrounded 
          ? this.config.lateralAcceleration 
          : this.config.lateralAcceleration * this.config.airControlMultiplier)
      );
    }
  }

  private getLaneChangeSpeed(): number {
    switch (this.config.laneChangeCurve) {
      case 'linear': return 10;
      case 'ease-in': return 8;
      case 'ease-out': return 12;
      case 'ease-in-out': return 10;
    }
  }

  private clampPosition(): void {
    // Clamp X to lanes
    this.state.position.x = THREE.MathUtils.clamp(this.state.position.x, -4, 4);
    
    // Clamp Y
    this.state.position.y = Math.max(0.5, this.state.position.y);
  }

  // Reset
  reset(): void {
    this.state = this.createInitialState();
    this.currentLanePosition = 0;
    this.clearInput();
  }

  // Force grounded (for testing)
  forceGround(): void {
    this.state.isGrounded = true;
    this.state.position.y = 0.5;
    this.state.velocity.y = 0;
    this.state.coyoteTime = this.config.jumpCoyoteTime;
  }
}

export default EnhancedPhysicsSystem;