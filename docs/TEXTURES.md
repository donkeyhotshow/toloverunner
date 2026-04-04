# 🎨 Система текстур ToLOVERunner

## Обзор

Проект использует централизованную систему загрузки и управления текстурами через `TextureManager`.

---

## Структура файлов

Текстуры организованы в папке `public/assets/`:

```
public/assets/
├── fonts/          # Шрифты для UI
│   ├── font_comic.png
│   ├── font_bold.png
│   ├── font_digital.png
│   ├── font_title.png
│   └── font_score.png
├── fx/             # Эффекты (частицы, свечения)
│   ├── fx_particle.png
│   ├── fx_glow.png
│   ├── fx_sparkle.png
│   ├── fx_explosion.png
│   ├── fx_lightning.png
│   ├── fx_shield.png
│   └── fx_speed.png
└── enemies/        # Враги (вирусы, бактерии)
    ├── virus_purple.png
    ├── virus_green.png
    ├── virus_yellow.png
    ├── virus_red.png
    ├── virus_special.png
    ├── virus_boss.png
    ├── bacteria_1.png
    ├── bacteria_2.png
    └── bacteria_3.png
```

---

## Использование

### Базовое использование

```typescript
import { useTexture, TextureType } from './components/System/useTexture';

function MyComponent() {
  const texture = useTexture(TextureType.ENEMY_VIRUS_PURPLE);
  
  if (texture) {
    material.map = texture;
  }
}
```

### Предзагрузка текстур

```typescript
import { TexturePreloader } from './components/System/TexturePreloader';

<TexturePreloader 
  onComplete={() => console.log('Textures loaded!')}
  onProgress={(loaded, total) => console.log(`${loaded}/${total}`)}
/>
```

### Прямое использование TextureManager

```typescript
import { textureManager, TextureType } from './core/assets/TextureLoader';

// Загрузить одну текстуру
const texture = await textureManager.loadTexture(TextureType.FX_PARTICLE, {
  repeat: [2, 2],
  wrapS: THREE.RepeatWrapping,
  wrapT: THREE.RepeatWrapping
});

// Предзагрузить несколько
await textureManager.preloadTextures([
  TextureType.ENEMY_VIRUS_PURPLE,
  TextureType.FX_PARTICLE
]);
```

---

## Интеграция в компоненты

### VirusObstacle

Компонент `VirusObstacle` автоматически использует текстуры вирусов:

```typescript
const { geometry, material, outlineMaterial } = useVirusAssets('purple');
// Доступны типы: 'purple', 'green', 'yellow', 'red'
```

### ParticleSystem

Компонент `ParticleSystem` использует текстуры эффектов для частиц:

- `FX_PARTICLE` - базовые частицы
- `FX_SPARKLE` - искры (powerup)
- `FX_GLOW` - свечение (jump)

---

## Добавление новых текстур

1. Поместите файл в соответствующую папку `public/assets/`
2. Добавьте новый тип в `TextureType` enum
3. Добавьте путь в `TEXTURE_PATHS` маппинг
4. Используйте через `useTexture` хук

---

## Оптимизация

- Текстуры кэшируются после первой загрузки
- Используется singleton паттерн для TextureManager
- Fallback текстуры создаются при ошибках загрузки
- Предзагрузка критичных текстур при старте игры

---

## Скрипт копирования

Для копирования и переименования текстур из исходных папок:

```bash
node scripts/copy-textures.js
```

Скрипт автоматически:
- Копирует файлы из `FONT/`, `FX/`, `ENEMIES/`
- Переименовывает их с понятными именами
- Размещает в `public/assets/`

---

*Версия документа: 1.0*

