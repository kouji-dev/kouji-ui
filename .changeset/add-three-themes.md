---
'@kouji-ui/themes': patch
---

Add three new themes: `retro`, `cyberpunk`, `corporate`.

- **retro** — warm cream surfaces with terracotta + sand accents, soft rounding (vintage paper feel).
- **cyberpunk** — hot yellow base with magenta/cyan accents, hard edges and mono type.
- **corporate** — clean white surfaces, blue primary, subtle rounding (calm, business-ready).

Each theme defines every required shared-layer token, verified by the contract test in `themes.spec.ts`. Activate via `data-theme="retro"` (or `cyberpunk` / `corporate`) on the `<html>` element.
