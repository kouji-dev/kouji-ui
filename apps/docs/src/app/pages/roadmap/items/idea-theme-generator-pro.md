---
title: Theme generator pro — exports, share, diff, history
description: Extend the existing visual generator with multi-target exports, shareable draft URLs, two-theme diff, undo history, and a one-click "open PR" against a repo.
version: v0.3+
date: Q4 2026
category: theme
status: idea
candidate: true
---

The generator is already the killer feature; this is the natural follow-on:

- **Export targets**: CSS file (today), W3C `design-tokens.json`, Tailwind config, Style Dictionary, iOS/Android-flavored token bundle. Same draft, multiple outputs.
- **Import from existing CSS** — paste a `.css` file with `--my-var` declarations, kj remaps onto its own token slots and seeds a draft.
- **Side-by-side diff** — pick two themes, see which tokens diverge and which contrast pairs change tier.
- **History timeline** — undo / redo / named snapshots, all in-session.
- **Live share URL** — encode the draft state in a URL hash; paste to a teammate, they see the exact draft.
- **Open PR** — given a GitHub repo URL, kj generates a PR adding the theme file. The theme contract test makes the PR safe to merge.
