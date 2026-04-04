# ESLint Baseline Report

**Дата:** 2026-03-08  
**Версия проекта:** 2.4.0  
**Цель:** Базовый отчёт по линтингу и классификация P0/P1 для пошагового снижения долга.

---

## Классификация ошибок (P0 / P1)

### P0 — Критические (блокеры сборки/типов)

| Правило | Описание | Действие |
|--------|----------|----------|
| `@typescript-eslint/no-unsafe-*` | Небезопасное использование any, вызовы, присваивания | Исправить до merge |
| Ошибки парсера TypeScript | Синтаксис / неразрешённые модули | Исправить немедленно |
| `no-undef` | Использование необъявленных переменных | Исправить до merge |
| `react-hooks/exhaustive-deps` (error) | Неполные зависимости хуков → баги рантайма | Исправить в критичных путях |

### P1 — Важные (качество, предсказуемость)

| Правило | Описание | Действие |
|--------|----------|----------|
| `@typescript-eslint/no-unused-vars` | Неиспользуемые переменные/аргументы | Исправлять по модулям, префикс `_` для намеренно неиспользуемых |
| `@typescript-eslint/no-explicit-any` | Явное использование `any` | Понижать до конкретных типов по приоритету |
| `no-empty` (без allowEmptyCatch) | Пустые блоки | Заполнить или явно разрешить |
| `react-refresh/only-export-components` | Экспорт не-компонентов из файлов с компонентами | Вынести константы/утилиты или пометить allowConstantExport |

### P2 — Желательные (стиль, долг)

- `no-console` — по текущей конфигурации выключен; при включении — заменить на logger.
- Остальные рекомендации TypeScript/ESLint — исправлять по спринтам.

---

## Приоритет модулей для снижения долга

1. **core/** — физика, трек, утилиты (критичный путь исполнения).
2. **store/** — состояние игры (предсказуемость данных).
3. **components/** — UI и мир (начиная с World, System, затем UI).

---

## Как собирать отчёт

```bash
# Полный отчёт (сохранить в файл)
npm run lint -- --format json -o docs/reports/eslint-report.json

# Только core, components, store
npx eslint core components store --format stylish

# Количество ошибок по правилам
npx eslint . --format json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const r={}; d.forEach(f=>f.messages.forEach(m=>{ r[m.ruleId]=r[m.ruleId]||0; r[m.ruleId]++; })); console.log(JSON.stringify(r,null,2));"
```

---

## Текущая конфигурация (выдержка)

- **Парсер:** `@typescript-eslint/parser` с `project: ./tsconfig.eslint.json`
- **Плагины:** react-hooks, react-refresh, @typescript-eslint
- **Игнор:** dist, node_modules, server, scripts
- **Строгие правила:** no-unused-vars (error), no-explicit-any (warn), no-empty (error с allowEmptyCatch)

## Жёсткий минимум (quality gate)

- **Ошибки ESLint:** 0 по всему проекту (P0 не допускаются; P1 целятся в 0).
- **Предупреждения:** временно допускаются только в некритичных местах (UI-косметика); в `core/`, `store/`, `components/World` — не допускаются.
- **CI:** `npm run lint` должен завершаться с кодом 0 при мердже в main/develop.

## Связь с TS-baseline

- После устранения P0 TypeScript (см. [ts-baseline-20260308.md](./ts-baseline-20260308.md)) прогон `npm run type-check` должен проходить без ошибок.
- Сводку по количеству P0/P1 по файлам рекомендуется добавлять после каждого полного прогона `npm run lint -- --format json -o docs/reports/eslint-report.json`.

## Пошаговое снижение долга (очередь)

1. Запустить `npx eslint core --max-warnings 0` и исправить все P0/P1 в `core/`.
2. Затем `npx eslint store --max-warnings 0`, затем `components/World`, `components/System`, `components/UI`.
3. После каждого модуля обновлять этот файл (количество ошибок до/после).

---

## Текущий статус (core) — 2026-03-08

- **Ошибки:** 0 (P0 в core устранены; в т.ч. DynamicAudioManager — неиспользуемые параметры в `catch` исправлены).
- **Предупреждения:** снижены: ObjectPool (navigator → Navigator & { deviceMemory? }), BatchManager (userData → unknown), HitStopManager (hit-stop → расширение Window). Остаются `no-explicit-any` в: AccessibilityManager, EnemyFactory, EnemyPoolManager, GraphicsStabilizer, LevelGenerator, ObstacleSequences, RouteMarker, AdvancedPerformanceMonitor, SaveManager, CollisionWorkerClient, collisionWorker.
- **Рекомендация:** Для прохождения `npx eslint core --max-warnings 0` либо заменить `any` на конкретные типы в критичных путях (physics, collision, level-generation), либо временно поднять лимит предупреждений в CI до фактического значения и снижать по спринтам (см. очередь выше).

## Текущий статус (store) — 2026-03-08

- **Ошибки:** 0.
- **Предупреждения:** 0 после правки. Тип `takeDamage` расширен до `obj?: { type?: string | number }`, удалён `as any` в `gameplaySlice.ts` (проверка VIRUS_KILLER по строке и по числу 13).
- **Команда:** `npx eslint store --max-warnings 0` — проходит.

## Текущий статус (components) — 2026-03-08

- **Ошибки:** 0 (P0 устранены). В `ToonSperm.tsx` исправлено `no-undef`: вместо глобального `THREE` добавлен импорт `Material` из `three` и приведение типа `(material as Material).opacity`.
- **Предупреждения:** после `eslint --fix` и ручных правок — ~48 (было ~60). Устранены: неиспользуемые eslint-disable (автофикс); в **World** заменены `any` на типы: WorldBendingShader (ShaderObject, PatchableMaterial), BiologicEnemiesRenderer (пул и obj.type), VolumetricGodRays (position/rotation/scale), VirusObstacle (ref: MutableRefObject<InstancedMesh | null>); в **UI/HUD** типизированы селекторы store (GameState) в ComboIndicator, ComicHealthDisplay; в **player** — nucleusMatRef тип вместо any.
- **Команда:** `npx eslint components --max-warnings 0` — пока не проходит; снижать дальше по очереди: System → UI (Input, Debug, остальные HUD).
- **Доп. правки (далее):** System — OutlinesShim (OutlinesProps, типизация mod), RenderDebugger (window __RENDER_DEBUGGER__, gl.domElement); UI/HUD — ComicScoreCounter, JumpPopup (CustomEvent), PerfectTimingIndicator, TopPanel (GameState), LobbyPopups (CSSProperties); Debug — AssetShowcase (CharacterType), PatternDebugPanel (unknown); player — ToonNucleusMaterial (R3F intrinsic); Input — EnhancedControls (gamepad vibrationActuator тип). Оставшиеся предупреждения: EnhancedControls (handler casts для inputManager.on/off), react-hooks/exhaustive-deps, react-refresh/only-export-components.
