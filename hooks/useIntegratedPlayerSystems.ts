/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrated Player Systems Hook
 * 
 * Інтегрує три системи в правильному порядку оновлення:
 * 1. Physics (фізика)
 * 2. Animation (анімація)
 * 3. Particles (частинки)
 * 
 * Порядок оновлення критичний для коректної роботи:
 * - Фізика визначає стан гравця (позиція, швидкість, grounded)
 * - Анімація реагує на стан фізики
 * - Частинки реагують на анімацію та стан
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { EnhancedPhysicsSystem } from '../core/physics/EnhancedPhysicsSystem';
import { AnimationStateMachine, PlayerAnimationState, ExpressionType } from '../core/animations/AnimationStateMachine';
import { MobileParticleSystem, ParticleEffectType, particleSystemManager, PARTICLE_EFFECT_CONFIGS } from '../core/effects/MobileParticleSystem';
import { useStore } from '../store';
import { GameStatus } from '../types';
import { getPerformanceManager } from '../infrastructure/performance/PerformanceManager';

// Input callback type
export interface PlayerInputCallbacks {
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onJump?: () => void;
  onSlide?: () => void;
  onDash?: () => void;
}

// Integrated systems result
export interface IntegratedPlayerSystems {
  // Physics state
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isJumping: boolean;
  isDashing: boolean;
  isSliding: boolean;
  
  // Animation state
  animationState: PlayerAnimationState;
  scale: THREE.Vector3;
  expression: ExpressionType;
  
  // Input handlers
  handleMoveLeft: () => void;
  handleMoveRight: () => void;
  handleJump: () => void;
  handleSlide: () => void;
  handleDash: () => void;
  
  // Effects
  emitParticles: (effect: ParticleEffectType) => void;
  
  // Controls
  isControlsEnabled: boolean;
}

/**
 * Hook that integrates physics, animation, and particle systems
 * with the correct update order: physics -> animation -> particles
 */
export const useIntegratedPlayerSystems = (
  _inputCallbacks?: PlayerInputCallbacks
): IntegratedPlayerSystems => {
  // Store access
  const status = useStore(s => s.status);
  const isPaused = status === GameStatus.PAUSED;
  
  // Systems refs
  const physicsRef = useRef<EnhancedPhysicsSystem | null>(null);
  const animationRef = useRef<AnimationStateMachine | null>(null);
  const particleSystemsRef = useRef<Map<ParticleEffectType, MobileParticleSystem>>(new Map());
  
  // Current state refs for rendering (mutated directly for performance in R3F)
  const currentPosition = useRef(new THREE.Vector3(0, 0.5, 0));
  const currentVelocity = useRef(new THREE.Vector3());
  const currentScale = useRef(new THREE.Vector3(1, 1, 1));
  
  // === SYNC & REACTIVITY ===
  // We use direct REFS for fast physics updates, but need some reactive state
  // to trigger UI updates for discrete events.
  const [_playerProps, _setPlayerProps] = useState({
    isGrounded: true,
    isJumping: false,
    isDashing: false,
    isSliding: false,
    animation: PlayerAnimationState.IDLE
  });
  
  // Performance manager
  const performanceManager = useRef(getPerformanceManager());
  
  // Controls enabled
  const isControlsEnabled = status === GameStatus.PLAYING && !isPaused;
  
  // Initialize systems
  useEffect(() => {
    const quality = performanceManager.current.getCurrentQuality();
    
    // Initialize physics
    physicsRef.current = new EnhancedPhysicsSystem(quality);
    
    // Initialize animation state machine
    animationRef.current = new AnimationStateMachine(PlayerAnimationState.IDLE);
    
    // Initialize particle systems for common effects
    const effects: ParticleEffectType[] = [
      'player_trail',
      'jump_dust',
      'landing_impact',
      'collect_sparkle',
      'speed_lines'
    ];
    
    effects.forEach(effect => {
      const system = particleSystemManager.getSystem(effect);
      particleSystemsRef.current.set(effect, system);
    });
    
    return () => {
      // Cleanup
      particleSystemManager.dispose();
    };
  }, []);
  
  // Update quality when it changes
  useFrame(() => {
    if (!physicsRef.current) return;
    
    const currentQuality = performanceManager.current.getCurrentQuality();
    physicsRef.current.setQuality(currentQuality);
  });
  
  // Input handlers
  const handleMoveLeft = useCallback(() => {
    if (!physicsRef.current || !isControlsEnabled) return;
    physicsRef.current.moveLeft();
  }, [isControlsEnabled]);
  
  const handleMoveRight = useCallback(() => {
    if (!physicsRef.current || !isControlsEnabled) return;
    physicsRef.current.moveRight();
  }, [isControlsEnabled]);
  
  const handleJump = useCallback(() => {
    if (!physicsRef.current || !isControlsEnabled) return;
    
    // Emit jump dust
    const jumpDust = particleSystemsRef.current.get('jump_dust');
    if (jumpDust) {
      jumpDust.setEmissionPosition(currentPosition.current.clone());
      jumpDust.emit(10);
    }
    
    physicsRef.current.jump();
  }, [isControlsEnabled]);
  
  const handleSlide = useCallback(() => {
    if (!physicsRef.current || !isControlsEnabled) return;
    physicsRef.current.slide();
  }, [isControlsEnabled]);
  
  const handleDash = useCallback(() => {
    if (!physicsRef.current || !isControlsEnabled) return;
    
    // Emit speed lines
    const speedLines = particleSystemsRef.current.get('speed_lines');
    if (speedLines) {
      speedLines.setEmissionPosition(currentPosition.current.clone());
      speedLines.emit(20);
    }
    
    physicsRef.current.dash();
  }, [isControlsEnabled]);
  
  // Emit particles helper
  const emitParticles = useCallback((effect: ParticleEffectType) => {
    const system = particleSystemsRef.current.get(effect);
    if (system) {
      system.setEmissionPosition(currentPosition.current.clone());
      system.emit(PARTICLE_EFFECT_CONFIGS[effect].maxParticles);
    }
  }, []);
  
  // Main update loop
  useFrame((_, delta) => {
    if (!physicsRef.current || !animationRef.current || !isControlsEnabled) return;
    
    const safeDelta = Math.min(delta, 0.05);
    
    // === STEP 1: PHYSICS UPDATE ===
    const physicsState = physicsRef.current.update(safeDelta);
    
    // Update position ref (mutating ref is efficient for r3f)
    currentPosition.current.copy(physicsState.position);
    currentVelocity.current.copy(physicsState.velocity);
    
    // === STEP 2: ANIMATION UPDATE ===
    // Map physics state to animation state
    let targetAnimationState: PlayerAnimationState;
    
    if (physicsState.isDashing) {
      targetAnimationState = PlayerAnimationState.DASH;
    } else if (physicsState.isSliding) {
      targetAnimationState = PlayerAnimationState.SLIDE;
    } else if (!physicsState.isGrounded) {
      if (physicsState.velocity.y > 2) {
        targetAnimationState = PlayerAnimationState.JUMP_UP;
      } else if (physicsState.velocity.y < -1) {
        targetAnimationState = PlayerAnimationState.FALL;
      } else {
        targetAnimationState = PlayerAnimationState.JUMP_PEAK;
      }
    } else if (physicsState.velocity.length() > 0.5) {
      targetAnimationState = PlayerAnimationState.RUN;
    } else {
      targetAnimationState = PlayerAnimationState.IDLE;
    }
    
    // Transition animation state
    animationRef.current.transitionTo(targetAnimationState);
    animationRef.current.update(safeDelta, physicsState.velocity, physicsState.isGrounded);
    
    // Update scale from animation
    currentScale.current.copy(animationRef.current.getScale());
    
    // === STEP 3: PARTICLES UPDATE ===
    // Update player trail based on movement
    const playerTrail = particleSystemsRef.current.get('player_trail');
    if (playerTrail && physicsState.isGrounded) {
      playerTrail.setEmissionPosition(currentPosition.current.clone().add(new THREE.Vector3(0, 0, -0.5)));
      playerTrail.update(safeDelta);
    }
    
    // Update all particle systems
    particleSystemsRef.current.forEach(system => {
      system.update(safeDelta);
    });
  });
  
  // Read ref values outside useMemo to satisfy react-hooks/refs rule
  const _position = currentPosition.current;
  const _velocity = currentVelocity.current;
  const _scale = currentScale.current;
  const _physicsState = physicsRef.current?.getState();
  const _animState = animationRef.current?.getState() ?? PlayerAnimationState.IDLE;
  const _expression = animationRef.current?.getExpression() ?? 'normal';

  // Return integrated state
  return useMemo(() => ({
    // Physics state
    position: _position,
    velocity: _velocity,
    isGrounded: _physicsState?.isGrounded ?? true,
    isJumping: _physicsState?.isJumping ?? false,
    isDashing: _physicsState?.isDashing ?? false,
    isSliding: _physicsState?.isSliding ?? false,
    
    // Animation state
    animationState: _animState,
    scale: _scale,
    expression: _expression,
    
    // Input handlers
    handleMoveLeft,
    handleMoveRight,
    handleJump,
    handleSlide,
    handleDash,
    
    // Particles
    emitParticles,
    
    // Controls
    isControlsEnabled
  }), [
    _position,
    _velocity,
    _physicsState,
    _animState,
    _scale,
    _expression,
    handleMoveLeft,
    handleMoveRight,
    handleJump,
    handleSlide,
    handleDash,
    emitParticles,
    isControlsEnabled
  ]);
};

export default useIntegratedPlayerSystems;