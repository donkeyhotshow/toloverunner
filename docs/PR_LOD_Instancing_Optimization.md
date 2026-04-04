# PR: LOD & Instancing Optimization (BatchManager + AdaptiveTunnelLOD)

Краткое описание
----------------
Этот PR содержит оптимизации для подсистем LOD и инстансинга с целью уменьшения draw‑calls, снизить CPU/GPU нагрузку и улучшить стабильность FPS на слабых устройствах.

Ключевые изменения
------------------
- core/rendering/BatchManager.ts
  - Перенёс обновление `instanceMatrix.needsUpdate` в планировщик обновлений (`scheduleMatrixUpdate`) для группировки обновлений и уменьшения количества флагов `needsUpdate` в одном кадре.
  - Уменьшил накладные расходы при массовых обновлениях инстансов.

- core/rendering/AdaptiveTunnelLOD.ts
  - Уменьшил аллокации (реиспользование `_dummyObject`), избегаю записи матриц для кульнутых чанков и упаковываю видимые чанки в компактный блок.
  - Обновление `instancedMesh.count` для корректного рендера видимых чанков.

- components/player/SpermModel3D.tsx, components/player/ToonSperm.tsx
  - Runtime‑оптимизации: frustumCulling, отключение shadow/outline на низком качестве, чистый dispose GLTF/DRACO/геометрий.

Почему это важно
-----------------
- Уменьшение количества вызовов `instanceMatrix.needsUpdate` и запись матриц только для видимых элементов уменьшает нагрузку на JS и GPU.
- Меньше аллокаций в горячих путях (реиспользование Object3D и вьюпоинтов).
- Позволяет стабильнее держать 60 FPS и уменьшает количество подшагов физики (PhysicsStabilizer) при просадках.

Тестирование (локально)
----------------------
1. Запустить сборку и preview:
   - npm install (если нужно)
   - npm run build
   - npm run preview

2. Открыть страницу и пройти сцены с активной генерацией (PLAYING).

3. Собрать метрики (включено в PerformanceManager):
   - FPS (целевой ≥ 55 для HIGH/ULTRA, ≥ 40 для MEDIUM)
   - Average SubSteps (PhysicsStabilizer.getMetrics)
   - Accumulator (не должно расти бесконтрольно; целевой максимум ~fixedTimeStep*maxSubSteps)
   - Draw calls / Batches (BatchManager.getOverallStats())
   - Использование памяти / GC spikes

4. Сценарии:
   - Нормальный игровой цикл (средний FPS): убедиться, что видимость объектов не ломается при переключении LOD.
   - Низкое качество: проверить отключение outline и теней.
   - Пробегание через большие количества объектов: убедиться, что batching корректно отрабатывает (нет наложенных матриц).

Критерии приёмки
-----------------
- Нет регрессий в визуальной целостности (LOD переключается предсказуемо).  
- Снижение draw calls на сценах с большим количеством объектов (по метрикам BatchManager).  
- Устойчивое улучшение FPS/падение CPU в горячих профилях (стабильность).  
- Linter: нет ошибок.

Откат / rollback
----------------
1. Откатить изменения в перечисленных файлах (git revert/checkout).  
2. При необходимости отключить новую логику через временные guards в коде (PerformanceManager.getCurrentQuality() checks).

Риски и mitigations
-------------------
- Возможны визуальные артефакты если порядок матриц в InstancedMesh будет нарушён — mitigated тестом и проверкой `instancedMesh.count` и `BatchManager.optimizeBatch`.
- Некорректное dispose может привести к утечкам — добавлены safeDispose вызовы в компонентах моделей.

Список изменённых файлов
-----------------------
- core/rendering/BatchManager.ts  
- core/rendering/AdaptiveTunnelLOD.ts  
- components/player/SpermModel3D.tsx  
- components/player/ToonSperm.tsx  
- components/World/WorldLevelManager.tsx (раньше изменён для физики)  
- components/World/Player.tsx (интерполяция)

Инструкция по ревью
-------------------
1. Прогонить lint и сборку: `npm run build`  
2. Запустить `npm run preview` и открыть DevTools → Performance  
3. Проверить метрики из `PerformanceManager.getMetrics()` (вывести в консоль или использовать debug overlay)  
4. Проверить утечки памяти при длительном прогоне (5+ минут)

Контакт/автор
-------------
Изменения внесены автоматически агентом (autobot), автор: dev-team. Если нужно, подготовлю PR на GitHub (создам ветку и PR) — укажите репозиторий/remote.


