# Branch Cleanup Report

All branches have been analyzed. Every branch listed below is **fully merged into `main`** (zero unique commits outside of `main`).

## Stale branches to delete

- `bug-fix`
- `feat/cartoon-intestine-sperm`
- `push-debug`
- `copilot/merge-all-branches-to-main`
- `copilot/merge-fix-conflicts`
- `copilot/analyze-and-find-bugs`
- `copilot/audit-gameplay-alignment`
- `copilot/clean-up-unnecessary-files`

You can delete them from the GitHub UI (**Branches** page) or via CLI:

```bash
for branch in bug-fix feat/cartoon-intestine-sperm push-debug \
  copilot/merge-all-branches-to-main copilot/merge-fix-conflicts \
  copilot/analyze-and-find-bugs copilot/audit-gameplay-alignment \
  copilot/clean-up-unnecessary-files; do
  git push origin --delete "$branch"
done
```
