# Обзор и анализ стабильности: геймплей, графика, рендер, модели

**Дата:** 2026-02-22  
**Версия:** 2.2.0  
**Области:** Gameplay, Graphics, Renderer, Models

---

## 1. Резюме

| Область      | Оценка стабильности | Критические риски | Рекомендации |
|-------------|----------------------|-------------------|---------------|
| Геймплей    | **Высокая**          | Нет               | Унифицировать лимит delta в useGamePhysics |
| Графика     | **Высокая**          | Нет               | Сохранять текущую политику |
| Рендер      | **Высокая**          | Нет               | — |
| Модели      | **Высокая**          | Нет               | Проверять release геометрий при unmount |

---

## 2. Стабильность геймплея

### 2.1 Игровой цикл

- **Единая точка входа:** `GameLoopRunner` — один `useFrame`, все обновления идут через зарегистрированные колбэки (`worldUpdate`, `playerUpdate`, `renderUpdate`, `lateUpdate`).
- **Ограничение delta:** `finalDelta` зажимается в `[SAFETY_CONFIG.MIN_DELTA_TIME, SAFETY_CONFIG.MAX_DELTA_TIME]` (0.001–0.05 с), что снижает скачки при лагах и возврате с вкладки.
- **Hit stop:** `HitStopManager` масштабирует delta при ударе (freeze ~0.08 с), не останавливая рендер.

**Код (GameLoopRunner.tsx):**
```ts
finalDelta = Math.max(SAFETY_CONFIG.MIN_DELTA_TIME, Math.min(SAFETY_CONFIG.MAX_DELTA_TIME, finalDelta));
```

### 2.2 Физика

- **PhysicsStabilizer:** фиксированный timestep (1/60), до 10 подшагов за кадр, интерполяция между шагами. Защита от «spiral of death» при низком FPS.
- **PhysicsEngine:** создаётся в `useGamePhysics`, при размонтировании вызывается `physicsEngine.dispose()`.
- **Валидация позиции игрока:** в колбэке Player проверяется `Number.isFinite(tx|ty|tz)`; при невалидных значениях кадр пропускается, позиция принудительно сбрасывается к безопасным значениям.

**Расхождение:** в `useGamePhysics.updatePhysics` используется `safeDelta = Math.min(delta, 0.1)` (до 100 ms), а в основном цикле лимит 0.05 с. Для единообразия лучше брать `SAFETY_CONFIG.MAX_DELTA_TIME` или тот же лимит, что и в GameLoopRunner.

### 2.3 Состояние и спавн объектов

- **Лимит объектов:** в `useChunkSystem` используется `SAFETY_CONFIG.MAX_OBJECTS` (300). При нехватке места новые объекты не добавляются (`spaceLeft <= 0`).
- **Числовая безопасность:** в WorldLevelManager используются `safeDeltaTime`, `isValidNumber`; при невалидной дистанции выполняется сброс в 0.
- **Вкладка/фокус:** `useBrowserStability` при скрытии вкладки переводит игру в PAUSED, при показе — возобновление с задержкой 100 ms, что уменьшает рывки при возврате.

### 2.4 Вывод по геймплею

- Единый цикл, ограничение delta, фиксированный шаг физики и интерполяция дают предсказуемое и устойчивое поведение.
- Рекомендация: в `useGamePhysics` заменить жёсткий `0.1` на `SAFETY_CONFIG.MAX_DELTA_TIME` (или общий хелпер `safeDeltaTime`) для согласованности.

---

## 3. Стабильность графики

### 3.1 Пост-обработка

- **Условие рендера:** PostProcessing не рендерится при `MENU`, `LOBBY`, `COUNTDOWN` и пока `!isReady`. Эффекты включаются только когда есть готовый WebGL и сцена игры.
- **Инициализация:** `isReady` выставляется через 50 ms после проверки `gl`, `scene`, `camera`, что снижает риск работы с неинициализированным контекстом.
- **Параметры SSAO:** заданы `worldDistanceThreshold`, `worldDistanceFalloff`, `worldProximityThreshold`, `worldProximityFalloff` — тип и поведение эффекта согласованы.

### 3.2 Освещение и окружение

- Environment/Atmosphere: статичные fog, lights, цвет фона. Нет динамического создания/удаления контекста в цикле.
- LOD: `LOD_CONFIG` (DRAW_DISTANCE, TRACK_CHUNKS, PARTICLE_COUNT, SHADOW_UPDATE_SKIP) зависит от `__TOLOVERUNNER_LOW_QUALITY`; TRACK_CHUNKS зафиксирован (80) для стабильности дороги.

### 3.3 Вывод по графике

- Включение пост-обработки только при готовности контекста и в нужных статусах уменьшает артефакты и падения. Дополнительных критичных рисков не выявлено.

---

## 4. Стабильность рендерера

### 4.1 Canvas и WebGL

- **App.tsx:** один основной Canvas, `frameloop="always"`, `dpr={[1, 2]}`, фиксированные `camera` (near: 0.1, far: 110), `gl` с antialias, depth, high-performance, ACES tone mapping.
- **onCreated:** устанавливаются background, ColorManagement, outputColorSpace; регистрируются debug-глобалы только в dev.

### 4.2 Контроль рендера и производительности

- **RenderController:** вешает на игровой цикл колбэк, обновляет `PerformanceManager` (FPS и т.д.); при инициализации выставляет `gl.info.autoReset = true`.
- **PerformanceManager:** мониторинг FPS/draw calls/memory, адаптивное качество, LOD — не меняет базовую инициализацию рендерера.

### 4.3 Обработка ошибок

- **StableErrorBoundary / UIErrorBoundary:** перехват ошибок в дереве, логирование, в prod — Sentry. Падение одного поддерева не роняет весь экран.
- **safeExecute / safeDispose (errorHandler):** безопасное выполнение и dispose с try/catch и fallback.

### 4.4 Вывод по рендеру

- Один Canvas, предсказуемые настройки, мониторинг и границы ошибок обеспечивают устойчивую работу рендерера.

---

## 5. Стабильность моделей и геометрии

### 5.1 GeometryPool

- **Синглтон с ref-count:** общие геометрии (Box, Sphere, Cylinder, Plane, Circle, Torus, Octahedron, Icosahedron, Dodecahedron) переиспользуются по ключу; при `release()` счётчик уменьшается, при 0 — `dispose()`.
- Снижает количество аллокаций и риск утечек за счёт централизованного владения.

### 5.2 Использование в компонентах

- **ToonSperm:** головная и ядерная геометрии берутся из пула (`getSphereGeometry`), в `useEffect` cleanup вызываются `getGeometryPool().release(...)` и `safeDispose(headMat, tailMat)`. Хвост — собственный `BufferGeometry` (создаётся в useMemo), не из пула — при unmount не освобождается через pool (но объект будет собран GC при размонтировании группы). Явный dispose для tail geometry при unmount улучшил бы предсказуемость.
- **Atmosphere / VolumetricGodRays:** используют пул (`getSphereGeometry`, `getBoxGeometry`, `getCylinderGeometry`). В Atmosphere есть cleanup в useEffect (release геометрий, safeDispose материалов). В VolumetricGodRays в useFrame добавлена проверка `if (!data) return` для безопасности доступа к `items[i]`.

### 5.3 Материалы и униформы

- **OrganicFleshMaterial / ToonNucleusMaterial:** кастомные uniform обновляются в `useFrame` (uTime, uEmissiveIntensity и т.д.). В ToonSperm delta для анимаций ограничивается через `SAFETY_CONFIG` — риск «разлёта» значений при лагах снижен.
- **Мутация атрибутов:** хвост ToonSperm в каждом кадре перезаписывает `positions` и вызывает `posAttr.needsUpdate = true`, `geo.computeVertexNormals()` — паттерн корректен для динамической геометрии.

### 5.4 Лимиты и пулы объектов

- **SAFETY_CONFIG:** MAX_OBJECTS (300), MAX_PARTICLES (50), MAX_VELOCITY, MAX_SCALE, MIN_SCALE — используются в спавне и проверках.
- **SharedPool (gameObjectPool):** объекты возвращаются в пул при `obj.active = false` и через `gameObjectPool.release(obj)` в физике (collecting), что ограничивает рост числа объектов.

### 5.5 Вывод по моделям

- Пул геометрий и осознанный release в ключевых компонентах снижают утечки и нагрузку на GPU.
- Рекомендация: для хвоста ToonSperm в cleanup добавить явный `tailGeometry.dispose()` при unmount (если геометрия не из пула). Проверить остальные компоненты с собственной BufferGeometry на наличие dispose в unmount.

---

## 6. Сводка рисков и рекомендаций

### Критических рисков не выявлено

- Delta везде ограничивается (в основном цикле — SAFETY_CONFIG, в Player — SAFETY_CONFIG, в WorldLevelManager — safeDeltaTime).
- Физика с фиксированным шагом и интерполяцией, валидация позиций и чисел, лимиты на число объектов и частиц.
- Пост-обработка включается только при готовом контексте и в нужных экранах; рендер и ошибки прикрыты границами и PerformanceManager.

### Рекомендации (улучшения без смены архитектуры)

1. **Геймплей:** в `useGamePhysics.updatePhysics` заменить `Math.min(delta, 0.1)` на использование `SAFETY_CONFIG.MAX_DELTA_TIME` (или `safeDeltaTime` из safeMath) для единого лимита delta по проекту.
2. **Модели:** в ToonSperm в cleanup добавить `tailGeometry.dispose()` (tail создаётся через `new BufferGeometry()` и не идёт через GeometryPool).
3. **Документация:** зафиксировать в ADR или Runbook правило: все компоненты, создающие Three.js геометрию/материал вне пула, должны вызывать dispose/release в unmount.

---

## 7. Использованные файлы (выборочно)

- `components/System/GameLoopRunner.tsx` — игровой цикл, clamp delta
- `constants.ts` — SAFETY_CONFIG, LOD_CONFIG, GAMEPLAY_CONFIG
- `core/physics/PhysicsStabilizer.ts` — фиксированный timestep, интерполяция
- `core/physics/PhysicsEngine.ts` — использование стабилизатора
- `components/World/Player.tsx` — колбэк позиции, safeDelta, валидация
- `components/World/hooks/useGamePhysics.ts` — updatePhysics, safeDelta
- `components/World/hooks/useChunkSystem.ts` — MAX_OBJECTS, спавн
- `components/World/PostProcessing.tsx` — isReady, skipEffects
- `App.tsx` — Canvas, gl, camera, frameloop
- `components/System/RenderController.tsx` — PerformanceManager
- `infrastructure/rendering/GeometryPool.ts` — пул, release
- `components/player/ToonSperm.tsx` — геометрии, материалы, cleanup
- `utils/safeMath.ts` — safeDeltaTime, isValidNumber
- `utils/errorHandler.ts` — safeDispose
- `components/System/StableErrorBoundary.tsx` — граница ошибок
- `hooks/useBrowserStability.ts` — вкладка/фокус
