# Слабые места и дыры в реализации

**Дата:** 2026-02-22  
**Обновлено:** 2026-03-08 (план «Дубли и дыры», далее «дальше»)  
**Цель:** Анализ архитектурных пробелов, рисков и проблемных участков кода.

---

## Закрыто (2026-03-08)

| Пункт | Решение |
|-------|--------|
| 1.1 HitStopManager | Уже реализован `destroy()` с `removeEventListener`. |
| 1.1 UnifiedAudioManager | Добавлены `stopListening()`, `destroy()`, хранение отписок в `eventBusUnsubs`. |
| 1.1 StabilityManager | В `stop()` снимаются слушатели (в т.ч. webglcontextlost/restored), retry-таймер; при retry используются те же обработчики. |
| 1.2 setTimeout в store | Используются `pendingGameplayTimeouts` и `clearPendingGameplayTimeouts` в `resetGame`. |
| 2.1 ComicPopupSystem | Аллокации убраны: мутация position/velocity in-place в useFrame. |
| 2.2 Player.tsx | В эффекте с eventBus зависимости уже пустые `[]` — переподписок нет. |
| 3.2 Мутация LOD_CONFIG | Настройки вынесены в экземпляр PerformanceManager, добавлен `getDrawDistance()`. |
| 4.1 Пустой catch в тестах | В `App.integration.test.tsx` добавлено `console.warn` в catch. |
| 4.2 CollisionWorkerClient | При успешном ответе воркера вызывается `clearTimeout(req.timeoutId)`. |
| 5.1 ResourceManager pooling | TODO заменён на комментарий со ссылкой на этот документ. |
| 5.1 PlayerPhysics тесты | Описание обновлено: покрытие integration/e2e, см. п. 5.1. |
| 5.2 Canvas retry | Проверено: при retry вешаются те же `webglContextLostHandler`/`webglContextRestoredHandler`; в `stop()` снимаются с `this.canvasElement`. Комментарий в коде добавлен. |
| 6.1 Валидация в store | В gameplaySlice и sessionSlice используются `safeClamp`/`safeNumber` для score, distance, lives, combo. |
| 3.1 BioInfiniteTrack | Введены типы `OrganicRoadMaterialType`, `MaterialWithDithering`, `MaterialWithCurvatureUniform`; доступ к uniforms и dithering через типизированные приведения. |

---

## 1. Жизненный цикл и очистка ресурсов

### 1.1 Синглтоны без отписки от событий

| Компонент | Проблема | Риск |
|-----------|----------|------|
| **HitStopManager** | `addEventListener('player-hit')`, `addEventListener('hit-stop')` — никогда не вызывается `removeEventListener` | При HMR, тестах или пересоздании приложения слушатели остаются. Дублирование при повторной инициализации. |
| **UnifiedAudioManager** | `eventBus.on(...)` в `startListening()` — нет `eventBus.off` при destroy | Синглтон живёт всё время, но при пересоздании — дублирование подписок. |
| **StabilityManager** | `addEventListener('error'|'unhandledrejection'|'webglcontextlost'|'webglcontextrestored')` — в `stop()` не удаляются | При `destroyStabilityManager()` интервалы очищаются, но слушатели остаются. Утечка памяти (замыкания держат экземпляр) и возможные дубли при повторной инициализации. |

**Рекомендация:** В `stop()` / `destroy()` явно вызывать `removeEventListener` для всех добавленных обработчиков. Сохранять ссылки на функции-обработчики, чтобы снимать те же самые.

---

### 1.2 setTimeout/setInterval в store без отмены

**Файл:** `store/gameplaySlice.ts`

```ts
setTimeout(() => set({ isInvincible: false }), 2500);
setTimeout(() => set({ status: GameStatus.GAME_OVER }), 1000);
setTimeout(() => set({ isDashing: false }), 400);
setTimeout(() => set({ isInvincible: false }), 600);
```

**Проблема:** Таймеры не отменяются при смене сцены, рестарте игры или unmount. Отложенный `set()` выполнится позже и обновит store в неактуальном контексте.

**Риск:** Race condition: новая игра уже идёт, старый таймер сбрасывает `isInvincible` или `status` в неожиданный момент.

**Рекомендация:** Хранить ID таймеров в store или в отдельном менеджере и вызывать `clearTimeout` при `resetGame`, `startNewGame`, переходе в меню и т.п.

---

## 2. Производительность и аллокации

### 2.1 ComicPopupSystem — тяжёлые аллокации в useFrame

**Файл:** `components/Effects/ComicPopupSystem.tsx`

```ts
let next = prev.map(p => ({
    ...p,
    position: p.position.clone().add(p.velocity.clone().multiplyScalar(delta)),
    velocity: p.velocity.clone().setY(p.velocity.y - delta * 10)
})).filter(...)
```

**Проблема:** На каждый кадр создаётся много `Vector3` через `.clone()`, что даёт нагрузку на GC.

**Рекомендация:** Мутировать `position` и `velocity` in-place или переиспользовать объекты (например, через ref/пул).

---

### 2.2 Player.tsx — лишние переподписки на eventBus

**Файл:** `components/World/Player.tsx`

```ts
useEffect(() => {
    const unsubs = [eventBus.on(...), ...];
    return () => unsubs.forEach(unsub => unsub());
}, [isInvincible, lives, isSpeedBoostActive, isImmortalityActive, activeCharType]);
```

**Проблема:** В колбэке эти зависимости не используются. При каждом изменении `lives`, `isInvincible` и т.д. эффект перезапускается, старые подписки снимаются, новые создаются.

**Рекомендация:** Убрать неиспользуемые зависимости или вынести их в ref, если нужны только актуальные значения при вызове.

---

## 3. Типизация и небезопасные приведения

### 3.1 Использование `as any`

| Файл | Строка | Контекст |
|------|--------|----------|
| VirusObstacle.tsx | 110 | `(BIOME_CONFIG as any)[biome]` — отсутствует типизация биома |
| BioInfiniteTrack.tsx | 128, 187 | `(organicMaterial as any).uniforms` — доступ к внутренним uniforms |
| PerformanceManager.ts | — | Закрыто: настройки в экземпляре, `getDrawDistance()`. |
| WorldBendingShader.ts | 45 | `material as any` — патчинг материала |
| CurvedWorldEffect.tsx | 27, 31, 79 | `(material as any).onBeforeCompile` |
| Procedural.ts | 144, 168 | `(TYPE_MAP_KEYS as any)[item.type]` |

**Риски:** Хрупкость при рефакторинге, отсутствие проверок типов, возможные runtime-ошибки при изменении структур.

---

### 3.2 Мутация shared config

**Файл:** `infrastructure/performance/PerformanceManager.ts`

```ts
(LOD_CONFIG as any).DRAW_DISTANCE = settings.drawDistance;
```

**Проблема:** Прямое изменение `LOD_CONFIG` влияет на общее поведение. Лучше хранить настройки в экземпляре менеджера или в отдельном конфиге и передавать их явно.

---

## 4. Обработка ошибок

### 4.1 Пустой catch

**Файл:** `tests/integration/App.integration.test.tsx`

```ts
} catch (e) { }
```

**Проблема:** Ошибки полностью игнорируются, затрудняют отладку.

**Рекомендация:** Хотя бы логировать ошибку или использовать `expect` для проверки.

---

### 4.2 CollisionWorkerClient — таймаут при включённом worker

**Файл:** `core/physics/CollisionWorkerClient.ts`

Worker сейчас отключён (`this.worker = null`). При включении:

- `timeoutId` создаётся, но не очищается при успешном ответе worker;
- при resolve из worker `pending.delete(id)` удаляет запись, но `clearTimeout(timeoutId)` не вызывается.

**Рекомендация:** При успешном ответе вызывать `clearTimeout(req.timeoutId)` перед удалением из `pending`.

---

## 5. Незавершённые и неактуальные части

### 5.1 TODO / нереализованный функционал

| Файл | Описание |
|------|----------|
| `core/resources/ResourceManager.ts` | `// TODO: Implement pooling if needed` — пул не реализован |
| `tests/core/physics/PlayerPhysics.test.ts` | `// TODO: PlayerPhysics is now a React component, needs different testing approach` — тесты не обновлены |

---

### 5.2 Canvas в StabilityManager — retry без очистки

**Файл:** `infrastructure/stability/StabilityManager.ts`

При отсутствии canvas при инициализации вызывается `setTimeout(..., 2000)` для повторной попытки. Если canvas найден, добавляются слушатели. Обработчики создаются в замыкании, ссылки на них не сохраняются, поэтому при `stop()` их невозможно снять.

**Рекомендация:** Сохранять ссылки на обработчики и при `stop()` вызывать `removeEventListener` для всех добавленных слушателей (включая retry-путь).

---

## 6. Валидация данных

### 6.1 Store — отсутствие валидации числовых полей

**Файл:** `store/gameplaySlice.ts`, `store/sessionSlice.ts`

`score`, `distance`, `lives`, `combo` и др. обновляются без проверки `isFinite`, `NaN`, `Infinity`.

**Риск:** При некорректных расчётах или багах в физике/UI могут попасть невалидные значения, что приведёт к нестабильному поведению и отображению.

**Рекомендация:** Хелперы вида `clamp(value, min, max)` и `isValidNumber(value)` в редьюсерах для критичных полей.

---

## 7. Сводка по приоритетам (актуальные открытые пункты)

Все пункты из предыдущей сводки на 2026-03-08 закрыты (см. таблицу «Закрыто» выше).

| Приоритет | Проблема | Действие |
|-----------|----------|----------|
| Низкий | 3.1 Оставшиеся приведения (CurvedWorldEffect, WorldBendingShader, Procedural при необходимости) | Типизировать по мере рефакторинга |
| Низкий | ResourceManager pooling | Реализовать при необходимости или оставить как бэклог |
| Низкий | PlayerPhysics тесты | Обновить под React-компонент при изменении физики |

---

## 8. Связанные документы

- `docs/SECURITY_AND_PERFORMANCE_AUDIT.md` — уязвимости и производительность
- `docs/IMPROVEMENTS_BACKLOG.md` — бэклог улучшений
