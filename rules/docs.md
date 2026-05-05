# Docs UI Rules

The `apps/docs` site is the public face of `@kouji-ui` — it has to look and behave like the library it documents. Every interactive element rendered in the docs (and inside any docs-side feature like the theme generator) must use a styled wrapper from `@kouji-ui/components` whenever one exists.

## The rule

**All UI in `apps/docs/src/**` must use `@kouji-ui/components` components for any element that has a styled wrapper.** No raw `<button>`, `<input>`, `<a>`, `<kbd>` in templates when there's a kj-* equivalent.

| Raw element | Required wrapper |
|---|---|
| `<button>` | `<kj-button>` (with `variant`, `size`, `disabled`, `type`, `ariaLabel` as needed) |
| `<input type="text\|email\|number\|password\|search\|tel\|url\|color">` | `<kj-input>` |
| `<input type="checkbox">` | `<kj-checkbox>` (projects label content) |
| `<input type="radio">` (group) | `<kj-radio-group>` + `<kj-radio>` |
| Button-as-toggle | `<kj-toggle>` |
| `<a>` (link, internal nav) | `<kj-link>` |
| `<kbd>` | `<kj-kbd>` |
| Card / panel surface | `<kj-card>` (+ `<kj-card-header>`, `<kj-card-title>`, `<kj-card-subtitle>`, `<kj-card-content>`, `<kj-card-footer>`, `<kj-card-cover>`) |
| Avatar / initials | `<kj-avatar>` (with `src`, `alt`, `content` inputs) |
| Status pill | `<kj-badge>` |
| Disclosure | `<kj-accordion>` + `<kj-accordion-item label="…">` |
| Tab navigation | `<kj-tabs>` + `<kj-tab id label>` |
| Action menu | `<kj-menu>` + `<kj-menu-trigger>` + `<kj-menu-content>` + `<kj-menu-item>` |
| Confirm/edit dialog | `<kj-dialog>` slots (`-overlay`, `-header`, `-title`, `-body`, `-footer`) + `KjDialogTrigger` |
| Notification | `<kj-toast-viewport>` + `KjToastService.show(...)` |

`<select>` does not yet have a kj-equivalent that fits configuration UIs (the existing `<kj-select>` is option-list only). Native `<select>` is acceptable for now in docs internals; flag a follow-up if a generic-config select is needed.

## Why

- **Self-dogfooding**: bugs and theme regressions in the components show up first in the docs. Using a raw `<button class="something">` hides issues that would have surfaced if the same element were a `<kj-button>`.
- **Theming consistency**: every kj-component reads from `--kj-color-*-hover`, `--kj-color-base-*`, etc. Raw elements styled with custom CSS drift away from the design tokens and break in non-default themes.
- **Accessibility**: the kj-components carry the headless directive's keyboard, ARIA, and focus behavior. Raw replacements quietly drop those.

## Exceptions (with reason)

- **Pure layout primitives** — `<div>`, `<section>`, `<aside>`, `<article>`, `<header>`, `<main>`, `<footer>`, `<nav>`, `<ul>`/`<ol>`/`<li>`, `<p>`, headings (`<h1>`–`<h6>`). These are structural; no kj-equivalent and none needed.
- **Form `<label>`** — when used as a structural wrapper inside a kj-checkbox / kj-radio's projected content, it's already handled by the wrapper. Stand-alone `<label for="…">` is fine when paired with a `<kj-input>`.
- **`<input type="file">`** — there is no `<kj-input type="file">` today. Hidden file inputs paired with a `<kj-button (click)="fileInput.click()">` is the documented pattern.
- **Native `<select>`** for dense configuration UIs (multi-option pickers in the theme generator's controls panel). The existing `<kj-select>` is intended for option-list dropdowns rather than form-config menus. Replace as soon as a control-style select wrapper exists.

## How to enforce

- New PRs that introduce raw `<button>` / `<input>` / `<a>` / `<kbd>` in `apps/docs/src/**` should be flagged in review.
- Quick audit: `rg '<(button|input|kbd|a) ' apps/docs/src --no-heading | rg -v 'kj-|hidden|aria-hidden|type="file"'` — anything that surfaces should either become a kj-component or be added to the exceptions above with a reason.
