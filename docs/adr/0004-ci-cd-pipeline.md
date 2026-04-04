# ADR-0004: CI/CD Pipeline — GitHub Actions

**Статус:** Прийнято (чернетка v2.5)  
**Дата:** 2026-04-04  
**Автори:** Архітектурна команда ToLOVERunner  
**Версія проекту:** v2.4.1 → v2.5+

---

## Контекст

Станом на v2.4.1 проект **не має** `.github/workflows/` — CI запускається вручну або через зовнішні системи. ADR-0001 задокументував бажаний порядок команд (`type-check → lint → security:audit → test → test:e2e`), але без автоматизованого пайплайну.

Для v2.5 необхідно:
- Автоматична перевірка кожного PR перед мержем
- Preview-деплой для дизайн-ревью (без доступу до prod-секретів)
- Prod-деплой тільки після мержу в `main`

---

## Проблема

- Відсутність CI дозволяє мержити PR із TypeScript-помилками або зламаними тестами
- Немає preview-середовища для ревью нових біомів і мультиплеєрного UI
- Prod-деплой виконується вручну — ризик випадкового деплою непротестованого коду

---

## Рішення: Базовий GitHub Actions пайплайн

### Стадії пайплайну

```
PR відкрито / commit pushed
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  JOB: quality                                                         │
│  ├── type-check   (tsc --noEmit)                                      │
│  ├── lint         (eslint .)                                          │
│  └── security     (npm audit --audit-level=high)                      │
└───────────────────────────────────────────────────────────────────────┘
        │ success
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  JOB: test                                                            │
│  ├── unit         (vitest run)                                        │
│  └── integration  (vitest run tests/integration)                      │
└───────────────────────────────────────────────────────────────────────┘
        │ success
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  JOB: e2e                                                             │
│  └── playwright   (npm run test:e2e)                                  │
└───────────────────────────────────────────────────────────────────────┘
        │ success
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  JOB: build                                                           │
│  └── vite build   (npm run build:prod)                                │
└───────────────────────────────────────────────────────────────────────┘
        │         │
        │ PR      │ push to main
        ▼         ▼
  deploy:preview  deploy:prod
```

---

### Файл: `.github/workflows/ci.yml` (шаблон)

```yaml
name: CI / CD

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  quality:
    name: Quality checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run security:audit

  test:
    name: Unit & Integration tests
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration

  e2e:
    name: E2E tests (Playwright)
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build:prod
      - run: npm run test:e2e

  build:
    name: Production build
    needs: e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run build:prod
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  deploy-preview:
    name: Deploy preview
    needs: build
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      # Підставити власний деплой-провайдер (Vercel / Netlify / Firebase Hosting)
      - name: Deploy to preview
        run: echo "Deploy dist/ to preview environment"

  deploy-prod:
    name: Deploy production
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy to production
        run: echo "Deploy dist/ to production environment"
```

---

## Стратегія гілок

| Гілка | Тригер | Деплой |
|---|---|---|
| `feature/*` | PR → develop | preview (опційно) |
| `develop` | push | preview (обов'язково) |
| `main` | PR merged | production |

---

## Обмеження та правила

1. **Кожен job незалежний** — матриця Node versions опційна (додати в v2.5-1).
2. **Секрети** (API keys, деплой токени) — тільки через GitHub Environments з обов'язковим review для production.
3. **`cancel-in-progress: true`** — скасовує старі запуски при новому push у той самий PR (економія CI-хвилин).
4. **Playwright** завжди білдить перед запуском — не використовує `vite dev` у CI.
5. **Security scan** — окремий job, що не блокує при `npm audit` рівень lower (тільки high+critical).

---

## Альтернативи, що розглядались

| Варіант | Причина відхилення |
|---|---|
| GitLab CI | Проект на GitHub |
| CircleCI | Платний при великому обсязі; GitHub Actions включено в план |
| Турбореп + Nx | Надмірна складність для single-app репозиторію |

---

## Наслідки

- ✅ Кожен PR автоматично перевіряється: type-check, lint, tests, e2e, build
- ✅ Preview-деплої для дизайн і функціонального ревью
- ✅ Prod-деплой — тільки з `main`, з manual approval через GitHub Environments
- ⚠️ Потрібно додати `.github/workflows/ci.yml` із реальними deploy-командами під провайдера
- ⚠️ E2E-тести на CI потребують `playwright.config.ts` з `webServer` секцією (описано в ADR-0001)

---

## Перегляд

Перегляд планується при: додаванні matrix-тестування (Node 18/20/22), впровадженні Docker-контейнерів або переході на окремий backend для multiplayer.
