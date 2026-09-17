# Architecture

## Packages
- `@kouji-ui/core` — headless behaviour: directives (plus the few components a pattern needs, such as overlay bodies), no component-scoped styles. It ships four opt-in global stylesheets — overlay chrome (`overlay/overlay.css`), the `[kjIcon]` mask (`icon/icon.css`), `.kj-prose` typography (`typography/prose.css`) and `kjMotion` presets (`motion/motion.css`) — aggregated by `@kouji-ui/core/styles.css`; each is token-driven, exported on its own, and never injected by a directive
- `@kouji-ui/components` — styled wrappers over core directives using design tokens

## Signal-context pattern
Inter-directive communication (parent↔child, e.g. Select↔Option) via `InjectionToken`. Root provides token pointing to self. Children inject it.

## Host directives
Shared behaviours (disabled, form control, ARIA, focus) → standalone directives composed via `hostDirectives`.

Forwarded input names follow the binding-name rule in
[`code_style.md`](./code_style.md#binding-names-kj-prefix-on-directives-bare-names-on-kj--elements):
an attribute directive keeps the `kj` prefix, an element component
(`<kj-tabs>`, `<kj-input>`) re-exposes it bare (`variant`, `size`).

Two constraints that follow from Angular, not from taste:

- **One public name per composed input.** Angular rejects the same
  host-directive input exposed under two names (TS-99 / NG0312), so an alias is
  a real wrapper input that feeds the directive — never a second entry in
  `hostDirectives.inputs`.
- **Forwarding is not transitive.** A directive that composes `KjVariant`
  does not give its own composer that input. The wrapper must list `KjVariant`
  directly. Angular applies each directive once per host, so both list the same
  instance — and only one of them may name the input.

## ARIA
Always in `host` object. Never via `Renderer2` or direct DOM manipulation.

## Form controls
All form inputs compose `KjFormControl` via `hostDirectives`. Single `ControlValueAccessor`. Exposes: `value`, `disabled`, `touched`, `dirty`, `valid`, `invalid`.

## Overlay
All overlays share `KjOverlayService`. Never reimplement per component.
- Connected (tooltip, popover, menu) → `position: fixed` + `getBoundingClientRect()`
- Global-center (dialog) → `position: fixed; inset: 0` + flex centering
- SSR-safe via `afterNextRender()`

## Micro-frontends: a non-goal

**One copy of `@kouji-ui/core` and `@kouji-ui/components` per document.** That is
the supported configuration; everything below follows from it. In a federated
setup both packages must be `shared: { singleton: true }` with a
`requiredVersion` range. Two copies, or two *versions*, of either package on one
page is **not supported** and is not something a fix will be accepted for.

Why it cannot work rather than merely does not: the 100 `InjectionToken`s are
module-scope objects, and token identity is object identity — a second copy
gives every `provideKj*` a different token with the same debug name, so
`inject(KJ_FIELD)` from a projected child silently returns `null` and a DI miss
reads as "No provider for KJ_ICON_REGISTRY" against a token that visibly *is*
provided. Component rules also key off unversioned class names (`.kj-button`)
and `packages/themes/src/base.css` writes the primitive palette onto bare
`:root`, so two versions collide in the cascade regardless of `@layer`.
`KjOverlayStack`, `KjOverlayBuilder`, `KjLocale` and the dialog/drawer services
are `providedIn: 'root'`, so overlay stacking, z-ordering and focus-trap
ownership break well before any of that is noticed.

### Seams that do exist

These are supported, and exist because each is also an SSR or correctness win —
not because MFE is a target:

- **`KjId` + `KJ_ID_NAMESPACE`** (`primitives/overlay/id.ts`) — every generated
  DOM id in the library is minted per injector, per prefix. Two Angular roots
  in one document keep their ids (and the `for=` / `aria-describedby` /
  `aria-controls` IDREFs built on them) apart by providing `KJ_ID_NAMESPACE`,
  normally the app's `APP_ID`. Dev mode warns when a second root starts minting
  without one. Never add a module-level `let …Counter = 0`: it breaks SSR
  hydration first and id isolation second.
- **`KJ_OVERLAY_CONTAINER` and DOM-discovered page state** — the overlay root
  is found by `[data-kj-overlay-container]`, the scroll-lock refcount lives in
  `<html data-kj-scroll-lock>`, live regions are found by
  `[data-kj-live-region]`, and Monaco's page-global AMD init is marked with
  `<html data-kj-monaco>`. Anything whose *subject* is the page is
  bookkept on the page, never in a module variable.
- **`KJ_OVERLAY_Z_BASE` / `--kj-overlay-z-index`** — an app-provided token wins
  over the CSS variable, so a host can place its overlay layer relative to
  chrome it does not own.
- **`KJ_OVERLAY_MOUNT_STRATEGY` + `inContainer(target)`** — overlays built on
  the primitives can mount into an arbitrary element or shadow root. The
  *shipped* components pin `bodyPortal()` in component-level providers, which
  an ancestor injector cannot override; that limitation stands.
- **`onHotkey({ target })`** — a hotkey can be scoped to an element instead of
  the document, and a keystroke another listener already handled is ignored.

### Explicitly unsupported

Two copies / two versions of either package; cross-root overlay stacking and
Escape routing (each root has its own `KjOverlayStack`); `<html dir>` ownership
(`locale/document-direction.ts` writes the document element); one app's
`provideKj*` reaching another root's components.

## One directive per file

A file declares **one** `@Directive` / `@Component` and stays under ~300 lines.
The only exception is a tightly-coupled pair where the child is never used
standalone and both are under 30 lines.

A feature whose directives live in several files keeps a `<feature>.ts`
aggregator next to them that re-exports each one, so consumers and the folder's
`index.ts` keep a single import path:

```
packages/core/src/alert/
  alert.ts              # export * from './alert-root'; … (the aggregator)
  alert-root.ts         # KjAlert
  alert-title.ts        # KjAlertTitle
  alert.context.ts
  index.ts
```

That aggregator is the one sanctioned exception to
[`code_style.md`](./code_style.md)'s "no barrel re-exports beyond `index.ts`".

Imports between a feature's files must stay acyclic. A child reaches its root
through the feature's context token, not by importing the root class; where it
genuinely needs the class (a cast, a `hostDirectives` entry) the edge runs
child -> root, and the root refers to its children by name in prose only.

`packages/components/src/class-naming.spec.ts` and
`packages/core/src/primitives/diagnostics/` pin the naming and diagnostics
halves of this file; the directive-count threshold is pinned by
`packages/components/src/one-directive-per-file.spec.ts`, which carries the
shrink-only list of files still over it.

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
