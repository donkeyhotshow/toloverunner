/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Animation State Machine - Система керування анімаціями гравця
 * 
 * Особливості:
 * - Плавні переходи між станами
 * - Trigger-based анімації
 * - Squash & stretch система
 * - Expression system
 */

import * as THREE from 'three';

// Стани анімації
export enum PlayerAnimationState {
  IDLE = 'idle',
  RUN = 'run',
  JUMP_UP = 'jump_up',
  JUMP_PEAK = 'jump_peak',
  FALL = 'fall',
  LAND = 'land',
  SLIDE = 'slide',
  DASH = 'dash',
  HIT = 'hit',
  DEATH = 'death',
  VICTORY = 'victory'
}

// Типи тригерів для анімацій
export type AnimationTrigger = 
  | { type: 'velocity_threshold'; axis: 'x' | 'y' | 'z'; threshold: number; direction?: 'above' | 'below' }
  | { type: 'grounded_change'; isGrounded: boolean }
  | { type: 'input'; action: string }
  | { type: 'time'; duration: number }
  | { type: 'state_change'; from: PlayerAnimationState; to: PlayerAnimationState };

// Перехід між анімаціями
export interface AnimationTransition {
  from: PlayerAnimationState[];
  to: PlayerAnimationState;
  duration: number;
  curve: (t: number) => number; // Easing function
  trigger: AnimationTrigger;
}

// Кліп анімації
export interface AnimationClip {
  duration: number;
  loop: boolean;
  tracks: KeyframeTrack[];
}

// Keyframe track
export interface KeyframeTrack {
  target: string;
  property: 'position' | 'rotation' | 'scale' | 'emissive' | 'expression';
  times: number[];
  values: number[] | string[];
  interpolation: 'linear' | 'step' | 'quaternion';
}

// Easing functions
export const easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

// Конфігурація анімаційних переходів
export const ANIMATION_TRANSITIONS: AnimationTransition[] = [
  // Idle/Run -> Jump
  {
    from: [PlayerAnimationState.IDLE, PlayerAnimationState.RUN],
    to: PlayerAnimationState.JUMP_UP,
    duration: 0.1,
    curve: easing.easeOutQuad,
    trigger: { type: 'velocity_threshold', axis: 'y', threshold: 5, direction: 'above' }
  },
  // Jump Up -> Peak
  {
    from: [PlayerAnimationState.JUMP_UP],
    to: PlayerAnimationState.JUMP_PEAK,
    duration: 0.2,
    curve: easing.easeInOutQuad,
    trigger: { type: 'velocity_threshold', axis: 'y', threshold: 0, direction: 'below' }
  },
  // Peak -> Fall
  {
    from: [PlayerAnimationState.JUMP_PEAK],
    to: PlayerAnimationState.FALL,
    duration: 0.1,
    curve: easing.linear,
    trigger: { type: 'velocity_threshold', axis: 'y', threshold: -1, direction: 'below' }
  },
  // Fall -> Land
  {
    from: [PlayerAnimationState.FALL],
    to: PlayerAnimationState.LAND,
    duration: 0.15,
    curve: easing.bounce,
    trigger: { type: 'grounded_change', isGrounded: true }
  },
  // Land -> Run
  {
    from: [PlayerAnimationState.LAND],
    to: PlayerAnimationState.RUN,
    duration: 0.2,
    curve: easing.easeOutCubic,
    trigger: { type: 'time', duration: 0.15 }
  },
  // Any -> Slide (input)
  {
    from: Object.values(PlayerAnimationState),
    to: PlayerAnimationState.SLIDE,
    duration: 0.1,
    curve: easing.easeOutQuad,
    trigger: { type: 'input', action: 'slide' }
  },
  // Any -> Dash
  {
    from: Object.values(PlayerAnimationState),
    to: PlayerAnimationState.DASH,
    duration: 0.08,
    curve: easing.easeOutQuad,
    trigger: { type: 'input', action: 'dash' }
  },
  // Any -> Hit
  {
    from: Object.values(PlayerAnimationState),
    to: PlayerAnimationState.HIT,
    duration: 0.1,
    curve: easing.easeOutQuad,
    trigger: { type: 'state_change', from: PlayerAnimationState.RUN, to: PlayerAnimationState.HIT }
  }
];

// Squash & Stretch конфігурація
export interface SquashStretchConfig {
  // Base scale
  baseScale: THREE.Vector3;
  // Jump stretch
  jumpStretch: THREE.Vector3;
  jumpSquash: THREE.Vector3;
  // Dash stretch  
  dashStretch: THREE.Vector3;
  // Land squash
  landSquash: THREE.Vector3;
  // Recovery speed
  recoverySpeed: number;
}

export const SQUASH_STRETCH_CONFIG: Record<PlayerAnimationState, SquashStretchConfig> = {
  [PlayerAnimationState.IDLE]: {
    baseScale: new THREE.Vector3(1, 1, 1),
    jumpStretch: new THREE.Vector3(1, 1, 1),
    jumpSquash: new THREE.Vector3(1, 1, 1),
    dashStretch: new THREE.Vector3(1, 1, 1),
    landSquash: new THREE.Vector3(1, 1, 1),
    recoverySpeed: 8
  },
  [PlayerAnimationState.RUN]: {
    baseScale: new THREE.Vector3(1, 1, 1),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(1, 1, 1),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 12
  },
  [PlayerAnimationState.JUMP_UP]: {
    baseScale: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 10
  },
  [PlayerAnimationState.JUMP_PEAK]: {
    baseScale: new THREE.Vector3(0.95, 1.1, 0.95),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 10
  },
  [PlayerAnimationState.FALL]: {
    baseScale: new THREE.Vector3(0.95, 1.1, 0.95),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 10
  },
  [PlayerAnimationState.LAND]: {
    baseScale: new THREE.Vector3(1.2, 0.7, 1.2),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 15
  },
  [PlayerAnimationState.SLIDE]: {
    baseScale: new THREE.Vector3(1.1, 0.5, 1.1),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 8
  },
  [PlayerAnimationState.DASH]: {
    baseScale: new THREE.Vector3(0.7, 0.7, 1.8),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 12
  },
  [PlayerAnimationState.HIT]: {
    baseScale: new THREE.Vector3(1.1, 0.9, 1.1),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 6
  },
  [PlayerAnimationState.DEATH]: {
    baseScale: new THREE.Vector3(1, 1, 1),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 2
  },
  [PlayerAnimationState.VICTORY]: {
    baseScale: new THREE.Vector3(1.2, 1.2, 1.2),
    jumpStretch: new THREE.Vector3(0.85, 1.3, 0.9),
    jumpSquash: new THREE.Vector3(0.85, 1.3, 0.9),
    dashStretch: new THREE.Vector3(0.7, 0.7, 1.8),
    landSquash: new THREE.Vector3(1.2, 0.7, 1.2),
    recoverySpeed: 6
  }
};

// Expression система
export type ExpressionType = 'normal' | 'scared' | 'angry' | 'happy' | 'surprised' | 'hurt';

export const EXPRESSION_CONFIG: Record<ExpressionType, {
  eyeScaleY: number;
  eyeRotationZ: number;
  mouthOpen: number;
  blushOpacity: number;
  color: THREE.Color;
}> = {
  normal: {
    eyeScaleY: 1.0,
    eyeRotationZ: 0,
    mouthOpen: 0,
    blushOpacity: 0.3,
    color: new THREE.Color('#000000')
  },
  scared: {
    eyeScaleY: 1.4,
    eyeRotationZ: 0,
    mouthOpen: 0.3,
    blushOpacity: 0.5,
    color: new THREE.Color('#880000')
  },
  angry: {
    eyeScaleY: 0.6,
    eyeRotationZ: 0.25,
    mouthOpen: 0.1,
    blushOpacity: 0,
    color: new THREE.Color('#000000')
  },
  happy: {
    eyeScaleY: 1.0,
    eyeRotationZ: 0,
    mouthOpen: 0.2,
    blushOpacity: 0.7,
    color: new THREE.Color('#000000')
  },
  surprised: {
    eyeScaleY: 1.2,
    eyeRotationZ: 0,
    mouthOpen: 0.5,
    blushOpacity: 0.4,
    color: new THREE.Color('#000000')
  },
  hurt: {
    eyeScaleY: 0.8,
    eyeRotationZ: 0,
    mouthOpen: 0.4,
    blushOpacity: 0.6,
    color: new THREE.Color('#ff0000')
  }
};

// Animation State Machine клас
export class AnimationStateMachine {
  private currentState: PlayerAnimationState = PlayerAnimationState.IDLE;
  private previousState: PlayerAnimationState = PlayerAnimationState.IDLE;
  private currentScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private targetScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private transitionProgress: number = 1;
  private expression: ExpressionType = 'normal';
  private targetExpression: ExpressionType = 'normal';
  private expressionProgress: number = 1;

  constructor(initialState: PlayerAnimationState = PlayerAnimationState.IDLE) {
    this.currentState = initialState;
    this.previousState = initialState;
    this.currentScale.copy(SQUASH_STRETCH_CONFIG[initialState].baseScale);
    this.targetScale.copy(SQUASH_STRETCH_CONFIG[initialState].baseScale);
  }

  // Отримати поточний стан
  getState(): PlayerAnimationState {
    return this.currentState;
  }

  // Отримати вираз обличчя
  getExpression(): ExpressionType {
    return this.expression;
  }

  // Отримати поточну шкалу
  getScale(): THREE.Vector3 {
    return this.currentScale.clone();
  }

  // Перехід до нового стану
  transitionTo(newState: PlayerAnimationState): void {
    if (newState === this.currentState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.transitionProgress = 0;

    // Встановити цільову шкалу
    const config = SQUASH_STRETCH_CONFIG[newState];
    this.targetScale.copy(config.baseScale);

    // Оновити вираз на основі стану
    this.updateExpressionForState(newState);
  }

  // Оновити вираз на основі стану
  private updateExpressionForState(state: PlayerAnimationState): void {
    switch (state) {
      case PlayerAnimationState.HIT:
      case PlayerAnimationState.DEATH:
        this.setTargetExpression('hurt');
        break;
      case PlayerAnimationState.DASH:
        this.setTargetExpression('surprised');
        break;
      case PlayerAnimationState.VICTORY:
        this.setTargetExpression('happy');
        break;
      case PlayerAnimationState.FALL:
        this.setTargetExpression('scared');
        break;
      default:
        this.setTargetExpression('normal');
    }
  }

  // Встановити цільовий вираз
  setTargetExpression(expr: ExpressionType): void {
    if (expr === this.targetExpression) return;
    this.targetExpression = expr;
    this.expressionProgress = 0;
  }

  // Оновити стан (викликається кожен кадр)
  update(delta: number, velocity: THREE.Vector3, isGrounded: boolean): void {
    const safeDelta = Math.min(delta, 0.05);

    // Оновити переходи
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + safeDelta * 8);
      
      // Інтерполяція шкали
      const prevConfig = SQUASH_STRETCH_CONFIG[this.previousState];
      const currConfig = SQUASH_STRETCH_CONFIG[this.currentState];
      
      this.currentScale.lerpVectors(
        prevConfig.baseScale,
        currConfig.baseScale,
        this.transitionProgress
      );
    }

    // Застосувати velocity-based деформацію
    this.applyVelocityDeformation(velocity, safeDelta);

    // Відновити шкалу
    this.applyRecovery(safeDelta);

    // Оновити вираз
    this.updateExpression(safeDelta);

    // Перевірити автоматичні переходи
    this.checkAutoTransitions(velocity, isGrounded);
  }

  // Застосувати деформацію від швидкості
  private applyVelocityDeformation(velocity: THREE.Vector3, _delta: number): void {
    void velocity.length();
    const verticalVelocity = velocity.y;

    if (this.currentState === PlayerAnimationState.RUN || 
        this.currentState === PlayerAnimationState.IDLE) {
      // Stretch при русі
      if (Math.abs(verticalVelocity) > 0.5) {
        const stretch = Math.min(0.3, Math.abs(verticalVelocity) * 0.04);
        const squeeze = 1 - stretch * 0.5;
        
        if (verticalVelocity > 0) {
          this.targetScale.multiply(new THREE.Vector3(squeeze, 1 + stretch, squeeze));
        } else {
          this.targetScale.multiply(new THREE.Vector3(squeeze + 0.1, 1 - stretch * 0.5, squeeze + 0.1));
        }
      }
    }
  }

  // Відновлення шкали
  private applyRecovery(delta: number): void {
    const config = SQUASH_STRETCH_CONFIG[this.currentState];
    const recoverySpeed = config.recoverySpeed;
    
    this.currentScale.lerp(this.targetScale, delta * recoverySpeed);
  }

  // Оновити вираз
  private updateExpression(delta: number): void {
    if (this.expressionProgress < 1) {
      this.expressionProgress = Math.min(1, this.expressionProgress + delta * 5);
      
      // Проста інтерполяція
      if (this.expressionProgress >= 1) {
        this.expression = this.targetExpression;
      }
    }
  }

  // Перевірити автоматичні переходи
  private checkAutoTransitions(velocity: THREE.Vector3, isGrounded: boolean): void {
    // Ground transition
    if (!isGrounded && (this.currentState === PlayerAnimationState.RUN || 
                        this.currentState === PlayerAnimationState.IDLE ||
                        this.currentState === PlayerAnimationState.LAND)) {
      if (velocity.y > 2) {
        this.transitionTo(PlayerAnimationState.JUMP_UP);
      }
    }

    if (isGrounded && this.currentState === PlayerAnimationState.FALL) {
      this.transitionTo(PlayerAnimationState.LAND);
    }

    // Land -> Run recovery
    if (this.currentState === PlayerAnimationState.LAND && this.transitionProgress >= 0.8) {
      this.transitionTo(PlayerAnimationState.RUN);
    }
  }

  // Reset
  reset(): void {
    this.transitionTo(PlayerAnimationState.IDLE);
    this.expression = 'normal';
    this.targetExpression = 'normal';
    this.expressionProgress = 1;
  }
}

export default AnimationStateMachine;