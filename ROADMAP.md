# ToLOVERunner — Дорожня карта розробки

> **Поточна стабільна версія:** v2.4.1  
> **Документ оновлено:** 2026-04-04  
> **Архітектурна основа для v2.5+:** ADR-0003 (DDD), ADR-0004 (CI/CD)

---

## ✅ Завершено — v2.4.x

| Версія | Основні зміни |
|---|---|
| v2.4.0 | Бойова система, DNA-картки, 5 полос, ComicPopup |
| v2.4.1 | Рефакторинг `store/gameplaySlice` → 4 суб-модулі; `AppProviders`; розширені тести фізики; speed-drift smoke-тести |

---

## 🚧 v2.5 — Multiplayer & Biomes Expansion

### v2.5-0-alpha — Мульти-сейв і підготовка інфраструктури

**Ціль:** Стабільна база для мультиплеєрних і біом-функцій без ризику регресії.

- [ ] Впровадити `src/multiplayer/`, `src/biomes/`, `src/leaderboard/` (скелет вже готовий)
- [ ] Додати GitHub Actions CI/CD пайплайн (`.github/workflows/ci.yml`) за ADR-0004
- [ ] Налаштувати preview-деплой для PR-ревью
- [ ] Мульти-сейв: підтримка кількох save-слотів у `LocalLeaderboard` і persistence-слайсі
- [ ] Додати `@biomes/*`, `@multiplayer/*`, `@leaderboard/*` path aliases до `tsconfig.json`
- [ ] Виконати ADR-0003: перевірити відсутність циклічних залежностей між контекстами

**Критерії завершення:**
- CI зелений на main
- Мульти-сейв ручно протестовано
- Жодних нових TypeScript-помилок у `src/`

---

### v2.5-1 — Co-op Local (Локальний кооператив)

**Ціль:** Два гравці грають на одному пристрої (split-input, shared screen).

- [ ] `GameService.createSession()` → локальна сесія (без сервера)
- [ ] Другий набір керування (клавіші WASD + стрілки або геймпад 2)
- [ ] Рендеринг другого персонажа в тій самій сцені (shared Three.js world)
- [ ] Co-op score-таблиця: сума балів обох гравців + індивідуальний рейтинг
- [ ] Локальна таблиця лідерів (`LocalLeaderboard`) підтримує записи з 2 гравцями
- [ ] Новий біом: **Ovarian Labyrinth** (колір схема, спавн, музика)
- [ ] BiomeRenderer: `transition()` — реальний tweening кольорів через RAF

**Критерії завершення:**
- E2E тест: обидва персонажі рухаються, збирають монети, отримують бали
- Новий біом відображається коректно без FPS-просадок

---

### v2.5-2 — Server Sync (Серверна синхронізація)

**Ціль:** Онлайн co-op і глобальна таблиця лідерів.

- [ ] `AuthService`: реальний JWT/OAuth flow (backend API)
- [ ] `SyncClient`: WebSocket або WebRTC data channel (замінити stub)
- [ ] `RemoteLeaderboardAdapter.sync()`: реальний POST до API
- [ ] `RemoteLeaderboardAdapter.fetchGlobal()`: реальний GET з кешуванням
- [ ] Online matchmaking: join session за кодом кімнати
- [ ] Новий біом: **Bloodstream Rush** (high-speed zone, специфічні перешкоди)
- [ ] Виконати Matrix CI: Node 18 / 20 / 22

**Критерії завершення:**
- Два гравці на різних браузерах бачать рух один одного в реальному часі
- Глобальна таблиця лідерів оновлюється після завершення гри

---

## 🔮 v3.0 — Platform & Content Expansion

> **Попередній таймінг:** Q3–Q4 2026 (після стабілізації v2.5)

### v3.0-0 — Mobile First

- [ ] Touch-контролі (swipe up/down/left/right)
- [ ] PWA: offline mode, home screen install
- [ ] Адаптивний HUD для екранів < 400px
- [ ] Performance: target 60 FPS на mid-tier Android (Mali-G52)
- [ ] Asset streaming: lazy-load біом-текстури за потребою

### v3.0-1 — Season Pass & Live Ops

- [ ] Сезонні виклики (щотижнева ротація умов)
- [ ] Magasin DNA-карток: купівля нових карток за гени
- [ ] Achievements: 30 унікальних досягнень
- [ ] Аналітика: Firebase Analytics або власний event pipeline

### v3.0-2 — Narrative Mode

- [ ] Сюжетний режим: 12 рівнів із наративними карточками між ними
- [ ] Нові персонажі (4 нових тіпи з унікальними пасивками)
- [ ] Кінцева локація: **Egg Chamber** — boss-encounter
- [ ] Локалізація: EN / UK / DE / JP

---

## 📐 Архітектурні принципи для всіх версій

1. **Не ламати `core/`** — нові контексти (`src/`) взаємодіють із `core/` тільки через інтерфейси (ADR-0003).
2. **ADR для кожного великого рішення** — перед реалізацією, не після.
3. **CI green = merge** — жоден PR не мержиться без зеленого пайплайну (ADR-0004).
4. **Feature flags** — всі нові фічі v2.5+ вмикаються через `GAMEPLAY_CONFIG` або env variables, не через live code changes.
5. **Organic palette** — всі нові біоми дотримуються палітри ADR-0002.

---

## 🔗 Пов'язані документи

| Документ | Опис |
|---|---|
| [ADR-0001](docs/adr/0001-stabilization-strategy.md) | Стратегія стабілізації |
| [ADR-0002](docs/adr/0002-game-visual-gameplay-design.md) | Дизайн візуалу та геймплею |
| [ADR-0003](docs/adr/0003-ddd-refactor.md) | DDD розмежовані контексти |
| [ADR-0004](docs/adr/0004-ci-cd-pipeline.md) | GitHub Actions CI/CD пайплайн |
| [PROJECT_HEALTH_AUDIT_REPORT](docs/reports/PROJECT_HEALTH_AUDIT_REPORT.md) | Поточний стан здоров'я проекту |
