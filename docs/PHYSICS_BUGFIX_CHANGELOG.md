# Physics Bugfix Changelog — B-01 through B-07

Branch: `game-engine-audit`  
Files changed: 6 source files, 1 new test file

---

## B-01 — `position.y` hardcoded to 0.5 in store write

**File:** `components/World/hooks/useGamePhysics.ts`

**Before:**
```ts
position: [pos.x, 0.5, pos.z], // FORCE Y=0.5 STABLE
```

**After:**
```ts
position: [pos.x, pos.y, pos.z],
```

**Why:** The forced 0.5 was a workaround for a rendering Z-fight that no longer
exists. Every system that reads `localPlayerState.position[1]` — `SnapshotSystem`,
`CameraController` (fallback path), `DebugOverlay`, `ParticleSystem`,
`ComicPopupSystem`, `NewObstaclesRenderer`, and any future network snapshot — was
seeing a constant mid-air Y instead of the true physics value.

**Position[1] consumer audit:**

| File | Reads `position[1]` | Risk after fix |
|---|---|---|
| `SnapshotSystem.ts:18` | Network Y coordinate | Now transmits real Y — correct |
| `CameraController.tsx:159` | Fallback when `interpolated` is null | Safe: `interpolated` overrides it on line 163 |
| `PlayerController.tsx:62` | Fallback when stabilizer has no data | Safe: same pattern |
| `DebugOverlay.tsx:51` | HUD display | Now shows real jump height — correct |
| `ParticleSystem.tsx:121` | Particle spawn height | Particles now spawn at correct Y |
| `ComicPopupSystem.tsx:39` | Popup anchor | Popups now track real player Y |
| `selectors.ts:28` | Selector re-export | Passthrough — no change needed |

No consumer assumed Y was always 0.5; all of them are improved by receiving real data.

---

## B-02 — Double jump registration (dual trigger path)

**Files:** `components/Input/EnhancedControls.tsx`, `components/World/hooks/useGamePhysics.ts`

### Flow diagram

```
BEFORE (broken):
  keydown(Space)
      ├─ store.setLocalPlayerState({ isJumping: true })   ← path A
      └─ store.jump() → eventBus('player:jump_input')     ← path B
                             └─ physicsEngine.jump()

  Next physics tick:
      pState.isJumping === true → playerPhysics.requestJump()   ← path A fires again
                                       └─ jump() → consumes jumpsRemaining

  Result: 2 jump calls per key press; first ground-jump burns double-jump charge.

AFTER (fixed):
  keydown(Space)
      └─ store.jump() → eventBus('player:jump_input')     ← single path
                             └─ physicsEngine.jump()

  Physics tick: no isJumping poll — redundant requestJump() block removed.
```

**Changes:**
- Removed `setLocalPlayerState({ isJumping: true })` from keyboard, swipe-up, tap,
  and gamepad-A handlers.
- Replaced `setTimeout(() => setLocalPlayerState({ isJumping: false }), N)` with
  `setTimeout(() => store.stopJump(), N)` for cut-jump behaviour.
- Deleted the `pState.isJumping && !playerPhysics.isJumping && playerPhysics.isGrounded → requestJump()` 
  polling block in `useGamePhysics.ts`.

**Guard against same-tick re-trigger:** `PlayerPhysics.jump()` internally checks
`jumpsRemaining > 0` and `isGrounded || coyoteTimer > 0`; eventBus debouncing is
not needed because the event is only emitted once per key press.

---

## B-03 — Lane spring overshoot / slide-into-adjacent-lane

**File:** `core/physics/PlayerPhysicsLogic.ts`

| Parameter | Before | After | Rationale |
|---|---|---|---|
| `laneDamping` | 0.88 (ζ < 1, underdamped) | **1.0** (ζ = 1, critical) | Critical damping gives fastest settling with zero oscillation |
| Extra kick on lane change | `laneVelocity += direction * 5` | **removed** | Kick compounded underdamped spring; with ζ=1 the spring settles sharply on its own |

Critical damping preserves full responsiveness — `laneSpeed = 28` gives a
natural frequency ω = 28 rad/s, meaning the player reaches the target lane in
~3/(28) ≈ 107 ms with zero overshoot. The "punchy feel" now comes from the
spring acceleration alone, not from an artificial velocity bump.

---

## B-04 — `isSliding` stuck when keyup is lost (focus loss)

**File:** `components/Input/EnhancedControls.tsx`

**Changes:**
1. Added named `handleVisibilityChange` function (previously anonymous — would not
   be removed by `removeEventListener`).
2. `window blur` and `document visibilitychange` both call `resetInputState()`:
   - Flushes `inputManager.inputState.keys` set (prevents ghost key presses after refocus).
   - Clears `store.isSliding` and `store.isJumping`.
   - Calls `store.stopJump()` (cuts any pending variable-height jump).
3. Physics ↔ store sync already exists in `useGamePhysics.ts` lines 84–93:
   - `pState.isSliding && !physics.isSliding → physics.requestSlide()`
   - `!pState.isSliding && physics.isSliding → physics.stopSlide()`
   - These ensure that if `isSliding` somehow drifts, the next physics tick corrects it
     in both directions.

**Hold behaviour preserved:** Slide while holding down-arrow still works — the
slide is driven by `pState.isSliding` being true (set on keydown, cleared on keyup
or blur), and `PlayerPhysics.requestSlide()` guards against resetting the timer
while the slide is already in progress.

---

## B-05 — PhysicsStabilizer visual freeze at 0 substeps

**File:** `core/physics/PhysicsStabilizer.ts`

**Root cause:** When accumulator < fixedTimeStep (common at 120+ FPS or after a
tab-hidden pause), the substep loop never runs. `previousState` retained its
value from the *last frame that had a substep*, so `getInterpolatedState()`
interpolated between a stale previousState and the current one — producing a
"jump" backward in position whenever substeps resumed.

**Fix (3 lines):**
```ts
if (this.physicsUpdatesThisFrame === 0 && this.currentState) {
    this.previousState = this.cloneState(this.currentState);
}
```
When no substep executes, previousState is advanced to currentState, so alpha
interpolates over a zero-length interval (correct: stay at current position).

**New test:** `tests/core/physics/PhysicsStabilizer.test.ts`
- 0-substep frame does not produce stale Y.
- 10 consecutive 0-substep frames do not drift position.
- Normal 60 FPS substep count, NaN clamping, spiral-of-death guard.

---

## B-06 — Graze detection window too narrow at high speed

**File:** `core/physics/CollisionSystem.ts`

**Before:** `Math.abs(zEnd) < 1.0` — hard-coded 1-unit window.  
**After:** `Math.max(1.5, forwardTravelPerStep * 3)` — proportional to speed.

At 45 u/s with a 60 Hz fixed step, `forwardTravelPerStep ≈ 0.75`, giving a
2.25-unit window. Graze is now reliable across the full speed range.

---

## B-07 — Trampoline fires on ascending contact

**Files:** `core/physics/CollisionSystem.ts`, `core/physics/PhysicsEngine.ts`

**Before:** Bounce triggered whenever `playerY > objY + 0.3` regardless of
vertical velocity direction.  
**After:** Added `&& playerVelocityY <= 0` guard — bounce only fires when the
player is falling onto or at the peak of a worm, not when jumping upward through it.

`playerVelocityY` is now threaded through the full CCD call chain:
`PhysicsEngine.update()` → `checkWithCCD()` → `checkSimple()`.

---

## Risks and Rollback Plan

The only breaking-surface risk is **B-01**: any external system that relied on
`position[1]` always being 0.5 as a "safe default" would now receive real jump
heights. Audit above shows no consumer makes that assumption. All other changes
are internal to physics and input subsystems with no public API surface changes.

**Rollback:** All changes are in a single feature branch (`game-engine-audit`).
`git revert HEAD` or `git revert <commit-sha>` restores the previous state
atomically. No migration, no schema change, no dependency added.

---

## Manual QA Checklist

- [ ] **Jump** — press Space: player jumps, does not consume double-jump
- [ ] **Double jump** — second Space in air: fires correctly, third has no effect
- [ ] **Variable-height jump** — tap vs hold Space: short vs full jump arc
- [ ] **Lane switch** — swipe/arrow left/right: no visible overshoot past target lane
- [ ] **Slide hold** — hold down-arrow for full duration: slide ends naturally at ~0.7 s
- [ ] **Slide release** — release before timer: slide ends immediately
- [ ] **Blur/focus** — Alt-Tab then back: slide and jump flags cleared, no ghost inputs
- [ ] **Low FPS** (throttle CPU to 4×) — player position does not freeze between frames
- [ ] **High FPS** (120+) — movement smooth, no stutter
- [ ] **Trampoline** — jump over worm: no bounce on ascent; land on top: bounce fires
- [ ] **Graze** — pass close to obstacle at high speed: graze combo increments

---

## Test and Lint Commands

```sh
# Run all unit tests
pnpm vitest run

# Run only physics tests
pnpm vitest run tests/core/physics

# Run specific stabilizer regression
pnpm vitest run tests/core/physics/PhysicsStabilizer.test.ts

# Type-check entire project
pnpm tsc --noEmit

# Lint
pnpm eslint . --ext .ts,.tsx
```
