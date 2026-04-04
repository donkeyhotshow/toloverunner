# TypeScript Baseline — 2026-03-08

**Цель:** Зафиксировать состояние после устранения P0/P1 блокеров и задать очередь дальнейших исправлений.

## Классификация

- **P0:** Ошибки компиляции (`tsc --noEmit`) в `core/`, `store/`, `components/` — блокируют сборку.
- **P1:** Избыточные `any`/небезопасные приведения в горячих путях (physics, collision, networking).

## Выполненные исправления (2026-03-08)

1. **store/storeTypes.ts** — добавлены `slowDown`, `bacteriaJumpBonus`, сигнатура `takeDamage(obj?)`.
2. **core/level-generation/index.ts** — переход на `export type` для типов (isolatedModules), исправлен default export.
3. **core/level-generation/LevelSeedSystem.ts** — параметр конструктора `streamId`, удалено неиспользуемое поле `stream`, добавлен `seedsCacheSize` для использования `_seeds`.
4. **core/level-generation/DifficultyProgression.ts** — удалены неиспользуемые константы.
5. **core/assets/TextureOptimizer.ts** — типы Three.js: `ColorSpace`, `MagnificationTextureFilter`, `TextureDataType`.
6. **core/enemies/EnemyPoolManager.ts** — fallback тип `EnemyType`: `'GLOBUS_VULGARIS'` вместо `'virus'`.
7. **core/physics/** — неиспользуемые параметры/поля: префикс `_`, удаление или геттеры; сравнение с `ObjectType.BACILLUS_MAGNUS` через приведение.
8. **core/pooling/ParticlePool.ts** — обновление атрибутов через проверку наличия.
9. **core/utils/dataUtils.ts** — типизация `omit`: `Record<string, unknown>` при удалении ключей.
10. **components/World/PostProcessing.tsx** — дочерние элементы `EffectComposer` как массив `React.ReactElement[]`.
11. **components/World/BioInfiniteTrack.tsx** — сравнения по `BiomeType`, приведение для `uCurvature`.
12. **components/UI/common/ComicButton.tsx, ComicPanel.tsx** — разделённый рендер: при `animated` используется `motion.button`/`motion.div` с MotionProps, при `!animated` — нативный `button`/`div` с HTML-атрибутами (устраняет несовместимость `onDrag` и других motion-специфичных пропсов с типами DOM).
13. **components/Effects/CurvedWorldEffect.tsx** — тип материала с опциональным `onBeforeCompile`.
14. **UI HUD (GameOverScreen, PauseScreen, VictoryScreen)** — удалены неиспользуемые импорты иконок.
15. **infrastructure/performance/AdaptiveQualityManager.ts** — переименовано свойство в `_mobileOptimized`, исправлен дубликат идентификатора.
16. **infrastructure/network/GhostSystem.ts** — проверки на `null` для снимков, цикл без небезопасного доступа по индексу.
17. **hooks/useIntegratedPlayerSystems.ts**, **store/networkSlice.ts**, **scripts/simulate_tdi.ts** — удалены/заменены неиспользуемые импорты и переменные.

## Очередь (если появятся новые ошибки)

1. Прогнать `npm run type-check`, сохранить вывод в `docs/reports/ts-errors-YYYYMMDD.log`.
2. Все P0 исправлять до мерджа в main/develop.
3. P1 в `core/`, `store/`, `components/World` — по спринтам.

## Ссылки

- [ESLINT_BASELINE.md](./ESLINT_BASELINE.md) — классификация P0/P1 ESLint.
- [ADR 0001](../../adr/0001-stabilization-strategy.md) — стратегия стабилизации.
