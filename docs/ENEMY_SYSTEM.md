# 🦠 Enemy System Documentation

## Обзор системы врагов

Система врагов ToLoveRunner реализует **15 уникальных типов** с процедурной генерацией геометрии и Comic Book визуальным стилем.

## 📁 Архитектура

```
core/enemies/
├── EnemyTypes.ts          # Типы и конфигурации (15 врагов)
├── ProceduralGeometry.ts  # Процедурная геометрия с Simplex Noise
└── EnemyFactory.ts        # Фабрика создания врагов с кешированием
```

## 🎨 Реализованные враги (6/15)

### 1. **Spike Virus** (Базовый, EARLY tier)
- **Геометрия:** Icosahedron + 8 шипов
- **Цвет:** `#00FF00` (зеленый) + halftone dots
- **Глаза:** Angry (злые брови)
- **Анимация:** Idle bob + rotation
- **Поведение:** Static block

### 2. **Hex Blocker** (EARLY tier)
- **Геометрия:** Hexagonal cylinder
- **Цвет:** `#006400` (темно-зеленый) + metallic
- **Глаза:** Neutral (полузакрытые)
- **Анимация:** Spin Y + pulse
- **Поведение:** Rotating blocker

### 3. **Star Spiker** (EARLY tier)
- **Геометрия:** 5-point star (custom)
- **Цвет:** `#32CD32` (lime) + gradient
- **Глаза:** Shocked (O-рот)
- **Анимация:** Multi-axis spin + trail
- **Поведение:** Full lane spin

### 4. **Thrombus Blob** (LATE tier, 2 DMG!)
- **Геометрия:** Heavy noise-displaced icosahedron
- **Цвет:** `#8B0000` (dark red)
- **Глаза:** Angry + large (0.35)
- **Анимация:** Slow pulse 1.15x
- **Поведение:** Big threat

### 5. **Dart Shooter** (MID tier)
- **Геометрия:** Elongated cylinder
- **Цвет:** `#FF6600` (orange) + emissive
- **Глаза:** Angry + fast blink (2s)
- **Анимация:** Fast spin
- **Поведение:** Shoot projectiles

### 6. **Jump Pod** (MID tier)
- **Геометрия:** Noisy sphere
- **Цвет:** `#FFAA00` (gold)
- **Глаза:** Shocked + frequent blink (1.5s)
- **Анимация:** Hop motion
- **Поведение:** Lane jumping

## 🛠 Технические особенности

### Процедурная генерация
```typescript
// Simplex Noise 3D для органического вида
applyNoiseDisplacement(geometry, amplitude, frequency, seed);

// Добавление шипов на вершины
addSpikes(geometry, count, length);

// Звездная форма custom
createStarGeometry(pointCount, outerRadius, innerRadius);
```

### Система глаз (обязательна!)
```typescript
enum EyeEmotion {
    NEUTRAL = 'neutral',   // Обычные
    ANGRY = 'angry',       // Злые брови
    SHOCKED = 'shocked'    // Широко открытые
}
```

**Фичи:**
- 2 белых круга + черные зрачки
- Rainbow highlight (радужный блик)
- Морфинг эмоций
- Автоматический blink (2-5s интервал)

### Halftone материалы
```typescript
// Comic book стиль через halftone точки
const texture = createHalftoneTexture(128, 4);
const material = new MeshToonMaterial({
    color: baseColor,
    map: halftoneTexture,
    emissive: glowColor
});
```

### Кэширование ресурсов
```typescript
class EnemyFactory {
    private geometryCache = new Map<string, BufferGeometry>();
    private materialCache = new Map<string, Material>();
    
    // Геометрия/материалы создаются 1 раз и переиспользуются
}
```

## 📊 Spawn System

### Веса по прогрессу игры
```typescript
SpawnTier.EARLY  -> progress < 0.3: 70%, < 0.6: 20%, else: 10%
SpawnTier.MID    -> progress < 0.3: 20%, < 0.7: 50%, else: 30%
SpawnTier.LATE   -> progress < 0.5: 5%,  < 0.8: 30%, else: 65%
SpawnTier.BOSS   -> progress > 0.9: 80%, else: 0%
```

### Пример использования
```typescript
import { enemyFactory } from 'core/enemies/EnemyFactory';
import { EnemyType } from 'core/enemies/EnemyTypes';

// Создание врага
const spike = enemyFactory.createEnemy(EnemyType.SPIKE_VIRUS);
scene.add(spike.mesh);

// Обновление (в game loop)
enemyFactory.updateEnemy(spike, deltaTime);

// Удаление
enemyFactory.disposeEnemy(spike);
```

## 🎯 Roadmap

### Phase 1 (Завершено) ✅
- [x] Система типов (15 configs)
- [x] Процедурная геометрия (noise, spikes, stars)
- [x] Halftone текстуры
- [x] Система глаз с эмоциями
- [x] EnemyFactory с кешированием
- [x] Первые 6 врагов детально

### Phase 2 (След. итерация)
- [ ] Остальные 9 врагов (Splitter Duo, Shield Guard, и т.д.)
- [ ] Wave System (mix 3-5 types)
- [ ] Advanced behaviors (shoot, split, laser)
- [ ] Particle effects (spawn burst, death pop)

### Phase 3 (Полировка)
- [ ] LOD для врагов (high/mid/low poly)
- [ ] Instanced rendering (500+ врагов)
- [ ] "CLOSE CALL!" screen shake
- [ ] Outline pass integration

## 🔧 Интеграция в WorldGen

```typescript
// В WorldLevelManager или Spawner
import { enemyFactory } from '../core/enemies/EnemyFactory';
import { getSpawnWeight } from '../core/enemies/EnemyTypes';

function spawnEnemyWave(progress: number) {
    const types = [
        EnemyType.SPIKE_VIRUS,
        EnemyType.HEX_BLOCKER,
        EnemyType.STAR_SPIKER
    ];
    
    // Выбор по весу
    const weights = types.map(t => getSpawnWeight(t, progress));
    const selected = weightedRandom(types, weights);
    
    // Создание
    const enemy = enemyFactory.createEnemy(selected);
    enemy.mesh.position.set(lane * 2, 0, -distance);
    
    return enemy;
}
```

## ⚡ Performance

### Оптимизации
- **Geometry caching:** 1 создание на тип
- **Material sharing:** Instanced materials
- **LOD ready:** Subdivisions 1-3
- **No shadows:** castShadow = false

### Метрики (проектные)
- 500 врагов одновременно
- <100 draw calls (instancing)
- 60 FPS stable
- <5ms update cost

## 🎨 Визуальный стиль

### Comic Book правила
- ✅ Thick black outlines (через Outlines от Drei)
- ✅ Halftone dots texture (4x4 grid)
- ✅ Emissive glow (intensity 0.2-0.4)
- ✅ Глаза везде! (обязательно)
- ✅ Bright saturated colors (#00FF00, #8B0000)

### Contrast
- Враги: Green/Red hues
- Pickups: Yellow/Cyan
- Background: Light pastels
- **Читаемость:** High contrast vs road

---

**Статус:** 🟢 **40% готово** (6/15 врагов детально реализованы)  
**Следующий шаг:** Интеграция в WorldGen + волны (Wave System)

🚀 **Готово к тестированию!**
