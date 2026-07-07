# Skip-to-content link — design spec

Date: 2026-07-07
Roadmap: `apps/docs/src/app/pages/roadmap/items/idea-a11y-enhancements.md` (a11y enhancements)
WCAG: **2.4.1 Bypass Blocks (Level A)** — a mechanism to skip repeated blocks of
content (navbar, docs sidebar) and jump straight to the main content.

## Problem

Keyboard and screen-reader users landing on a docs page must Tab through the
navbar and the (large) docs sidebar before reaching the page content. There is
no bypass mechanism today. This is the canonical "skip to content" pattern.

## Goals

- First focusable element on the page is a "Skip to main content" link.
- Visually hidden until it receives focus; fully visible + readable on focus.
- Activating it (Enter / click) moves **keyboard focus** to the main content
  landmark, not just the scroll position.
- Reusable, headless behaviour in `@kouji-ui/core`; themed wrapper in
  `@kouji-ui/components`. No Angular CDK. Signals + standalone. SSR-safe.

## Non-goals

- Multiple skip links / skip-link menus (single "skip to main" only for v1).
- i18n of the label (English default; overridable via projected content).

## Package split (repo convention: core = directives/zero-CSS, components = styled)

### `@kouji-ui/core` — `KjSkipLink` (directive, zero CSS)

Headless behaviour primitive. Owns the two things CSS alone cannot deliver:
the fragment `href` and the **focus move** on activation.

- **Selector:** `a[kjSkipLink]`
- **Input:** `kjSkipLink: string` (alias of selector) — id of the target
  element. Default `'main-content'`.
- **Host bindings:**
  - `[attr.href]="'#' + kjSkipLink()"` — real anchor semantics (role=link, Enter
    activates) and carries the target id in the SSR-prerendered HTML.
  - `(click)="onActivate($event)"` — SSR-safe (only fires in the browser).
- **Behaviour (`onActivate`):** `preventDefault()`, look up the target by id via
  injected `DOCUMENT`. If found and it has no `tabindex`, add `tabindex="-1"`
  (makes it programmatically focusable while keeping it out of the tab order),
  then call `.focus()` (which also scrolls it into view).
- **Why `preventDefault` is required (design finding).** The original plan kept
  the native fragment navigation for a bookmarkable hash. Verified against the
  built app, that is actively wrong: Angular SPAs ship `<base href="/">`, and a
  fragment-only reference (`#main-content`) resolves against the **base URL**,
  not the current document — so the native click navigates to `/#main-content`
  (the **home** route), swapping the page out and dropping focus. Moving focus
  programmatically and suppressing the default is both correct and immune to the
  `<base>` gotcha, so the input default resolving (`'' → 'main-content'`) is done
  in an input `transform` because a bare `<a kjSkipLink>` binds the attribute as
  an empty string.

### `@kouji-ui/components` — `KjSkipLinkComponent` (styled wrapper)

- **Selector:** `kj-skip-link`
- **Template:** `<a kjSkipLink class="kj-skip-link" [kjSkipLink]="kjTarget()"><ng-content>Skip to main content</ng-content></a>`
- **Input:** `kjTarget: string` (default `'main-content'`) forwarded to the directive.
- **CSS:** `position: fixed`, parked above the viewport (`top` negative) and
  revealed to `top: <space>` on `:focus` / `:focus-visible`, with a solid
  high-contrast background (`--kj-bg-primary` / `--kj-fg-on-primary`), a visible
  focus outline, `--kj-shadow-lg`, and a very high `z-index` so it sits above the
  navbar and overlays. Component tokens (`--kj-skip-link-*`) are themable.
- Host is `display: contents` so the positioned `<a>` is the real element.

## Wiring into the docs app shell

The link must be the **first focusable element** of every page, so it lives at
the top of the shared `MainLayoutComponent` (before `<kj-navbar>`), which wraps
all top-level routes:

```html
<kj-skip-link />
<kj-navbar />
<router-outlet />
```

The target landmark is the docs content `<main>` in `DocsShellComponent`, which
gains `id="main-content"` and `tabindex="-1"`.

## Accessibility contract (WCAG 2.1 AAA)

- **2.4.1 Bypass Blocks (A):** the link bypasses the navbar + sidebar blocks.
- **2.1.1 Keyboard (A):** reachable by Tab, activated by Enter (native anchor).
- **2.4.7 Focus Visible (AA):** hidden state ends on focus; a visible outline is
  shown. **2.4.11/2.4.13 (AAA-adjacent):** fully on-screen when focused.
- **1.4.6 Contrast Enhanced (AAA):** `--kj-bg-primary` / `--kj-fg-on-primary`
  is the theme's AAA-grade pairing.
- **4.1.2 Name, Role, Value:** real `<a>` → role=link, accessible name from the
  projected text.
- **Focus management:** on activation focus lands on `#main-content`
  (`tabindex="-1"`), so the next Tab continues from the content, not the nav.

## Testing

- **Unit (core):** renders an `<a role=link>`; `href` reflects `#<target>`;
  clicking moves focus to the target and adds `tabindex="-1"` when absent;
  custom target id honoured.
- **Unit (components):** renders `kj-skip-link` → inner `<a>` with default label
  and forwarded target.
- **E2E (Playwright):** Tab from the top of a docs page reveals the skip link;
  Enter moves focus to `#main-content`. Falls back to a prerender-markup
  assertion if the sandbox cannot run a headed browser.

## Docs

The link is live in the shell (Tab on any page reveals it). `KjSkipLinkComponent`
also self-registers a docs page via `@doc` tags, with a usage example that lets
the reader Tab into a demo skip link.
