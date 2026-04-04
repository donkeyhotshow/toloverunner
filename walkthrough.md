# Project Reorganization Walkthrough

## Summary of Changes

### 1. Documentation Consolidation

**Moved 13 report-type docs from `docs/` to `docs/reports/`:**

- `POORLY_IMPLEMENTED_AUDIT.md`
- `SECURITY_AND_PERFORMANCE_AUDIT.md`
- `ROAD_AND_ENVIRONMENT_STABILITY.md`
- `STABILITY_REVIEW.md`
- `IMPROVEMENTS_AND_STABILITY.md`
- `AUDIT_AND_CLEANUP_2026-02.md`
- `GAMEPLAY_FULL_ANALYSIS.md`
- `FINAL_OPTIMIZATION_SUMMARY.md`
- `STABILITY_REPORT.md`
- `GAMEPLAY_SCREENSHOTS_ANALYSIS.md`
- `STABILITY_AUDIT_REPORT.md`
- `PROJECT_ANALYSIS_REPORT.md`
- `VISUAL_PHYSICS_IMPROVEMENT_SPEC.md`

**Deleted duplicate directory:**
- `plans/VISUAL_PHYSICS_IMPROVEMENT_SPEC.md` — exact duplicate of `docs/VISUAL_PHYSICS_IMPROVEMENT_SPEC.md`

**Permanent docs kept in `docs/` root:**
- `ARCHITECTURE.md`, `RUNBOOK_DEPLOY.md`, `PROJECT_DEVELOPMENT_PLAN.md`
- `GDD_Visual_Spec.md`, `GDD_obstacle_patterns.md`, `SPERM_RUNNER_SPEC.md`, `ENEMY_SYSTEM.md`
- `TESTING.md`, `TESTING_GUIDE.md`, `QA_TEST_PLAN.md`, `GAMEPLAY_TESTING_CHECKLIST.md`
- `ADVANCED_OPTIMIZATION_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md`, `PRODUCTION_DEPLOYMENT.md`
- `API.md`, `TEXTURES.md`, `SENTRY_SETUP.md`, `CORE_SYSTEMS.md`, `3D_MODEL_INTEGRATION_GUIDE.md`
- `IMPROVEMENTS_BACKLOG.md`, `WEAK_SPOTS_AND_IMPLEMENTATION_GAPS.md`
- `PR_LOD_Instancing_Optimization.md`, `OBSTACLE_PATTERNS.md`
- `adr/0001-stabilization-strategy.md`

### 2. Scripts Organization

Scripts were already organized into:
- `scripts/` — utility scripts (build tools, SSL gen, screenshot capture)
- `scripts/tests/` — test scripts (stress test, visual scan, performance runner)

No changes needed — structure was already clean.

### 3. `.gitignore` Updates

**Added entries:**
```
stress_test_log.txt        # Specific test log
test-screenshots/          # Playwright test screenshots
.agent/                    # AI assistant artifacts (images, videos)
.kiro/                     # IDE-specific config
**/issues-report.json      # Generated report (any directory)
**/eslint-report.json      # Generated report (any directory)
**/ts-errors-*.log         # TypeScript error logs (any directory)
```

**Already covered:**
- `*.log`, `dist/`, `node_modules/`, `.env`, `test-results/`, `blob-report/`, `coverage/`
- `*.pem`, `*.key`, `certs/`, `*.crt` — secrets/certs
- `*.png` (with exceptions for `public/`, `docs/`, `screenshots/`)

### 4. Deleted Junk Files

- `firebase-debug.log` — Firebase debug output
- `plans/` — duplicate directory with one file already in `docs/`

### 5. README.md Fixes

**Removed broken links:**
- `RELEASE_PRESENTATION.md` — file does not exist
- `REFACTORING_AUDIT.md` reference — file does not exist

**Verified working links:**
- All `docs/reports/*` links — correct after move
- All `docs/*` links — correct
- `CHANGELOG.md` — correct

---

## Final Project Root Structure

```
toloverunner/
├── App.tsx                    # Main application
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── index.css                  # Global styles
├── constants.ts               # Root constants
├── store.ts                   # Root store
├── types.ts                   # Root types
├── package.json               # Dependencies
├── package-lock.json          # Lock file
├── tsconfig.json              # TypeScript config
├── tsconfig.eslint.json       # TS config for ESLint
├── vite.config.ts             # Vite config
├── vitest.config.ts           # Vitest config
├── playwright.config.ts       # Playwright config
├── eslint.config.js           # ESLint config
├── tailwind.config.js         # Tailwind config
├── postcss.config.js          # PostCSS config
├── vercel.json                # Vercel deployment
├── Dockerfile                 # Docker (frontend)
├── Dockerfile.server          # Docker (server)
├── docker-compose.yml         # Docker Compose
├── nginx.conf                 # Nginx config
├── CHANGELOG.md               # Version history
├── README.md                  # Project documentation
├── .env.example               # Environment template
├── quick-start.bat            # Windows quick start
├── quick-start.sh             # Linux/Mac quick start
│
├── src/  (implicit in root)
│   ├── components/            # React components
│   ├── hooks/                 # Custom hooks
│   ├── store/                 # Zustand store slices
│   ├── core/                  # Core systems (physics, visuals)
│   ├── constants/             # Constants modules
│   ├── types/                 # Type definitions
│   ├── utils/                 # Utilities
│   ├── infrastructure/        # Infrastructure (network, monitoring)
│   ├── server/                # Server-side code
│   ├── assets/                # Static assets
│   └── public/                # Public assets
│
├── docs/                      # Permanent documentation
│   ├── adr/                   # Architecture Decision Records
│   └── reports/               # Audit reports & analysis
│
├── scripts/                   # Build & utility scripts
│   └── tests/                 # Test scripts
│
├── tests/                     # Test files
├── screenshots/               # Gameplay screenshots (tracked)
├── .github/                   # GitHub Actions CI
└── .vscode/                   # VS Code settings
```

---

## First Git Push Instructions

### Step 1: Initialize Repository (if not already done)

```bash
cd E:/toloverunner
git init
```

### Step 2: Verify `.gitignore` is Working

```bash
# Check what will be tracked
git status

# These should NOT appear:
# - node_modules/
# - dist/
# - .env (only .env.example)
# - test-results/
# - test-screenshots/
# - .agent/
# - *.log files
```

### Step 3: Remove Cached Files (if re-initializing)

If `.gitignore` was added after files were already tracked:

```bash
# Remove cached entries that should be ignored
git rm -r --cached .agent/ 2>/dev/null
git rm -r --cached dist/ 2>/dev/null
git rm -r --cached test-results/ 2>/dev/null
git rm -r --cached test-screenshots/ 2>/dev/null
git rm --cached .env 2>/dev/null
git rm --cached docs/reports/ts-errors-20260308.log 2>/dev/null
git rm --cached docs/reports/eslint-report.json 2>/dev/null
git rm --cached docs/reports/issues-report.json 2>/dev/null
```

### Step 4: Stage All Files

```bash
git add .
```

### Step 5: Verify Staged Files

```bash
# Review what's staged
git status

# Make sure sensitive files are NOT staged:
git status | grep -i "\.env$"
# Should return nothing (only .env.example should be staged)

git status | grep "node_modules"
# Should return nothing
```

### Step 6: Create Initial Commit

```bash
git commit -m "chore: project reorganization for GitHub publication

- Consolidate 13 report docs into docs/reports/
- Remove duplicate plans/ directory
- Update .gitignore for test artifacts and IDE files
- Fix broken documentation links in README.md
- Clean up temporary files (firebase-debug.log)
- Enterprise-ready repository structure"
```

### Step 7: Create GitHub Repository & Push

```bash
# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/toloverunner.git

# Push to main
git branch -M main
git push -u origin main
```

### Step 8: Verify on GitHub

After pushing, verify:
- [ ] `node_modules/` is NOT in the repo
- [ ] `dist/` is NOT in the repo
- [ ] `.env` is NOT in the repo (only `.env.example`)
- [ ] `test-results/` is NOT in the repo
- [ ] `.agent/` is NOT in the repo
- [ ] README.md renders correctly with all links working
- [ ] `docs/reports/` contains all audit reports

---

## Cleanup Command (Optional)

If you want to permanently delete build artifacts and test outputs from disk to save space:

```powershell
# PowerShell — run from project root
Remove-Item -Recurse -Force dist/, test-results/, test-screenshots/, .agent/, node_modules/ -ErrorAction SilentlyContinue; Write-Output "Cleanup complete. Run 'npm install' to restore node_modules."
```

```bash
# Bash — run from project root
rm -rf dist/ test-results/ test-screenshots/ .agent/ node_modules/ && echo "Cleanup complete. Run 'npm install' to restore node_modules."
```

> **Note:** `screenshots/` is intentionally kept (tracked in git, referenced in README).
