# Drawer

A side-anchored overlay panel — the modal sibling of [`Dialog`](./dialog.md)
that slides in from the **left**, **right**, **top**, or **bottom** edge of
the viewport. Used for navigation drawers, filter panels, edit panes,
detail views, and shopping-cart slide-overs. Modal by default; supports an
inline / persistent mode that pushes layout content rather than overlaying
it.

> **Roadmap absorption note.** kouji's `Drawer` absorbs shadcn/ui's `Sheet`
> primitive. shadcn ships two side-anchored modals — `Sheet`
> (left/right/top/bottom, desktop) and `Drawer` (Vaul-based, mobile bottom
> grab-handle). We collapse those into a single component
> (`KjDrawer`, all four edges). The mobile/grab-handle/snap-point variant
> is a **separate** component, [`bottom-sheet.md`](./bottom-sheet.md), with
> its own gesture and snap-point machinery. See § 8.

> **Cross-refs:** [`dialog.md`](./dialog.md) (shared overlay machinery),
> [`alert-dialog.md`](./alert-dialog.md) (assertive sibling),
> [`bottom-sheet.md`](./bottom-sheet.md) (mobile bottom-anchored variant
> with snap points), [`popover.md`](../layout/popover.md) (anchored,
> non-modal — different problem).

---

## 1. Source comparison

| Concern | PrimeNG `p-drawer` | Angular Material `MatSidenav` / `MatDrawer` | shadcn/ui `Sheet` (absorbed → kouji Drawer) | shadcn/ui `Drawer` (Vaul) | daisyUI `drawer` |
|---|---|---|---|---|---|
| Primary surface | Component (`<p-drawer [(visible)] position="…">`) | Compound: `<mat-drawer-container>` + `<mat-drawer mode="…" position="…">` | Compound primitives: `Sheet`, `SheetTrigger`, `SheetContent side="…"` | Compound primitives + Vaul gesture engine | Pure CSS — `<input type="checkbox">` toggles a `:checked + .drawer-side` sibling |
| Edges | `left` / `right` / `top` / `bottom` / `full` | `start` / `end` (LTR-aware, no top/bottom) | `top` / `right` / `bottom` / `left` | `top` / `right` / `bottom` / `left` (mobile-tuned) | `start` / `end` only |
| Modal vs. inline | `[modal]` flag → modal overlay; otherwise inline | `mode: 'over' \| 'push' \| 'side'` — three distinct behaviours | Modal only | Modal only | Inline by default; `drawer-end` for right; modal achieved via overlay sibling |
| Backdrop | Built-in, `[dismissible]` | Built-in scrim for `over`/`push`, none for `side` | Separate `SheetOverlay` | Built-in scrim | Sibling `<label class="drawer-overlay">` |
| Focus trap | Custom internal | CDK `FocusTrap` | Radix focus-scope | Radix focus-scope | Not handled — consumer's job |
| Scroll lock | Yes when modal | Yes via `BlockScrollStrategy` (modal modes) | Yes via Radix | Yes via Radix | None |
| RTL | LTR-only `position` values | RTL-aware (`start` / `end`) | LTR-only (`left` / `right`) | LTR-only | RTL-aware (`start` / `end`) |
| Result | `(onHide)` event | `(closedStart)` / `(closed)` events; programmatic `.close(result)` returns Promise | Consumer state | Consumer state + drag-to-dismiss callback | DOM state via checkbox |
| Animation | Built-in slide | Built-in slide (CDK overlay panel transforms) | CSS `data-state` transitions | Spring-based via Vaul | CSS transition |
| Push content (inline) | No | `mode="push"` translates the container | No | No | Yes — flexbox pushes sibling |
| Stacking | Z-index manager | Overlay container | CSS-only | CSS-only | None |
| ARIA | `role="complementary"` (!) on `<p-drawer>` host; modal mode adds `aria-modal` | `role="dialog"` when modal, `complementary` otherwise; programmatic via `MatDrawerContainer` | `role="dialog"` always | `role="dialog"` always | None set automatically |

**Read-off.** Material is the most architecturally honest — it splits *behaviour*
(`mode`) from *placement* (`position`), and only its `over` mode is the
true modal drawer. PrimeNG bundles both into one element with a flag.
shadcn `Sheet` is the closest spiritual match for kouji: compound,
headless, `role="dialog"`, four edges. shadcn's mobile `Drawer` (Vaul)
is a different beast — gesture-driven, snap-pointed, bottom-only — which
is why we keep [`bottom-sheet.md`](./bottom-sheet.md) separate even
after absorbing `Sheet`.

We take shadcn `Sheet`'s compound shape, Material's `mode` distinction
(modal vs. inline-push vs. inline-side), and PrimeNG's four-edge
positioning — exposed through a new core preset directive `KjPlacement`.

---

## 2. Decision

**Ship `KjDrawer` as a thin specialisation over `KjDialog`.** The overlay
machinery — focus trap, scroll lock, escape close, backdrop click,
mount in `document.body`, ARIA `role="dialog"`/`aria-modal` — is
identical to `KjDialog`. The only things `KjDrawer` adds are:

1. **Placement** (`'left' | 'right' | 'top' | 'bottom'`), reflected to a
   `data-kj-placement` host attribute so styles can pick the right slide
   transform.
2. **Mode** (`'modal' | 'push' | 'side'`), borrowed from Material. Modal
   is the default and reuses every Dialog primitive verbatim; push / side
   are *inline* and skip the overlay/scrim/scroll-lock entirely.
3. **Slide direction** matches placement automatically — the components
   package handles the CSS, the core directive only emits the
   `data-kj-placement` attribute.

**`KjPlacement` is a new core preset directive.** It does not exist
today. Because `'left' | 'right' | 'top' | 'bottom'` is a *cross-cutting*
concept (Drawer, Tooltip, Popover, Menu, Bottom Sheet edge variants all
need it), we introduce a `KjPlacement` preset directive next to
`KjSize` / `KjVariant` in `packages/core/src/presets/`. Same shape as
those: an `InjectionToken<KjPlacementPreset>` carrying allowed values
(`['left','right','top','bottom']` for Drawer; `['top','right','bottom','left']`
+ aligned variants like `'top-start'` for Popover) and a default. App
code never imports `KjPlacement` directly; components compose it via
`hostDirectives`. This avoids re-inventing the same `kjPlacement` input
on every overlay-style component. **(See § 7 Open questions for the
"do we ship `KjPlacement` first or land it inside Drawer?" debate.)**

**RTL.** Drawer accepts physical placements (`left`/`right`/`top`/`bottom`),
not logical (`start`/`end`). Rationale: most kouji consumers want
"appears from the right edge of the viewport" semantics that do not
flip in RTL (a settings drawer should stay on the right). When
RTL-flipping *is* desired, consumers wrap the input. We may add a
`KjPlacementLogical` preset later (`'inline-start' | 'inline-end' | 'block-start' | 'block-end'`)
if a real consumer surfaces the need. Material's choice (`start`/`end`)
is the opposite default; we deliberately diverge.

**No grab-handle, no snap points, no swipe-to-dismiss in `KjDrawer`.**
Those are the *defining* features of [`KjBottomSheet`](./bottom-sheet.md).
Keeping them out of Drawer keeps the API honest — adding a `snapPoints`
input to a four-edged drawer would force every other edge to define what
"snap" even means there. Bottom Sheet specialises Drawer (or Dialog) with
gesture behaviour; Drawer stays a slide-and-rest panel.

**No CDK, no Material.** Per [`rules/stack.md`](../../../rules/stack.md):
no CDK, no Material. We re-use existing kouji primitives only.

---

## 3. What exists today

Nothing. There is no `packages/core/src/drawer/` directory. The closest
neighbour is `packages/core/src/dialog/`, which provides the entire
overlay backbone we will compose against.

---

## 4. Base features

- **Trigger modes**
  - **Declarative directive:** `[kjDrawerTrigger]="tplRef"` mirrors
    `[kjDialogTrigger]`. Template projects `[kjDrawerOverlay]` →
    `[kjDrawer]`.
  - **Programmatic:** `KjDrawerService.open(component | template, config)`
    returns `KjDrawerRef` (a thin wrapper around `KjDialogRef` that adds
    `placement` and `mode`).
- **Placement:** `kjPlacement: 'left' | 'right' | 'top' | 'bottom'`
  (default `'right'`). Reflected to `data-kj-placement` on the panel
  host. Styling layer (components package) reads this attribute to pick
  the correct slide transform / size axis.
- **Mode**
  - `'modal'` *(default)* — full Dialog machinery: backdrop, focus trap,
    scroll lock, Escape close, `role="dialog"`, `aria-modal="true"`.
  - `'push'` — inline; no backdrop, no scroll lock, no focus trap. The
    drawer participates in document flow and shifts a sibling
    `[kjDrawerContent]` element via CSS (the components package supplies
    a `<kj-drawer-container>` wrapper that owns the layout). `role="region"`,
    `aria-modal` omitted, `aria-labelledby` still wired.
  - `'side'` — inline like `'push'`, but does not translate the sibling
    content; the content shrinks instead. Same ARIA treatment as `'push'`.
- **Dismissal contract** (modal mode only)
  - Escape → close. Gated by `kjDrawerCloseOnEscape` (default `true`).
  - Backdrop click → close. Gated by `kjDrawerCloseOnBackdrop` (default
    `true`).
  - Programmatic close via `KjDrawerRef.close(result?)` or
    `[kjDrawerClose]`.
- **Result payload.** `kjDrawerClosed` output (declarative) and
  `KjDrawerRef.afterClosed(cb)` (service). Same `unknown`-default /
  generic-on-service shape as Dialog.
- **Sizing.** No `kjSize` input on `KjDrawer` itself. The width
  (left/right placements) or height (top/bottom placements) is a
  styling concern — the components package exposes `[size]` on
  `<kj-drawer>` mapping to a `--kj-drawer-size` CSS var.
- **Scroll lock.** Inherits whatever Dialog ships (currently a known gap
  — see [`dialog.md`](./dialog.md) § Open questions #4). Drawer waits
  on the same `KjScrollLock` primitive.
- **Animation.** Slide direction matches placement (CSS-only, in the
  components package). Honours `prefers-reduced-motion: reduce` (fade
  instead of slide). No animation hooks in core — synchronous
  attach/detach, same as Dialog.

---

## 5. Accessibility (WCAG 2.1 AAA)

Target: **WCAG 2.1 AAA** ([`rules/accessibility.md`](../../../rules/accessibility.md)).
WAI-ARIA APG references: [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

| Concern | Modal mode | Inline (`push` / `side`) |
|---|---|---|
| `role` | `dialog` | `region` |
| `aria-modal` | `"true"` | omitted |
| `aria-labelledby` | wired to `[kjDrawerTitle]` id (mirrors `KjDialogTitle`) | same |
| `aria-describedby` | optional, via `[kjDrawerDescription]` | same |
| `aria-label` (fallback) | accepted on `[kjDrawer]` if no title element exists; dev-warns when both absent | same |
| Initial focus | First focusable inside panel, or `kjDrawerAutoFocus` selector, or panel `tabindex="-1"` fallback | none — keyboard focus stays where it was |
| Focus trap | `KjFocusTrap` host-directive on `[kjDrawer]`, bound to `KJ_DRAWER.open() && mode() === 'modal'` | trap disabled |
| Focus restore | Restores to trigger on close | not applicable (focus never moved) |
| Keyboard | `Tab` cycles inside trap; `Escape` closes (gated) | `Tab` flows naturally; `Escape` is a no-op |
| Scroll lock | Body scroll locked while open (via shared `KjScrollLock`) | no scroll lock |
| Touch targets | Close affordance ≥ 44×44 CSS px (components package) | same |
| Live region | None (modal role announces itself) | None |
| Reduced motion | Slide → fade under `prefers-reduced-motion: reduce` (components package CSS) | same |
| Forced colours | Panel border + close icon survive Windows High Contrast | same |

**WCAG mapping (modal mode):**

| Criterion | Where it lives |
|---|---|
| 1.3.1 Info & Relationships | `role`, `aria-modal`, `aria-labelledby` — `KjDrawer` host bindings. |
| 2.1.1 Keyboard | `KjFocusTrap` host-directive; `KjDrawerTrigger.onEscape` document listener. |
| 2.1.2 No Keyboard Trap | Trap detaches on close. |
| 2.4.3 Focus Order | First-focusable / `kjDrawerAutoFocus` / panel-fallback ladder. |
| 2.4.7 Focus Visible | Inherited from `KjFocusRing` on focusables inside. |
| 2.5.5 Target Size (AAA) | Close button sizing in components package. |
| 4.1.2 Name, Role, Value | Trigger announces `aria-haspopup="dialog"` and `aria-expanded`. |

**Where each piece lives.**

- Role / labelledby / describedby / focus-trap wiring → core.
- Slide direction CSS, reduced-motion fallback, forced-colours rules →
  `@kouji-ui/components`.

---

## 6. Composition model

Six small directives + one service, all `standalone: true`,
communicating through a single `KJ_DRAWER` injection token. All in
`packages/core/src/drawer/`.

```
packages/core/src/drawer/
  drawer.context.ts          // KJ_DRAWER token, KjDrawerContext (extends KjDialogContext-like shape)
  drawer.ts                  // Trigger + panel + overlay + slot directives
  drawer.service.ts          // KjDrawerService + KjDrawerRef
  drawer.example.ts
  drawer.retro.example.ts
  drawer.finance.example.ts
  drawer.spec.ts
  index.ts
```

### Directives

| Directive | Selector | Role |
|---|---|---|
| `KjDrawerTrigger` | `[kjDrawerTrigger]` | Mirrors `KjDialogTrigger`. Adds `aria-haspopup="dialog"`. Owns lifecycle, projects template into `document.body` (modal) or into the host `<kj-drawer-container>` (inline). |
| `KjDrawer` | `[kjDrawer]` *(`exportAs: 'kjDrawer'`)* | Panel. Sets `role`, `aria-modal`, `aria-labelledby`, `data-kj-placement`, `data-kj-mode`. Hosts focus-trap (modal only). |
| `KjDrawerOverlay` | `[kjDrawerOverlay]` | Backdrop. Modal-only; in inline modes the overlay element is omitted from the template. |
| `KjDrawerTitle` | `[kjDrawerTitle]` | Sets id used by `aria-labelledby`. |
| `KjDrawerDescription` | `[kjDrawerDescription]` | Sets id used by `aria-describedby`. |
| `KjDrawerClose` | `[kjDrawerClose]` | Calls `ctx.close()` on click. |

### New shared preset directive

| Directive | Selector | Where | Role |
|---|---|---|---|
| `KjPlacement` *(new)* | `[kjPlacement]` | `packages/core/src/presets/placement.ts` | Composed via `hostDirectives` by Drawer, Bottom Sheet, Popover, Tooltip, Menu. Reflects `data-kj-placement`. Validates against `KJ_PLACEMENT_PRESET` allowed values; dev-warns on invalid input. |

`KJ_PLACEMENT_PRESET` shape (mirrors `KJ_SIZE_PRESET`):

```ts
export interface KjPlacementPreset {
  values: readonly string[];
  default: string;
}
export const KJ_PLACEMENT_PRESET = new InjectionToken<KjPlacementPreset>(
  'kj.placement.preset',
  { factory: () => ({ values: ['left', 'right', 'top', 'bottom'], default: 'right' }) },
);
```

For Drawer, the preset is `{ values: ['left','right','top','bottom'], default: 'right' }`. Popover later overrides with the twelve-position set.

### Shared-state mechanism

- `KjDrawerContext` interface, structurally **a superset of**
  `KjDialogContext`. Adds `placement: Signal<'left'|'right'|'top'|'bottom'>`
  and `mode: Signal<'modal'|'push'|'side'>`.
- `KJ_DRAWER` injection token; trigger and panel use
  `provide: KJ_DRAWER, useExisting: ...` (same pattern as Dialog).
- We **do not** reuse `KJ_DIALOG`. A `[kjDialogClose]` inside a
  `[kjDrawerTrigger]` is a type error — keeps semantics scoped.

### Reuse of existing primitives

| Primitive | Reused for |
|---|---|
| `KjFocusTrap` | Trap inside the panel (modal mode only). |
| `KjFocusRing` | Visible focus on close affordance and focusables (in the styled wrapper). |
| `KjDisabled` | Disable trigger / close while in-flight async work resolves. |
| `KjLiveRegion` | **Not used.** `role="dialog"` self-announces in modal; inline mode is silent by design. |
| `KjRovingTabindex` | Not used. |
| `KjPlacement` *(new preset)* | Placement input + `data-kj-placement` attribute. |
| `KjSize` / `KjVariant` | Not used on the core directive. The components package may apply them to the panel for styling. |
| `KjScrollLock` *(planned, see [`dialog.md`](./dialog.md) §6 Open questions #4)* | Body scroll lock in modal mode. Drawer needs the same primitive Dialog needs; we should land it once and share. |

### Reuse of `KjDialog` machinery

Two viable refactor paths; pick one before implementation:

1. **Compose:** `KjDrawer` declares `KjDialog` in `hostDirectives` (modal
   mode only) and forwards every input. Smallest code, but means
   `[kjDrawer]` is silently *also* a `[kjDialog]` for DI lookups, which
   muddies the `KJ_DIALOG` vs. `KJ_DRAWER` boundary.
2. **Extract a shared mixin:** factor the trigger + panel + overlay
   guts of `KjDialog` into a `KjOverlayDismissable` / `mountModal()`
   helper used by *both* Dialog and Drawer (and later Alert Dialog,
   Bottom Sheet, Popover). Bigger refactor, but it's the right shape
   long-term — [`dialog.md`](./dialog.md) § Composition already flags
   this as the next step after Drawer ships.

**Recommendation:** option 2. Drawer is the trigger to extract the
shared primitive. Land `KjScrollLock` and `KjOverlayDismissable` in
`packages/core/src/primitives/overlay/` first, then have `KjDialog` and
`KjDrawer` both compose them. Alert Dialog (already shipped on top of
Dialog) gets the upgrade for free.

### Service

```ts
@Injectable({ providedIn: 'root' })
export class KjDrawerService {
  open<R = unknown, D = unknown>(
    content: Type<unknown> | TemplateRef<unknown>,
    config: KjDrawerOpenConfig<D>,
  ): KjDrawerRef<R>;
}
```

`KjDrawerRef<R>` extends the `KjDialogRef<R>` contract verbatim, plus:

| Member | Kind | Notes |
|---|---|---|
| `placement` | `Signal<'left'\|'right'\|'top'\|'bottom'>` | Mutable so animations can reposition without re-mounting. |
| `mode` | `Signal<'modal'\|'push'\|'side'>` | Mutable for the same reason; toggling at runtime is unusual but cheap. |

### Cross-component pointers

- **[Dialog](./dialog.md)** — base. Drawer reuses focus-trap, mounting,
  `KjDialogRef`, `aria-labelledby` machinery. The shared
  `KjOverlayDismissable` / `KjScrollLock` extraction documented there
  blocks Drawer; ship them together.
- **[Alert Dialog](./alert-dialog.md)** — sibling specialisation of
  Dialog. No interaction with Drawer; documented for completeness.
- **[Bottom Sheet](./bottom-sheet.md)** — *not* the same component.
  Bottom Sheet is mobile-tuned: bottom-only edge, drag handle, snap
  points, swipe-to-dismiss, momentum gestures. We deliberately keep it
  separate so `KjDrawer` does not grow gesture machinery for one of its
  four edges. A `bottom`-placed `KjDrawer` is a desktop bottom panel; a
  `KjBottomSheet` is a mobile sheet.
- **[Popover](../layout/popover.md)** *(future)* — anchored, non-modal,
  trigger-relative. Drawer is viewport-anchored. Popover will compose
  the same `KjPlacement` preset with a richer value set.
- **[Tooltip](../feedback/tooltip.md)** *(future)* — same `KjPlacement`
  preset.
- **[Toast](../feedback/toast.md)** — non-modal, viewport-edge-anchored,
  but uses live regions, not `role="dialog"`. May coincidentally share
  `KjPlacement` for `'top'` / `'bottom'` placement of the toast stack.

---

## 7. Inputs / Outputs / Models

All directive inputs / outputs carry the `kj` prefix per
[`rules/code_style.md`](../../../rules/code_style.md).

### `KjDrawerTrigger` (`[kjDrawerTrigger]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDrawerTrigger` | `input.required` | `TemplateRef<unknown>` | — | Template projected into mount point. |
| `kjDrawerPlacement` | `input` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'right'` | Forwarded to `KjPlacement` host-directive on the panel via context. |
| `kjDrawerMode` | `input` | `'modal' \| 'push' \| 'side'` | `'modal'` | Drives overlay/focus-trap/scroll-lock gating. |
| `kjDrawerCloseOnEscape` | `input` | `boolean` | `true` | Modal-only; ignored in inline modes. |
| `kjDrawerCloseOnBackdrop` | `input` | `boolean` | `true` | Modal-only. |
| `kjDrawerAutoFocus` | `input` | `boolean \| string` | `true` | `false` skips; string = CSS selector inside panel. Mirrors Dialog. |
| `kjDrawerRestoreFocus` | `input` | `boolean` | `true` | Modal-only. |
| `kjDrawerScrollLock` | `input` | `boolean` | `true` | Modal-only. |
| `kjDrawerClosed` | `output` | `unknown` | — | Emits `close(result)` payload. |
| `open` | readonly `Signal<boolean>` | — | — | Public open state. |

### `KjDrawer` (`[kjDrawer]`, `exportAs: 'kjDrawer'`)

No public inputs (reads context). Public method `close(result?: unknown)`.
Host bindings: `[attr.role]`, `[attr.aria-modal]`, `[attr.aria-labelledby]`,
`[attr.aria-describedby]`, `[attr.data-kj-placement]`, `[attr.data-kj-mode]`,
`[attr.tabindex]="-1"`, `(click)="$event.stopPropagation()"`.

### `KjDrawerOverlay` (`[kjDrawerOverlay]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDrawerOverlayCloseOnClick` | `input` | `boolean` | `true` | ANDed with trigger's `kjDrawerCloseOnBackdrop`. |

Renders to a no-op host in inline modes (`*ngIf` on `mode() === 'modal'`).

### `KjDrawerTitle` / `KjDrawerDescription` / `KjDrawerClose`

Same shape as their Dialog counterparts. `KjDrawerTitle` sets
`[attr.id]="ctx.drawerId + '-title'"`; `KjDrawerDescription` sets
`[attr.id]="ctx.drawerId + '-desc'"`; `KjDrawerClose` calls
`ctx.close()` on click.

### `KjDrawerService.open(content, config)`

`KjDrawerOpenConfig<D>` (extends Dialog's):

| Field | Type | Default | Notes |
|---|---|---|---|
| `placement` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'right'` | |
| `mode` | `'modal' \| 'push' \| 'side'` | `'modal'` | Inline modes still use the service for symmetry, but require a `host: ElementRef \| ViewContainerRef` so the panel mounts inside the consumer's layout instead of `document.body`. |
| `host` | `ElementRef \| ViewContainerRef` | `undefined` | **Required when `mode !== 'modal'`.** Where the inline panel mounts. |
| `data` | `D` | — | Injected via `DRAWER_DATA` token. |
| `panelClass` | `string \| string[]` | — | Applied to panel host. |
| `autoFocus`, `restoreFocus`, `disableClose`, `scrollLock` | — | — | Same semantics as Dialog. |
| `ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` | `string` | — | When the rendered component does not project `[kjDrawerTitle]`. |

`KjDrawerRef<R>` extends `KjDialogRef<R>` plus mutable `placement` and
`mode` signals (see § 6).

---

## 8. Why Bottom Sheet stays separate

shadcn/ui ships *two* side-anchored modals (`Sheet` and `Drawer`) for
good reason: they answer different design problems.

| Concern | `KjDrawer` (this doc, absorbs shadcn `Sheet`) | `KjBottomSheet` ([`bottom-sheet.md`](./bottom-sheet.md)) |
|---|---|---|
| Edges | All four (`left`/`right`/`top`/`bottom`) | Bottom only (mobile convention) |
| Primary input | Click trigger | Touch / drag |
| Drag handle | None | Visible grab handle, accessible focus target |
| Snap points | None — open or closed | Multiple (e.g. `[0.25, 0.5, 0.9]` of viewport height) |
| Dismiss gesture | Click backdrop / Escape | Swipe down past threshold; click backdrop / Escape still work |
| Inertia / spring | None (CSS transition) | Required (`prefers-reduced-motion` falls back to CSS) |
| Typical platform | Desktop & mobile | Mobile-first |
| ARIA | `role="dialog"` | `role="dialog"` *plus* drag handle has `role="separator"` + value semantics |

Could `KjBottomSheet` be a config of `KjDrawer` (`placement: 'bottom'`,
`gestures: true`, `snapPoints: [...]`)? Technically yes. But the gesture
+ snap-point machinery is non-trivial — it touches pointer events,
inertia, scroll-vs-drag conflict resolution, and a much richer ARIA
contract. Bundling it into Drawer would force every Drawer consumer to
ship that machinery (or guard it with feature flags). Cleaner: Drawer
stays a slide panel, Bottom Sheet specialises it (composes the same
`KjOverlayDismissable` + `KjFocusTrap` primitives) for the gesture case.

If we ever fold them, that's a Drawer v2 decision driven by a real
consumer need. Not now.

---

## 9. Examples to ship

`@doc-example` groups for the docs site:

1. **Basic right drawer** — `[kjDrawerTrigger]` opens a right-edge modal
   drawer with title + body + close button. Default theme.
2. **Edges showcase** — four buttons, each opens a drawer from a
   different edge. Default + retro + finance themes for each placement.
3. **Inline push mode** — `<kj-drawer-container>` with `mode="push"`;
   sibling content shifts when the drawer opens. Demonstrates
   navigation-drawer pattern.
4. **Programmatic with data** — `KjDrawerService.open(EditCmp, { data, placement: 'right' })`,
   `afterClosed()` consumes typed result.
5. **Filter panel** — long-scroll body, `kjPlacement="left"`, demonstrates
   scroll-lock and inner scroll. Mirrors Dialog's `dialog.scrollable.example.ts`.
6. **Reduced motion** — visual demo with `prefers-reduced-motion: reduce`
   showing fade-in fallback. (Components package only.)

---

## 10. Open questions / risks

1. **Land `KjPlacement` first, or inside Drawer?** The preset is
   cross-cutting (Popover, Tooltip, Menu, Bottom Sheet all need it).
   Landing it standalone in `packages/core/src/presets/placement.ts`
   alongside `KjSize` / `KjVariant` is the right shape. Drawer is the
   first consumer; it should not couple to a Drawer-internal directive.
   **Action:** ship `KjPlacement` as a precursor PR.

2. **`KjScrollLock` is a precursor.** Documented in
   [`dialog.md`](./dialog.md) § Open questions #4. Both Dialog and
   Drawer (modal mode) need it. Don't ship Drawer without it.

3. **`KjOverlayDismissable` extraction.** Same source. Drawer is the
   forcing function — refusing to extract it now means Dialog's
   trigger/overlay/escape logic gets duplicated in `drawer.ts`, which is
   the wrong outcome. See § 6 "Reuse of `KjDialog` machinery".

4. **Inline modes (`push` / `side`) genuinely need a layout container.**
   The components package must ship `<kj-drawer-container>` and
   `<kj-drawer-content>` to make `push` work — the core directive can
   only emit `data-kj-mode` and `data-kj-placement`; CSS Grid /
   Flexbox in the wrapper does the actual pushing. Decide whether
   `mode="push"` is in v1 or deferred to v1.1. Provisional: defer.
   v1 ships `mode="modal"` only; the directive contract leaves the
   `mode` input in place so we don't break consumers when v1.1 lands.

5. **Push-mode focus.** When `mode="push"` we leave focus alone — the
   drawer becomes part of the page. But the *trigger* still has
   `aria-expanded` / `aria-controls`, and AT users may expect tabbing
   into the drawer next. Decide: should we move focus into the drawer
   on open even in `push` mode? APG is silent (the pattern only covers
   modal). Provisional: don't. Document the behaviour clearly.

6. **`mat-drawer`'s `mode="side"` resizes the content area.** Our
   `'side'` mode does the same, but it requires the components-package
   container to use `display: grid` with `grid-template-columns: auto 1fr`
   (or similar). Pure-flexbox layouts can't pull this off cleanly.
   Document the container's layout requirements when `mode="side"` lands.

7. **`KjDrawerService` with inline modes is awkward.** The service
   conventionally mounts in `document.body`. Inline modes need a host
   element. Options: (a) require `host` in config when `mode !== 'modal'`,
   (b) make the service modal-only and steer inline consumers to the
   directive form, (c) ship two services. Provisional: (a).

8. **RTL.** Physical placements (`left`/`right`) do not flip in RTL.
   Most use cases are correct (a settings drawer pinned to the right
   stays on the right). But navigation drawers traditionally use
   logical edges (`start`/`end`). Open question: do we also expose
   `kjDrawerStart` / `kjDrawerEnd` aliases that resolve at runtime
   against `Dir`? Provisional: no in v1, revisit when a real consumer
   asks. Material's choice (`start`/`end` only) is the inverse default;
   we deliberately diverge.

9. **Top-layer / native `<dialog>` element.** Same answer as Dialog —
   not used in v1 (Safari + SSR support uneven for top-layer-only
   features kouji wants). Revisit alongside Dialog.

10. **Stacking.** Same caveat as Dialog: no z-index manager. Two open
    drawers from opposite edges would visually collide; first-open-wins
    on focus. Acceptable for v1; revisit when a real consumer needs
    nested drawers.

11. **`aria-haspopup` value on the trigger.** APG says `aria-haspopup="dialog"`.
    There is no `aria-haspopup="drawer"` value. Use `"dialog"`, same as
    Dialog's trigger. Document so consumers don't rename it.

12. **Drag-out backdrop click swallow.** Same gotcha as
    `KjDialogOverlay` (see [`dialog.md`](./dialog.md) § Open questions
    #11). Pointer-down target tracking should ship in
    `KjOverlayDismissable` once and benefit Dialog + Drawer + future
    siblings together.

13. **Naming.** `Drawer` (not `Sheet`, not `Sidenav`). `Sheet` is
    shadcn-specific terminology; `Sidenav` implies navigation use only.
    `Drawer` matches PrimeNG, Material's underlying directive,
    daisyUI, and most product copy.

14. **Result type in declarative path.** Same Angular limitation as
    Dialog: directives cannot be generic over `output<T>()`. Use the
    service path for typed results.

15. **Animation hooks.** Synchronous attach/detach in core, CSS
    transitions in the components package. If the components package
    later needs "wait for slide-out before destroying", land it on
    Dialog first (same problem) and reuse the hook here.
