# 🏗️ Архитектура ToLOVERunner v2.4.1

**Версия:** 2.4.1  
**Лицензия:** Apache-2.0  
**Технологический стек:** React 18, Three.js, TypeScript, Vite, Zustand, TailwindCSS  
**См. также:** [ADR 0001 — стратегия стабилизации](./adr/0001-stabilization-strategy.md)

---

## 🎮 Общее описание

**ToLOVERunner** — это 3D endless runner игра, где игрок управляет сперматозоидом, бегущим по бесконечному туннелю. Игра сочетает классический геймплей runner'а с биологической тематикой.

---

## 📁 Структура проекта

```
toloverunner/
├── components/          # React компоненты
│   ├── player/         # Компоненты игрока
│   ├── World/          # Игровой мир и объекты
│   ├── UI/             # Интерфейс пользователя
│   ├── System/         # Системные компоненты
│   └── debug/          # Отладочные компоненты
├── core/               # Ядро игры (не React)
│   ├── physics/       # Физика и коллизии
│   ├── track/          # Система трека
│   ├── utils/          # Утилиты (типобезопасные данные: deepClone, safeJSONParse, memoize — только здесь, см. dataUtils.ts)
│   └── assets/         # Загрузка ресурсов
├── store/              # Zustand store (состояние)
│   ├── gameSlice.ts    # Игровая логика
│   ├── networkSlice.ts # Мультиплеер
│   ├── uiSlice.ts      # UI состояние
│   └── persistenceSlice.ts # Сохранение данных
├── constants/          # Константы и конфигурация
├── public/assets/      # Статические ресурсы
│   ├── enemies/        # Текстуры врагов
│   ├── fonts/          # Шрифты
│   └── fx/             # Эффекты
└── tests/              # Тесты (Vitest)
```

---

## 🔧 Технологический стек

### Основные зависимости

**3D Графика:**
- `three@^0.159.0` - Базовый 3D движок
- `@react-three/fiber@^8.15.16` - React рендерер для Three.js
- `@react-three/drei@^9.99.0` - Хелперы и компоненты
- `@react-three/postprocessing@^2.16.0` - Постпроцессинг эффекты
- `postprocessing@^6.34.1` - Эффекты (Bloom, Chromatic Aberration, Outline)

**UI и анимации:**
- `react@^18.2.0` + `react-dom@^18.2.0`
- `framer-motion@^10.18.0` - Анимации UI
- `lucide-react@^0.309.0` - Иконки
- `tailwindcss@^4.x` - Стилизация

**Состояние и логика:**
- `zustand@^4.5.0` - Управление состоянием

**Инструменты разработки:**
- `vite@^6.x` - Сборщик
- `typescript@^5.7.x`
- `vitest@^4.x` - Unit/интеграционные тесты
- `@playwright/test` - E2E тесты
- `eslint@^9.x` + `@typescript-eslint/*` - Линтинг

**Команды:** `npm run dev` (port 3000), `npm run build` / `build:prod`, `npm run type-check`, `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run test:e2e`, `npm run security:audit` — см. README и package.json.

**Логирование:** при включении правила `no-console` в ESLint использовать `utils/logger` (log/warn/error) вместо `console.*` в `core/`, `store/`, `components/World`.

**Типы:** Глобальные типы игры (GameStatus, ObjectType, GameObject и т.д.) — в корневом `types.ts`. Типы систем мира (ChunkGenerationConfig, CullingConfig, IWorldGenerationSystem и т.д.) — в `core/world/types.ts` (импортируют из `types` при необходимости). Дублирование одних и тех же интерфейсов не допускается.

---

## 🎯 Основные системы

### 1. Физика игрока (`core/physics/PlayerPhysics.ts`)

**Назначение:** Детерминированная физика движения игрока

**Ключевые особенности:**
- Движение по 3 полосам (левая, центр, правая)
- Прыжки с поддержкой двойного прыжка
- Гравитация: 105 единиц
- Сила прыжка: 52 единицы
- Скорость смены полос: 32 единицы/сек
- Fast fall при падении

**Методы:**
- `setLane(laneIndex)` - Установка целевой полосы
- `jump(isDouble)` - Прыжок (обычный/двойной)
- `update(dt)` - Обновление физики
- `reset()` - Сброс состояния

---

### 2. Система коллизий (`core/physics/CollisionSystem.ts`)

**Назначение:** Обнаружение столкновений с использованием swept sphere detection (CCD)

**Оптимизации:**
- **Z-range culling** - Проверка только объектов вблизи игрока (±8 единиц)
- **Lane culling** - Проверка только объектов в той же полосе
- **Обратный порядок** - Проверка ближайших объектов первыми

**Радиусы:**
- Игрок: `0.32²` (0.1024)
- Препятствия: `0.32²`
- Пикапы: `2.5²` (щедрый радиус сбора)

---

### 3. Процедурная генерация (`components/System/Procedural.ts`)

**Назначение:** Генерация уровней в Web Worker для предотвращения блокировки UI

**Архитектура:**
- Встроенный Web Worker (Blob-based)
- Seed-based генерация для детерминированности
- Float32Array для zero-copy передачи данных

**Формат данных:**
```
[Type, X, Y, Z, ColorInt] × N объектов
Stride: 5 элементов на объект
```

**Типы объектов:**
- `OBSTACLE` (0) - Препятствия (вирусы)
- `GENE` (1) - Гены
- `DNA_HELIX` (2) - Спирали ДНК
- `JUMP_BAR` (3) - Платформы для прыжков
- `COIN` (4) - Монеты
- `SHIELD` (5) - Щит
- `SPEED_BOOST` (6) - Ускорение

---

### 4. Система трека (`core/track/TrackSystem.ts`)

**Назначение:** Визуализация бесконечного трека с кривизной

**Особенности:**
- Instanced mesh для эффективного рендеринга
- Бесконечная прокрутка через модульную арифметику
- Применение кривизны через `CurveHelper`
- Сегментированный трек (CHUNK_SIZE = 20 единиц)
 - Все объекты на треке (препятствия, пикапы, декорации) синхронизируются с кривизной через `CurveHelper` для корректного позиционирования при world-bending.
 - Адаптивный culling через `DynamicCullingManager` — единый источник дистанций отрисовки для трека и объектов.

---

### 5. Управление состоянием (Zustand)

**Архитектура:**
- Модульная структура с slices
- `createWithEqualityFn` для оптимизации ре-рендеров

**Slices:**
- **gameSlice.ts:** Игровая логика (score, lives, distance, speed)
- **networkSlice.ts:** PeerJS интеграция для мультиплеера
- **uiSlice.ts:** UI состояние (меню, пауза, магазин)
- **persistenceSlice.ts:** LocalStorage интеграция

---

## 🎨 Визуальные компоненты

### Игрок (`components/World/PrimitiveSperm.tsx`)

**Модель:**
- Голова: `SphereGeometry(0.8, 32, 32)` - белая с emissive
- Ядро: Внутренняя сфера с голубым оттенком
- Акросома: Конус на передней части
- Хвост: `SpermTail` - сегментированный хвост (14 сегментов)
- Outline: Черный контур для видимости

### Объекты мира

**VirusObstacles:**
- Геометрия: Упрощенная (8 шипов)
- Материал: `MeshBasicMaterial`
- Instanced mesh (MAX_COUNT: 200)

**BonusOrb:**
- Геометрия: Sphere (0.7) для орбов, Torus для DNA coins
- Материал: `MeshBasicMaterial` с emissive
- Instanced mesh (MAX_COUNT: 100)

---

## ⚙️ Конфигурация

### Иерархия констант (единый источник правды)

- **Корневой `constants.ts`** — скаляры и сводные конфиги:
  - Базовые: `LANE_WIDTH`, `JUMP_HEIGHT`, `RUN_SPEED_BASE`, `SPAWN_DISTANCE`, `WIN_DISTANCE`, `MIN_ACTIVE_DISTANCE`, сеть, UI_LAYERS, цвета.
  - Группы: `PHYSICS_CONFIG`, `NETWORK_CONFIG`, `SAFETY_CONFIG`, `GAMEPLAY_CONFIG`, `LOD_CONFIG`, `FEATURE_FLAGS`, `BIOME_CONFIG`, `ASSET_CONFIG`.
  - Реэкспорт физики/коллизий: см. ниже.
- **`constants/physicsConfig.ts`** — параметры движения и коллизий (не дублировать значения из `constants.ts`):
  - `PLAYER_PHYSICS` — пружины, тилт, dash, тень, fear (используется в `Player.tsx`, анимация).
  - `COLLISION_CONFIG` — радиусы игрока/препятствий/пикапов, высоты прыжка (используется в `CollisionSystem`, `AdaptivePhysicsEngine`).
  - Импорт: из `constants/physicsConfig` или из `constants` (реэкспорт).
- **`core/level-generation/PhysicsPassability.ts`** — отдельный `PLAYER_PHYSICS` для пассабилити (RUN_SPEED, REACTION_TIME, JUMP_DURATION и т.д.); только для генерации уровней и валидации, не подменяет корневые константы.

**Правило:** Числовые значения физики/геймплея не дублировать между `constants.ts` и `constants/physicsConfig.ts`; при изменении — менять в одном месте.

### Константы (`constants.ts`) — выдержка

**Физика (корень):**
- `LANE_WIDTH`, `JUMP_HEIGHT`, `RUN_SPEED_BASE`, `GRAVITY_Y`, `JUMP_FORCE_Y`, `PHYSICS_CONFIG`.

**Игра:**
- `WIN_DISTANCE`, `SPAWN_DISTANCE`, `MIN_ACTIVE_DISTANCE`, `GAMEPLAY_CONFIG` (MIN/MAX_SPEED, MAX_SCORE и т.д.).

**LOD (Level of Detail):**
- `LOD_CONFIG`: `DRAW_DISTANCE`, `TRACK_CHUNKS` (не мутировать в рантайме), `PARTICLE_COUNT`, `SHADOW_UPDATE_SKIP`.

---

## 🎮 Геймплей

### Управление

**Клавиатура:**
- `ArrowLeft` / `A` - Левая полоса
- `ArrowRight` / `D` - Правая полоса
- `ArrowUp` / `W` / `Space` - Прыжок
- `Shift` - Dash

**Touch (Mobile):**
- Swipe left/right - Смена полосы
- Swipe up - Прыжок

### Игровые механики

**Комбо система:**
- Увеличивается при сборе монет
- Множитель: `Math.floor(combo / 5) + 1`
- Сбрасывается при пропуске монеты

**Power-ups:**
- **Shield** - Бессмертие на 10 секунд
- **Speed Boost** - Ускорение (x2)
- **Magnet** - Притягивание монет

---

## 🔄 Жизненный цикл игры

1. **MENU** - Выбор персонажа, создание/присоединение к комнате
2. **PLAYING** - Игровой процесс
3. **PAUSED** - Пауза
4. **SHOP** - Магазин
5. **GAME_OVER** - Поражение
6. **VICTORY** - Победа (достижение WIN_DISTANCE)
7. **STATS** - Статистика

---

## 📝 Ключевые файлы

**Точка входа:**
- `index.tsx` - ReactDOM рендеринг
- `App.tsx` - Главный компонент

**Игровая логика:**
- `WorldLevelManager.tsx` - Управление миром
- `PlayerController.tsx` - Контроллер игрока
- `CameraController.tsx` - Управление камерой

**Системы:**
- `Procedural.ts` - Генерация уровней
- `CollisionSystem.ts` - Коллизии
- `PlayerPhysics.ts` - Физика
- `TrackSystem.ts` - Трек

**UI:**
- `HUD.tsx` - Игровой интерфейс
- `LobbyUI.tsx` - Меню и мультиплеер
- `MenuRunnerPreview.tsx` - Превью в меню

---

*Версия документа: 1.0*

