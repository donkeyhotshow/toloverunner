# 📋 MASTER CHECKLIST: TO LOVE RUNNER (v1.0 Release)

### 🎮 I. ОСНОВНЫЕ МЕХАНИКИ (Core Mechanics)

*Как это управляется и ощущается.*

**1. Перемещение (Movement)**
* [ ] **Lane System:** Ровно 5 полос движения (X: -4, -2, 0, 2, 4).
* [ ] **Snappy Lerp:** Смена лайна не линейная, а через `MathUtils.lerp` с фактором `15-20`.
* [ ] **Speed Curve:** Start `10-12 u/s`, Max `25-30 u/s`, Duration `120s`.

**2. Физика Прыжка (Custom Physics)**
* [ ] **Gravity:** ~`35.0`.
* [ ] **Jump Force:** ~`12.0-15.0`.
* [ ] **Ground Check:** `y <= 0` only.

**3. Рывок (Dash)**
* [ ] **Input:** Swipe Down.
* [ ] **Effect:** Invulnerability 1.5s.
* [ ] **Visual:** FOV +15, Speed Lines.

**4. Коллизии (Hitboxes)**
* [ ] **Forgiveness Rule:** Player Radius `0.5`, Enemy Radius `0.6`.
* [ ] **Distance Check:** Use `distanceTo`.
* [ ] **Side-Collision:** Death on side impact.

---

### 🕹️ II. ГЕЙМПЛЕЙ И ЦИКЛ (Gameplay Loop)

**1. Спавн Препятствий (Spawning Logic)**
* [ ] **Pattern System:** Wall, Slalom, Tunnel chunks.
* [ ] **Z-Culling:** remove at `z > 5`.

**2. Бонусы и Пикапы (Pickups)**
* [ ] **DNA Coin:** Sound + Particles.
* [ ] **Magnet:** Radius 15u.
* [ ] **Shield:** Visual Sphere.

**3. Прогрессия и Финал**
* [ ] **Progress Bar:** 0-3000m.
* [ ] **Win Condition:** Stop spawn at 3000m.
* [ ] **Boss Sequence:** Giant Egg approach.

---

### 🧊 III. МОДЕЛИ И АССЕТЫ (3D Models)

**1. Игрок (The Hero)**
* [ ] **Shape:** Teardrop + Tail.
* [ ] **Style:** White, Toon, Outline.
* [ ] **Face:** Eyes, Mouth.

**2. Враги (The Viruses)**
* [ ] **Type A (Spike):** Lime Green.
* [ ] **Type B (Blocker):** Toxic Purple.
* [ ] **Type C (Static):** Deep Red.
* [ ] **Face:** Eyes on all.

**3. Окружение (Environment)**
* [ ] **Track:** Pipe Slice geometry, Meat texture.
* [ ] **Walls:** Semi-transparent.
* [ ] **Props:** DNA, Cells.

---

### 🏃 IV. АНИМАЦИИ (Animations)

**1. Процедурные (Code-based)**
* [ ] **Tail Wiggle:** Sinewave.
* [ ] **Squash & Stretch:** Jump stretch, land squash.
* [ ] **Lean:** Tilt on turn.

**2. Враги**
* [ ] **Idle:** Breathing pulse.
* [ ] **Rotation:** Spikes rotate.
* [ ] **Reaction:** Close call lookAt/eyes.

---

### ✨ V. ТЕХНИЧЕСКИЙ ПОЛИШИНГ (Tech Polish)

**1. Шейдеры**
* [ ] **Curvature:** World Bending enabled.
* [ ] **Halftone Shadows:** Enabled.
* [ ] **Rim Light:** Enabled.

**2. VFX**
* [ ] **Comic Pop-ups:** BAM/POW text.
* [ ] **Speed Lines:** Enabled.
* [ ] **Dust:** On land.

**3. Звук**
* [ ] **BGM:** Energetic loop.
* [ ] **SFX:** Jump, Collect, Hit, Win.
