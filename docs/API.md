# 📘 API Документация ToLOVERunner v2.1.0

## Обзор

Документация API для основных систем игры ToLOVERunner v2.1.0.

---

## Core Systems

### PlayerPhysics

**Расположение:** `core/physics/PlayerPhysics.ts`

Система физики игрока, управляющая движением, прыжками и гравитацией.

#### Методы

##### `constructor()`
Создает новый экземпляр физики игрока и инициализирует начальное состояние.

##### `reset(): void`
Сбрасывает физику игрока в начальное состояние (позиция [0,0,0], скорость 0, на земле).

##### `setLane(laneIndex: number): void`
Устанавливает целевую полосу для движения.
- `laneIndex`: -1 (левая), 0 (центр), 1 (правая)

##### `jump(isDouble: boolean): boolean`
Выполняет прыжок игрока.
- `isDouble`: true для двойного прыжка (в воздухе)
- **Возвращает:** `true` если прыжок выполнен, `false` если нет доступных прыжков

##### `update(dt: number): void`
Обновляет физику на один кадр.
- `dt`: Delta time в секундах (рекомендуется ограничить до 0.05)

#### Свойства

- `position: THREE.Vector3` - Текущая позиция игрока
- `velocity: THREE.Vector3` - Текущая скорость игрока
- `targetLane: number` - Целевая полоса движения
- `isGrounded: boolean` - Находится ли игрок на земле
- `isJumping: boolean` - Выполняется ли прыжок
- `isDoubleJumping: boolean` - Выполняется ли двойной прыжок
- `jumpsRemaining: number` - Количество доступных прыжков (макс. 2)
- `config` - Конфигурация физики (гравитация, сила прыжка, скорость движения по полосам)

---

### CollisionSystem

**Расположение:** `core/physics/CollisionSystem.ts`

Система обнаружения коллизий с использованием swept sphere detection (CCD).

#### Методы

##### `checkSwept(playerX, playerY, playerZ, objects, currentDistance, previousDistance): CollisionResult`

Выполняет swept sphere проверку для предотвращения прохождения сквозь объекты.

**Параметры:**
- `playerX: number` - X координата игрока (в полосах)
- `playerY: number` - Y координата игрока (высота)
- `playerZ: number` - Z координата игрока (обычно 0)
- `objects: GameObject[]` - Массив игровых объектов для проверки
- `currentDistance: number` - Текущая пройденная дистанция
- `previousDistance: number` - Предыдущая пройденная дистанция

**Возвращает:**
```typescript
interface CollisionResult {
    hit: boolean;
    object: GameObject | null;
}
```

**Оптимизации:**
- Z-range culling (±8 единиц)
- Lane culling (проверка только объектов в той же полосе)
- Обратный порядок (ближайшие объекты первыми)

---

### ProceduralSystem

**Расположение:** `components/System/Procedural.ts`

Система процедурной генерации уровней в Web Worker.

#### Методы

##### `constructor(seed: string)`
Создает новый экземпляр системы процедурной генерации.
- `seed`: Строка-семя для генератора случайных чисел

##### `init(seed: string): void`
Инициализирует генератор с новым seed.

##### `setCallback(cb: ((data: Float32Array) => void) | null): void`
Устанавливает callback для обработки сгенерированных чанков.
- `cb`: Функция, вызываемая при генерации чанка (null для отключения)

##### `requestChunk(startZ: number, count: number, laneCount: number, biome: BiomeType): void`
Запрашивает генерацию нового чанка объектов.
- `startZ`: Начальная Z координата для генерации (обычно отрицательная)
- `count`: Количество секций для генерации
- `laneCount`: Количество полос движения
- `biome`: Тип биома для генерации

##### `terminate(): void`
Завершает работу Web Worker и освобождает ресурсы.

#### Свойства

- `isProcessing: boolean` - Флаг обработки текущего запроса

---

### TrackSystem

**Расположение:** `core/track/TrackSystem.ts`

Система управления визуализацией бесконечного трека.

#### Методы

##### `registerMesh(mesh: THREE.InstancedMesh): void`
Регистрирует instanced mesh для рендеринга трека.

##### `reset(): void`
Сбрасывает трек в начальное состояние.

##### `update(totalDistance: number): void`
Обновляет позиции и трансформации сегментов трека.
- `totalDistance`: Общая пройденная дистанция игрока

##### `dispose(): void`
Освобождает ресурсы системы.

---

### CurveHelper

**Расположение:** `core/utils/CurveHelper.ts`

Синхронизация кривизны для всех объектов.

#### Методы

##### `getCurveAt(z: number): { x: number, y: number, rotY: number }`
Возвращает X/Y offset и Y rotation для любой Z позиции в мире.
- `z`: The generic "World Z" (Distance travelled + local Z)
- **Возвращает:** Объект с x, y offsets и rotation Y

**Особенности:**
- Централизованное кэширование (шаг 2 единицы)
- Автоматическая очистка при превышении лимита (1000 записей)

##### `getRotationAt(z: number): number`
Возвращает только rotation Y для заданной Z позиции.

##### `clearCache(): void`
Очищает кэш кривизны (полезно при смене уровня или рестарте игры).

---

## Store API (Zustand)

### GameSlice

**Расположение:** `store/gameSlice.ts`

#### Основные методы

##### `startGame(mode?: GameMode): void`
Запускает новую игру.
- `mode`: Режим игры (по умолчанию ENDLESS)

##### `resetGame(): void`
Сбрасывает игру в начальное состояние.

##### `restartGame(): void`
Перезапускает игру с текущим режимом.

##### `addScore(amount: number): void`
Добавляет очки.

##### `collectCoin(points: number): void`
Собирает монету с системой комбо.

##### `collectGene(): void`
Собирает ген (+200 очков).

##### `takeDamage(): void`
Наносит урон игроку.

##### `useLife(): void`
Использует одну жизнь.

##### `activateShield(): void`
Активирует щит (бессмертие на 10 секунд).

##### `activateSpeedBoost(): void`
Активирует ускорение (x2 на 5 секунд).

##### `activateMagnet(): void`
Активирует магнит (притягивание монет на 10 секунд).

##### `dash(): void`
Выполняет рывок (dash ability).

---

## React Components

### PlayerController

**Расположение:** `components/player/PlayerController.tsx`

Контроллер игрока, управляющий физикой, вводом, анимацией и визуализацией.

#### Props

```typescript
interface PlayerControllerProps {
    visible?: boolean; // Видимость игрока
}
```

#### Особенности

- Обработка клавиатурного ввода (стрелки, WASD, пробел)
- Jump buffer для отзывчивости управления
- Squash & stretch анимация
- Синхронизация с глобальным состоянием через Zustand
- Применение кривизны трека к позиции и вращению

---

### WorldLevelManager

**Расположение:** `components/World/WorldLevelManager.tsx`

Главный компонент, управляющий игровым миром.

#### Функциональность

- Процедурная генерация объектов через ProceduralSystem
- Обновление дистанции и скорости
- Система коллизий
- Управление жизненным циклом объектов
- Проверка условий победы

---

## Утилиты

### safeDeltaTime

**Расположение:** `utils/safeMath.ts`

```typescript
function safeDeltaTime(dt: number, max: number, min: number): number
```

Безопасно ограничивает delta time для предотвращения скачков.

### validateLaneIndex

**Расположение:** `utils/validation.ts`

```typescript
function validateLaneIndex(lane: number, limit: number): number
```

Валидирует и ограничивает индекс полосы.

### validatePosition

**Расположение:** `utils/validation.ts`

```typescript
function validatePosition(pos: [number, number, number]): readonly [number, number, number]
```

Валидирует позицию объекта.

---

## Константы

### Физика

- `LANE_WIDTH = 2.0` - Ширина полосы
- `JUMP_HEIGHT = 2.5` - Высота прыжка
- `RUN_SPEED_BASE = 30.0` - Базовая скорость

### Игра

- `WIN_DISTANCE = 3000` - Дистанция до победы
- `SPAWN_DISTANCE = 200` - Дистанция спавна
- `MIN_ACTIVE_DISTANCE = 100` - Минимальная дистанция для активации

### Безопасность

- `MAX_DELTA_TIME = 0.05` - Максимальная delta time
- `MIN_DELTA_TIME = 0.001` - Минимальная delta time
- `MAX_OBJECTS = 500` - Максимальное количество объектов
- `MAX_PARTICLES = 100` - Максимальное количество частиц

### Геймплей

- `JUMP_BUFFER_TIME = 0.15` - Время для jump buffer
- `COYOTE_TIME = 0.1` - Время для coyote jump
- `TOUCH_JUMP_BUFFER = 0.2` - Увеличенный buffer для touch управления

---

*Версия документа: 1.0*

