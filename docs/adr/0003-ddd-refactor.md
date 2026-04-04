# ADR-0003: DDD-рефакторинг — розмежовані контексти (Bounded Contexts)

**Статус:** Прийнято (чернетка v2.5)  
**Дата:** 2026-04-04  
**Автори:** Архітектурна команда ToLOVERunner  
**Версія проекту:** v2.4.1 → v2.5+

---

## Контекст

Після стабілізації v2.4.1 (ADR-0001) кодова база ToLOVERunner налічує:

- `core/` — 28+ модулів із змішаними обов'язками (фізика, аудіо, прогресія, рендеринг)
- `store/` — єдиний Zustand-стор із 7 слайсами після рефакторингу gameplaySlice
- Відсутнє явне розмежування доменів: ігровий стан, мережа, прогресія, окруження

Планований розвиток v2.5 вводить нові домени:
- **Multiplayer** (кооперативна гра, синхронізація)
- **Biomes** (нові біоми/окруження)
- **Leaderboard** (локальні + серверні бали)

Без явних меж між доменами нові модулі ризикують породити нові зв'язані залежності.

---

## Проблема

- `core/` змішує фізику, аудіо, рендеринг, прогресію без явних публічних API
- Нові multiplayer/biomes/leaderboard-модулі не можуть безпечно читати стан гравця без ризику циклічних залежностей
- Відсутня концепція агрегатів і value objects — бізнес-правила розпорошені по слайсах і компонентах

---

## Рішення: Шість обмежених контекстів (Bounded Contexts)

### 1. `player` — стан гравця

**Відповідає за:** позиція, швидкість, здоров'я, характер, сніни.  
**Публічний інтерфейс:** `IPlayerState`  
**Власник стану:** `store/playerSlice` + `store/gameplaySlice`  
**Заборонено:** безпосередній доступ до `core/physics` з інших контекстів — тільки через `IPlayerState`.

```ts
interface IPlayerState {
  position: Readonly<[number, number, number]>;
  lane: number;
  lives: number;
  speed: number;
  isGrounded: boolean;
  characterType: string;
}
```

---

### 2. `physics` — рухова система

**Відповідає за:** PlayerPhysics, CollisionSystem, PhysicsEngine, EnhancedPhysicsSystem.  
**Публічний інтерфейс:** `IPhysicsSystem`  
**Заборонено:** `physics` не знає про score, leaderboard, multiplayer — тільки про IPlayerState.

```ts
interface IPhysicsSystem {
  update(delta: number, input: IPlayerInput): IPlayerState;
  checkCollisions(state: IPlayerState, objects: readonly IGameObject[]): ICollisionResult;
}
```

---

### 3. `powerups` — підсилення та комбо

**Відповідає за:** shield, magnet, speed-boost, dash, DNA cards, combo.  
**Публічний інтерфейс:** `IPowerupSystem`  
**Виділено з:** `store/gameplay/powerupActions`, `store/gameplay/damageActions`

```ts
interface IPowerupSystem {
  activate(type: PowerupType, state: IPlayerState): IPowerupEffect;
  tick(delta: number, state: IPlayerState): Partial<IPlayerState>;
}
```

---

### 4. `biomes` — окруження та рівні

**Відповідає за:** генерація рівнів, теми біомів, палітра, спавн об'єктів.  
**Публічний інтерфейс:** `IBiomeConfig`, `IBiomeRenderer`  
**Не торкається:** store, playerSlice, physics.  
**Розташування:** `src/biomes/`

```ts
interface IBiomeConfig {
  id: string;
  name: string;
  palette: BiomePalette;
  objectDensity: number;
  hazardTypes: readonly string[];
  musicTrack: string;
}
```

---

### 5. `multiplayer` — мережева взаємодія

**Відповідає за:** автентифікація, серверна синхронізація, co-op стан.  
**Публічний інтерфейс:** `IGameSync`, `IAuthService`  
**Не торкається:** core/ — тільки через `IPlayerState` і `IGameObject`.  
**Розташування:** `src/multiplayer/`

```ts
interface IGameSync {
  connect(sessionId: string): Promise<void>;
  sendState(state: IPlayerState): void;
  onRemoteState(cb: (state: IPlayerState) => void): () => void;
  disconnect(): Promise<void>;
}
```

---

### 6. `leaderboard` — таблиці рекордів

**Відповідає за:** збереження і читання локальних рекордів, відправлення на сервер.  
**Публічний інтерфейс:** `ILeaderboard`  
**Не торкається:** physics, biomes, multiplayer.  
**Розташування:** `src/leaderboard/`

```ts
interface ILeaderboard {
  addEntry(entry: LeaderboardEntry): void;
  getTopN(n: number): readonly LeaderboardEntry[];
  sync(): Promise<void>;
}
```

---

## Схема залежностей (Anti-Corruption Layer)

```
biomes ──────────────────────────────────────────────────────────────────┐
                                                                          │
multiplayer ──── IPlayerState ──── physics ──── player ──── store/slice  │
                                                   │                      │
leaderboard ──────────────────────────────────────┘         components ──┘
```

**Правило:** стрілки вказують напрям залежності. Нижчі шари не імпортують вищі.

---

## Альтернативи, що розглядались

| Варіант | Причина відхилення |
|---|---|
| Event Sourcing | Надмірна складність для поточного масштабу |
| Монорепозиторій із пакетами | Ломає поточний Vite-білд без значного переналаштування |
| Redux Toolkit з RTK Query | Міграція з Zustand — великий ризик регресії |

---

## Наслідки

- ✅ Нові модулі (biomes, multiplayer, leaderboard) ізольовані від core/
- ✅ Тестування за інтерфейсами — мок-об'єкти замість реальних залежностей
- ✅ Поступова міграція: старий код `core/` залишається, нові модулі в `src/`
- ⚠️ Потрібне оновлення `tsconfig.json` для нових path aliases (`@multiplayer/*`, `@biomes/*`, `@leaderboard/*`)
- ⚠️ ADR-0003 має бути переглянутий після завершення v2.5-1 (coop local)

---

## Перегляд

Перегляд планується після: мілстоун v2.5-1 або при виникненні циклічних залежностей між контекстами.
