# Architecture

## Packages
- `@kouji-ui/core` — directives only, zero CSS, zero components
- `@kouji-ui/components` — styled wrappers over core directives using design tokens

## Signal-context pattern
Inter-directive communication (parent↔child, e.g. Select↔Option) via `InjectionToken`. Root provides token pointing to self. Children inject it.

## Host directives
Shared behaviours (disabled, form control, ARIA, focus) → standalone directives composed via `hostDirectives`. All forwarded inputs keep the `kj` prefix.

## ARIA
Always in `host` object. Never via `Renderer2` or direct DOM manipulation.

## Form controls
All form inputs compose `KjFormControl` via `hostDirectives`. Single `ControlValueAccessor`. Exposes: `value`, `disabled`, `touched`, `dirty`, `valid`, `invalid`.

## Overlay
All overlays share `KjOverlayService`. Never reimplement per component.
- Connected (tooltip, popover, menu) → `position: fixed` + `getBoundingClientRect()`
- Global-center (dialog) → `position: fixed; inset: 0` + flex centering
- SSR-safe via `afterNextRender()`

## One directive per file
Exception: tightly-coupled pair where child is never used standalone and both are < 30 lines.

## Folder layout
```
packages/core/src/
  primitives/interaction | forms | overlay
  <component>/
    <component>.ts
    <component>.context.ts
    <component>.spec.ts
    index.ts
  a11y/
```
