# ToLOVERunner — Project Status

> **Single source of truth.** Update this file with every release.  
> Marketing copy lives in README.md. Historic ADRs live in `docs/adr/`.

---

## Current Release

| Field | Value |
|-------|-------|
| **Version** | v2.4.1 |
| **Date** | 2026-04-04 |
| **Branch** | `main` |

---

## CI / Build Health

| Check | Status |
|-------|--------|
| TypeScript type-check | ✅ `npm run type-check` |
| ESLint (0 errors) | ✅ `npm run lint` |
| Unit + Integration tests (65/65) | ✅ `npm run test` |
| Production build | ✅ `npm run build` |
| Security audit (high+critical) | ✅ `npm run security:audit` |

---

## Minimum Playability Criteria

A build is considered **playable** when all of the following are true:

1. **Starts without errors** — no unhandled exceptions on load, canvas renders
2. **Controls respond** — WASD / arrow keys move the player, Space jumps
3. **Pause works** — P or Escape pauses and resumes correctly
4. **Game Over occurs** — lives deplete properly after obstacle collisions
5. **Score and distance increment** — HUD updates during gameplay
6. **No memory runaway** — memory growth stays below +50 KB/sec after the first 30 s of play
7. **Stable FPS** — average ≥ 55 FPS on a mid-range desktop (Chrome, no dev tools)

Run `npm run test:e2e` to verify automated smoke scenarios; run `npm run test` for unit/integration coverage.

---

## Known Open Issues

| Priority | Issue | Tracking |
|----------|-------|----------|
| Low | `no-explicit-any` warnings in Three.js material adapters | `docs/IMPROVEMENTS_BACKLOG.md` |
| Low | `react-refresh/only-export-components` warnings in context files | `docs/IMPROVEMENTS_BACKLOG.md` |
| Backlog | PlayerPhysics.test.ts skipped (component needs different test approach) | `docs/IMPROVEMENTS_BACKLOG.md` |

---

## Quick Commands

```bash
# Install
npm ci

# Development server (localhost:3000)
npm run dev

# Full quality gate (mirrors CI)
npm run type-check && npm run lint && npm run test && npm run build && npm run security:audit

# E2E tests (requires build first)
npm run build && npm run test:e2e
```

---

## Active Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
| [CORE_SYSTEMS.md](./CORE_SYSTEMS.md) | Core subsystem reference |
| [IMPROVEMENTS_BACKLOG.md](./IMPROVEMENTS_BACKLOG.md) | Active tech-debt and backlog |
| [TESTING.md](./TESTING.md) | Testing strategy and QA guide |
| [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) | Common issues and fixes |
| [RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md) | Deployment runbook |
| [THREE_JS_BUGS.md](./THREE_JS_BUGS.md) | Three.js / R3F bug history |
| [CHANGELOG.md](../CHANGELOG.md) | Version history |
| [ROADMAP.md](../ROADMAP.md) | Upcoming milestones |
| [adr/](./adr/) | Architecture Decision Records |

---

## Archived Documents

Historical development plans, draft GDDs, and one-time PR analyses have been moved to `docs/archive/`. They are kept for reference but are no longer maintained.
