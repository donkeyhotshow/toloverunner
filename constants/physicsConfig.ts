/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * PhysicsConfig - Centralized parameters for player movement and collision.
 */

export const PLAYER_PHYSICS = {
    // Spring physics for movement/animations
    SPRING_STIFFNESS: 280, // Покращена жорсткість пружини
    SPRING_DAMPING: 18,    // Покращене демпфування

    // Lerping factors
    LANE_LERP_FACTOR: 10.0,  // Швидша реакція на переключення смуг
    TILT_SMOOTHING: 16,     // Швидше згладжування нахилу

    // Max limits
    MAX_TILT_RAD: 0.35, // трохи більший нахил
    MAX_TILT_DEGREES: 20,

    // Gameplay feedbacks
    HIT_DECAY_RATE: 2.5,    // Швидше затухання удару
    HIT_KNOCKBACK_AMP: 1.4, // Сильніший відкид
    FEAR_DISTANCE: 6,       // Реакція на перешкоду раніше
    FEAR_JITTER: 0.035,    // Менший джиттер

    // Timings
    DASH_DURATION: 0.35,   // shorter dash
    DASH_INVINCIBILITY: 0.5,
    INVINCIBILITY_IFRAMES: 1.3,

    // Aesthetic Tuning
    STORE_READ_INTERVAL: 0, // Direct access
    ANTICIPATION_DURATION: 0.08,
    OVERSHOOT_DURATION: 0.12,
    OVERSHOOT_THRESHOLD: 0.08,
    MAX_TILT_RAD_VAL: 0.35,
    TILT_SMOOTHING_VAL: 16,
    FEAR_DISTANCE_VAL: 6,
    FEAR_JITTER_VAL: 0.035,
    SHADOW_MIN_SCALE: 0.35,
    SHADOW_HEIGHT_FACTOR: 0.25,
    SPRING_STIFFNESS_VAL: 280,
    SPRING_DAMPING_VAL: 18,
    HIT_DECAY_RATE_VAL: 2.5,
    HIT_KNOCKBACK_AMP_VAL: 1.4,
} as const;

export const COLLISION_CONFIG = {
    PLAYER_RADIUS: 0.25,
    OBSTACLE_RADIUS: 0.35,
    PICKUP_RADIUS: 1.2,
    GRAZE_RADIUS: 1.8,
    JUMP_CLEAR_HEIGHT: 1.2,

    /** Висота препятствия "прыжок" (ниже = перепрыгнул) */
    OBSTACLE_JUMP_HEIGHT: 1.0,
    /** Ниже этой Y игрок проходит под SLIDE */
    OBSTACLE_SLIDE_UNDER_HEIGHT: 1.0,
    /** Глубина препятствия по Z для CCD (вирус/стена) */
    OBSTACLE_DEPTH_Z: 0.6,
    /** Глубина по Z для JUMP/SLIDE/DODGE */
    OBSTACLE_SPECIAL_DEPTH_Z: 0.8,

    // Rendering/Culling limits
    CULL_BEHIND: 30,
    CULL_AHEAD: -900,

    // CCD Settings
    CCD_VELOCITY_THRESHOLD: 10,  // Мінімальна швидкість для CCD
    CCD_MAX_RAY_STEPS: 8,        // Максимальні кроки raycast
} as const;

// Adaptive Physics Configuration
export const ADAPTIVE_PHYSICS_CONFIG = {
    // Timestep based on FPS
    TIMESTEP_LOW_FPS: 1 / 30,      // < 30 FPS
    TIMESTEP_MEDIUM_FPS: 1 / 60,   // 30-60 FPS
    TIMESTEP_HIGH_FPS: 1 / 90,     // 60-90 FPS
    TIMESTEP_ULTRA_FPS: 1 / 120,   // > 90 FPS

    // Time Catch-up
    CATCHUP_LAG_THRESHOLD_MS: 100, // Поріг затримки
    CATCHUP_MIN_MULTIPLIER: 1.5,   // Мінімальне прискорення
    CATCHUP_MAX_MULTIPLIER: 3.0,   // Максимальне прискорення

    // Extrapolation
    MAX_EXTRAPOLATION_ALPHA: 1.5,   // Максимальний коефіцієнт
    MAX_EXTRAPOLATION_PERCENT: 0.1, // 10% від швидкості

    // Sub-stepping
    MIN_SUB_STEPS: 1,
    MAX_SUB_STEPS: 4,
    MAX_DELTA_TIME: 0.1,            // 100ms

    // Smooth transitions
    SMOOTH_TRANSITION_SPEED: 2.0,
} as const;
