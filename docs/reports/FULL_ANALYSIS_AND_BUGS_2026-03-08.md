# Полный анализ и список багов/проблем

**Дата:** 2026-03-08  
**Версия:** 2.4.0  
**Цель:** Сводный отчёт по состоянию кодовой базы, известным багам и рекомендациям.

---

## 1. Текущее состояние проверок

| Проверка | Результат |
|----------|-----------|
| **TypeScript** (`npm run type-check`) | ✅ Без ошибок |
| **Критические TS-ошибки** | ✅ Отсутствуют (ранее исправлены InstancedLevelObjects, constants, Reporting, TopPanel) |
| **Валидация в store** | ✅ Используются `safeClamp`/`safeNumber` для score, distance, lives, combo |
| **Таймеры в gameplaySlice** | ✅ `pendingGameplayTimeouts` + `clearPendingGameplayTimeouts` в resetGame |
| **StabilityManager stop()** | ✅ Снимает error/unhandledrejection/webglcontextlost/restored, очищает retry-таймер и интервалы |
| **HitStopManager / UnifiedAudioManager** | ✅ destroy() с removeEventListener / eventBus.off |
| **Мост play-sound** | ✅ В App.tsx: window `play-sound` → eventBus `system:play-sound` |
| **Магнит: исключение препятствий** | ✅ В useGamePhysics исключаются OBSTACLE_JUMP, OBSTACLE_SLIDE, OBSTACLE_DODGE и биологические типы |
| **ComicPopupSystem аллокации** | ✅ Исправлено: мутация position/velocity in-place |
| **PostProcessing SSAO/DoF** | ✅ Отключаются при QualityLevel.LOW и на слабых GPU |
| **CollisionWorkerClient** | ✅ При успешном ответе вызывается clearTimeout(req.timeoutId) |
| **Dispose при unmount** | ✅ Добавлено/расширено в VeinTunnel, SpermModel3D, DNABackground, BiologicEnemiesRenderer |

---

## 2. Известные баги и проблемы

### 2.1 Щит: визуал при блоке удара ✅ (исправлено 2026-03-08)

**Где:** `components/World/hooks/useGamePhysics.ts` (обработка столкновения с препятствием).

**Новая логика:**  
- Вычисляется `willTakeDamage` по состоянию бессмертия, неуязвимости, жизней и щита.  
- При столкновении препятствие всегда деактивируется и возвращается в пул.  
- Для иммунных клеток (`IMMUNE_CELL`) при `!willTakeDamage` по-прежнему вызывается `slowDown(0.5, 3000)` — замедление без урона.  
- `store.takeDamage(obj)` вызывается всегда (для единообразной статистики/стейта), но тяжёлые VFX завязаны на `willTakeDamage`:
  - **Если `willTakeDamage === true`:** применяется рекоил игрока, `screen-shake`, звук `enemy-hit`, событие `player-hit` и красный `particle-burst` (type: `hit`).  
  - **Если `willTakeDamage === false`:** отправляется мягкий `particle-burst` с цветом `#66CCFF` и type `shield-block`, а также звук `shield`; `player-hit`, `screen-shake` и рекоил **не** вызываются.

**Эффект:** При блоке щитом/бессмертием игрок больше не получает визуал реального удара; вместо этого показывается отдельный, мягкий эффект блока.

---

### 2.2 Прочие пункты из аудитов (низкий приоритет) — перенесены в бэклог

Пункты из старых аудитов, отмеченные как:
- «OptimizedGameLoop не используется (мёртвый код)»,
- «Интерполяция PhysicsStabilizer не используется для рендера»,
- «Оставшиеся приведения типов (as any/as unknown) в BioInfiniteTrack, VirusObstacle, Procedural и т.п.»,
- «Canvas в StabilityManager — retry без сохранения ссылок на обработчики»,
- TODO по RemotePlayer (GhostSystem), ResourceManager pooling, PlayerPhysics tests,

на текущий момент:
- **не приводят к ошибкам компиляции или падениям в рантайме**;
- либо уже отражены как архитектурные решения (например, минимальный рендер-флаг через `window.__TOLOVERUNNER_MINIMAL_RENDER__` и стабилизатор без интерполяции);
- либо зафиксированы как задачи развития в `docs/IMPROVEMENTS_BACKLOG.md` и `docs/WEAK_SPOTS_AND_IMPLEMENTATION_GAPS.md`.

Поэтому они считаются **бэклогом улучшений**, а не «известными багами». Для дальнейшей работы с ними следует опираться на указанные документы.

---

## 3. Документы WEAK_SPOTS — актуализация

Ряд пунктов в `docs/WEAK_SPOTS_AND_IMPLEMENTATION_GAPS.md` уже закрыт в коде, но в документе помечены как открытые. Рекомендуется обновить секции:

- **1.1** (HitStopManager, UnifiedAudioManager, StabilityManager): помечать как закрыто — destroy/stop с removeEventListener реализованы.
- **1.2** (setTimeout в store): закрыто — используются pendingGameplayTimeouts и clearPendingGameplayTimeouts.
- **2.1** (ComicPopupSystem): закрыто — аллокации убраны, мутация in-place.
- **3.2** (LOD_CONFIG): закрыто — настройки в экземпляре PerformanceManager.
- **4.1** (пустой catch в тестах): закрыто — добавлен console.warn в App.integration.test.
- **4.2** (CollisionWorkerClient): закрыто — clearTimeout при успешном ответе.
- **6.1** (валидация в store): закрыто — safeClamp/safeNumber.

Сводная таблица приоритетов в конце WEAK_SPOTS должна отражать только ещё открытые пункты (например, 5.2 Canvas retry, 3.1 оставшиеся `as any`, 5.1 ResourceManager pooling / PlayerPhysics тесты).

---

## 4. Рекомендуемые приоритеты исправлений

На момент 2026-03-08 **известных открытых багов в кодовой базе не зафиксировано** (TypeScript-сборка проходит, критических рантайм-проблем по аудитам нет).  
Дальнейшая работа — это развитие и полировка по бэклогу (`IMPROVEMENTS_BACKLOG.md`, `WEAK_SPOTS_AND_IMPLEMENTATION_GAPS.md`).

---

## 5. Связанные документы

- `docs/WEAK_SPOTS_AND_IMPLEMENTATION_GAPS.md` — слабые места (требует актуализации)
- `docs/IMPROVEMENTS_BACKLOG.md` — бэклог улучшений
- `docs/POORLY_IMPLEMENTED_AUDIT.md` — аудит плохо/неполно реализованного (часть пунктов уже исправлена)
- `docs/SECURITY_AND_PERFORMANCE_AUDIT.md` — безопасность и производительность
- `docs/reports/CRITICAL_ISSUES_SUMMARY.md` — критические проблемы (исправлены)
