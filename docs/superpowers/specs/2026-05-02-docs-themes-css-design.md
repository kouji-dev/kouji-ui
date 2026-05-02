# Docs Theme Tokens — Design Spec

**Date:** 2026-05-02
**Scope:** `packages/core/src/styles/docs-themes.css` (new) + all `*.example.ts` files refactored to use it + docs extractor updated to include it in code preview

---

## Goal

Centralise all example theme tokens into one CSS file using `@layer` and CSS custom properties. Remove all hardcoded hex values and shadow strings from individual example files. Expose the CSS token file in the "Show code" panel so users see how the theme works.

---

## Part 1: `packages/core/src/styles/docs-themes.css`

New shared CSS file. Loaded by every example component via `styleUrls`.

### Layer structure

```css
@layer kj.tokens, kj.theme;
```

### Token definitions

```css
/* ── Default (dark) tokens ── */
@layer kj.tokens {
  :root {
    --kj-bg: #0c0c0c;
    --kj-surface: #1a1a1a;
    --kj-text: #f0ede6;
    --kj-text-muted: #888;
    --kj-border: #333;
    --kj-accent: #b8f500;
    --kj-accent-on: #0c0c0c;
    --kj-radius-sm: 0px;
    --kj-radius-md: 0px;
    --kj-radius-lg: 0px;
    --kj-shadow-sm: none;
    --kj-shadow-md: none;
    --kj-shadow-hard: none;
    --kj-font: 'JetBrains Mono', monospace;
    --kj-btn-border: none;
    --kj-backdrop: rgba(0, 0, 0, 0.75);
    --kj-transition: opacity 0.15s;
  }
}

/* ── Theme overrides ── */
@layer kj.theme {
  .kj-theme-retro {
    --kj-bg: #fef9c3;
    --kj-surface: #fef9c3;
    --kj-text: #000;
    --kj-text-muted: #444;
    --kj-border: #000;
    --kj-accent: #16a34a;
    --kj-accent-on: #fff;
    --kj-radius-sm: 0px;
    --kj-radius-md: 0px;
    --kj-radius-lg: 0px;
    --kj-shadow-sm: 2px 2px 0 #000;
    --kj-shadow-md: 4px 4px 0 #000;
    --kj-shadow-hard: 6px 6px 0 #000;
    --kj-font: 'Courier New', monospace;
    --kj-btn-border: 2px solid #000;
    --kj-backdrop: rgba(0, 0, 0, 0.6);
    --kj-transition: transform 0.08s, box-shadow 0.08s;
  }

  .kj-theme-finance {
    --kj-bg: #f9fafb;
    --kj-surface: #fff;
    --kj-text: #111827;
    --kj-text-muted: #6b7280;
    --kj-border: #e5e7eb;
    --kj-accent: #3b82f6;
    --kj-accent-on: #fff;
    --kj-radius-sm: 4px;
    --kj-radius-md: 6px;
    --kj-radius-lg: 12px;
    --kj-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
    --kj-shadow-md: 0 8px 30px rgba(0, 0, 0, 0.1);
    --kj-shadow-hard: 0 20px 60px rgba(0, 0, 0, 0.12);
    --kj-font: system-ui, -apple-system, sans-serif;
    --kj-btn-border: 1px solid transparent;
    --kj-backdrop: rgba(0, 0, 0, 0.4);
    --kj-transition: background 0.12s;
  }
}
```

---

## Part 2: Example file refactor

### `styleUrls` + theme class on `:host`

Every example component changes from `styles: [...]` only to:

```typescript
@Component({
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    /* default example: no host class — inherits :root tokens */
    :host { display: flex; ...; background: var(--kj-bg); font-family: var(--kj-font); color: var(--kj-text); }
  `],
  host: { class: '' },           // default: no class, uses :root
})
```

```typescript
@Component({
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`...`],
  host: { class: 'kj-theme-retro' },     // retro examples
})
```

```typescript
@Component({
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`...`],
  host: { class: 'kj-theme-finance' },   // finance examples
})
```

CSS custom properties cascade through Shadow DOM boundaries, so `DynamicComponentService`'s `ShadowDom`-encapsulated examples automatically receive the theme variables from their `:host`.

### Token usage in styles

All hardcoded values replaced:

| Before | After |
|---|---|
| `background: #0c0c0c` | `background: var(--kj-bg)` |
| `color: #f0ede6` | `color: var(--kj-text)` |
| `color: #888` | `color: var(--kj-text-muted)` |
| `border: 2px solid #000` | `border: var(--kj-btn-border)` |
| `background: #b8f500` | `background: var(--kj-accent)` |
| `color: #0c0c0c` (on accent) | `color: var(--kj-accent-on)` |
| `border-radius: 6px` | `border-radius: var(--kj-radius-md)` |
| `box-shadow: 3px 3px 0 #000` | `box-shadow: var(--kj-shadow-sm)` |
| `font-family: 'Courier New', monospace` | `font-family: var(--kj-font)` |
| `rgba(0,0,0,0.75)` (backdrop) | `var(--kj-backdrop)` |
| `transition: background 0.12s` | `transition: var(--kj-transition)` |

Component-specific colors that aren't theme tokens (toast variant backgrounds, tooltip content colors, etc.) stay inline — only structural/layout tokens are centralised.

---

## Part 3: Show code includes `docs-themes.css`

### Extractor change

The docs extractor detects when an example component references `docs-themes.css` via `styleUrls` and automatically adds it as an additional file in the code preview output.

In `extract-docs.ts` / `docs-extractor.ts`: when processing an example file's `styleUrls`, if any entry matches `*/docs-themes.css`, add the CSS file contents as an extra `ExampleFile` entry with `lang: 'css'` and `filename: 'docs-themes.css'`.

### Code preview display

The code preview already supports multiple file tabs. The `docs-themes.css` file appears as an additional tab labelled `docs-themes.css`. Users can click it to see the full token definitions driving the example's appearance.

Since `docs-themes.css` is shared across all examples, its content is identical in every tab — it only needs to be read from disk once and reused.

---

## Files Touched

| File | Change |
|---|---|
| `packages/core/src/styles/docs-themes.css` | NEW — token definitions |
| `packages/core/src/**/*.example.ts` | Add `styleUrls`, add `host: {class}`, replace hardcoded values with `var(--kj-*)` |
| `apps/docs/src/lib/docs-extractor.ts` | Detect `docs-themes.css` in `styleUrls`, append CSS as extra file |
| `apps/docs/scripts/extract-docs.ts` | Same change |
