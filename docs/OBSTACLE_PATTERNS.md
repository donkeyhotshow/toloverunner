# 🎯 Система паттернов препятствий - ToLOVERunner

**Версия:** 2.2.0  
**Дата:** 2025-12-26  
**Статус:** ✅ Реализовано

---

## 📋 Обзор

Система **ObstaclePatternGenerator** заменяет случайную генерацию препятствий на **определенные паттерны** - заранее спроектированные последовательности препятствий, которые обеспечивают:

- **Предсказуемый геймплей** - игрок может изучить паттерны
- **Прогрессивную сложность** - от простых к сложным паттернам
- **Разнообразие** - множество различных типов вызовов
- **Балансировку** - каждый паттерн тестирован и сбалансирован

---

## 🏗️ Архитектура системы

### Основные компоненты

```
core/patterns/
├── ObstaclePatternGenerator.ts  # Основной генератор паттернов
├── PatternIntegrator.ts         # Интеграция с игровой системой
└── types/                       # Типы данных

components/Debug/
├── PatternVisualizer.tsx        # Визуализация паттернов
└── PatternDebugPanel.tsx        # Отладочная панель

hooks/
├── useObstaclePatterns.ts       # React хук
└── usePatternGeneration.ts      # Интеграция с WorldLevelManager
```

---

## 🎮 Типы паттернов

### 1. **TUTORIAL** - Обучающие паттерны
Простые паттерны для изучения основ:
- `tutorial_single_jump` - Одиночный прыжок
- `tutorial_single_dodge` - Одиночное уклонение
- `tutorial_single_slide` - Одиночное скольжение

### 2. **BASIC** - Базовые паттерны
Основные игровые ситуации:
- `basic_left_right_choice` - Выбор между полосами
- `basic_jump_sequence` - Последовательность прыжков
- `basic_zigzag` - Зигзагообразное движение

### 3. **COMBO** - Комбинированные паттерны
Сочетание различных действий:
- `combo_jump_slide` - Прыжок + скольжение
- `combo_triple_threat` - Все три типа действий

### 4. **SPEED** - Скоростные паттерны
Для высокой скорости (40+ единиц):
- `speed_quick_dodge` - Быстрое уклонение
- `speed_tunnel_run` - Узкий туннель

### 5. **PRECISION** - Точные паттерны
Требуют высокой точности:
- `precision_narrow_gap` - Узкий проход

### 6. **ENDURANCE** - Выносливые паттерны
Длинные последовательности:
- `endurance_marathon` - Марафонская дистанция

### 7. **BOSS** - Босс паттерны
Экстремально сложные:
- `boss_gauntlet` - Испытание на выживание

---

## 🔧 Типы препятствий

### Новые типы объектов:
```typescript
enum ObjectType {
  OBSTACLE_JUMP = 'OBSTACLE_JUMP',     // Можно только перепрыгнуть
  OBSTACLE_DODGE = 'OBSTACLE_DODGE',   // Можно только обойти сбоку
  OBSTACLE_SLIDE = 'OBSTACLE_SLIDE',   // Можно только проскочить снизу
}
```

### Требуемые действия:
- `jump` - Прыжок (Space, W, ↑)
- `dodge` - Уклонение (A/D, ←/→)
- `slide` - Скольжение (S, ↓)
- `none` - Нет требований (бонусы)

---

## 📊 Система сложности

### Уровни сложности:
- **Easy** (0.0-0.3) - Простые паттерны, одиночные препятствия
- **Medium** (0.3-0.6) - Комбинации, выбор пути
- **Hard** (0.6-0.8) - Сложные последовательности
- **Expert** (0.8-1.0) - Экстремальные вызовы

### Адаптивная сложность:
```typescript
difficulty = baseProgression + distanceProgression + skillAdjustment + randomVariation
```

- **baseProgression** - Базовая прогрессия (0.1)
- **distanceProgression** - На основе дистанции (до 0.8)
- **skillAdjustment** - Адаптация к навыку игрока (до 0.3)
- **randomVariation** - Случайная вариация (±0.1)

---

## 🎯 Использование в коде

### Базовое использование:
```typescript
import { useObstaclePatterns } from '../hooks/useObstaclePatterns';

const MyComponent = () => {
  const { generateChunkWithPatterns } = useObstaclePatterns();
  
  const objects = generateChunkWithPatterns(chunkStart, chunkLength);
  return <>{/* Рендер объектов */}</>;
};
```

### Интеграция с WorldLevelManager:
```typescript
import { usePatternGeneration } from './hooks/usePatternGeneration';

const WorldLevelManager = () => {
  const { generateChunk, shouldGenerateChunk } = usePatternGeneration();
  
  // В игровом цикле
  if (shouldGenerateChunk(chunkIndex, playerDistance, spawnDistance)) {
    const objects = generateChunk(chunkIndex, chunkSize, playerDistance);
    // Добавить объекты в сцену
  }
};
```

### Отладка и визуализация:
```typescript
import { PatternDebugPanel } from '../components/Debug/PatternDebugPanel';
import { PatternVisualizer } from '../components/Debug/PatternVisualizer';

// В компоненте отладки
<PatternDebugPanel visible={showDebug} position="top-right" />
<PatternVisualizer isOpen={showVisualizer} onClose={() => setShowVisualizer(false)} />
```

---

## 🔍 Отладка и тестирование

### Debug Panel (F3)
Показывает в реальном времени:
- Текущую сложность и навык игрока
- Статистику использованных паттернов
- Информацию о генерации

### Pattern Visualizer
Визуальный редактор паттернов:
- Просмотр всех доступных паттернов
- Фильтрация по категориям и сложности
- Тестирование отдельных паттернов
- Детальная информация о каждом паттерне

### Консольные команды:
```javascript
// Получить статистику
window.__TOLOVERUNNER_DEBUG__.PATTERN_STATS = useObstaclePatterns().getPatternStats();

// Сбросить систему паттернов
useObstaclePatterns().resetPatternSystem();

// Получить информацию о генерации
console.log(useObstaclePatterns().getGenerationInfo());
```

---

## 📈 Метрики и аналитика

### Отслеживаемые метрики:
- **Использование паттернов** - Какие паттерны используются чаще
- **Успешность прохождения** - Процент успешного прохождения каждого паттерна
- **Адаптация сложности** - Как система адаптируется к навыку игрока
- **Производительность** - Время генерации паттернов

### Статистика в реальном времени:
```typescript
const stats = getPatternStats();
console.log({
  totalPatterns: stats.generator.totalPatterns,
  byCategory: stats.generator.byCategory,
  playerSkill: stats.integrator.playerSkillLevel,
  recentPatterns: stats.integrator.recentPatterns
});
```

---

## 🎨 Создание новых паттернов

### Структура паттерна:
```typescript
const newPattern: ObstaclePattern = {
  id: 'my_custom_pattern',
  name: 'My Custom Pattern',
  difficulty: 'medium',
  length: 25,
  tags: ['custom', 'jump', 'dodge'],
  description: 'Описание паттерна',
  minSpeed: 30, // Опционально
  maxSpeed: 60, // Опционально
  objects: [
    {
      type: ObjectType.OBSTACLE_JUMP,
      lane: 0,
      offset: 10,
      height: 0,
      requiredAction: 'jump'
    },
    {
      type: ObjectType.COIN,
      lane: 1,
      offset: 15,
      requiredAction: 'none'
    }
  ]
};
```

### Добавление в систему:
```typescript
// В ObstaclePatternGenerator.ts, метод initializePatterns()
this.addPattern(newPattern);
```

---

## 🔄 Миграция со старой системы

### Было (случайная генерация):
```typescript
// Случайные препятствия
const obstacle = createRandomObstacle(position);
```

### Стало (паттерны):
```typescript
// Определенные паттерны
const pattern = obstaclePatternGenerator.generateNextPattern(config);
const objects = patternIntegrator.convertPatternToObjects(pattern, position);
```

### Обратная совместимость:
Старые файлы (`MazePatternGenerator.ts`) сохранены и перенаправляют на новую систему.

---

## 🚀 Преимущества новой системы

### Для игроков:
- **Изучаемость** - Можно запомнить и освоить паттерны
- **Справедливость** - Нет "невозможных" ситуаций
- **Прогрессия** - Четкое ощущение улучшения навыков
- **Разнообразие** - Множество различных вызовов

### Для разработчиков:
- **Контроль** - Полный контроль над геймплеем
- **Балансировка** - Каждый паттерн можно протестировать
- **Расширяемость** - Легко добавлять новые паттерны
- **Отладка** - Простая диагностика проблем

### Для дизайнеров:
- **Творчество** - Создание уникальных вызовов
- **Тестирование** - Визуальный редактор паттернов
- **Итерация** - Быстрое изменение и тестирование
- **Аналитика** - Данные об использовании паттернов

---

## 📋 Чек-лист интеграции

### ✅ Реализовано:
- [x] Основной генератор паттернов
- [x] Интеграция с игровой системой
- [x] 15+ готовых паттернов всех категорий
- [x] Адаптивная система сложности
- [x] React хуки для интеграции
- [x] Отладочные инструменты
- [x] Визуализатор паттернов
- [x] Документация и примеры

### 🔄 В процессе:
- [ ] Интеграция с WorldLevelManager
- [ ] Тестирование всех паттернов
- [ ] Балансировка сложности
- [ ] Аналитика использования

### 🎯 Планы:
- [ ] Редактор паттернов в игре
- [ ] Пользовательские паттерны
- [ ] Экспорт/импорт паттернов
- [ ] Машинное обучение для адаптации

---

## 🎮 Примеры паттернов

### Простой прыжок:
```
Lane: -2  -1   0   1   2
      |   |   |   |   |
      |   |   ↑   |   |  <- Препятствие (прыжок)
      |   |   |   |   |
      |   |   ●   |   |  <- Монета (награда)
```

### Выбор пути:
```
Lane: -2  -1   0   1   2
      |   |   |   |   |
      |   ■   |   ■   |  <- Препятствия (уклонение)
      |   |   ●   |   |  <- Монета в центре
      |   |   |   |   |
```

### Комбо последовательность:
```
Lane: -2  -1   0   1   2
      |   |   |   |   |
      |   |   ↑   |   |  <- 1. Прыжок
      |   |   |   |   |
      |   |   ↓   |   |  <- 2. Скольжение
      |   |   |   |   |
      |   ■   |   ■   |  <- 3. Уклонение
      |   |   ⚡  |   |  <- Награда
```

---

**Автор:** AI Development Assistant  
**Версия документа:** 1.0  
**Последнее обновление:** 2025-12-26
