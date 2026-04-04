# Отчёт: старт проекта и поиск проблем

**Дата:** 31.01.2026  
**Проект:** ToLOVERunner v2.2.0

---

## Старт проекта — успешно

- **Dev-сервер:** `npm run dev` — запущен
- **URL:** http://localhost:3000/
- **Сеть:** http://192.168.31.89:3000/
- **Зависимости:** `npm install` — без уязвимостей (0 vulnerabilities)
- **Сборка Vite:** успешна (Vite v6.4.1, ~4.3 с)

---

## Найденные проблемы

### 1. TypeScript (`npm run type-check`) — **~95 ошибок**

Сборка Vite проходит (esbuild не проверяет типы), но `tsc --noEmit` падает. Ошибки по категориям:

| Категория | Примеры файлов | Что делать |
|-----------|----------------|------------|
| **Неиспользуемые переменные/параметры** | AssetShowcase, DebugHitboxVisualizer, DustClouds, ParticleTrail, SpeedLines, StabilizedEffects, ComicVFX, OptimizedOrganicMaterial, OutlineHull, StableErrorBoundary и др. | Удалить или переименовать в `_name` (например `_delta`, `_time`) |
| **`possibly undefined` / `possibly 'undefined'`** | EnhancedControls (touch), ParticleTrail (particle), HorizontalMotionLines, StabilizedEffects (offset), PlayerInput, LaneMarkers, GestureManager, PatternIntegrator, EnemyPoolManager, BakedTextureGenerator и др. | Добавить проверки или non-null assertion (`!`) где допустимо |
| **`string \| undefined` не assignable to `string`** | Reporting.tsx, GameOverScreen, VictoryScreen, SaveManager, I18nManager, BakedTextureGenerator | Гарантировать строку (default `''` или проверка) |
| **Неправильные типы/свойства** | AssetShowcase: `makeDefault` (должно быть `makeDefault` в R3F?), PatternDebugPanel: `isInitialized`, usePatternGeneration: `ObjectType`, `GameObject.properties`, PatternIntegrator: `ObstacleType`, `ObstaclePattern \| null` | Привести к актуальным типам/API (R3F, store, core types) |
| **Duplicate identifier** | `constants/ToonMaterial.tsx` — `color` объявлен дважды | Убрать дублирование |
| **ReactNode / Element** | PatternDebugPanel, PatternVisualizer, PostProcessing — `unknown` или `undefined` в JSX | Типизировать как `ReactNode` или обеспечить не-undefined |
| **Аргументы функций** | UnifiedAudioManager, GraphicsStabilizer — `number | undefined` / `QualityLevel | undefined` в параметры, ожидающие не-undefined | Проверки или значения по умолчанию |

Критичные для стабильности и типов:

- `core/patterns/PatternIntegrator.ts` — типы `ObstacleType`, `ObjectType`, `lane` undefined
- `core/patterns/ObstaclePatternGenerator.ts` — `selectedPattern` undefined, тип `ObstaclePattern | null`
- `core/world/hooks/usePatternGeneration.ts` — `ObjectType`, `GameObject.properties`
- `constants/ToonMaterial.tsx` — дубликат `color`
- `components/Debug/PatternDebugPanel.tsx` — отсутствует `isInitialized` в типе системы паттернов
- `components/Debug/AssetShowcase.tsx` — `makeDefault` для PerspectiveCamera (R3F API)

### 2. ESLint — ошибки и предупреждения

- **Устаревшие комментарии:** `/* eslint-env */` в flat config не поддерживаются (PerformanceManager.ts, generate-ssl-cert.js, App.integration.test.tsx). Заменить на `/* global */` или описать globals в `eslint.config.js`.
- **no-unused-vars:** совпадают с TS (неиспользуемые импорты/параметры).
- **react-hooks:** использование refs в render (DustClouds), вызов нечистой функции в render (ComicVFX — `Date.now()`), обращение к `loadPatterns`/`loadStats` до объявления (PatternVisualizer).
- **no-case-declarations:** DynamicAudio.tsx — объявление переменной в `case` без блока `{}`.
- **react-refresh/only-export-components:** DynamicAudio — экспорт не только компонентов.

### 3. Рекомендации по приоритету

1. **Быстро (чтобы type-check проходил):**
   - Исправить `constants/ToonMaterial.tsx` (дубликат `color`).
   - В ключевых модулях паттернов (`PatternIntegrator`, `ObstaclePatternGenerator`, `usePatternGeneration`) привести типы и проверки на `undefined`/`null`.
   - В `PatternDebugPanel` — либо добавить `isInitialized` в тип/контракт системы паттернов, либо убрать использование.

2. **Средний приоритет:**
   - Массово почистить неиспользуемые переменные (префикс `_` или удаление).
   - Добавить проверки/дефолты для `string | undefined` и `possibly undefined` в UI и core (Reporting, GameOverScreen, VictoryScreen, SaveManager, BakedTextureGenerator, GestureManager, EnemyPoolManager и т.д.).

3. **Ниже приоритет:**
   - Рефакторинг React (DustClouds — refs не в render; ComicVFX — вынести `Date.now()` в state/effect; PatternVisualizer — порядок объявления `loadPatterns`/`loadStats` и зависимости useEffect).
   - Заменить `eslint-env` и поправить ESLint-предупреждения.

---

## Как воспроизвести проверки

```powershell
cd e:\toloverunner
npm install
npm run type-check   # TypeScript
npm run lint         # ESLint
npm run dev          # Dev-сервер http://localhost:3000/
```

---

## Итог

- Проект **запускается**, игра доступна в браузере по http://localhost:3000/.
- **Проблемы:** множество ошибок TypeScript и часть ошибок/предупреждений ESLint. Их исправление улучшит надёжность и поддержку кода; для текущего запуска и игры они не блокируют сборку Vite.
