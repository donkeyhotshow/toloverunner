# Что ещё проработать, оптимизировать и стабилизировать

**Дата:** 2026-02-22  
**Контекст:** Движок, геймплей, рендер, графика, модели — приоритеты по стабильности и предсказуемости.

---

## ✅ Уже сделано в этой сессии

| Область | Изменение |
|--------|-----------|
| **Геймплей** | В `useGamePhysics` delta ограничивается через `safeDeltaTime(..., SAFETY_CONFIG.MAX_DELTA_TIME)` — единый лимит с GameLoopRunner. |
| **Модели** | В ToonSperm при unmount вызывается `tailGeometry.dispose()` для геометрии хвоста (не из пула). |
| **Типы/рендер** | ComicTopBar: во всех путях useEffect возвращается значение (return undefined). PostProcessing: возврат типизирован как React.ReactElement. VolumetricGodRays: проверка `ray` перед доступом. UnifiedAudioManager: используется EVENT_TO_SFX при обработке system:play-sound. |

---

## 1. Движок и геймплей

### 1.1 Сброс аккумулятора физики при паузе/возобновлении ✅ (2026-03-08)
- **Где:** `PhysicsStabilizer`, вызов при переходе в PAUSED / из PAUSED.
- **Что:** При долгой паузе `accumulator` может накопить большое значение; при возобновлении возможен «рывок» из нескольких подшагов подряд.
- **Сделано:** В `GameLoopRunner` в `useEffect` по `status` вызывается `getPhysicsStabilizer().resetAccumulator()` при переходе в PAUSED и при переходе в PLAYING (старт/возобновление).

### 1.2 Единый источник правды для «готовности» игры ✅ (2026-03-08)
- **Где:** App.tsx (ready, loadingComplete), PostProcessing (isReady), RenderController.
- **Что:** Несколько флагов готовности могут расходиться.
- **Сделано:** В store (UISlice) добавлен `gameSceneReady` и `setGameSceneReady`. App выставляет флаг при `ready && loadingComplete`; PostProcessing использует `gameSceneReady` в условии `skipEffects`.

### 1.3 Throttle обновления TrackSystem
- **Где:** TrackSystem.update() — уже есть throttle 16 ms.
- **Статус:** Реализовано, при необходимости можно вынести интервал в константу (например GAMEPLAY_CONFIG.TRACK_UPDATE_MS).

---

## 2. Рендер и графика

### 2.1 Пост-обработка: условное отключение тяжёлых эффектов ✅ (2026-03-08)
- **Где:** PostProcessing.tsx — SSAO, DepthOfField, Bloom всегда включены при игре.
- **Сделано:** Чтение `getPerformanceManager().getCurrentQuality()`; SSAO и DoF отключены при `QualityLevel.LOW` или при `isLowEnd` (слабый GPU). Bloom остаётся с пониженными intensity/radius на слабых устройствах.

### 2.2 LOD для декора и препятствий
- **Где:** BiomeDecorRenderer, InstancedLevelObjects, VirusObstacles.
- **Что:** Все инстансы рендерятся с одной детализацией независимо от расстояния.
- **Действие:** На низком качестве уменьшать count видимых инстансов по дистанции или использовать более простые геометрии для дальних объектов (если появится LOD-пул).

### 2.3 Один draw call для одного типа инстансов
- **Где:** Уже используется InstancedMesh для трека, стен, декора, объектов.
- **Статус:** Оптимально. Следить, чтобы при изменении качества не ломать count/матрицы (LOD_CONFIG.TRACK_CHUNKS не менять — зафиксировано).

---

## 3. Модели и геометрия

### 3.1 Правило dispose при unmount ✅ (2026-03-08)
- **Где:** Любой компонент, создающий `BufferGeometry` или `Material` вне GeometryPool.
- **Сделано:** Добавлен cleanup в VeinTunnel (geo + material), SpermModel3D (traverse scene, dispose geometry/material у каждого Mesh), DNABackground (release barGeo/sphereGeo, dispose barMat/redMat/blueMat), BiologicEnemiesRenderer (release eyeGeo/pupilGeo, dispose faceMat/pupilMat). ToonSperm, ParticleTrail, DynamicEvents, BioInfiniteTrack, VirusObstacle уже имели dispose/release.

### 3.2 Пул материалов для инстансов
- **Где:** InstancedLevelObjects, VirusObstacles — материалы создаются в useMemo.
- **Что:** При смене биома/настроек материалы пересоздаются.
- **Действие:** По возможности переиспользовать материалы (по типу объекта/биому) и не создавать новые без необходимости.

### 3.3 ToonSperm: геометрия глаз
- **Где:** ToonSperm — глаза через `<sphereGeometry args={[...]} />` (декларативно), R3F создаёт геометрию сам.
- **Статус:** Обычно R3F сам dispose при unmount. При переходе на ручное создание геометрии — добавить dispose в cleanup.

---

## 4. Производительность и память

### 4.1 Ограничение размера логов метрик
- **Где:** PerformanceManager — metricsLog, fpsHistory.
- **Статус:** Уже есть лимит и экстренная очистка. Проверить при длительной игре (30+ мин).

### 4.2 Отписка от eventBus при unmount ✅ (2026-03-08)
- **Где:** Компоненты и менеджеры (UnifiedAudioManager, PostProcessing, и т.д.), подписавшиеся на eventBus.
- **Сделано:** ComicPopupSystem и Player уже отписываются в useEffect cleanup. UnifiedAudioManager при init() вешает beforeunload → destroy(), в destroy() вызывается stopListening() (eventBusUnsubs).

### 4.3 TexturePreloader ✅ (2026-03-08)
- **Где:** Предзагрузка текстур при старте.
- **Сделано:** TextureManager при ошибке загрузки кэширует fallback (createFallbackTexture); все текстуры из кэша освобождаются в dispose(). В TextureLoader/TexturePreloader добавлены комментарии. TTL/лимит кэша не вводились — текущая схема достаточна.

---

## 5. Стабильность и предсказуемость

### 5.1 Валидация позиции игрока
- **Где:** Player.tsx / колбэк позиции из физики.
- **Статус:** Уже есть проверка isFinite и сброс к безопасным значениям. Сохранять при любых новых путях обновления позиции.

### 5.2 Числовая валидация в store
- **Где:** sessionSlice, gameplaySlice — score, distance, lives, timers.
- **Действие:** При необходимости добавить санитизацию (isValidNumber, clamp) в редьюсерах для критичных полей, чтобы не записывать NaN/Infinity.

### 5.3 Браузер: вкладка/фокус
- **Где:** useBrowserStability — при скрытии вкладки пауза, при показе — возобновление с задержкой.
- **Статус:** Реализовано. При добавлении новых глобальных подписок (resize, visibility) — добавлять и очистку в unmount.

---

## 6. Приоритеты внедрения

| Приоритет | Задача | Оценка риска |
|-----------|--------|----------------|
| Высокий   | Сброс аккумулятора физики при паузе/старте ✅ | Низкий |
| Высокий   | Условное отключение SSAO/DoF на низком качестве | Низкий |
| Средний   | Единый флаг готовности сцены (gameSceneReady) | Средний |
| Средний   | Аудит dispose/release геометрий и материалов | Низкий |
| Низкий    | LOD для декора по дистанции | Средний |
| Низкий    | Пул/переиспользование материалов инстансов | Низкий |

---

## 7. Связанные документы

- `docs/STABILITY_REVIEW.md` — обзор стабильности геймплея, графики, рендера, моделей.
- `docs/ROAD_AND_ENVIRONMENT_STABILITY.md` — текстуры дороги и окружения, стабильность генерации.
- `docs/GAMEPLAY_SCREENSHOTS_ANALYSIS.md` — анализ скриншотов геймплея и правки UI.
