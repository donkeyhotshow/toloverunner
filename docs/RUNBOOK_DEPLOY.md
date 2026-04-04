# Runbook: развёртывание ToLOVERunner

**Версия:** 2.4.0  
**Цель:** Краткая инструкция по поднятию фронта и (при необходимости) game-server.

---

## 1. Переменные окружения

- Скопируйте `.env.example` в `.env` и заполните значения.
- Не коммитьте `.env`. Обязательные для продакшена (при использовании):
  - Sentry: `VITE_SENTRY_DSN`, `VITE_SENTRY_AUTH_TOKEN` (для сборки).
  - Firebase (если используется): все `VITE_FIREBASE_*` из `.env.example`.
- Версия приложения берётся из `package.json` при сборке (`VITE_APP_VERSION` в vite define).

---

## 2. Фронт (Vite SPA)

### Локальная разработка

```bash
npm install
npm run dev
```

- Приложение: **http://localhost:3000** (порт в `vite.config.ts` → `server.port`).

### Production-сборка

```bash
npm run build
npm run preview   # превью собранного dist на локальном сервере
```

- Артефакт: папка `dist/`.

### Деплой через Docker (фронт)

```bash
docker build -t toloverunner-front .
docker run -p 8080:80 toloverunner-front
```

- Фронт будет доступен на **http://localhost:8080** (nginx на порту 80 внутри контейнера).

### Деплой на Vercel

- Подключите репозиторий к Vercel; сборка по умолчанию: `npm run build`, выход — `dist`.
- Переменные окружения задайте в настройках проекта (Vercel → Settings → Environment Variables).
- Конфигурация маршрутов и заголовков — в корневом `vercel.json`.

---

## 3. Game-server (опционально)

Используется только если нужен отдельный бэкенд (например, для мультиплеера/синхронизации).

### Локально

```bash
npx ts-node server/index.ts
```

- Требуется `ts-node` в devDependencies (уже добавлен в проект).

### Docker

```bash
docker build -f Dockerfile.server -t toloverunner-server .
docker run -p 3000:3000 toloverunner-server
```

- В `docker-compose.yml` сервис `game-server` использует этот образ и порт 3000.
- Фронт в Docker (nginx) проксирует `/api/` на `backend:3000` (см. `nginx.conf`); при одном контейнере фронта без compose имя `backend` не резолвится — для полного сценария поднимайте через `docker-compose up`.

### Docker Compose (фронт + сервер)

```bash
docker-compose up --build
```

- Фронт: **http://localhost:8080**
- Сервер: **http://localhost:3000** (внутри сети — как `game-server:3000` для nginx proxy).

---

## 4. Откат

- **Vercel:** откат на предыдущий деплой через панель Vercel (Deployments → … → Promote to Production).
- **Docker:** пересобрать образ с предыдущим тегом/коммитом и перезапустить контейнер.
- **Локально:** `git checkout <prev-commit>`, затем снова `npm run build` / `npm run dev`.

---

## 5. Связанные документы

- [README.md](../../README.md) — быстрый старт и команды
- [.env.example](../../.env.example) — шаблон переменных окружения
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) — решение типичных проблем
