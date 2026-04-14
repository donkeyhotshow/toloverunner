# Детальний план розвитку проєкту ToLOVERunner V2

**Версія документа:** 1.0  
**Дата створення:** 2026-02-24  
**Тип проєкту:** 3D-гра на React Three Fiber (Endless Runner)

---

## Зміст

1. [Пріоритетний напрямок 1: Об'єднання аудіо менеджерів](#пріоритетний-напрямок-1-обєднання-аудіо-менеджерів)
2. [Пріоритетний напрямок 2: Frustum Culling для instanced meshes](#пріоритетний-напрямок-2-frustum-culling-для-instanced-meshes)
3. [Пріоритетний напрямок 3: Комплексна система unit тестів](#пріоритетний-напрямок-3-комплексна-система-unit-тестів)
4. [Пріоритетний напрямок 4: Валідація вхідних даних](#пріоритетний-напрямок-4-валідація-вхідних-даних)
5. [Загальний план впровадження](#загальний-план-впровадження)

---

## Аналіз поточного стану

### Існуючі аудіо системи

| Компонент | Стан | Джерело |
|-----------|------|---------|
| UnifiedAudioManager | ✅ Активний | [`core/audio/UnifiedAudioManager.ts`](core/audio/UnifiedAudioManager.ts) |
| DynamicAudioManager | ❌ Не знайдено | Потребує створення |
| Audio.ts (deprecated) | ⚠️ Фасад | [`components/System/Audio.ts`](components/System/Audio.ts) |

**Технічний аудит (розділ 44-45):**
> Дублювання аудіо систем (DynamicAudioManager + UnifiedAudioManager)

### Існуючі instanced meshes

Проєкт активно використовує `InstancedMesh` у наступних компонентах:

- [`components/World/InstancedLevelObjects.tsx`](components/World/InstancedLevelObjects.tsx) — бонуси, щити, прискорювачі
- [`components/World/VirusObstacle.tsx`](components/World/VirusObstacle.tsx) — вірусні перешкоди
- [`components/World/BioInfiniteTrack.tsx`](components/World/BioInfiniteTrack.tsx) — дорога та стіни
- [`components/World/BiomeDecorRenderer.tsx`](components/World/BiomeDecorRenderer.tsx) — декорації біомів
- [`components/Effects/SpeedLines.tsx`](components/Effects/SpeedLines.tsx) — ефекти швидкості

### Поточний стан тестування

| Категорія | Оцінка | Стан |
|-----------|--------|------|
| Тестування | 5/10 | ❌ Недостатньо |

**Існуючі тести:**
- [`tests/core/physics/CollisionSystem.test.ts`](tests/core/physics/CollisionSystem.test.ts)
- [`tests/core/physics/PlayerPhysics.test.ts`](tests/core/physics/PlayerPhysics.test.ts)
- E2E тести у [`tests/e2e/`](tests/e2e/)

### Валідація даних

**Існуюча система валідації:** [`utils/validation.ts`](utils/validation.ts)
- `validateLaneIndex()` — валідація індексу смуги
- `validatePosition()` — валідація позиції
- `validateSpeed()` — валідація швидкості
- `validateScale()` — валідація масштабу

**Метод `startGame()`:** [`store/sessionSlice.ts:40`](store/sessionSlice.ts:40)
- Відсутня валідація параметра `mode`
- Відсутня обробка помилок
- Відсутнє логування некоректних даних

---

## Пріоритетний напрямок 1: Об'єднання аудіо менеджерів

### 1.1 Поточний стан

Існує лише [`UnifiedAudioManager`](core/audio/UnifiedAudioManager.ts) — синглтон з ~950 рядками коду, що включає:
- Управління звуковими ефектами (SFX)
- Музичні треки
- Haptic patterns
- Кешування та попереднє завантаження

### 1.2 План дій

#### Етап 1: Розширення UnifiedAudioManager

```typescript
// Новий функціонал для UnifiedAudioManager

interface AudioCacheConfig {
  maxCacheSize: number;        // Максимальний розмір кешу (MB)
  preloadPriority: string[];    // Пріоритет завантаження
  evictionPolicy: 'LRU' | 'LFU';
}

interface DynamicAudioAsset {
  id: string;
  url: string;
  loaded: boolean;
  lastUsed: number;
  useCount: number;
}
```

**Завдання:**
1. Додати систему кешування звуків з LRU/LFU eviction
2. Реалізувати динамічне завантаження (lazy loading)
3. Додати пріоритетну систему завантаження
4. Інтегрувати Web Audio API для позиційного звуку

#### Етап 2: Створення DynamicAudioManager як розширення

```typescript
// core/audio/DynamicAudioManager.ts

export class DynamicAudioManager {
  private cache: Map<string, AudioBuffer>;
  private loadingQueue: Map<string, Promise<AudioBuffer>>;
  private cacheConfig: AudioCacheConfig;
  
  // Динамічне завантаження
  async loadSound(id: string, url: string): Promise<AudioBuffer>;
  
  // Кешування
  getCachedSound(id: string): AudioBuffer | null;
  
  // Очищення
  clearCache(): void;
  setMaxCacheSize(sizeMB: number): void;
}
```

#### Етап 3: Інтеграція

**Існуючі точки інтеграції:**
- [`store/sessionSlice.ts:42`](store/sessionSlice.ts:42) — `unifiedAudio.init()`
- [`core/input/GestureManager.ts`](core/input/GestureManager.ts) — Haptic patterns
- [`components/System/Audio.ts`](components/System/Audio.ts) — Deprecated facade

### 1.3 Очікувані результати

| Метрика | До | Після |
|---------|-----|-------|
| Використання пам'яті | ~50MB | ~30MB (кешування) |
| Час завантаження першого звуку | 500ms | 50ms (кешовано) |
| Кількість аудіо менеджерів | 2 (дублі) | 1 (об'єднаний) |

---

## Пріоритетний напрямок 2: Frustum Culling для instanced meshes

### 2.1 Аналіз поточного стану

Проєкт використовує ~15+ `InstancedMesh` компонентів, але **не має** Frustum Culling.

### 2.2 План дій

#### Етап 1: Створення FrustumCullingSystem

```typescript
// core/rendering/FrustumCullingSystem.ts

import { Frustum, Matrix4, InstancedMesh } from 'three';

export interface CullingConfig {
  enabled: boolean;
  updateFrequency: number;  // Кадри між перевірками
  margin: number;           // Відступ від frustum
}

export class FrustumCullingSystem {
  private frustum: Frustum;
  private projectionMatrix: Matrix4;
  private viewMatrix: Matrix4;
  
  // Перевірка чи instance видимий
  isInstanceVisible(
    instanceMatrix: Matrix4, 
    cameraPosition: Vector3
  ): boolean;
  
  // Оптимізована перевірка для batch
  computeVisibleInstances(
    mesh: InstancedMesh,
    camera: Camera,
    count: number
  ): Set<number>;
  
  // Оновлення матриць камери
  updateCameraMatrices(camera: Camera): void;
}
```

#### Етап 2: Інтеграція з InstancedLevelObjects

**Файл:** [`components/World/InstancedLevelObjects.tsx`](components/World/InstancedLevelObjects.tsx)

```typescript
// Додати до існуючого компоненту

import { FrustumCullingSystem } from '../../core/rendering/FrustumCullingSystem';

const cullingSystem = new FrustumCullingSystem();

// У useFrame:
useFrame(({ camera }) => {
  const visibleIndices = cullingSystem.computeVisibleInstances(
    coinMeshRef.current,
    camera,
    totalCoins
  );
  
  // Оновлюємо тільки видимі інстанси
  updateVisibleInstances(visibleIndices);
});
```

#### Етап 3: Розширення на інші компоненти

| Компонент | Пріоритет | Складність |
|-----------|-----------|------------|
| VirusObstacle.tsx | Високий | Середня |
| BiomeDecorRenderer.tsx | Високий | Середня |
| ParticleSystem.tsx | Середній | Низька |
| SpeedLines.tsx | Низький | Низька |

### 2.3 Очікувані результати

| Метрика | До | Після |
|---------|-----|-------|
| Draw calls | ~200 | ~80 |
| GPU навантаження | 100% | ~40% |
| FPS (середній) | 45 | 60 |

---

## Пріоритетний напрямок 3: Комплексна система unit тестів

### 3.1 Поточний стан

- Тестування: **5/10** ❌ Недостатньо
- Існуючі unit тести: ~5 файлів
- E2E тести: ~10 файлів

### 3.2 План дій

#### Етап 1: Створення тестів для Audio Manager

**Файл:** [`tests/core/audio/UnifiedAudioManager.test.ts`](tests/core/audio/UnifiedAudioManager.test.ts)

```typescript
describe('UnifiedAudioManager', () => {
  describe('init()', () => {
    it('повинен ініціалізувати AudioContext');
    it('повинен викидати помилку якщо Web Audio недоступний');
  });
  
  describe('playSound()', () => {
    it('повинен відтворювати звук за ID');
    it('повинен кешувати завантажені звуки');
    it('повинен обробляти неіснуючі звукові ID');
  });
  
  describe('Dynamic Loading', () => {
    it('повинен завантажувати звук lazy');
    it('повинен витісняти старі звуки при переповненні кешу');
  });
});
```

#### Етап 2: Створення тестів для Rendering System

**Файл:** [`tests/core/rendering/FrustumCullingSystem.test.ts`](tests/core/rendering/FrustumCullingSystem.test.ts)

```typescript
describe('FrustumCullingSystem', () => {
  describe('isInstanceVisible()', () => {
    it('повинен визначати видимі інстанси');
    it('повинен враховувати margin');
  });
  
  describe('computeVisibleInstances()', () => {
    it('повинен повертати Set видимих індексів');
    it('повинен оптимізувати batch перевірку');
  });
});
```

#### Етап 3: Тести для ігрової логіки

**Файли:**
- [`tests/core/game/GameLogic.test.ts`](tests/core/game/GameLogic.test.ts)
- [`tests/store/validation.test.ts`](tests/store/validation.test.ts)
- [`tests/core/physics/AdaptivePhysicsEngine.test.ts`](tests/core/physics/AdaptivePhysicsEngine.test.ts)

```typescript
describe('Game Logic', () => {
  describe('startGame()', () => {
    it('повинен валідувати gameMode');
    it('повинен викликати unifiedAudio.init()');
    it('повинен скидати рахунок та життя');
  });
  
  describe('takeDamage()', () => {
    it('повинен зменшувати кількість житів');
    it('повинен обробляти game over при 0 життів');
  });
});
```

#### Етап 4: Покриття тестами

| Компонент | Цільове покриття | Пріоритет |
|-----------|------------------|-----------|
| UnifiedAudioManager | 80% | Високий |
| FrustumCullingSystem | 90% | Високий |
| Session Slice (store) | 85% | Високий |
| CollisionSystem | 80% | Середній |
| LevelGenerator | 70% | Середній |

### 3.3 Конфігурація Vitest

**Файл:** [`vitest.config.ts`](vitest.config.ts)

```typescript
// Додатиcoverage та налаштування
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['core/**/*', 'store/**/*'],
    },
  },
});
```

---

## Пріоритетний напрямок 4: Валідація вхідних даних

### 4.1 Аналіз проблем

**Метод `startGame()`:** [`store/sessionSlice.ts:40`](store/sessionSlice.ts:40)

```typescript
// Поточний код (без валідації)
startGame: (mode = GameMode.ENDLESS) => {
  debugLog("Starting countdown sequence...");
  unifiedAudio.init();
  set({
    status: GameStatus.COUNTDOWN,
    gameMode: mode,  // ❌ Без валідації
    lives: get().maxLives,
    score: 0,
    distance: 0
  });
}
```

### 4.2 План дій

#### Етап 1: Розширення Validation Utility

**Файл:** [`utils/validation.ts`](utils/validation.ts)

```typescript
// Додати нові функції валідації

/**
 * Валідація GameMode
 */
export const validateGameMode = (mode: unknown): GameMode => {
  if (!Object.values(GameMode).includes(mode as GameMode)) {
    console.warn(`Invalid game mode: ${mode}, using default ENDLESS`);
    return GameMode.ENDLESS;
  }
  return mode as GameMode;
};

/**
 * Валідація GameStatus
 */
export const validateGameStatus = (status: unknown): GameStatus => {
  if (!Object.values(GameStatus).includes(status as GameStatus)) {
    console.warn(`Invalid game status: ${status}`);
    return GameStatus.LOBBY;
  }
  return status as GameStatus;
};

/**
 * Валідація числових параметрів гри
 */
export const validateGameNumber = (
  value: unknown,
  min: number = 0,
  max: number = Infinity,
  defaultValue: number = 0
): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    console.warn(`Invalid value: ${value}, expected ${min}-${max}, using ${defaultValue}`);
    return defaultValue;
  }
  return num;
};
```

#### Етап 2: Оновлення startGame()

**Файл:** [`store/sessionSlice.ts`](store/sessionSlice.ts:40)

```typescript
import { validateGameMode, validateGameNumber } from '../utils/validation';

startGame: (mode = GameMode.ENDLESS) => {
  // ✅ Валідація
  const validatedMode = validateGameMode(mode);
  
  debugLog("Starting countdown sequence...");
  
  // ✅ Логування некоректних даних
  if (mode !== validatedMode) {
    console.warn(`[startGame] Invalid mode ${mode} corrected to ${validatedMode}`);
  }
  
  unifiedAudio.init();
  
  set({
    status: GameStatus.COUNTDOWN,
    gameMode: validatedMode,
    lives: get().maxLives,
    score: 0,
    distance: 0
  });
}
```

#### Етап 3: Створення валідатора для публічних методів

**Файл:** [`core/validation/InputValidator.ts`](core/validation/InputValidator.ts)

```typescript
import { z } from 'zod';

// Схеми Zod для валідації

export const GameConfigSchema = z.object({
  mode: z.nativeEnum(GameMode).default(GameMode.ENDLESS),
  lives: z.number().min(1).max(10).default(3),
  speed: z.number().min(0).max(200).default(50),
  seed: z.string().optional(),
});

export const PlayerStateSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  lane: z.number().int().min(-1).max(1),
  velocity: z.number().finite(),
});

export class InputValidator {
  static validateGameConfig(input: unknown): GameConfig {
    const result = GameConfigSchema.safeParse(input);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path}: ${i.message}`);
      console.error('[InputValidator] Game config validation failed:', errors);
      throw new ValidationError('Invalid game config', errors);
    }
    return result.data;
  }
  
  static validatePlayerState(input: unknown): PlayerState {
    const result = PlayerStateSchema.safeParse(input);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path}: ${i.message}`);
      console.warn('[InputValidator] Player state validation issues:', errors);
    }
    return result.data;
  }
}
```

#### Етап 4: Охоплення валідацією інших методів

| Метод/Клас | Файл | Тип валідації |
|-------------|------|----------------|
| `setGameMode` | sessionSlice.ts | GameMode enum |
| `startGameplay` | sessionSlice.ts | Player state |
| `takeDamage` | sessionSlice.ts | Damage amount |
| `addScore` | sessionSlice.ts | Score value |
| `setSpeed` | sessionSlice.ts | Speed range |
| `PlayerController` | PlayerController.tsx | Position/velocity |

### 4.3 Обробка помилок

```typescript
// Глобальний обробник помилок валідації

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Centralized validation logging
const validationLogger = {
  warn: (context: string, message: string, data?: unknown) => {
    console.warn(`[VALIDATION:${context}] ${message}`, data);
    // Could send to analytics
  },
  error: (context: string, message: string, errors: string[]) => {
    console.error(`[VALIDATION:${context}] ${message}`, errors);
    // Could send to Sentry
  }
};
```

---

## Загальний план впровадження

### Фаза 1: Фундамент (Тиждень 1-2)

| Завдання | Відповідальний | Статус |
|----------|----------------|--------|
| Розширити validation.ts | Dev | ⏳ |
| Створити InputValidator з Zod | Dev | ⏳ |
| Оновити startGame() з валідацією | Dev | ⏳ |
| Додати unit тести для валідації | Dev | ⏳ |

### Фаза 2: Аудіо система (Тиждень 3-4)

| Завдання | Відповідальний | Статус |
|----------|----------------|--------|
| Розширити UnifiedAudioManager з кешуванням | Dev | ⏳ |
| Створити DynamicAudioManager | Dev | ⏳ |
| Інтегрувати lazy loading | Dev | ⏳ |
| Тести для Audio Manager | Dev | ⏳ |

### Фаза 3: Оптимізація рендерингу (Тиждень 5-6)

| Завдання | Відповідальний | Статус |
|----------|----------------|--------|
| Створити FrustumCullingSystem | Dev | ⏳ |
| Інтегрувати в InstancedLevelObjects | Dev | ⏳ |
| Розширити на VirusObstacles | Dev | ⏳ |
| Оптимізувати BiomeDecorRenderer | Dev | ⏳ |

### Фаза 4: Тестування (Тиждень 7-8)

| Завдання | Відповідальний | Статус |
|----------|----------------|--------|
| Створити тести для Game Logic | Dev | ⏳ |
| Створити тести для Rendering | Dev | ⏳ |
| Покрити 80%+ критичних шляхів | Dev | ⏳ |
| Налаштувати CI з coverage | Dev | ⏳ |

### Фаза 5: Завершення (Тиждень 9-10)

| Завдання | Відповідальний | Статус |
|----------|----------------|--------|
| Решта валідації публічних методів | Dev | ⏳ |
| Інтеграційне тестування | Dev | ⏳ |
| Performance benchmark | Dev | ⏳ |
| Документація змін | Dev | ⏳ |

---

## Метрики успіху

| Показник | Поточний | Ціль |
|----------|----------|------|
| Оцінка тестування | 5/10 | 8/10 |
| Покриття тестами | ~30% | 80% |
| FPS (середній) | 45 | 60 |
| Використання пам'яті (audio) | ~50MB | ~30MB |
| Draw calls | ~200 | ~80 |
| Lint issues | 0 | 0 |

---

## Залежності між фазами

```
Фаза 1 (Валідація)
    │
    ├──► Фаза 3 (Frustum Culling) ──► Фаза 4 (Тестування)
    │
    └──► Фаза 2 (Аудіо) ───────────► Фаза 4 (Тестування)
                                           │
                                           ▼
                                    Фаза 5 (Завершення)
```

---

## Ризики та пом'якшення

| Ризик | Імовірність | Вплив | Пом'якшення |
|-------|-------------|-------|--------------|
| Зміни в API Three.js | Середня | Високий | Використовувати стабільні API |
| regresії в ігровій логіці | Висока | Високий | E2E тести перед мержем |
| Performance degradation | Середня | Середній | Benchmarks після кожної фази |
| Memory leaks в кеші | Середня | Високий | LRU eviction + тести |

---

## Рекомендації

1. **Послідовність:** Дотримуватися порядку фаз — валідація first
2. **Тестування:** Кожна функція повинна мати мінімум 2 тести (success/fail cases)
3. **Performance:** Запускати benchmark після кожної оптимізації
4. **Code Review:** Обов'язковий review перед мержем у main
5. **Documentation:** Оновлювати README.md після кожної фази