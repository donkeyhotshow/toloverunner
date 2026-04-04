# 🔍 Инструкция по Анализу и Тестированию Проекта

## 📋 Быстрый Старт

### 1. Перейдите в директорию проекта:
```powershell
cd D:\SPERM\toloverunner
```

### 2. Запустите автоматический анализ:
```powershell
npm run analyze
```

Этот скрипт проверит:
- ✅ TypeScript ошибки
- ✅ ESLint предупреждения  
- ✅ Зависимости проекта
- ✅ Антипаттерны в коде (TODO, console.log, any, @ts-ignore)
- ✅ Статистику кода

---

## 🧪 Полное Тестирование

### TypeScript Проверка
```powershell
npm run build
# или только проверка типов без сборки:
npx tsc --noEmit
```

### ESLint Проверка
```powershell
npm run lint
```

### Unit Тесты
```powershell
npm test
```

### Тесты с UI
```powershell
npm run test:ui
```

### E2E Тесты
```powershell
npm run test:e2e
```

### Coverage Отчет
```powershell
npm run test:coverage
```

---

## 📊 Результаты Анализа

После запуска `npm run analyze` вы получите:

### 1. **Статистика Кода**
- Количество файлов
- TypeScript/TSX файлы
- Строки кода

### 2. **Ошибки** (❌)
- Критические проблемы
- TypeScript ошибки
- Нарушения архитектуры

### 3. **Предупреждения** (⚠️)
- Устаревшие зависимости
- TODO комментарии
- console.log
- Использование any типов

### 4. **Общая Оценка** (0-100)
- 90-100: ⭐ Отлично
- 70-89: 👍 Хорошо
- 50-69: ⚠️ Удовлетворительно
- 0-49: ❌ Требуется рефакторинг

---

## 🔧 Исправление Проблем

### Автоматическое исправление ESLint
```powershell
npm run lint -- --fix
```

### Установка зависимостей
```powershell
npm install
```

### Очистка и переустановка
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

---

## 📝 Отчеты

Все отчеты доступны в папке `docs/`:

- **PROJECT_ANALYSIS_REPORT.md** - Полный анализ проекта
- **QA_CHECKLIST_REPORT.md** - QA тестирование
- **GAMEPLAY_TEST_REPORT.md** - Тестирование геймплея
- **CODEBASE_AUDIT_REPORT.md** - Аудит кода

---

## 🎯 Рекомендации

### Перед коммитом:
```powershell
npm run analyze    # Анализ проекта
npm run lint       # ESLint проверка
npm test           # Unit тесты
npm run build      # Сборка проекта
```

### Еженедельно:
```powershell
npm run test:coverage  # Проверка покрытия
npm run test:e2e       # E2E тесты
```

### Перед релизом:
```powershell
npm run analyze
npm run lint
npm test
npm run test:e2e
npm run build
npm run preview
```

---

## 🆘 Помощь

Если возникли проблемы:

1. Проверьте `docs/TROUBLESHOOTING_GUIDE.md`
2. Смотрите `docs/PROJECT_ANALYSIS_REPORT.md`
3. Запустите `npm run analyze` для диагностики

---

**Дата:** 22 января 2026  
**Версия:** 1.0
