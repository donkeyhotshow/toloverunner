# Технічне завдання: Покращення візуальної складової та фізичної моделі ToLOVERunner

**Версія:** 1.0  
**Дата:** 2026-02-25  
**Проект:** ToLOVERunner V2.2.0  
**Автор:** Kilo Code (AI Development Assistant)

---

## Зміст

1. [Вступ та аналіз поточного стану](#вступ-та-аналіз-поточного-стану)
2. [Графічне виконання](#графічне-виконання)
3. [Фізична модель](#фізична-модель)
4. [Система анімацій](#система-анімацій)
5. [Анімовані фонові елементи](#аніміровані-фонові-елементи)
6. [Оточення та рівні](#оточення-та-рівні)
7. [Об'ємні форми та геометрія](#обємні-форми-та-геометрія)
8. [Паттерни та текстури](#паттерни-та-текстури)
9. [Візуальна стилістика](#візуальна-стилістика)
10. [Імплементація](#імплементація)

---

## Вступ та аналіз поточного стану

### 1.1 Опис проекту

**ToLOVERunner** — це 3D endless runner гра, де гравець керує сперматозоїдом у біологічному середовищі. Гра побудована на React 18 + TypeScript + Three.js (React Three Fiber) з використанням Rapier3D для фізики.

### 1.2 Поточний стан систем

| Система | Стан | Оцінка |
|---------|------|--------|
| Шейдери | Базовий toon shader + organics | 6/10 |
| Фізика | Adaptive physics + collision | 7/10 |
| Анімації | Часткова (tail, squash-stretch) | 6/10 |
| Ефекти | Post-processing (bloom, vignette) | 7/10 |
| Оточення | Procedural generation | 7/10 |
| Оптимізація мобільних | Adaptive Quality Manager | 8/10 |

### 1.3 Цілі покращення

Покращити візуальну та фізичну складову до рівня **Subway Surfers** з адаптацією під біологічну тематику проекту, зберігаючи продуктивність **60 FPS** на мобільних пристроях.

---

## Графічне виконання

### 2.1 Шейдери

#### 2.1.1 Поточний стан
- `ToonShader.ts` — базовий MeshToonMaterial з outline
- `OrganicFleshMaterial.tsx` — rim lighting + SSS ефект
- `ToonNucleusMaterial.tsx` — glow для ядра

#### 2.1.2 Пропозиції покращень

**Enhanced Toon Shader з Cell Shading:**

```typescript
// core/shaders/EnhancedToonShader.ts
export const createEnhancedToonMaterial = (params: ToonMaterialParams) => {
  const {
    color = '#ffffff',
    gradientMap = null,
    rimColor = '#ff69b4',
    rimPower = 3.0,
    rimIntensity = 1.0,
    cellShading = true,
    cellBands = 3
  } = params;

  // Custom shader з 3-4 кольоровими зонами
  const shader = {
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRimColor: { value: new THREE.Color(rimColor) },
      uRimPower: { value: rimPower },
      uRimIntensity: { value: rimIntensity },
      uCellBands: { value: cellBands },
      uLightDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() },
      uAmbient: { value: 0.4 },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision mediump float;
      
      uniform vec3 uColor;
      uniform vec3 uRimColor;
      uniform float uRimPower;
      uniform float uRimIntensity;
      uniform int uCellBands;
      uniform vec3 uLightDirection;
      uniform float uAmbient;
      uniform float uTime;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      // Cell shading function
      float cellShade(float intensity) {
        float band = 1.0 / float(uCellBands);
        return floor(intensity / band) * band;
      }
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // Basic lighting
        float NdotL = dot(normal, uLightDirection);
        float lightIntensity = NdotL * 0.5 + 0.5; // Half-lambert
        
        // Cell shading
        float celIntensity = cellShade(lightIntensity);
        
        // Fresnel rim
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uRimPower);
        
        // Final color
        vec3 color = uColor * (uAmbient + celIntensity * (1.0 - uAmbient));
        color = mix(color, uRimColor, fresnel * uRimIntensity);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  };
  
  return new THREE.ShaderMaterial(shader);
};
```

**Параметри конфігурації:**

```typescript
export const TOON_SHADER_PRESETS = {
  PLAYER: {
    cellBands: 4,
    rimPower: 2.5,
    rimIntensity: 1.2,
    ambient: 0.35
  },
  OBSTACLE: {
    cellBands: 3,
    rimPower: 3.0,
    rimIntensity: 0.8,
    ambient: 0.4
  },
  ENVIRONMENT: {
    cellBands: 3,
    rimPower: 4.0,
    rimIntensity: 0.5,
    ambient: 0.5
  }
} as const;
```

#### 2.1.3 Пріоритет: Високий
- Розробити `EnhancedToonShader` з cell shading
- Додати gradient map для різних типів об'єктів
- Інтегрувати з існуючими матеріалами

---

### 2.2 Ефекти частинок

#### 2.2.1 Поточний стан
- `ParticleTrail.tsx` — слід гравця
- `DustClouds.tsx` — пил при приземленні
- `SpeedLines.tsx` / `SpeedLinesEffect.tsx` — ефект швидкості

#### 2.2.2 Пропозиції покращень

**Оптимізована система частинок для мобільних:**

```typescript
// core/effects/OptimizedParticleSystem.ts
export interface ParticleSystemConfig {
  maxParticles: number;        // 50-200 для мобільних
  emissionRate: number;        // частинок/сек
  lifetime: number;            // секунди
  startSize: number;
  endSize: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  gravity: number;
  velocity: THREE.Vector3;
  useGPU: boolean;              // GPU particles для топових пристроїв
}

export const PARTICLE_EFFECTS: Record<string, ParticleSystemConfig> = {
  PLAYER_TRAIL: {
    maxParticles: 100,
    emissionRate: 30,
    lifetime: 0.8,
    startSize: 0.15,
    endSize: 0.02,
    startColor: new THREE.Color('#ffffff'),
    endColor: new THREE.Color('#ff69b4'),
    gravity: -0.5,
    velocity: new THREE.Vector3(0, 0, -2),
    useGPU: false
  },
  DUST_CLOUD: {
    maxParticles: 50,
    emissionRate: 20,
    lifetime: 0.5,
    startSize: 0.3,
    endSize: 0.1,
    startColor: new THREE.Color('#d4a574'),
    endColor: new THREE.Color('#8b7355'),
    gravity: -2,
    velocity: new THREE.Vector3(0, 1, 0),
    useGPU: false
  },
  SPEED_LINES: {
    maxParticles: 80,
    emissionRate: 60,
    lifetime: 0.3,
    startSize: 0.02,
    endSize: 0.01,
    startColor: new THREE.Color('#00ffff'),
    endColor: new THREE.Color('#0088aa'),
    gravity: 0,
    velocity: new THREE.Vector3(0, 0, -15),
    useGPU: true
  },
  COLLECT_SPARKLE: {
    maxParticles: 30,
    emissionRate: 0, // One-shot
    lifetime: 0.6,
    startSize: 0.2,
    endSize: 0.0,
    startColor: new THREE.Color('#ffff00'),
    endColor: new THREE.Color('#ff8800'),
    gravity: 2,
    velocity: new THREE.Vector3(0, 3, 0),
    useGPU: false
  }
};
```

**Mobile Optimization:**

```typescript
// Адаптивна кількість частинок
export const getParticleCountForDevice = (quality: QualityLevel): number => {
  switch (quality) {
    case QualityLevel.LOW: return 20;
    case QualityLevel.MEDIUM: return 50;
    case QualityLevel.HIGH: return 100;
    case QualityLevel.ULTRA: return 150;
  }
};

// Instanced rendering для максимальної продуктивності
export const createInstancedParticleMesh = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  maxCount: number
): THREE.InstancedMesh => {
  return new THREE.InstancedMesh(geometry, material, maxCount);
};
```

#### 2.2.3 Пріоритет: Високий
- Створити централізовану систему частинок
- Додати нові ефекти: collect sparkle, obstacle hit, wall scrape

---

### 2.3 Система освітлення та теней

#### 2.3.1 Поточний стан
- Базове освітлення (Ambient + Directional)
- Тіні відключені на мобільних (QualityLevel.LOW)
- Post-processing: Bloom, Vignette, ChromaticAberration
- Адаптивна якість для різних пристроїв

#### 2.3.2 Пропозиції покращень

**Dynamic Lighting System:**

```typescript
// core/lighting/DynamicLightingSystem.ts
export interface LightingConfig {
  ambient: {
    color: THREE.Color;
    intensity: number;
  };
  main: {
    color: THREE.Color;
    intensity: number;
    position: THREE.Vector3;
    castShadows: boolean;
  };
  fill: {
    color: THREE.Color;
    intensity: number;
  };
  rim: {
    color: THREE.Color;
    intensity: number;
  };
}

export const BIOME_LIGHTING: Record<BiomeType, LightingConfig> = {
  BIO_JUNGLE: {
    ambient: { color: new THREE.Color('#1a4a1a'), intensity: 0.4 },
    main: { color: new THREE.Color('#ffe4b5'), intensity: 1.2, position: new THREE.Vector3(5, 10, 5), castShadows: true },
    fill: { color: new THREE.Color('#228b22'), intensity: 0.3 },
    rim: { color: new THREE.Color('#90ee90'), intensity: 0.5 }
  },
  VEIN_TUNNEL: {
    ambient: { color: new THREE.Color('#4a0000'), intensity: 0.3 },
    main: { color: new THREE.Color('#ff6b6b'), intensity: 0.8, position: new THREE.Vector3(0, 8, 0), castShadows: false },
    fill: { color: new THREE.Color('#8b0000'), intensity: 0.4 },
    rim: { color: new THREE.Color('#ff1493'), intensity: 0.8 }
  },
  // ... інші біоми
};
```

**Shadow Configuration для мобільних:**

```typescript
// Адаптивні тіні
export const SHADOW_CONFIG = {
  [QualityLevel.LOW]: {
    enabled: false,
    mapSize: 512,
    bias: -0.001
  },
  [QualityLevel.MEDIUM]: {
    enabled: true,
    mapSize: 512,
    bias: -0.001,
    radius: 2
  },
  [QualityLevel.HIGH]: {
    enabled: true,
    mapSize: 1024,
    bias: -0.0005,
    radius: 4
  },
  [QualityLevel.ULTRA]: {
    enabled: true,
    mapSize: 2048,
    bias: -0.0001,
    radius: 8
  }
};

// Soft shadows для high-end
export const createSoftShadowMaterial = () => {
  return new THREE.SoftShadowMaterial({
    opacity: 0.4,
    color: new THREE.Color('#000000')
  });
};
```

#### 2.3.3 Пріоритет: Середній
- Розробити динамічну систему освітлення для біомів
- Оптимізувати тіні для мобільних пристроїв

---

### 2.4 Пост-обробка

#### 2.4.1 Поточний стан
- `PostProcessing.tsx` — використовує @react-three/postprocessing
- ChromaticAberration, Bloom, Vignette, DepthOfField, SSAO
- Адаптивна якість для різних пристроїв

#### 2.4.2 Пропозиції покращень

**Mobile-Optimized Post-Processing:**

```typescript
// core/postprocessing/MobilePostProcessing.ts
export interface PostProcessQuality {
  bloom: {
    enabled: boolean;
    intensity: number;
    luminanceThreshold: number;
    radius: number;
  };
  vignette: {
    enabled: boolean;
    offset: number;
    darkness: number;
  };
  chromaticAberration: {
    enabled: boolean;
    offset: [number, number];
  };
  dof: {
    enabled: boolean;
    focalLength: number;
    focalDistance: number;
    bokehScale: number;
  };
}

export const POST_PROCESS_QUALITY: Record<QualityLevel, PostProcessQuality> = {
  [QualityLevel.LOW]: {
    bloom: { enabled: false, intensity: 0, luminanceThreshold: 1, radius: 0 },
    vignette: { enabled: true, offset: 0.3, darkness: 0.6 },
    chromaticAberration: { enabled: false, offset: [0, 0] },
    dof: { enabled: false, focalLength: 0, focalDistance: 0, bokehScale: 0 }
  },
  [QualityLevel.MEDIUM]: {
    bloom: { enabled: true, intensity: 0.3, luminanceThreshold: 0.8, radius: 0.5 },
    vignette: { enabled: true, offset: 0.5, darkness: 0.5 },
    chromaticAberration: { enabled: false, offset: [0, 0] },
    dof: { enabled: false, focalLength: 0, focalDistance: 0, bokehScale: 0 }
  },
  [QualityLevel.HIGH]: {
    bloom: { enabled: true, intensity: 0.5, luminanceThreshold: 0.7, radius: 0.7 },
    vignette: { enabled: true, offset: 0.8, darkness: 0.4 },
    chromaticAberration: { enabled: true, offset: [0.002, 0.002] },
    dof: { enabled: false, focalLength: 0, focalDistance: 0, bokehScale: 0 }
  },
  [QualityLevel.ULTRA]: {
    bloom: { enabled: true, intensity: 0.6, luminanceThreshold: 0.6, radius: 1.0 },
    vignette: { enabled: true, offset: 1.0, darkness: 0.35 },
    chromaticAberration: { enabled: true, offset: [0.003, 0.003] },
    dof: { enabled: true, focalLength: 50, focalDistance: 10, bokehScale: 3 }
  }
};

// Comic-style Post-Processing
export const createComicPostProcess = () => {
  // Custom edge detection + color quantization
  return {
    edgeDetection: {
      enabled: true,
      threshold: 0.1,
      color: new THREE.Color('#000000')
    },
    colorQuantization: {
      enabled: true,
      levels: 8
    }
  };
};
```

#### 2.4.3 Пріоритет: Середній
- Адаптивна пост-обробка для мобільних
- Додати comic-style edge detection

---

### 2.5 Текстурні рішення

#### 2.5.1 Поточний стан
- Текстури відсутні (використовуються кольори)
- `TextureOptimizer.ts` — оптимізація завантаження

#### 2.5.2 Пропозиції покращень

**Texture Atlas для оптимізації:**

```typescript
// core/textures/TextureAtlas.ts
export interface TextureAtlasConfig {
  atlasSize: number;        // 1024, 2048
  format: THREE.TextureFormat;
  mipmap: boolean;
  compression: 'none' | 'basis' | 'ktx2';
}

export const TEXTURE_ATLAS_PRESETS = {
  LOW: {
    atlasSize: 512,
    format: THREE.RGBAFormat,
    mipmap: true,
    compression: 'none'
  },
  MEDIUM: {
    atlasSize: 1024,
    format: THREE.RGBAFormat,
    mipmap: true,
    compression: 'basis'
  },
  HIGH: {
    atlasSize: 2048,
    format: THREE.RGBAFormat,
    mipmap: true,
    compression: 'basis'
  }
};

// Procedural textures для біологічних поверхонь
export const createProceduralTexture = (
  type: 'vein' | 'cell' | 'membrane' | 'tissue',
  size: number = 256
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  switch (type) {
    case 'vein':
      // Створити візерунок вени
      drawVeinPattern(ctx, size);
      break;
    case 'cell':
      // Створити візерунок клітини
      drawCellPattern(ctx, size);
      break;
    // ...
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};
```

#### 2.5.3 Пріоритет: Низький
- Створити текстурний атлас для оптимізації
- Додати процедурні текстури для поверхонь

---

## Фізична модель

### 3.1 Поточний стан

- [`AdaptivePhysicsEngine.ts`](core/physics/AdaptivePhysicsEngine.ts:1) — адаптивна фізика
- [`constants/physicsConfig.ts`](constants/physicsConfig.ts:1) — конфігурація
- CCD (Continuous Collision Detection)
- Time catch-up mechanism

#### Існуючі параметри фізики:

```typescript
PLAYER_PHYSICS = {
  SPRING_STIFFNESS: 280,
  SPRING_DAMPING: 18,
  LANE_LERP_FACTOR: 10.0,
  MAX_TILT_RAD: 0.35,
  DASH_DURATION: 0.35,
  // ...
}

COLLISION_CONFIG = {
  PLAYER_RADIUS: 0.25,
  OBSTACLE_RADIUS: 0.35,
  PICKUP_RADIUS: 1.2,
  GRAZE_RADIUS: 1.8,
  // ...
}
```

### 3.2 Пропозиції покращень

#### 3.2.1 Покращена система колізій

```typescript
// core/physics/EnhancedCollisionSystem.ts
export interface CollisionLayers {
  PLAYER: number;
  OBSTACLE: number;
  BONUS: number;
  ENVIRONMENT: number;
  TRIGGER: number;
}

export const COLLISION_LAYERS: CollisionLayers = {
  PLAYER: 1 << 0,
  OBSTACLE: 1 << 1,
  BONUS: 1 << 2,
  ENVIRONMENT: 1 << 3,
  TRIGGER: 1 << 4
};

// Collision response types
export enum CollisionResponse {
  NONE = 'none',
  SLIDE = 'slide',
  BOUNCE = 'bounce',
  STOP = 'stop',
  TRIGGER = 'trigger'
}

// Enhanced collision shape
export interface CollisionShape {
  type: 'sphere' | 'box' | 'capsule';
  radius?: number;
  halfExtents?: THREE.Vector3;
  height?: number;
  offset?: THREE.Vector3;
}

// Layer-based collision detection
export const shouldCollide = (layerA: number, layerB: number): boolean => {
  return (layerA & layerB) !== 0;
};
```

#### 3.2.2 Покращена система управління

```typescript
// core/physics/EnhancedPlayerPhysics.ts
export interface MovementConfig {
  // Lateral movement
  lateralSpeed: number;           // Швидкість переміщення вліво/вправо
  lateralAcceleration: number;    // Прискорення
  lateralDeceleration: number;   // Уповільнення
  maxLateralVelocity: number;     // Макс. швидкість
  
  // Lane changing
  laneChangeDuration: number;     // Час на зміну смуги
  laneChangeCurve: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  
  // Vertical movement (jump)
  jumpForce: number;
  doubleJumpForce: number;
  gravity: number;
  maxFallSpeed: number;
  jumpCoyoteTime: number;         // Час після покидання землі для стрибка
  
  // Slide
  slideDuration: number;
  slideHeightScale: number;
  
  // Dash
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
}

export const ENHANCED_MOVEMENT_CONFIG: Record<QualityLevel, MovementConfig> = {
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
    slideDuration: 0.5,
    slideHeightScale: 0.5,
    dashSpeed: 25,
    dashDuration: 0.2,
    dashCooldown: 1.0
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
    slideDuration: 0.6,
    slideHeightScale: 0.45,
    dashSpeed: 30,
    dashDuration: 0.25,
    dashCooldown: 0.8
  },
  // HIGH and ULTRA would have more responsive controls
};
```

#### 3.2.3 Інерція та плавність

```typescript
// Smooth inertia system
export const createInertiaSystem = () => {
  const state = {
    velocity: new THREE.Vector3(),
    targetVelocity: new THREE.Vector3(),
    smoothing: 0.15,
    
    // Input response curve
    inputCurve: (t: number) => Math.pow(t, 0.7),
    
    // Update function
    update: (delta: number, input: InputState): THREE.Vector3 => {
      // Calculate target velocity from input
      state.targetVelocity.set(
        input.x * config.maxLateralVelocity,
        input.y * config.maxVerticalVelocity,
        0
      );
      
      // Smooth interpolation
      state.velocity.lerp(state.targetVelocity, state.smoothing * delta * 60);
      
      return state.velocity.clone();
    }
  };
  
  return state;
};
```

#### 3.2.4 Гравітація та стрибкова механіка

```typescript
// Enhanced jump physics
export const createJumpPhysics = () => {
  return {
    // Variable jump height (button hold)
    minJumpTime: 0.1,
    maxJumpTime: 0.4,
    jumpCutoff: 0.5, // Cut velocity at 50% when button released
    
    // Double jump
    doubleJumpEnabled: true,
    doubleJumpVelocityMultiplier: 0.85,
    
    // Air control
    airControlMultiplier: 0.7,
    
    // Fall physics
    fastFallMultiplier: 2.0,
    fastFallThreshold: -5, // Velocity threshold
    
    // Wall jump (for future)
    wallJumpEnabled: false,
    
    // Calculate jump velocity
    calculateJumpVelocity: (holdingTime: number, isGrounded: boolean): number => {
      if (!isGrounded) return 0;
      
      const jumpTime = Math.max(config.minJumpTime, Math.min(holdingTime, config.maxJumpTime));
      const t = jumpTime / config.maxJumpTime;
      
      // Eased jump curve
      const jumpProgress = 1 - Math.pow(1 - t, 2);
      return config.jumpForce * jumpProgress;
    }
  };
};
```

#### 3.2.5 Взаємодія з перешкодами та бонусами

```typescript
// Obstacle interaction types
export enum ObstacleInteraction {
  JUMP_OVER = 'jump_over',
  DODGE_LEFT = 'dodge_left',
  DODGE_RIGHT = 'dodge_right',
  SLIDE_UNDER = 'slide_under',
  DASH_THROUGH = 'dash_through',
  SHIELD_BLOCK = 'shield_block',
  DAMAGE = 'damage'
}

export interface ObstacleBehavior {
  type: ExtendedObstacleType;
  requiredAction: ObstacleInteraction;
  collisionShape: CollisionShape;
  damage: number;
  knockback: THREE.Vector3;
  particleEffect?: string;
  soundEffect?: string;
}

export const OBSTACLE_BEHAVIORS: Record<ExtendedObstacleType, ObstacleBehavior> = {
  VIRUS: {
    type: ExtendedObstacleType.VIRUS,
    requiredAction: ObstacleInteraction.DODGE_LEFT,
    collisionShape: { type: 'sphere', radius: 0.5 },
    damage: 1,
    knockback: new THREE.Vector3(-2, 0, 0),
    particleEffect: 'VIRUS_POP',
    soundEffect: 'hit_virus'
  },
  WALL_LOW: {
    type: ExtendedObstacleType.WALL_LOW,
    requiredAction: ObstacleInteraction.JUMP_OVER,
    collisionShape: { type: 'box', halfExtents: new THREE.Vector3(1.5, 0.5, 0.3) },
    damage: 0,
    knockback: new THREE.Vector3(0, 0, 0),
    particleEffect: 'DUST_CLOUD'
  },
  // ...
};

// Bonus pickup system
export interface BonusPickup {
  type: BonusType;
  radius: number;
  effect: (player: PlayerState) => void;
  visualEffect: string;
  soundEffect: string;
}
```

### 3.3 Пріоритет: Високий
- Покращити систему колізій з шарами
- Додати variable jump height
- Реалізувати coyote time для стрибків

---

## Система анімацій

### 4.1 Поточний стан

- [`ToonSperm.tsx`](components/player/ToonSperm.tsx:1) — анімація хвоста, squash-stretch
- [`SpermTail.tsx`](components/player/SpermTail.tsx:1) — instanced tail segments
- Базові переходи станів

### 4.2 Пропозиції покращень

#### 4.2.1 Плавні переходи між станами

```typescript
// core/animations/AnimationStateMachine.ts
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
  DEATH = 'death'
}

export interface AnimationTransition {
  from: PlayerAnimationState[];
  to: PlayerAnimationState;
  duration: number;
  curve: (t: number) => number; // Easing function
  trigger: AnimationTrigger;
}

export type AnimationTrigger = 
  | { type: 'velocity_threshold', params: { axis: 'x' | 'y' | 'z', threshold: number } }
  | { type: 'grounded_change', params: { isGrounded: boolean } }
  | { type: 'input', params: { action: string } }
  | { type: 'time', params: { duration: number } };

export const ANIMATION_TRANSITIONS: AnimationTransition[] = [
  {
    from: [PlayerAnimationState.IDLE, PlayerAnimationState.RUN],
    to: PlayerAnimationState.JUMP_UP,
    duration: 0.1,
    curve: easeOutQuad,
    trigger: { type: 'velocity_threshold', params: { axis: 'y', threshold: 5 } }
  },
  {
    from: [PlayerAnimationState.JUMP_UP],
    to: PlayerAnimationState.JUMP_PEAK,
    duration: 0.2,
    curve: easeInOutQuad,
    trigger: { type: 'velocity_threshold', params: { axis: 'y', threshold: 0 } }
  },
  // ... more transitions
];
```

#### 4.2.2 Анімація очікування (Idle)

```typescript
// Idle breathing + subtle movement
export const createIdleAnimation = (): AnimationClip => {
  return {
    duration: 2.0,
    loop: true,
    tracks: [
      // Body bob
      new VectorKeyframeTrack('.position[y]', [0, 1, 2], [0, 0.02, 0]),
      // Head tilt
      new VectorKeyframeTrack('head.rotation[x]', [0, 0.5, 1, 1.5, 2], [0, 0.02, 0, -0.02, 0]),
      // Tail gentle sway
      new NumberKeyframeTrack('tail.rotation[z]', [0, 1, 2], [0, 0.1, 0])
    ]
  };
};
```

#### 4.2.3 Анімація бігу (Run)

```typescript
// Run cycle - synced to speed
export const createRunAnimation = (speed: number): AnimationClip => {
  const cycleDuration = 1 / (speed * 0.1); // Faster speed = faster cycle
  
  return {
    duration: cycleDuration,
    loop: true,
    tracks: [
      // Body bounce
      new VectorKeyframeTrack('.position[y]', 
        [0, cycleDuration * 0.25, cycleDuration * 0.5, cycleDuration * 0.75, cycleDuration],
        [0, 0.05, 0, 0.05, 0]
      ),
      // Slight lean forward
      new VectorKeyframeTrack('.rotation[x]', [0, cycleDuration], [0.1, 0.1]),
      // Head bob
      new VectorKeyframeTrack('head.rotation[x]', 
        [0, cycleDuration * 0.25, cycleDuration * 0.5, cycleDuration * 0.75, cycleDuration],
        [0, 0.05, 0, -0.05, 0]
      )
    ]
  };
};
```

#### 4.2.4 Анімація стрибка

```typescript
// Jump phases
export const createJumpAnimation = (isDoubleJump: boolean): AnimationClip[] => {
  const anticipation = {
    duration: 0.08,
    tracks: [
      new VectorKeyframeTrack('.scale', [0, 0.08], 
        [[1, 1, 1], [0.9, 0.8, 1.1]] // Squash down
      )
    ]
  };
  
  const ascent = {
    duration: 0.3,
    tracks: [
      new VectorKeyframeTrack('.scale', [0, 0.3], 
        [[0.9, 0.8, 1.1], [0.85, 1.3, 0.9]] // Stretch up
      ),
      new VectorKeyframeTrack('.rotation[x]', [0, 0.3], [0.2, -0.1])
    ]
  };
  
  const peak = {
    duration: 0.15,
    tracks: [
      new VectorKeyframeTrack('.scale', [0, 0.15], 
        [[0.85, 1.3, 0.9], [0.95, 1.1, 0.95]]
      )
    ]
  };
  
  const descent = {
    duration: 0.25,
    tracks: [
      new VectorKeyframeTrack('.scale', [0, 0.25], 
        [[0.95, 1.1, 0.95], [1.1, 0.8, 1.1]] // Prepare for landing
      )
    ]
  };
  
  const landing = {
    duration: 0.15,
    tracks: [
      new VectorKeyframeTrack('.scale', [0, 0.15], 
        [[1.1, 0.8, 1.1], [1.2, 0.7, 1.2], [1, 1, 1]] // Squash on impact + recovery
      )
    ]
  };
  
  return isDoubleJump ? [anticipation, ascent, peak, descent, landing] : [anticipation, ascent, peak, descent, landing];
};
```

#### 4.2.5 Анімація ковзання (Slide)

```typescript
// Slide - compress and lean forward
export const createSlideAnimation = (): AnimationClip => {
  return {
    duration: 0.5,
    loop: false,
    tracks: [
      // Scale down vertically
      new VectorKeyframeTrack('.scale', [0, 0.1, 0.5], 
        [[1, 1, 1], [1.1, 0.5, 1.1], [1.1, 0.5, 1.1]]
      ),
      // Lean forward
      new VectorKeyframeTrack('.rotation[x]', [0, 0.1, 0.5], [0, 0.4, 0.4]),
      // Lower position
      new VectorKeyframeTrack('.position[y]', [0, 0.1, 0.5], [0, -0.3, -0.3])
    ]
  };
};
```

#### 4.2.6 Повороти та реакції

```typescript
// Lane change animation
export const createLaneChangeAnimation = (direction: -1 | 0 | 1): AnimationClip => {
  return {
    duration: 0.2,
    tracks: [
      // Tilt into direction
      new VectorKeyframeTrack('.rotation[z]', [0, 0.1, 0.2], 
        [0, direction * 0.2, 0]
      ),
      // Slight bounce
      new VectorKeyframeTrack('.position[y]', [0, 0.1, 0.2], 
        [0, 0.05, 0]
      )
    ]
  };
};

// Obstacle reaction - fear/dodge
export const createObstacleReaction = (): AnimationClip => {
  return {
    duration: 0.3,
    tracks: [
      // Quick duck/sidestep
      new VectorKeyframeTrack('.position', [0, 0.15, 0.3], 
        [[0, 0, 0], [0.5, -0.2, 0], [0, 0, 0]]
      ),
      // Concerned expression
      new StringKeyframeTrack('expression', [0, 0.15, 0.3], ['normal', 'scared', 'normal'])
    ]
  };
};

// Collect animation - happy reaction
export const createCollectAnimation = (): AnimationClip => {
  return {
    duration: 0.4,
    tracks: [
      // Jump for joy
      new VectorKeyframeTrack('.position[y]', [0, 0.2, 0.4], [0, 0.3, 0]),
      // Happy scale
      new VectorKeyframeTrack('.scale', [0, 0.2, 0.4], 
        [[1, 1, 1], [1.1, 1.2, 1.1], [1, 1, 1]]
      ),
      // Happy expression
      new StringKeyframeTrack('expression', [0, 0.2, 0.4], ['normal', 'happy', 'normal'])
    ]
  };
};
```

### 4.3 Пріоритет: Високий
- Розробити AnimationStateMachine
- Створити анімаційні кліпи для всіх станів
- Інтегрувати з системою частинок для ефектів

---

## Анімовані фонові елементи

### 5.1 Поточний стан
- `DNABackground.tsx` — фон DNA
- `BackgroundTunnel.tsx` — тунельний фон
- `Atmosphere.tsx` — атмосферні ефекти

### 5.2 Пропозиції покращень

#### 5.2.1 Паралакс-ефекти

```typescript
// core/background/ParallaxLayers.ts
export interface ParallaxLayer {
  name: string;
  depth: number;           // 0 = near, 1 = far
  speedMultiplier: number; // 1 = same as player
  elements: ParallaxElement[];
  color: THREE.Color;
}

export const PARALLAX_LAYERS: ParallaxLayer[] = [
  {
    name: 'foreground',
    depth: 0.2,
    speedMultiplier: 1.5,
    elements: [],
    color: new THREE.Color('#ff6b6b')
  },
  {
    name: 'midground',
    depth: 0.5,
    speedMultiplier: 1.0,
    elements: [],
    color: new THREE.Color('#4ecdc4')
  },
  {
    name: 'background',
    depth: 0.8,
    speedMultiplier: 0.5,
    elements: [],
    color: new THREE.Color('#45b7d1')
  }
];
```

#### 5.2.2 Атмосферні частинки

```typescript
// Atmospheric particles - different per biome
export interface AtmosphericParticleConfig {
  type: 'dust' | 'pollen' | 'cells' | 'bubbles' | 'organelles';
  density: number;
  size: { min: number; max: number };
  color: THREE.Color;
  movement: {
    type: 'drift' | 'swirl' | 'pulse' | 'float';
    speed: number;
    amplitude: number;
  };
}

export const BIOME_ATMOSPHERE: Record<BiomeType, AtmosphericParticleConfig> = {
  BIO_JUNGLE: {
    type: 'pollen',
    density: 0.3,
    size: { min: 0.02, max: 0.08 },
    color: new THREE.Color('#ffd93d'),
    movement: { type: 'drift', speed: 0.5, amplitude: 0.3 }
  },
  VEIN_TUNNEL: {
    type: 'cells',
    density: 0.5,
    size: { min: 0.05, max: 0.15 },
    color: new THREE.Color('#ff6b6b'),
    movement: { type: 'pulse', speed: 1.0, amplitude: 0.2 }
  },
  // ...
};
```

#### 5.2.3 Динамічне освітлення фону

```typescript
// Background lighting that changes with speed/progress
export const createDynamicBackgroundLighting = () => {
  return {
    update: (speed: number, distance: number, time: number) => {
      // Pulsing glow based on speed
      const glowIntensity = Math.min(speed / 50, 1.0) * 0.5;
      const pulse = Math.sin(time * 2) * 0.1 + 0.9;
      
      // Color shift based on distance
      const progress = distance / 3000;
      const colorShift = interpolateColor(
        new THREE.Color('#ff6b6b'),
        new THREE.Color('#4ecdc4'),
        progress
      );
      
      return {
        intensity: glowIntensity * pulse,
        color: colorShift
      };
    }
  };
};
```

### 5.3 Пріоритет: Середній
- Розробити систему паралакс шарів
- Додати атмосферні частинки для кожного біому

---

## Оточення та рівні

### 6.1 Поточний стан
- [`LevelGenerator.ts`](core/level-generation/LevelGenerator.ts:1) — генерація рівнів
- [`ObstacleSequences.ts`](core/level-generation/ObstacleSequences.ts:1) — послідовності перешкод
- [`PassageTypes.ts`](core/level-generation/PassageTypes.ts:1) — типи проходів
- 7 біомів з різними типами

### 6.2 Пропозиції покращень

#### 6.2.1 Структура рівня

```typescript
// core/level/LevelStructure.ts
export interface LevelChunk {
  index: number;
  startZ: number;
  endZ: number;
  biome: BiomeType;
  difficulty: number;
  objects: LevelObject[];
  decorations: DecorationElement[];
  lighting: LightingZone;
  audioZone: AudioZone;
}

export interface LevelSection {
  chunks: LevelChunk[];
  totalLength: number;
  difficulty: DifficultyProgression;
  checkpoints: Checkpoint[];
  bossZone?: BossZone;
}
```

#### 6.2.2 Візуальні теми для ділянок траси

```typescript
// Biome visual theming
export const BIOME_THEMES: Record<BiomeType, BiomeTheme> = {
  BIO_JUNGLE: {
    name: 'Bio Jungle',
    colors: {
      primary: '#228b22',
      secondary: '#90ee90',
      accent: '#ffd93d',
      warning: '#ff6b6b'
    },
    ambientSounds: ['jungle_ambient', 'bird_chirps'],
    particleEffects: ['pollen', 'leaves'],
    decorationTypes: ['leaf_cluster', 'vine', 'flower'],
    obstacleTypes: ['branch', 'rock', 'tree_root']
  },
  VEIN_TUNNEL: {
    name: 'Vein Tunnel',
    colors: {
      primary: '#8b0000',
      secondary: '#ff1493',
      accent: '#ff6b6b',
      warning: '#ffff00'
    },
    ambientSounds: ['heartbeat', 'blood_flow'],
    particleEffects: ['cells', 'red_particles'],
    decorationTypes: ['vein_wall', 'pulse_point', 'valve'],
    obstacleTypes: ['clot', 'wall_thick', 'narrowing']
  },
  // ... full definitions
};
```

#### 6.2.3 Генерація перешкод

```typescript
// Obstacle generation with visual variety
export interface ObstacleVariant {
  id: string;
  baseType: ExtendedObstacleType;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  scale: THREE.Vector3;
  animation?: ObstacleAnimation;
  particleEffect?: string;
}

export const OBSTACLE_VARIANTS: Record<ExtendedObstacleType, ObstacleVariant[]> = {
  [ExtendedObstacleType.VIRUS]: [
    { id: 'virus_spiky', baseType: ExtendedObstacleType.VIRUS, /* ... */ },
    { id: 'virus_smooth', baseType: ExtendedObstacleType.VIRUS, /* ... */ },
    { id: 'virus_glowing', baseType: ExtendedObstacleType.VIRUS, /* ... */ }
  ],
  // ... variants for each type
};
```

### 6.3 Пріоритет: Середній
- Розширити візуальні теми біомів
- Додати варіанти перешкод з різною геометрією

---

## Об'ємні форми та геометрія

### 7.1 Поточний стан
- Використання примітивів (sphere, cylinder, box)
- Procedural geometry для хвоста
- LOD система для гравця

### 7.2 Пропозиції покращень

#### 7.2.1 Форма та пропорції перешкод

```typescript
// Optimized obstacle geometries with readability
export const OBSTACLE_SHAPES: Record<ExtendedObstacleType, ObstacleGeometryConfig> = {
  WALL_LOW: {
    // Easy to jump over - low and wide
    baseGeometry: 'box',
    dimensions: { width: 3, height: 0.8, depth: 0.5 },
    readableSilhouette: true,
    color: '#ff6b6b'
  },
  
  WALL_HIGH: {
    // Must dodge - tall
    baseGeometry: 'box',
    dimensions: { width: 1.5, height: 3, depth: 0.5 },
    readableSilhouette: true,
    color: '#4ecdc4'
  },
  
  OVERHEAD: {
    // Must slide - elevated
    baseGeometry: 'box',
    dimensions: { width: 3, height: 0.5, depth: 0.5 },
    position: { y: 1.5 },
    readableSilhouette: true,
    color: '#ffe66d'
  },
  
  VIRUS: {
    // Spiky obstacle - dodge required
    baseGeometry: 'icosahedron',
    dimensions: { radius: 0.6 },
    readableSilhouette: true,
    color: '#ff6b6b',
    animation: { type: 'rotate', speed: 2 }
  }
};
```

#### 7.2.2 Дизайн персонажів та об'єктів

```typescript
// Visual clarity guidelines
export const VISUAL_CLARITY_GUIDELINES = {
  // Player must always be visible
  PLAYER: {
    minSilhouetteContrast: 0.7,
    rimLighting: true,
    glowOnDarkBackgrounds: true,
    outlineEnabled: true
  },
  
  // Obstacles must be readable at distance
  OBSTACLES: {
    minSilhouetteContrast: 0.8,
    highContrastColors: true,
    distinctShapes: true,
    warningIndicator: 'color_shift'
  },
  
  // Collectibles should stand out
  COLLECTIBLES: {
    glowEnabled: true,
    sparkleEffect: true,
    contrastWithBackground: 'high'
  }
};
```

### 7.3 Пріоритет: Середній
- Створити бібліотеку оптимізованих геометрій
- Додати guidelines для візуальної читабельності

---

## Паттерни та текстури

### 8.1 Поточний стан
- Відсутність текстур (color-based)
- Базові повторювані елементи

### 8.2 Пропозиції покращень

#### 8.2.1 Повторювані елементи дизайну

```typescript
// Design patterns for visual rhythm
export const DESIGN_PATTERNS = {
  // Lane markers
  LANE_DIVIDER: {
    pattern: 'dashed_line',
    spacing: 2,
    dashLength: 1,
    color: '#ffffff',
    opacity: 0.3
  },
  
  // Ground texture
  GROUND_STRIPE: {
    pattern: 'alternating',
    colors: ['#2a2a2a', '#333333'],
    stripeWidth: 0.5,
    speedEffect: true
  },
  
  // Wall decoration
  WALL_PATTERN: {
    pattern: 'geometric',
    shapes: ['circle', 'triangle', 'square'],
    spacing: 3,
    color: '#444444',
    parallax: 0.3
  }
};
```

#### 8.2.2 Текстурні рішення для поверхонь

```typescript
// Surface material types
export enum SurfaceType {
  ORGANIC_FLESH = 'organic_flesh',
  MEMBRANE = 'membrane',
  VEIN = 'vein',
  CELL_WALL = 'cell_wall',
  SLIME = 'slime'
}

export const SURFACE_MATERIALS: Record<SurfaceType, MaterialConfig> = {
  [SurfaceType.ORGANIC_FLESH]: {
    roughness: 0.7,
    metalness: 0.0,
    normalScale: 0.5,
    colorShift: true,
    subsurface: true
  },
  [SurfaceType.MEMBRANE]: {
    roughness: 0.3,
    metalness: 0.1,
    normalScale: 0.3,
    transparency: 0.6,
    iridescence: true
  },
  // ...
};
```

#### 8.2.3 Візуальний ритм

```typescript
// Visual rhythm patterns for motion
export const createMotionRhythm = (speed: number) => {
  const beatInterval = 60 / (speed * 4); // 4 beats per measure at base speed
  
  return {
    beatInterval,
    elements: [
      { type: 'lane_flash', interval: beatInterval },
      { type: 'speed_line', interval: beatInterval / 2 },
      { type: 'particle_burst', interval: beatInterval * 2 }
    ]
  };
};
```

### 8.3 Пріоритет: Низький
- Створити бібліотеку паттернів
- Додати текстурні рішення для поверхонь

---

## Візуальна стилістика

### 9.1 Адаптація подходу Subway Surfers

#### 9.1.1 Порівняльний аналіз

| Аспект | Subway Surfers | ToLOVERunner (поточний) | Пропозиція |
|--------|---------------|------------------------|------------|
| Стиль | Colorful cartoon | Biological toon | Bio-comic hybrid |
| Outline | Thick black | Thin | Medium (0.02-0.03) |
| Colors | Saturated | Muted organic | Saturated biological |
| Effects | Many particles | Few | Medium (optimized) |
| Speed feel | Strong | Medium | Enhanced |

#### 9.1.2 Унікальна візуальна ідентичність

```typescript
// Visual Identity System
export const VISUAL_IDENTITY = {
  name: 'Bio-Comic Runner',
  
  // Color palette - saturated biological
  palette: {
    primary: {
      red: '#ff6b6b',    // Blood/coral
      green: '#4ecdc4',  // Tissue/teal
      yellow: '#ffe66d'  // Yolk/gold
    },
    secondary: {
      pink: '#ff69b4',   // Biological accent
      purple: '#9b59b6', // Deep tissue
      blue: '#3498db'    // Vein/depth
    },
    neutral: {
      light: '#f5f5f5',
      dark: '#2c3e50',
      background: '#1a1a2e'
    }
  },
  
  // Style guidelines
  style: {
    outline: {
      width: 0.025,
      color: '#000000',
      enabled: true
    },
    shading: {
      type: 'cell',
      bands: 3,
      ambient: 0.4
    },
    effects: {
      rim: true,
      glow: true,
      particles: 'optimized'
    }
  }
};
```

#### 9.1.3 Консистентне арт-напрям

```typescript
// Art Direction Guidelines
export const ART_DIRECTION = {
  // Silhouette readability
  silhouette: {
    player: 'always_clear',
    obstacles: 'high_contrast',
    collectibles: 'glowing'
  },
  
  // Color usage
  colors: {
    playerAction: '#ffff00', // Yellow for actions
    danger: '#ff3333',        // Red for obstacles
    safe: '#33ff33',          // Green for safe paths
    collectible: '#ff00ff'   // Magenta for collectibles
  },
  
  // Visual language
  language: {
    curves: 'organic_rounded',
    edges: 'soft_with_outline',
    shapes: 'geometric_organic_hybrid'
  }
};
```

### 9.2 Пріоритет: Високий
- Створити Visual Identity System
- Розробити консистентне арт-напрям

---

## Імплементація

### 10.1 План впровадження

#### Phase 1: Core Systems (2-3 тижні)
1. Розширений Toon Shader з cell shading
2. Покращена система фізики (collision layers, variable jump)
3. Animation State Machine
4. Mobile particle system

#### Phase 2: Visual Enhancement (2-3 тижні)
1. Динамічне освітлення для біомів
2. Post-processing optimization
3. Parallax background layers
4. Atmospheric particles

#### Phase 3: Polish (1-2 тижні)
1. Visual identity system
2. Art direction consistency
3. Performance optimization
4. Testing on mobile devices

### 10.2 Технічні обмеження

| Параметр | Desktop | Mobile (High) | Mobile (Low) |
|----------|---------|---------------|--------------|
| FPS Target | 60 | 60 | 30 |
| Draw Calls | <50 | <60 | <80 |
| Particles | 150 | 80 | 30 |
| Shadow Map | 2048 | 1024 | Off |
| Post-FX | All | Basic | Vignette |

### 10.3 Приклади коду для ключових систем

#### 10.3.1 Shader Integration

```typescript
// Example: Using enhanced toon shader in component
import { createEnhancedToonMaterial } from '../../core/shaders/EnhancedToonShader';

const Obstacle = ({ type, position }) => {
  const material = useMemo(() => 
    createEnhancedToonMaterial({
      ...TOON_SHADER_PRESETS.OBSTACLE,
      color: OBSTACLE_COLORS[type]
    }), 
    [type]
  );
  
  return (
    <mesh geometry={obstacleGeometries[type]} material={material}>
      <OutlineHull geometry={obstacleGeometries[type]} />
    </mesh>
  );
};
```

#### 10.3.2 Physics Integration

```typescript
// Example: Using enhanced physics in player
import { useEnhancedPhysics } from '../../core/physics/EnhancedPlayerPhysics';

const Player = () => {
  const { 
    move, 
    jump, 
    slide, 
    dash, 
    state 
  } = useEnhancedPhysics({
    config: ENHANCED_MOVEMENT_CONFIG[QualityLevel.MEDIUM],
    collisionLayers: COLLISION_LAYERS
  });
  
  // Animation state from physics
  const animationState = useMemo(() => 
    mapPhysicsToAnimation(state), 
    [state]
  );
  
  return <ToonSperm animation={animationState} />;
};
```

---

## Підсумок

Це технічне завдання надає комплексний план для покращення візуальної складової та фізичної моделі гри ToLOVERunner. Пріоритетизация базується на:

1. **Високий пріоритет:** Шейдери, фізика, анімації, візуальна ідентичність
2. **Середній пріоритет:** Освітлення, пост-обробка, оточення, геометрія
3. **Низький пріоритет:** Текстури, паттерни

Всі пропозиції враховують обмеження мобільних пристроїв та необхідність збереження продуктивності на рівні 60 FPS.
