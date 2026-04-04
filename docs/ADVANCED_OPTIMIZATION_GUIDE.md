# 📘 Advanced R3F Optimization Guide: ToLOVERunner Edition

**Цель:** Стабильные 30-60 FPS, отсутствие утечек памяти, "зеленая" зона CPU.
**Стек:** React + React Three Fiber (R3F) + Three.js

---

## 🗺️ Краткий Пошаговый План

1.  **Audit & Profiling:** Замерить текущие метрики (FPS, Memory, Draw Calls). Найти "горячие" `useFrame`.
2.  **Stop the Bleeding (Memory):** Внедрить переиспользование объектов (Vector3, Matrix4) и проверить `dispose`.
3.  **Fix the Loop (`useFrame`):** Переписать все `useFrame`: убрать `setState`, добавить троттлинг/frame-skipping.
4.  **Demand Rendering:** Перевести меню и паузу на `frameloop="demand"`.
5.  **Offload CPU:** Вынести тяжелую физику/коллизии в Web Worker (если FPS все еще низок).

---

## 1. Общая Оптимизация Архитектуры R3F

### Снижение Re-renders
React перерисовывает компонент при каждом изменении стейта/пропсов. В R3F это не всегда пересоздает WebGL контекст, но нагружает CPU вычислениями дифов.

*   **Проблема:** Подписка на быстро меняющийся стейт (например, `distance` или `score`) в корневом компоненте.
*   **Решение:** Transient updates (обновление через ref без re-render) или селекторы Zustand.

**Пример (Zustand Selectors):**
```typescript
// ❌ BAD: Любое изменение в store ререндерит компонент
const store = useStore(); 

// ✅ GOOD: Ререндер ТОЛЬКО если изменился score
const score = useStore(state => state.score); 
```

### Снижение Draw Calls (Instancing)
Если у вас 100 одинаковых объектов (клетки, вирусы), используйте `InstancedMesh`.

**Пример:**
```typescript
// ❌ BAD: 100 draw calls
{items.map(i => <mesh key={i} geometry={geo} material={mat} />)}

// ✅ GOOD: 1 draw call
<instancedMesh args={[geo, mat, 100]}>
  {/* Управление матрицами через ref */}
</instancedMesh>
```

---

## 2. Оптимизация `useFrame`

Золотое правило: **Никаких `new` внутри цикла.**

### Паттерн: Переиспользование Объектов
**❌ БЫЛО (Антипаттерн):**
```typescript
useFrame(() => {
  // 🗑️ GC Thrashing: Создается новый вектор каждый кадр (60 раз/сек * N объектов)
  const newPos = new THREE.Vector3(0, 0, speed); 
  ref.current.position.add(newPos);
});
```

**✅ СТАЛО (Оптимизация):**
```typescript
// Создаем один раз вне компонента или в useMemo
const _vec = new THREE.Vector3(); 

useFrame((state, delta) => {
  // Переиспользуем существующий объект
  _vec.set(0, 0, speed * delta); // Используем delta для плавности
  ref.current.position.add(_vec);
});
```

### Паттерн: Frame Skipping (Throttling)
Не все нужно обновлять 60 раз в секунду.

**✅ ПРИМЕР:**
```typescript
const frameRef = useRef(0);

useFrame((state, delta) => {
  frameRef.current++;
  
  // Тяжелая логика (поиск пути, AI) - раз в 10 кадров
  if (frameRef.current % 10 === 0) {
    updateAI();
  }
  
  // Визуал (анимация) - каждый кадр
  ref.current.rotation.y += delta;
});
```

---

## 3. Heavy Computations в Web Worker

Выносим физику и коллизии из главного потока, чтобы не блокировать UI и рендер.

### Структура
1.  **Main Thread:** Отправляет инпуты/состояние в воркер. Получает позиции объектов.
2.  **Worker:** Считает физику. Отправляет новые координаты.

### Пример реализации

**Worker (`physics.worker.ts`):**
```typescript
// Простая физика в воркере
let entities = [];

self.onmessage = (e) => {
  const { type, payload } = e.data;
  
  if (type === 'INIT') {
    entities = payload;
  } else if (type === 'STEP') {
    const dt = payload.dt;
    // Тяжелые вычисления
    entities.forEach(ent => {
      ent.x += ent.vx * dt;
      // Коллизии...
    });
    
    // Отправляем результат обратно (Transferable objects для скорости)
    const positions = new Float32Array(entities.length * 3);
    // ... заполнение массива ...
    self.postMessage({ type: 'UPDATE', positions }, [positions.buffer]);
  }
};
```

**Main Thread (Hook):**
```typescript
export function usePhysicsWorker() {
  const workerRef = useRef<Worker>();
  const objectsRef = useRef<THREE.Group>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./physics.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'UPDATE') {
        // Синхронизация без React state! Прямое обновление DOM/WebGL
        const positions = e.data.positions;
        // Обновляем ref.current.children...
      }
    };
    
    return () => workerRef.current?.terminate();
  }, []);

  useFrame((state, delta) => {
    // Отправляем запрос на шаг физики
    workerRef.current?.postMessage({ type: 'STEP', payload: { dt: delta } });
  });

  return objectsRef;
}
```

---

## 4. Утечки Памяти (Memory Leaks)

### Чек-лист Dispose
Three.js не удаляет ресурсы (геометрию, текстуры, материалы) автоматически, когда компонент размонтируется.

**❌ БЫЛО:**
```typescript
useEffect(() => {
  const geo = new THREE.BoxGeometry();
  const mat = new THREE.MeshBasicMaterial();
  // ... использование
}, []); // При размонтировании geo и mat остаются в памяти GPU
```

**✅ СТАЛО (R3F делает это автоматически для декларативных объектов, но не для ручных):**
```typescript
// R3F автоматически вызывает dispose для всего, что в JSX
<mesh>
  <boxGeometry />
  <meshStandardMaterial />
</mesh>

// Для ручных ресурсов:
useEffect(() => {
  const material = new THREE.ShaderMaterial({...});
  return () => material.dispose(); // Явная очистка
}, []);
```

### Инструменты
1.  `console.log(renderer.info.memory)` — следите за `geometries` и `textures`. Они должны падать до минимума при смене сцен.
2.  Chrome Performance Monitor — график `JS Heap`. Если "пила" постоянно растет вверх — утечка.

---

## 5. On-demand Rendering

Экономит батарею и CPU на статичных экранах (Меню, Пауза).

### Настройка
В `App.tsx`:
```typescript
const isPlaying = status === 'PLAYING';

<Canvas frameloop={isPlaying ? 'always' : 'demand'}>
  {/* ... */}
</Canvas>
```

### Инвалидация (Invalidate)
В режиме `demand` R3F рендерит кадр только если:
1.  Изменились пропсы/стейт компонентов R3F.
2.  Вызван `invalidate()`.

**Пример (Анимация в меню):**
```typescript
import { useThree } from '@react-three/fiber';

function MenuButton() {
  const { invalidate } = useThree();
  
  const onHover = () => {
    // Запускаем перерисовку вручную для анимации ховера
    invalidate();
  };

  return <mesh onPointerOver={onHover} ... />;
}
```

---

## ✅ Метрики Успеха (Definition of Done)

1.  **FPS:**
    *   Меню: 60 FPS (или 0 FPS в idle demand режиме).
    *   Геймплей: Стабильные 30+ FPS (без просадок ниже 25).
2.  **Memory:**
    *   JS Heap: Стабильный (без постоянного роста).
    *   Geometries/Textures: Очищаются при перезапуске игры.
3.  **Draw Calls:**
    *   < 100 для мобилок/слабых ПК.
    *   Использование Instancing для частиц/стен.
4.  **CPU:**
    *   Idle time в Performance tab > 30-40%.

