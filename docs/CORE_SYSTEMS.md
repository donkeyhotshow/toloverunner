# Core Systems Documentation

Документация по новым централизованным системам проекта.

## Обзор исправленных проблем

| # | Проблема | Решение | Файл |
|---|----------|---------|------|
| 1 | Две параллельные аудио системы | UnifiedAudioManager | `core/audio/UnifiedAudioManager.ts` |
| 2 | Нет централизованного EnemyManager | EnemyPoolManager с object pooling | `core/enemies/EnemyPoolManager.ts` |
| 3 | Нет gesture recognition | GestureManager | `core/ureManager.ts` |
| 4 | Нет версионирования сохранений | SaveManager с миграциями | `core/persistence/SaveManager.ts` |
| 5 | Нет локализации | I18nManager | `core/i18n/I18nManager.ts` |
| 6 | Нет accessibility | AccessibilityManager | `core/accessibility/AccessibilityManager.ts` |

---

## 1. Unified Audio Manager

### Проблема
Две параллельные аудио системы (`DynamicAudio.tsx` и `Audio.ts`) создавали конфликты AudioContext и несинхронизированную громкость.

### Решение
Единый `UnifiedAudioManager` с:
- Одним AudioContext
- Синхронизированными уровнями громкости
- Предгенерированными буферами для оптимизации
- Haptic feedback интеграцией

### Использование

```typescript
import { unifiedAudio } from '../core';

// Инициализация (после пользовательского взаимодействия)
await unifiedAudio.init();

// Воспроизведение звуков
unifiedAudio.playSFX('jump');
unifiedAudio.playSFX('coin', { volume: 0.8, pitch: 1.2 });

// Управление музыкой
unifiedAudio.toggleMusic(true);
unifiedAudio.updateMusicIntensity(0.7, 0.5);

// Громкость
unifiedAudio.setMasterVolume(0.8);
unifiedAudio.setMusicVolume(0.5);
unifiedAudio.setSFXVolume(0.9);

// Haptic feedback
unifiedAudio.playHaptic('medium');
```

### React Hook

```typescript
import { useAudio } from '../hooks/useCoreSystems';

const MyComponent = () => {
    const { playSFX, toggleMusic, volumeSettings } = useAudio();

    return (
        <button onClick={() => playSFX('click')}>
            Click me
        </button>
    );
};
```

---

## 2. Enemy Pool Manager

### Проблема
- Враги разбросаны по отдельным файлам
- Нет object pooling
- GC паузы при массовом спавне

### Решение
Централизованный `EnemyPoolManager` с:
- Object pooling для всех типов врагов
- LOD системой
- Автоматическим кулингом
- Зонами спавна

### Использование

```typescript
import { enemyPool } from '../core';
import * as THREE from 'three';

// Спавн врага
const enemy = enemyPool.spawn({
    type: 'virus',
    position: new THREE.Vector3(0, 0, 10),
    behavior: 'drifting',
    difficultyMultiplier: 1.5
});

// Деспавн
enemyPool.despawn(enemy.id);

// Обновление в игровом цикле
enemyPool.setPlayerPosition(playerPosition);
enemyPool.update(deltaTime);

// Проверка коллизий
const hitEnemy = enemyPool.checkCollision(playerPosition, 0.5);

// Зоны спавна
enemyPool.addSpawnZone({
    center: new THREE.Vector3(0, 0, 50),
    radius: 20,
    allowedTypes: ['virus', 'slime'],
    spawnRate: 2,
    maxEnemies: 10,
    difficultyMultiplier: 1.0,
    isActive: true
});
```

---

## 3. Gesture Manager

### Проблема
- Нет gesture recognition
- Нет haptic feedback API
- Фиксированные размеры кнопок

### Решение
`GestureManager` с:
- Распознаванием свайпов, тапов, pinch
- Haptic feedback
- Адаптивными размерами

### Использование

```typescript
import { gestureManager } from '../core';

// Инициализация
gestureManager.init(document.body);

// Подписка на жесты
const unsubscribe = gestureManager.on('swipeLeft', (data) => {
    console.log('Swiped left!', data.velocity);
});

// Адаптивные размеры
const buttonSize = gestureManager.getAdaptiveSize(80);

// Настройки
gestureManager.setSensitivity(1.2);
gestureManager.setHapticEnabled(true);
```

### React Hook

```typescript
import { useGestures } from '../hooks/useCoreSystems';

const MyComponent = () => {
    const { onGesture, isMobile, getAdaptiveSize } = useGestures();

    useEffect(() => {
        const unsub = onGesture('swipeUp', () => {
            // Прыжок
        });
        return unsub;
    }, []);

    const buttonSize = getAdaptiveSize(80);

    return <button style={{ width: buttonSize }}>Jump</button>;
};
```

---

## 4. Save Manager

### Проблема
- Нет версионирования сохранений
- Нет миграции при обновлении структуры
- Нет валидации данных

### Решение
`SaveManager` с:
- Версионированием (текущая версия: 3)
- Автоматическими миграциями
- Валидацией и контрольными суммами
- Экспортом/импортом

### Использование

```typescript
import { saveManager } from '../core';

// Загрузка (с автоматической миграцией)
const data = saveManager.load();

// Сохранение
saveManager.save({ genesCollected: 100 }, true);

// Обновление частей
saveManager.updateStats({ bestScore: 5000 });
saveManager.updateUpgrades({ hasDoubleJump: true });
saveManager.updatePreferences({ language: 'ru' });

// Экспорт/импорт для бэкапа
const backup = saveManager.export();
saveManager.import(backup);
```

### Структура данных

```typescript
interface SaveData {
    version: number;
    timestamp: number;
    checksum: string;
    stats: PlayerStats;
    upgrades: PlayerUpgrades;
    preferences: PlayerPreferences;
    genesCollected: number;
    seed: string;
    achievements: string[];
}
```

---

## 5. I18n Manager

### Проблема
- Все тексты захардкожены
- Нет поддержки RTL языков

### Решение
`I18nManager` с:
- 10 языками (en, ru, es, de, fr, ja, ko, zh, ar, he)
- RTL поддержкой
- Форматированием чисел и дат

### Использование

```typescript
import { i18n, t } from '../core';

// Получение перевода
const text = t('menu.play'); // "Play" или "Играть"

// С параметрами
const score = t('a11y.scoreDisplay', { score: 1000 });

// Смена языка
i18n.setLanguage('ru');

// Проверка RTL
if (i18n.isRTL()) {
    // Применить RTL стили
}

// Форматирование
i18n.formatNumber(1234567); // "1,234,567" или "1 234 567"
i18n.formatTime(125); // "2:05"
```

### React Hook

```typescript
import { useI18n } from '../hooks/useCoreSystems';

const MyComponent = () => {
    const { t, language, setLanguage, isRTL } = useI18n();

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <h1>{t('menu.play')}</h1>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ru">Русский</option>
            </select>
        </div>
    );
};
```

---

## 6. Accessibility Manager

### Проблема
- Нет поддержки screen readers
- Нет настроек для дальтоников
- Нет альтернативного управления

### Решение
`AccessibilityManager` с:
- Screen reader анонсами
- 5 режимами дальтонизма
- Высокой контрастностью
- Крупным текстом
- Уменьшенной анимацией

### Использование

```typescript
import { accessibility } from '../core';

// Настройки
accessibility.setColorblindMode('deuteranopia');
accessibility.setReducedMotion(true);
accessibility.setHighContrast(true);

// Screen reader анонсы
accessibility.announce('Game started!');
accessibility.announceGameEvent('score', { score: 1000 });

// ARIA атрибуты
const attrs = accessibility.getAriaAttributes('jumpButton');
// { 'aria-label': 'Jump button', 'role': 'button' }

// Проверка клавиш
if (accessibility.isActionKey('jump', event.code)) {
    // Прыжок
}
```

### React Hook

```typescript
import { useAccessibility } from '../hooks/useCoreSystems';

const MyComponent = () => {
    const { settings, updateSettings, announce, shouldReduceMotion } = useAccessibility();

    return (
        <motion.div
            animate={shouldReduceMotion ? {} : { scale: [1, 1.1, 1] }}
        >
            <button onClick={() => updateSettings({ highContrast: true })}>
                High Contrast
            </button>
        </motion.div>
    );
};
```

---

## Компоненты UI

### AdaptiveMobileControls
Адаптивные мобильные контролы с жестами.

```tsx
import { AdaptiveMobileControls } from '../components/Input/AdaptiveMobileControls';

<AdaptiveMobileControls
    onJump={() => {}}
    onMoveLeft={() => {}}
    onMoveRight={() => {}}
    onDash={() => {}}
/>
```

### AccessibilitySettings
Панель настроек доступности.

```tsx
import { AccessibilitySettings } from '../components/UI/AccessibilitySettings';

<AccessibilitySettings isOpen={true} onClose={() => {}} />
```

### LanguageSettings
Панель выбора языка.

```tsx
import { LanguageSettings } from '../components/UI/LanguageSettings';

<LanguageSettings isOpen={true} onClose={() => {}} />
```

---

## Миграция с устаревших систем

### Audio
```typescript
// Было
import { audio } from '../components/System/Audio';
audio.playJump();

// Стало
import { unifiedAudio } from '../core';
unifiedAudio.playSFX('jump');
```

### Сохранения
```typescript
// Было
localStorage.setItem('game_save', JSON.stringify(data));

// Стало
import { saveManager } from '../core';
saveManager.save(data);
```

Старые файлы (`Audio.ts`, `DynamicAudio.tsx`) сохранены для обратной совместимости и делегируют вызовы в новые системы.
