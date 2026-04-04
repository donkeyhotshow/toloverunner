# 🚀 ToLOVERunner - Полное руководство по устранению неисправностей

## 📋 Быстрая диагностика

### FPS < 10, Draw Calls = 0, Delta > 150ms

**Вероятная причина:** Software WebGL rendering

**Быстрая проверка:**
1. Откройте `chrome://gpu/` в браузере
2. Ищите "Software Rendering: Enabled"
3. Если да - переходите к разделу [GPU Issues](#gpu-issues)

## 🔧 Инструменты диагностики

### В игре (DebugOverlay - F3)

| Кнопка | Назначение | Когда использовать |
|--------|------------|-------------------|
| 🧪 **RUN TESTS** | Полная проверка игры | Для выявления проблем с логикой |
| 🔍 **RENDER DEBUG** | Диагностика рендера | FPS проблемы, draw calls = 0 |
| 💪 **STRESS TEST** | Нагрузочное тестирование | Определение лимитов производительности |
| 🎯 **MINIMAL TEST** | Минимальный рендер | Изоляция проблем с Canvas/WebGL |
| 🔍 **GPU DETECTOR** | Диагностика GPU | Проблемы с hardware acceleration |

### Консольные команды

```javascript
// Полная диагностика GPU
window.__RUN_GPU_DETECTION__()

// Минимальный тест рендера
window.__START_MINIMAL_TEST__()

// Стресс-тест с выбором режима
window.__START_STRESS_TEST__("canvas_only")

// Диагностика рендера в реальном времени
window.__START_RENDER_DEBUG__()
```

## 🚨 Распространенные проблемы и решения

### 1. GPU Issues (FPS 3-7, Draw Calls = 0)

#### Симптомы:
- FPS стабильно 3-7
- Draw calls всегда = 0
- Delta > 150ms
- StressTest показывает 2-3 FPS

#### Решения:

##### Chrome/Chromium/Electron:
```bash
# Добавьте эти флаги при запуске
--enable-unsafe-swiftshader
--ignore-gpu-blocklist
--enable-gpu-rasterization
--enable-webgl-draft-extensions
--disable-webgl-msaa
```

##### Firefox:
1. Откройте `about:config`
2. Установите:
   - `webgl.force-enabled: true`
   - `webgl.msaa-force: true`
   - `webgl.disable: false`

##### Windows:
1. **Обновите драйверы** видеокарты:
   - NVIDIA: GeForce Experience → Drivers
   - AMD: AMD Radeon Settings → System → Software
   - Intel: Intel Driver & Support Assistant

2. **Проверьте службы:**
   - Windows + R → `services.msc`
   - Найдите "Windows Audio Endpoint Builder"
   - Убедитесь, что служба запущена

##### Альтернативные браузеры:
- **Firefox** (лучше поддержка WebGL)
- **Microsoft Edge** (Chromium-based)
- **Safari** (на macOS)

#### Проверка решения:
```javascript
// После применения решений
window.__RUN_GPU_DETECTION__()
```
Ожидаемый результат: `Hardware acceleration: ✅ Enabled`

---

### 2. Game Logic Issues (FPS нормальный, но игра тормозит)

#### Симптомы:
- FPS 50-60
- Draw calls > 0
- Delta < 50ms
- Но игра ощущается медленной

#### Возможные причины:

##### Таймеры и интервалы:
```javascript
// Проверьте в консоли
setInterval(() => console.log('Active timers'), 1000);
```

##### Object pooling:
```javascript
// В DebugOverlay смотрите "Active Objects"
if (activeObjects > 1000) {
    // Слишком много объектов - оптимизируйте pooling
}
```

##### Event listeners:
```javascript
// Проверьте утечки
getEventListeners(window); // Chrome DevTools
```

##### Memory leaks:
1. Откройте DevTools → Memory
2. Сделайте heap snapshot
3. Поиграйте 1-2 минуты
4. Сделайте второй snapshot
5. Compare - ищите утечки

#### Решения:

##### Очистка таймеров:
```javascript
// В компонентах всегда очищайте
useEffect(() => {
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
}, []);
```

##### Object pooling:
```javascript
// Используйте reuse вместо создания новых объектов
const pool = [];
function getObject() {
    return pool.pop() || createNewObject();
}
function returnObject(obj) {
    pool.push(obj);
}
```

---

### 3. Canvas Issues (Черный экран)

#### Симптомы:
- Canvas виден, но черный
- Three.js scene имеет объекты
- Камера на месте
- Освещение настроено

#### Проверки:

##### Canvas properties:
```javascript
const canvas = document.querySelector('canvas');
console.log({
    width: canvas.width,
    height: canvas.height,
    visible: canvas.offsetWidth > 0,
    context: !!canvas.getContext('webgl'),
    zIndex: canvas.style.zIndex
});
```

##### Three.js state:
```javascript
console.log({
    sceneChildren: window.__TOLOVERUNNER_SCENE__?.children.length,
    camera: window.__TOLOVERUNNER_CAMERA__?.position,
    renderer: !!window.__TOLOVERUNNER_RENDERER__,
    materials: window.__TOLOVERUNNER_SCENE__?.children
        .filter(obj => obj.material)
        .map(obj => obj.material.type)
});
```

#### Возможные решения:

##### Material issues:
```javascript
// Проверьте toneMapped
material.toneMapped = false;

// Или для всех материалов
scene.traverse(obj => {
    if (obj.material) {
        obj.material.toneMapped = false;
    }
});
```

##### Shader compilation:
```javascript
// Проверьте в консоли ошибки типа
// "Shader compilation failed" или "WebGL shader error"
```

---

### 4. Performance Issues (FPS 30-50, но нестабильный)

#### Симптомы:
- FPS колеблется 30-50
- Draw calls растут со временем
- Memory usage увеличивается

#### Диагностика:

##### Performance profiling:
1. DevTools → Performance → Start recording
2. Поиграйте 10-15 секунд
3. Stop recording
4. Ищите:
   - Long tasks > 50ms
   - Forced reflow/layout
   - Large GC events

##### Memory timeline:
1. DevTools → Memory → Start monitoring
2. Смотрите график memory usage
3. Ищите steady increase

#### Оптимизации:

##### Reduce draw calls:
```javascript
// Используйте instancing
const mesh = new THREE.InstancedMesh(geometry, material, count);

// Или объединяйте meshes
const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
```

##### Texture optimization:
```javascript
// Используйте сжатие
texture.format = THREE.RGBAFormat;
texture.generateMipmaps = false;

// Power of 2 размеры
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
```

##### LOD system:
```javascript
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(mediumDetailMesh, 50);
lod.addLevel(lowDetailMesh, 100);
```

---

## 📊 Результаты диагностики

### Интерпретация результатов GPU Detector:

| Статус | Значение | Действия |
|--------|----------|----------|
| `HARDWARE` | ✅ GPU работает | Ищите проблему в коде |
| `SOFTWARE` | ❌ Software rendering | Включите hardware acceleration |
| `DISABLED` | ❌ WebGL отключен | Включите WebGL в браузере |
| `BROKEN` | ❌ Критическая ошибка | Проверьте драйверы/браузер |

### Интерпретация Minimal Test:

| Draw Calls | FPS | Delta | Диагноз |
|------------|----|-------|---------|
| 0 | 3-7 | >150ms | Hardware acceleration отключен |
| 5-10 | 50-60 | <20ms | Рендер работает нормально |
| 0 | 50-60 | <20ms | Canvas перекрыт или невидим |

### Интерпретация Stress Test:

| Режим | FPS | Вывод |
|-------|----|-------|
| `canvas_only` < 30 | Hardware acceleration проблемы |
| `canvas_only` > 50 | GPU работает, проблема в UI |
| `canvas_ui` < 30 | DOM элементы перегружают рендер |
| `canvas_logic` < 30 | Игровая логика слишком тяжёлая |

---

## 🛠️ Расширенная диагностика

### Performance Monitor (DevTools):

```javascript
// Включите эти опции
Performance Monitor:
□ FPS
□ CPU usage
□ JS heap size
□ Nodes
□ JS event listeners
□ Documents
□ Frames
□ Layout shifts
```

### WebGL Inspector:

```javascript
// Для глубокого анализа WebGL
// Установите расширение WebGL Inspector
// Или используйте Spector.js
```

### Memory Leak Detection:

```javascript
// Добавьте в код для отслеживания
window.__memorySnapshots = [];
function takeSnapshot(label) {
    window.__memorySnapshots.push({
        label,
        timestamp: Date.now(),
        heap: performance.memory.usedJSHeapSize
    });
}
```

---

## 🚀 Профилактика

### Регулярные проверки:

```javascript
// Добавьте в game loop
if (frameCount % 300 === 0) { // Каждые 5 секунд при 60 FPS
    const fps = calculateAverageFps();
    if (fps < 45) {
        console.warn(`Low FPS detected: ${fps}`);
        // Автоматическое понижение качества
        qualityManager.decreaseQuality();
    }
}
```

### Автоматическая диагностика:

```javascript
// При запуске игры
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.__GET_GPU_STATUS__() !== 'hardware') {
            showGPUDialog();
        }
    }, 1000);
});
```

---

## 📞 Поддержка

Если ничего не помогает:

1. **Создайте issue** на GitHub с результатами всех тестов
2. **Прикрепите логи** из консоли
3. **Укажите:** ОС, браузер, GPU, драйверы
4. **Результаты команд:**
   ```bash
   # Windows
   wmic path win32_videocontroller get name, driverversion

   # macOS
   system_profiler SPDisplaysDataType

   # Linux
   lspci | grep VGA
   ```

---

## 🎯 Краткая шпаргалка

| Проблема | Быстрая проверка | Решение |
|----------|------------------|---------|
| FPS 3-7, draw calls=0 | `window.__RUN_GPU_DETECTION__()` | Hardware acceleration |
| Черный экран | `window.__START_MINIMAL_TEST__()` | Canvas/material issues |
| FPS 30-50, нестабильный | `window.__START_RENDER_DEBUG__()` | Memory leaks/timers |
| Игра тормозит | DevTools Performance | Code optimization |
| WebGL errors | Console logs | Shader/material fixes |

**Запомните:** 90% проблем с низким FPS - это отключенное hardware acceleration!
