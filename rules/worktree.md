# Worktree workflow

## Location

Worktrees live **inside** the repo at `.worktrees/<name>` (e.g. `.worktrees/overlay-impl`). Never sibling to the repo. The `.worktrees/` directory is git-ignored, but the IDE can still open the folder alongside the main checkout.

## Finishing work — merge-back to main

When the work in a worktree is ready to land, follow this flow. The goal: the feature lands as **one squashed commit on top of main**, never a 100-commit-deep merge bubble.

### 1. Add a changeset

Before merging, add a `.changeset/<name>.md` describing the public-API impact (`major` / `minor` / `patch` per package). One changeset per logical release unit — not one per commit.

```md
---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

<short summary of what shipped>
```

### 2. Branch off main

Create a separate merge-back branch based on the latest `origin/main` — never merge directly from the worktree's feature branch into main.

```bash
git fetch origin main
git switch -c merge/<feature-name> origin/main
```

### 3. Squash-merge the feature branch

Bring all the work over as one staged change:

```bash
git merge --squash feat/<feature-name>
# resolve conflicts once
git commit -m "feat(<scope>): <summary>"
```

This produces a single commit on top of main with the combined work.

### 4. Rebase if main moves

If `origin/main` advances while you're polishing build/adaptations, rebase — do **not** add a merge commit:

```bash
git fetch origin main
git rebase origin/main
```

### 5. Push + PR

Push the merge-back branch and open a PR targeting `main`. Run build, lint, and any cross-cutting adaptations (icon migrations, doc-tag refactors, etc.) on this branch.

```bash
git push -u origin merge/<feature-name>
gh pr create --base main --title "..." --body "..."
```

If reviewers (or CI) flag issues, push **new commits** on the merge-back branch — don't amend the squash commit. The PR squash-merge at the end keeps history clean.

## Why this flow

- **One commit on main per feature** — easy to revert, easy to scan history.
- **Rebase, not merge, for main updates** — keeps the merge-back branch linear.
- **Worktree branch is preserved** — if anything goes sideways during merge-back, the original feature branch and its rich history are still there to consult.
- **Changesets pin release intent** — version bumps decided before merge, not retroactively.
