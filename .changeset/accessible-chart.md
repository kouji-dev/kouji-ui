---
'@kouji-ui/components': minor
---

Add `<kj-chart>` — an accessible Apache ECharts wrapper (new component).

- SSR-safe lazy init in the browser only, reactive `option`, auto-resize via `ResizeObserver`, and clean dispose on destroy.
- Accessibility: ECharts paints an opaque `<canvas>`, so the host now carries `role="img"` and a required-in-practice `ariaLabel` for the accessible name. An optional `caption` renders a visually-hidden summary wired to the host via `aria-describedby`. The host takes no tab stop, so keyboard users are never trapped.
- Ships playground, usage example, and bar + donut examples.
