# 🔍 Настройка Sentry для мониторинга ошибок

## Обзор

ToLOVERunner v2.2.0 включает интеграцию с Sentry для мониторинга ошибок и производительности в продакшене.

## 🚀 Быстрая настройка

### 1. Создание проекта в Sentry

1. Перейдите на [sentry.io](https://sentry.io) и создайте аккаунт
2. Создайте новый проект:
   - Platform: `React`
   - Name: `toloverunner-v2`
3. Скопируйте DSN из настроек проекта

### 2. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
# App Configuration
VITE_APP_VERSION=2.2.0
VITE_ENV=production

# Sentry Configuration
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_AUTH_TOKEN=your-auth-token
VITE_SENTRY_ORG=your-org-slug
VITE_SENTRY_PROJECT=toloverunner-v2
```

### 3. Получение Auth Token

1. В Sentry: Settings → Developer Settings → Auth Tokens
2. Создайте новый token с scopes:
   - `project:read`
   - `project:write`
   - `project:releases`

## ⚙️ Конфигурация

### Автоматическая настройка

Sentry автоматически:
- ✅ Захватывает JavaScript ошибки
- ✅ Мониторит производительность (10% транзакций)
- ✅ Записывает user replays (1% сессий)
- ✅ Интегрируется с error boundaries
- ✅ Загружает source maps для debugging

### Фильтрация ошибок

По умолчанию фильтруются:
- Network errors (Failed to fetch)
- Script loading errors
- Non-Error promise rejections

### Performance Monitoring

```typescript
import { startPerformanceTransaction } from './src/sentry';

// Пример использования
const transaction = startPerformanceTransaction('game-level', 'navigation');
transaction?.finish();
```

## 📊 Что мониторится

### Errors
- JavaScript runtime errors
- React component errors (через error boundaries)
- Network failures
- Resource loading errors

### Performance
- Page load times
- React component render times
- Asset loading performance
- Core Web Vitals

### User Context
```typescript
import { setUserContext, clearUserContext } from './src/sentry';

// Установка контекста пользователя
setUserContext('user123', 'user@example.com', 'Player1');

// Очистка при выходе
clearUserContext();
```

## 🔧 Troubleshooting

### Ошибка: "Sentry not initialized"
- Проверьте `VITE_SENTRY_DSN` в `.env.local`
- Убедитесь что переменная начинается с `VITE_`

### Ошибка: "Auth token required"
- Добавьте `VITE_SENTRY_AUTH_TOKEN` для загрузки source maps
- Token нужен только для сборки, не для runtime

### Source maps не загружаются
- Проверьте что `VITE_SENTRY_AUTH_TOKEN` указан
- Убедитесь что проект slug правильный
- Проверьте права token'а

## 📈 Dashboard

После настройки вы увидите:
- **Issues**: Список ошибок с stack traces
- **Performance**: Метрики загрузки и производительности
- **Releases**: История релизов с source maps
- **Replays**: Записи пользовательских сессий

## 🔒 Безопасность

- DSN публичен (используется в браузере)
- Auth token хранится только локально (не коммитить!)
- Source maps автоматически ассоциируются с релизами
- Личные данные не собираются без явного согласия

## 🎯 Лучшие практики

1. **Используйте разные проекты** для staging/production
2. **Регулярно обновляйте** auth tokens
3. **Мониторьте alerts** для критичных ошибок
4. **Анализируйте trends** для улучшения UX
5. **Тестируйте локально** перед деплоем

## 📞 Поддержка

- [Sentry Documentation](https://docs.sentry.io/)
- [React Integration Guide](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

---

**Версия документа:** 1.0
**Дата:** Декабрь 2025
