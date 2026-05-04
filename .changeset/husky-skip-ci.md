---
'@kouji-ui/core': patch
---

CI fix: husky pre-push hook now skips in CI environments (`$CI` or `$GITHUB_ACTIONS` set). Prevents the Changesets action's automated push from being blocked by the changeset-status gate. No runtime effect on the published package.
