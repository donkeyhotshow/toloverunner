# Полный анализ геймплея ToLOVERunner

**Версия:** 2.2.0  
**Дата анализа:** по кодовой базе

---

## 1. Как выглядит геймплей

### 1.1 Главное меню (LobbyUI)

- **Фон:** светло-голубой `#87CEEB`, комиксный стиль.
- **Эффекты:**
  - Halftone-оверлей (точки 10×10px, opacity 5%).
  - Вращающийся conic-gradient (action lines).
  - Облака: три motion-облака плывут слева направо с разной скоростью и задержкой (25s, 18s, 30s).
- **Логотип:** «SPERN» красный, «RUNNER» голубой, шрифт Bangers; бейдж версии v2.2.0 справа сверху.
- **Карточка меню:** белая, бордер 6px чёрный, скругление 30px, жёлтый сдвиг тени справа снизу.
- **Кнопки:** ИГРАТЬ (зелёная), ГАЛЕРЕЯ, МАГАЗИН (сетка 2 колонки); внизу ЗВЕЗДЫ / РЕКОРД и иконки настроек/инфо.
- **Параллакс:** контейнер сдвигается от мыши (до ±15px).
- **При клике ИГРАТЬ:** эффект «POW!» в точке клика, через 500ms вызывается `startGame()`.

---

### 1.2 Обратный отсчёт (CountdownScreen)

- **Фон:** полупрозрачный чёрный, ben-day точки.
- **Цифры:** 3 → 2 → 1 (крупно, белые, comic-text-stroke), spring-анимация появления/исчезновения.
- **«GO!»:** зелёный `#44FF44`, после 0.8s вызывается `startGameplay()`.
- **Декор:** эмодзи ⚡💥🔥💨 по углам с анимациями (spin, bounce, pulse, ping).

---

### 1.3 Игровой HUD (во время RUN)

**Верхняя панель (ComicTopBar):**

- **Слева — очки:** панель градиент (жёлтый/золотой), иконка 💰, подпись «SCORE», число `score.toLocaleString()`, тень и «блик» сверху.
- **По центру — жизни:** до 3 сердец ❤️; потерянные показываются как 🖤 (opacity 40%, grayscale). Анимация heartBeat для полных.
- **Справа — таймер:** градиент голубой, иконка ⏰, время MM:SS от `sessionStartTime`.

**Левая панель (ComicLeftPanel):**

- Блок «DASH»: градиент голубой, иконка ⚡, бейдж справа сверху — «OK» / «GO!» при даше / число при кулдауне (секунды).
- Появляется с анимацией slideInLeft.

**Правая панель (ComicRightPanel):**

- Показывается только при `combo >= 2`.
- Жёлтый градиент, «COMBO! 🔥», крупное число комбо, строка «×N BONUS!» (множитель = floor(combo/5)+1).
- Анимация slideInRight.

**Дополнительно на экране:**

- PerfectTimingIndicator: жёлтая панель по центру сверху — «PERFECT TIMING!», «+100», «BONUS POINTS» (до 2.5s).
- JumpPopup по событию `player-jump`.
- ComicFeedback и GrazeFeedback по событиям.
- Декоративные стикеры «BOOM!» (жёлтый, левая четверть) и «POW!» (красный, правая четверть) — статичные, comic-text-stroke.
- На тач-устройствах: MobileControls внизу — две кнопки влево/вправо и кнопка прыжка (стекло bg-white/40, иконки ChevronLeft, ChevronRight, ArrowUp), видимость opacity 20%/40%.

---

### 1.4 3D-сцена

- **Канвас:** фон `#000033`, камера FOV 60, near 0.1, far 110.
- **SceneController** при `status !== MENU` рендерит:
  - **WorldLevelManager** — уровень.
  - **PlayerController** — игрок (ToonSperm + тень + trail + DustClouds).
  - **CameraController** — камера следом.
  - **BackgroundTunnel** — фон-туннель.
- **Трек (BioInfiniteTrack):** бесконечная дорога (PlaneGeometry, изгиб через шейдер), стены по бокам, цвета из BIOME_CONFIG (BIO_JUNGLE по умолчанию).
- **Объекты:** InstancedLevelObjects (пикапы), VirusObstacles, NewObstaclesRenderer (OBSTACLE_JUMP/SLIDE/DODGE), WarningIndicator, ComicVFX, FinishEgg (золотое яйцо впереди, видно в последние ~900 м).
- **Игрок:** модель ToonSperm, свечение при сборе/ударе/graze, тень под ногами, ParticleTrail, при смене полосы — DustClouds.

---

### 1.5 Экраны паузы, поражения и победы

- **PauseScreen:** затемнение bg-black/70, ben-day, панель «PAUSED», кнопки RESUME и MENU, подпись «DON'T GIVE UP!». RESUME → `setStatus(PLAYING)`, MENU → `resetGame()`.
- **GameOverScreen:** череп, «FAILED!», «TRY AGAIN?», статистика (Score, Distance, DNA, Best Combo), кнопки REVIVE (1 💎), RESTART, MENU. MENU → `resetGame()`.
- **VictoryScreen:** жёлтый фон, «VICTORY!», «NEW LIFE CREATED!», финальный счёт и дистанция/гены, кнопки PLAY AGAIN и MENU.

---

## 2. Как работает геймплей

### 2.1 Цикл состояний

1. **MENU** — LobbyUI, по «ИГРАТЬ» → `startGame()`.
2. **COUNTDOWN** — обратный отсчёт, по завершении → `startGameplay()`.
3. **PLAYING** — обновление мира в GameLoopRunner (worldUpdate), физика и коллизии в useGamePhysics, дистанция и победа в WorldLevelManager.
4. **PAUSED** — P/ Escape, пауза через setStatus(PAUSED); время не идёт (worldUpdate не вызывается при isPaused).
5. **GAME_OVER** — при lives → 0, с задержкой 1s после последнего удара.
6. **VICTORY** — при `totalDistanceRef.current >= WIN_DISTANCE + 10` (3000+ м).

---

### 2.2 Игровой цикл (GameLoopRunner)

- **useFrame:** каждый кадр читает status, считает finalDelta (hitStop × timeScale), вызывает:
  - при **PLAYING:** `callbacks.worldUpdate` (один callback от WorldLevelManager);
  - при **PLAYING** или **MENU:** `callbacks.playerUpdate`;
  - если не **PAUSED:** `callbacks.renderUpdate`, `callbacks.lateUpdate`.
- После этого — flush инстанс-мешей.

---

### 2.3 WorldLevelManager (один worldUpdate за кадр)

1. **Дистанция:** `totalDistanceRef.current += speed * delta * (speedBoost ? 2 : 1)`; раз в 0.2s пишет в store `increaseDistance` (обновляет store.distance, timePlayed, скорость по кривой +5% каждые 30s, cap 40).
2. **Трек:** `trackSystem.update(totalDistanceRef.current)`.
3. **Таймеры:** updateDashCooldown, updateShieldTimer, updateMagnetTimer, updateSpeedBoostTimer.
4. **Кulling:** объекты с worldZ > 30 или < -900 деактивируются и возвращаются в pool; пересобираются списки obstacles / specialObstacles / pickups.
5. **Чанки:** `checkChunkGeneration(totalDistanceRef.current)` — процедурная генерация через procGen.
6. **Физика и коллизии:** `updatePhysics(safeDelta, objects, totalDistanceRef, accumulatedScoreDistance)`.
7. **Победа:** если `totalDistanceRef.current >= WIN_DISTANCE + 10` → `setStatus(VICTORY)`.

---

### 2.4 Физика и коллизии (useGamePhysics)

- **PlayerPhysics:** таргет по полосе из store (`localPlayerState.lane`), прыжок и слайд по флагам. Скорость мира = store.speed × (speedBoost ? 2 : 1) × (dash ? 2 : 1). Движение мира — сдвиг `currentPhysicsDist` на effectiveSpeed*dt; коллизии через PhysicsEngine (CollisionSystem).
- **Магнит:** при magnetActive объекты (не препятствия) в радиусе 15 притягиваются к игроку (pullStrength 50).
- **Сбор:** при пересечении с пикапом ставится `obj.collecting = 0.35`, затем по таймеру объект освобождается; сразу вызываются store.collectCoin(100) / collectGene() / activateShield / activateSpeedBoost / activateMagnet и события (particle-burst, play-sound, hud-pulse и т.д.).
- **Удар:** при коллизии с OBSTACLE* вызываются store.takeDamage(), рекоил игроку, screen-shake, play-sound, player-hit, particle-burst; объект деактивируется.
- **Graze:** при graze-коллизии — store.graze() (очки +50, комбо +1).
- **Страх:** вычисляется nearestEnemyDistance в текущей полосе впереди, пишется в store (для возможного UI/звука).

---

### 2.5 Управление

- **Клавиатура (EnhancedControls):** стрелки / A-D — смена полосы (lane), Space/Up/W — прыжок, Shift — dash, Down/S — слайд. Состояние в store: setLocalPlayerState({ lane, isJumping, isSliding }), dash() из store.
- **Мобильные (MobileControls):** только lane ±1 и прыжок; dash с мобильного идёт через другую обвязку (например AdaptiveMobileControls), если подключена.
- **Полосы:** 5 полос, lane от -2 до 2, ширина полосы LANE_WIDTH = 2.

---

### 2.6 Очки и комбо

- **Монета (COIN):** collectCoin(100). Внутри: если с момента lastCollectTime < 500ms — bonus 100 (Perfect Timing), newCombo = combo+1, multiplier = floor(newCombo/5)+1, итог (100+bonus)*multiplier; также лёгкий прирост скорости (cap 40), genesCollected += 5, сохранение, события perfect-timing / coin-collected и т.д.
- **Ген (GENE/DNA_HELIX):** collectGene() — +500 очков, +1 gem, momentum.
- **Урон:** комбо сбрасывается в 0, скорость падает (×0.5, min 10), 1.5s неуязвимости (если не прикрыт щитом).

---

### 2.7 Power-ups

- **Щит:** 10s, shieldActive = true, при takeDamage не отнимается жизнь.
- **Speed Boost:** 5s, скорость +15, isImmortalityActive true на время буста.
- **Магнит:** 10s, magnetActive, в useGamePhysics притягиваются пикапы в радиусе 15.

---

### 2.8 Dash

- Условие: dashCooldown <= 0 и не isDashing. Ставится isDashing, isInvincible, dashCooldown = 2s; цепочка дашей (за 1s) даёт dashChainCount. В физике при isDashing: currentLanePos = targetLane*LANE_WIDTH, лёгкий вертикальный импульс.

---

## 3. Визуальные и технические детали

- **Шрифты:** Bangers (комикс), Rubik (UI), Comic Neue; в index.css и index.html подключены Google Fonts.
- **Цвета/паттерны:** CSS-переменные и утилиты в index.css (comic-shadow, comic-border, comic-text-stroke-lg, bg-ben-day, comic-bg-dots и т.д.).
- **Анимации:** Tailwind + framer-motion (CountdownScreen, LobbyUI, модалки); в 3D — useFrame в Player, FinishEgg, треке.
- **Звуки:** через CustomEvent 'play-sound' (coin-collect, enemy-hit, powerup-collect и др.); инициализация unifiedAudio при первом клике в меню.
- **Производительность:** лимит объектов (MAX_OBJECTS 300), culling по Z, instanced mesh для трека и объектов, pool для GameObjects.

---

## 4. Итоговая схема «как выглядит и как работает»

| Экран / режим | Внешний вид | Что происходит по коду |
|---------------|-------------|-------------------------|
| Меню | Голубое небо, облака, SPERN RUNNER, карточка с кнопками | LobbyUI, параллакс, по ИГРАТЬ → startGame → COUNTDOWN |
| Обратный отсчёт | 3-2-1-GO, декор | CountdownScreen, по завершении → startGameplay → PLAYING |
| Игра | Трек, полосы, препятствия и пикапы, игрок по центру, HUD сверху/сбоку | GameLoopRunner → worldUpdate (дистанция, culling, чанки, updatePhysics, победа при ≥3010м) |
| Пауза | Затемнение, PAUSED, RESUME/MENU | setStatus(PAUSED); RESUME → PLAYING, MENU → resetGame |
| Game Over | FAILED!, статистика, REVIVE/RESTART/MENU | lives=0 → через 1s setStatus(GAME_OVER); MENU → resetGame |
| Victory | VICTORY!, счёт, PLAY AGAIN/MENU | totalDistance ≥ 3010 → setStatus(VICTORY); endGameSession вызывается на VictoryScreen |

Управление: полосы (A/D или мобильные кнопки), прыжок (Space/Up/W или тап), слайд (S/Down), dash (Shift). Коллизии и сбор обрабатываются в useGamePhysics внутри worldUpdate; победа и поражение задаются в WorldLevelManager и gameSlice (takeDamage → таймер 1s → GAME_OVER).
