# Alert / Banner

A persistent, in-flow notification that surfaces error, warning, info, or
success state next to (or above) the content it relates to. Unlike Toast,
it is **sticky** — it stays until the consumer removes it, the user
dismisses it, or the underlying state resolves. Unlike Dialog, it does
**not** interrupt focus or block interaction.

> Not yet shipped. No `packages/core/src/alert/` directory exists today.
> This file specifies the directive set, a11y contract, composition, and
> wrapper API to land for v1.

For the transient sibling that auto-dismisses and stacks in a viewport,
see [`toast.md`](./toast.md). For the modal interrupting variant
(`role="alertdialog"`) see [`../actions/alert-dialog.md`](../actions/alert-dialog.md).
For the empty-state-with-error pattern that re-uses alert chrome inside a
data slot, see [`../data-display/empty-state.md`](../data-display/empty-state.md).
For inline form validation messages that *aren't* alerts (because the
field already owns its `aria-invalid` / `aria-describedby` contract), see
[`../data-input/field.md`](../data-input/field.md) and
[`../data-input/form.md`](../data-input/form.md).

## Source comparison

| Concern | PrimeNG `p-message` / `p-inplace` | Angular Material | shadcn/ui `Alert` | daisyUI `alert` | WAI-ARIA APG |
|---|---|---|---|---|---|
| First-class component? | Yes (`<p-message>`) | **No** — only `MatSnackBar` (transient). Alert is a documented gap. | Yes — `Alert`, `AlertTitle`, `AlertDescription` | Yes (CSS-only: `.alert.alert-info` / `.alert-success` / `.alert-warning` / `.alert-error`) | Yes — [Alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) |
| Variants / severity | `severity` (`success` / `info` / `warn` / `error` / `secondary` / `contrast`) | n/a | `default`, `destructive` (small surface; consumers extend) | `info`, `success`, `warning`, `error` | n/a (role-level only) |
| Title / description split | Single `text` input + content slot | n/a | Two named subcomponents (`AlertTitle`, `AlertDescription`) | CSS-only — consumer markup | Recommends a clear label and a description |
| Icon | Auto-resolved per severity, overridable via `icon` slot | n/a | Free slot at the start of the alert (any `<svg>`) | Optional, consumer-placed | n/a |
| Dismissible | `[closable]` adds a built-in × button, `(onClose)` event | n/a | **No built-in dismiss** — recipe-level | No built-in — recipe-level | Doesn't prescribe |
| Actions (Retry, View) | Action slot (`pTemplate="default"`) | n/a | Free composition with `<Button>` | Free composition | Doesn't prescribe |
| Role / live behaviour | `role="alert"` always — fires `aria-live="assertive"` even for info messages, which is loud | n/a | `role="alert"` always (same loudness issue) | `role="alert"` (CSS provides no role — consumer must) | Distinguishes: `role="alert"` for **dynamically inserted critical** (assertive), `role="status"` for non-critical (polite), `role="region"` + `aria-label` for **static page banners** |
| Sticky / banner mode | Not modelled — banner is a separate `<p-toast>`-style construct | n/a | Not modelled — caller adds `position: sticky` | Not modelled | Static banners are the **landmark** case — `role="region"` (or `role="banner"` when it's the page-level banner), not `role="alert"` |

**Read-off.** No library handles all four cases (dynamic-critical,
dynamic-non-critical, static-page-banner, dismissible-with-actions) with
the right ARIA per case. PrimeNG over-fires `role="alert"`. shadcn nails
the composition shape but lets the consumer get the role wrong. daisyUI
is CSS-only. Material has nothing. The APG distinction (alert vs. status
vs. region) is the one we adopt — and it is the main reason this needs a
core directive: **picking the right role/live-region pair from a single
input is exactly the kind of stateful a11y contract that should be
shared across themes.**

## Decision: needs a core directive?

**Yes.** Two contracts justify it:

1. **Role + live-region selection is non-trivial and easy to get wrong.**
   The right answer depends on three orthogonal facts about the alert:
   - Was it dynamically inserted in response to a user/system event? →
     `role="alert"` (assertive) for critical, `role="status"` (polite)
     otherwise.
   - Is it a static page-level banner present on initial render? →
     `role="region"` with `aria-label`, **not** `role="alert"`. Static
     `role="alert"` elements either fire on initial page load (loud,
     wrong) or get ignored by AT (silent, also wrong).
   - Is it a destructive / error severity? Severity alone does not pick
     `assertive` — a stale 5-minute-old error rendered into a "history"
     panel is not assertive.

   Encoding this matrix in a single `kjAlertMode` input on a directive
   that owns `role` + `aria-live` reflection is the only way to keep
   themes (and consumers) honest. shadcn and PrimeNG ship the wrong
   default; we ship the right matrix.

2. **Dismiss state needs to be reflected on the host.** Consumers
   manage the visibility (so they can re-show after dismissal — see
   below), but the directive still needs to expose `data-dismissed` /
   coordinate the `KjAlertDismiss` button via context, and announce the
   dismissal politely so AT users know it went away.

Items beyond a11y (variant/size presets, focus ring on the dismiss
button) are reused from existing primitives — they don't motivate the
directive on their own. The role/live + dismiss-context combo does.

## Composition model

**Compound directive set, shadcn-shaped.** One root + five supportive
parts, all standalone, sharing a `KJ_ALERT` injection token. This
mirrors the Dialog set (`KjDialog` + `KjDialogTitle` + `KjDialogClose`
+ ...).

```
KjAlert            (selector: [kjAlert],            owns role/live, provides KJ_ALERT)
  ├── KjAlertIcon         (selector: [kjAlertIcon])
  ├── KjAlertTitle        (selector: [kjAlertTitle])      → wires aria-labelledby
  ├── KjAlertDescription  (selector: [kjAlertDescription]) → wires aria-describedby
  ├── KjAlertActions      (selector: [kjAlertActions])     → semantic group for action buttons
  └── KjAlertDismiss      (selector: [kjAlertDismiss])     → close button, calls ctx.dismiss()
```

### Why each part exists

- **`KjAlert` (root).** Owns the whole a11y contract: `role`,
  `aria-live`, `aria-atomic`, `aria-labelledby`, `aria-describedby`,
  `data-variant`, `data-dismissed`. Provides `KJ_ALERT` to descendants.
  Composes `KjVariant` and `KjSize` via `hostDirectives` for preset
  binding (validates `kjVariant` against the configured list, reflects
  `data-variant` / `data-size`).
- **`KjAlertIcon`.** Sets `aria-hidden="true"` (the icon is decorative —
  the title carries the meaning). Optionally exposes `data-variant` so
  CSS can swap the glyph. Has no behaviour beyond that — but it earns
  the directive because `aria-hidden` enforcement is exactly the kind
  of "easy to forget, hard to debug" rule we want centralised. (See
  *What NOT to Build* in `rules/code_style.md`: a `data-*`-only
  directive is forbidden — `aria-hidden` lifts this above that bar.)
- **`KjAlertTitle`.** Generates an id (`${alertId}-title`), registers
  itself with the context so `KjAlert` can reflect
  `aria-labelledby="…-title"`. Defaults to rendering as `<h3>` when
  applied as an attribute on a non-heading? **No** — directives don't
  rewrite tag names. Document that consumers should put it on a heading
  (`<h3 kjAlertTitle>`) when the alert is in a content region.
- **`KjAlertDescription`.** Same id-registration pattern,
  `aria-describedby` instead of `aria-labelledby`.
- **`KjAlertActions`.** Sets `role="group"` and forwards an
  `aria-label="Alert actions"` (overridable). Lets AT users skip past
  the actions container as a unit. Composes naturally with `KjButton` /
  `KjButtonGroup` — see [`../actions/button.md`](../actions/button.md)
  and [`../actions/button-group.md`](../actions/button-group.md).
- **`KjAlertDismiss`.** Attribute directive that hooks into `KJ_ALERT`
  and calls `ctx.dismiss()` on click. Composes `KjButton` via
  `hostDirectives` so the dismiss button gets the full button contract
  (focus ring, aria-disabled, capture-phase click suppression). Sets
  `aria-label="Dismiss"` by default, overridable via `kjAlertDismissLabel`.

### Reused primitives

- `KjVariant`, `KjSize` — host directives on `KjAlert`, validated against
  `KJ_ALERT_CONFIG` via `bindPresets`. Same shape Button uses.
- `KjFocusRing` — composed on `KjAlertDismiss` (transitively via
  `KjButton`). The alert root itself is not focusable.
- `KjLiveRegion` — **not** composed. `KjAlert` sets `aria-live` and
  `aria-atomic` directly on the host because the alert content *is* the
  live region. Composing `KjLiveRegion` would imply a separate hidden
  announcer node, which is wrong here — the visible alert content is
  what we want announced. (Toast does the same: see
  `packages/core/src/toast/toast.ts` — `[kjToast]` sets `role` and
  `aria-atomic` on the host element.)
- `KjVisuallyHidden` — used by themes inside the dismiss button if the
  × glyph is rendered as text without an `aria-label`. Wrapper-level
  concern; not part of the core contract.
- `KjAriaDescribedby` — **not** composed. `KjAlert` does its own
  description-id reflection because it needs to combine title + body
  ids in a deterministic order. The shared primitive is for components
  whose description is supplied externally (Field/Input).

### Cross-component pointers

- [`toast.md`](./toast.md) — Toast is the **transient** sibling. Same
  variant taxonomy, same icon/title/description shape, but auto-dismiss,
  rendered into a viewport, not in flow. APG is explicit: prefer the
  least intrusive surface that conveys the message; Alert is more
  intrusive than Toast for *visual* attention but *less* intrusive for
  AT (because it doesn't fight the user's reading flow). Document
  decision rules in both files.
- [`../actions/alert-dialog.md`](../actions/alert-dialog.md) — Alert
  Dialog is the **modal** escalation. If the user must acknowledge or
  decide, it's an Alert Dialog, not an Alert. Don't blur the line.
- [`../data-display/empty-state.md`](../data-display/empty-state.md) —
  An error empty-state ("Failed to load — Retry") visually *looks* like
  an inline alert but is a different semantic surface (the empty state
  *is* the content, the alert is *about* the content). Empty State may
  embed a `<kj-alert>` for the error variant; it should not duplicate
  the alert chrome.
- [`../data-input/field.md`](../data-input/field.md) — Form validation
  errors rendered next to a field are **not** alerts. They're field
  errors with `aria-invalid` / `aria-describedby` on the input. A
  form-level "There were 3 errors" summary at the top of a form is an
  Alert (`role="alert"`, dynamically inserted on submit). Document this
  in `field.md` so consumers don't reach for `<kj-alert>` per field.
- [`../actions/button.md`](../actions/button.md) and
  [`../actions/button-group.md`](../actions/button-group.md) — primary
  actions ("Retry", "View details") inside `<kj-alert-actions>` are
  ordinary `<kj-button>` instances; the dismiss × is `KjButton` via
  `KjAlertDismiss`'s host directive composition.

## The `kjAlertMode` matrix (the core a11y decision)

`KjAlert` exposes a single `kjAlertMode` input that picks the right
role + live combination. Four modes:

| `kjAlertMode` | `role` | `aria-live` | When to use | Default for |
|---|---|---|---|---|
| `'assertive'` | `alert` | `assertive` | Critical, dynamically inserted (failed save, lost connection, payment declined). Interrupts the AT user's current speech. | `kjVariant="error"` **and** `kjAlertStatic="false"` (the dynamic-error path) |
| `'polite'` | `status` | `polite` | Non-critical, dynamically inserted (saved successfully, item added to cart, info note). Queues until current speech finishes. | All other dynamic variants (`success`, `info`, `warning`, `neutral`) |
| `'static'` | `region` | (omitted — no live) | Banner present on initial render (cookie notice, maintenance window, system status). Landmark, navigable via region rotor. **Requires `aria-label` or `aria-labelledby`.** | When `kjAlertStatic="true"` |
| `'off'` | — preserves explicit `kjAlertRole` if set, else no role — | (omitted) | Escape hatch when the alert is purely visual (e.g., already announced elsewhere) and the consumer wants to suppress the live behaviour without removing the visual chrome. | Never default |

**Resolution order** when computing the effective mode:

1. If `kjAlertMode` is set explicitly → use it verbatim.
2. Else if `kjAlertStatic()` is `true` → `'static'`.
3. Else if `kjVariant()` is `'error'` → `'assertive'`.
4. Else → `'polite'`.

This default matrix is the same one APG describes for the Alert
pattern; we expose `kjAlertMode` for the cases where the consumer knows
better (e.g., a non-error that *is* critical: lost connection, session
expiry).

**Why `kjAlertStatic` and not just inferring from "rendered on initial
load"?** The directive doesn't know whether it was inserted dynamically
— it only knows when it was instantiated. A consumer rendering an
alert from a server-side error in SSR is *static* from the user's
perspective even though the directive instantiates on hydrate. Make
the consumer say it.

## Base features

- **Variants (preset, configurable):** `info`, `success`, `warning`,
  `error`, `neutral`. Default `'info'`. Open-set string. Extend via
  `provideKjAlert({ variants: [...KJ_ALERT_DEFAULTS.variants, 'brand'] })`.
- **Sizes (preset, configurable):** `sm`, `md`, `lg`. Default `'md'`.
- **Modes (a11y, see matrix above):** `'assertive' | 'polite' | 'static' | 'off'`.
- **Static flag:** `kjAlertStatic` (boolean). Picks `'static'` mode when
  `kjAlertMode` is unset.
- **Dismiss:** consumer-managed via `kjAlertDismissed` output + parent
  `*ngIf` / `@if`. The directive does NOT remove itself. (See *State
  model* below for why.)
- **Slots:** icon (`[kjAlertIcon]`), title (`[kjAlertTitle]`),
  description (`[kjAlertDescription]`), actions (`[kjAlertActions]`),
  dismiss (`[kjAlertDismiss]`). All optional except: at minimum either
  title or description must be present so the alert has accessible
  content.

### State model

**Stateless from the directive's perspective.** Visibility is owned by
the consumer. `KjAlertDismiss` calls `KJ_ALERT.dismiss()`, which fires
the `kjAlertDismissed` output. The consumer is responsible for unmounting
the alert (or for keeping it mounted if they want to re-show it later
— e.g., after a retry succeeds and fails again).

**Why consumer-owned, unlike Dialog?**

- Dialog has an unambiguous lifecycle (open → close → unmount).
  Alert has multiple plausible lifecycles: dismiss-and-forget (most),
  dismiss-and-re-show-on-state-change (some), dismiss-just-this-instance-but-keep-state
  (rare). Letting the directive own visibility forces one of these on
  every consumer.
- Persistent banners (cookie notice, maintenance window) often need to
  remember the dismissed state in `localStorage`. That's not the
  directive's job.
- Stateless directive matches the existing `KjButton` model (loading
  and pressed are observed inputs, not internal state).

The directive does set `data-dismissed="true"` for the brief render
window between the click and the consumer unmounting, so themes can
animate exit if they want — but the directive itself does not delay
unmount or play animations.

## Accessibility

Target: **WCAG 2.1 AAA**.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | `aria-labelledby` → title id; `aria-describedby` → description id | `KjAlert` host bindings; `KjAlertTitle` / `KjAlertDescription` register ids via context. |
| 1.4.6 Contrast (Enhanced, AAA) | ≥7:1 text on background for each variant; ≥3:1 non-text (icon, border) | Themes layer — `--kj-alert-*` token pairs. Per-variant content tokens (`--kj-color-success-content`, etc.) tuned per theme. |
| 2.1.1 Keyboard | Dismiss button reachable via Tab; activatable via Enter / Space | `KjAlertDismiss` composes `KjButton` — inherits the full button keyboard contract. |
| 2.4.6 Headings & Labels (AAA) | Alert title is a heading or labelled region | `KjAlertTitle` is meant to be applied to a heading (`<h3 kjAlertTitle>`). Static-mode alerts must additionally carry `aria-label` or `aria-labelledby` on the root (validated in dev mode). |
| 2.5.5 Target Size (AAA) | Dismiss button ≥44×44 CSS px | Inherited from `KjButton` `kjSize="icon"` — wrapper sets the minimum. |
| 4.1.2 Name, Role, Value | Correct `role` and live politeness for the mode (see matrix) | `KjAlert` host bindings, computed from `kjAlertMode`. |
| 4.1.3 Status Messages | Non-critical announcements use `role="status"` (`aria-live="polite"`); critical use `role="alert"` (`aria-live="assertive"`) | Mode matrix. |

### Keyboard contract

Alert is **not** a focusable region (no `tabindex`). The only
focusables inside it are the dismiss button and any action buttons. No
custom keys: each interactive descendant uses its own native contract
(`Enter` / `Space` for buttons).

**Escape to dismiss?** No. Alerts are inline content, not modals;
hijacking Escape would surprise users (and steal it from any modal
above the alert). Toast does the same.

### Focus management

- **On insertion (dynamic alert):** Do **not** move focus. Inserting an
  alert and stealing focus is hostile (it interrupts whatever the user
  is doing — e.g., typing in a field that just failed validation).
  `aria-live` is the right channel.
- **On dismiss:** If the dismiss button was the focused element when
  clicked, focus is now on a button that's about to unmount. The
  directive emits `kjAlertDismissed`; the consumer is responsible for
  unmounting and (optionally) restoring focus. **Recommendation in
  docs:** restore focus to the element that triggered the original
  state if possible (e.g., the form field that errored), else let
  focus fall to the document body — Tab will pick up the next
  focusable. We'll provide a `kjAlertRestoreFocus` directive *only* if
  consumer feedback shows this is consistently mishandled; for v1, doc
  it.

### Live region nuances

- `aria-atomic="true"` on the alert host so AT reads the whole alert
  (title + description) when content changes, not just the diff.
- `aria-relevant` is left at the default (`additions text`). Setting
  `additions removals` would announce the alert *going away*, which is
  noise.
- **Static mode does not set `aria-live`.** A `role="region"` with
  `aria-live` would announce the banner on initial page load — wrong.

### Dev-mode validation

`KjAlert` runs an `effect()` in dev mode that asserts:

1. If `kjAlertMode() === 'static'` (or resolved to it), the host has
   either an `aria-label`, an `aria-labelledby`, or a projected
   `[kjAlertTitle]` — otherwise the region is unlabelled.
2. If neither `[kjAlertTitle]` nor `[kjAlertDescription]` is present
   AND no projected text content, warn — alert with no accessible
   content is meaningless.
3. If `kjAlertMode() === 'assertive'` and `kjVariant() === 'success'`,
   warn (almost certainly a misuse — you don't interrupt the user to
   announce success).

These are warnings, not throws — same posture as the icon-only Button
`aria-label` warning.

## Inputs / Outputs / Models

### `KjAlert` (`[kjAlert]`, `exportAs: 'kjAlert'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | `input` (preset) | `string` (validated against `KJ_ALERT_CONFIG.variants`) | `'info'` | Forwarded to `KjVariant` host directive. Reflects `data-variant`. |
| `kjSize` | `input` (preset) | `string` (validated against `KJ_ALERT_CONFIG.sizes`) | `'md'` | Forwarded to `KjSize`. Reflects `data-size`. |
| `kjAlertMode` | `input` | `'assertive' \| 'polite' \| 'static' \| 'off' \| undefined` | `undefined` | Explicit override; resolves via the matrix when unset. |
| `kjAlertStatic` | `input<boolean>` | `boolean` | `false` | When `true` and `kjAlertMode` is unset, resolves to `'static'`. |
| `kjAlertRole` | `input<string \| undefined>` | `string \| undefined` | `undefined` | Last-resort override for the `role` attribute. Discouraged — prefer `kjAlertMode`. |
| `kjAlertDismissed` | `output<void>` | — | — | Fired by `KjAlertDismiss` (or by `ctx.dismiss()` programmatically). Consumer unmounts. |

Public API exposed via the context (`KJ_ALERT`):

```ts
export interface KjAlertContext {
  alertId: Signal<string>;
  variant: Signal<string>;
  mode: Signal<'assertive' | 'polite' | 'static' | 'off'>;
  titleId: Signal<string | null>;
  descriptionId: Signal<string | null>;
  registerTitle(id: string): void;
  unregisterTitle(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;
  dismiss(): void;
}
export const KJ_ALERT = new InjectionToken<KjAlertContext>('KjAlert');
```

### `KjAlertTitle` (`[kjAlertTitle]`)

No public inputs. Generates id `${ctx.alertId}-title`, registers with
context on init, unregisters on destroy. Sets `[id]` on the host.

### `KjAlertDescription` (`[kjAlertDescription]`)

No public inputs. Same id-registration pattern as title, with the
description id slot.

### `KjAlertIcon` (`[kjAlertIcon]`)

No public inputs. Sets `aria-hidden="true"` and `data-variant` (mirrored
from context) on the host.

### `KjAlertActions` (`[kjAlertActions]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAlertActionsLabel` | `input<string>` | `string` | `'Alert actions'` | Bound to `[attr.aria-label]`. Set `role="group"` on host. |

### `KjAlertDismiss` (`[kjAlertDismiss]`)

Composed `hostDirectives: [{ directive: KjButton, inputs: ['kjVariant: kjAlertDismissVariant', 'kjSize: kjAlertDismissSize', 'kjAriaLabel: kjAlertDismissLabel'] }]`.

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAlertDismissLabel` | `input<string>` | `string` | `'Dismiss'` | Forwarded as `kjAriaLabel` on the underlying `KjButton`. Localisable. |
| `kjAlertDismissVariant` | `input<string>` | `string` | `'ghost'` | Pass-through to `KjButton.kjVariant`. |
| `kjAlertDismissSize` | `input<string>` | `string` | `'icon'` | Pass-through to `KjButton.kjSize`. |

### Wrapper component (`<kj-alert>`, components package)

Re-exposes everything on `KjAlert` plus content-projection slots. The
wrapper composes `KjAlert` via `hostDirectives` (`exportAs: 'kjAlert'`
preserved) and renders:

```html
<ng-content select="[kjAlertIcon]" />
<div class="kj-alert__body">
  <ng-content select="[kjAlertTitle]" />
  <ng-content select="[kjAlertDescription]" />
  <ng-content />  <!-- escape hatch -->
</div>
<ng-content select="[kjAlertActions]" />
<ng-content select="[kjAlertDismiss]" />
```

No new inputs at the wrapper layer — `KjAlert`'s contract is complete.

## Variants & severity mapping

| `kjVariant` | Default `kjAlertMode` (when unset) | Default icon (in wrapper) | Token pair |
|---|---|---|---|
| `'info'` | `'polite'` | `info` | `--kj-color-info` / `--kj-color-info-content` |
| `'success'` | `'polite'` | `check-circle` | `--kj-color-success` / `--kj-color-success-content` |
| `'warning'` | `'polite'` | `triangle-exclamation` | `--kj-color-warning` / `--kj-color-warning-content` |
| `'error'` | `'assertive'` | `circle-exclamation` | `--kj-color-error` / `--kj-color-error-content` |
| `'neutral'` | `'polite'` | none | `--kj-color-base-content` |

Themes own the icon glyphs and the token mapping. The directive only
exposes `data-variant`. Same model as Button.

## Sticky / page-level banner pattern

A page-level banner (cookie notice, ToS update, maintenance window,
unverified-email warning) is a real but distinct use case. It is:

- present on initial render (static),
- a landmark — users navigate to it via the region rotor,
- usually positioned `position: sticky; top: 0` or rendered inside the
  page header,
- often accompanied by an action and dismiss.

**Same directive set, configured differently:**

```html
<kj-alert
  kjAlertStatic="true"
  kjVariant="warning"
  kjAlertMode="static"
  aria-labelledby="banner-title">
  <kj-alert-icon />
  <span kjAlertTitle id="banner-title">Maintenance scheduled</span>
  <span kjAlertDescription>
    The platform will be unavailable on Saturday from 02:00 to 04:00 UTC.
  </span>
  <kj-alert-actions>
    <a kjButton kjVariant="link" href="/status">Status page</a>
  </kj-alert-actions>
  <button kjAlertDismiss>×</button>
</kj-alert>
```

What changes vs. an inline alert:

- `role="region"` (not `role="alert"`).
- No `aria-live` — the banner is present on load; AT users will reach
  it via region navigation, not via interruption.
- **An accessible name is mandatory** — either `aria-labelledby` to a
  title id, or `aria-label` on the root. `KjAlert`'s dev-mode check
  enforces this in static mode.
- Themes provide a `data-mode="static"` selector for the sticky
  positioning + page-spanning chrome. The directive does not set any
  positioning — that's strictly theme-layer.

We do **not** ship a separate `<kj-banner>` wrapper. One component,
two modes, picked by `kjAlertStatic` / `kjAlertMode`. Decoupling them
into two surface APIs would duplicate the variant/icon/title/dismiss
contract for no benefit.

(If a future "global page-banner stack" with z-index management and
cross-page persistence emerges as a real need, that's a *service*
layer like `KjToastService` — but it's not on the v1 list.)

## Examples to ship

Under `packages/core/src/alert/` (headless, theme-agnostic):

1. **`alert.example.ts`** — basic info alert with title + description.
2. **`alert.retro.example.ts`** / **`alert.finance.example.ts`** — themed
   variants of the basic example, mirroring the Toast/Button pattern.
3. **`alert.variants.example.ts`** — info/success/warning/error/neutral
   side-by-side.

Under `packages/components/src/alert/` (wrapper + chrome):

4. **`alert.default.example.ts`** — `<kj-alert>` with icon, title,
   description, dismiss.
5. **`alert.with-actions.example.ts`** — error variant with "Retry" +
   "View details" buttons inside `<kj-alert-actions>`.
6. **`alert.dismissible.example.ts`** — consumer-managed visibility via
   `*ngIf`/`@if`, `(kjAlertDismissed)="show.set(false)"`.
7. **`alert.static-banner.example.ts`** — `kjAlertStatic="true"` page-top
   maintenance banner, demonstrates `role="region"` + `aria-labelledby`.
8. **`alert.form-summary.example.ts`** — form-level "There were 3
   errors" summary at the top of a `<form>`, dynamically inserted on
   submit, `kjVariant="error"` resolves to assertive automatically.
9. **`alert.live-update.example.ts`** — the alert content changes while
   visible (e.g., "Reconnecting…" → "Reconnected"); demonstrates that
   `aria-atomic="true"` causes a clean re-announce.
10. **`alert.configured.example.ts`** — `provideKjAlert({ variants:
    [..., 'brand'] })` to extend the preset list.

## Open questions / risks

1. **Should `KjAlertTitle` enforce a heading element?** Today the
    proposal is "doc it, don't enforce." The Button analysis took the
    same posture for icon-only `aria-label`. If real consumers
    consistently apply it to a `<span>` or `<div>`, escalate to a
    dev-mode warning. Don't escalate further than a warning — there
    are valid layouts (banner inside a `<header>`) where the title
    isn't a heading.

2. **Severity-driven default mode is opinionated.** We default
    `error` → `assertive`, others → `polite`. A consumer who wants a
    polite error (e.g., "Couldn't save draft, will retry…" — non-blocking
    background error) needs to set `kjAlertMode="polite"` explicitly.
    Document this prominently with the matrix.

3. **`role="alert"` vs. `role="status"` are not equivalent across AT.**
    NVDA, JAWS, and VoiceOver each handle them slightly differently —
    e.g., VoiceOver does not always queue `polite` announcements when
    the user has just interacted with a control. We rely on the APG
    guidance and accept the platform variance; consumers who need
    deterministic announcements should use `KjLiveRegion.announce()`
    on a separate hidden region in addition to (not instead of) the
    visible alert.

4. **Mounting an alert with `role="alert"` on initial page load fires
    once on hydrate.** This is the expected APG behaviour — but in SSR
    apps, an alert rendered server-side and hydrated client-side will
    fire on hydrate, not on the original server render. The dev-mode
    guidance steers consumers to `kjAlertStatic="true"` whenever the
    alert is "always there", which avoids this. Document the SSR
    nuance explicitly.

5. **Multiple simultaneous assertive alerts.** Two or more `role="alert"`
    elements appearing at once may be coalesced or dropped by AT. If
    the consumer is rendering a list of errors, the right shape is
    **one** outer assertive alert with multiple `KjAlertDescription`
    items, not many alerts. Document the form-summary pattern (example
    8 above) as the canonical answer.

6. **Animation on dismiss.** The directive sets `data-dismissed="true"`
    momentarily but does not delay unmount. Themes that want an exit
    animation must run it at the consumer's `(kjAlertDismissed)`
    callback site, not via the directive. Consider adding a
    `kjAlertExitDuration` input later if a real consumer needs
    directive-managed exit timing — out of scope for v1.

7. **`KjAlertDismiss` swallows the dismiss click — what about consumer
    `(click)`?** `KjAlertDismiss` should call `ctx.dismiss()` *and*
    allow the consumer's own `(click)` to fire (they may want
    analytics). Fire `ctx.dismiss()` from the host listener (post-Angular
    event), not from a `preventDefault`-style handler. Same shape as
    `KjDialogClose`.

8. **`KjAlertDismiss` composing `KjButton` re-exposes `kjPressed`,
    `kjLoading`, `kjDisabled` whether we want them or not.** We don't
    pass those inputs through in the `hostDirectives` aliasing — only
    `kjVariant` / `kjSize` / `kjAriaLabel`. The unaliased ones remain
    bindable on the underlying `KjButton` host but aren't part of the
    documented `KjAlertDismiss` API. Acceptable; document the four
    aliased inputs as the supported surface.

9. **`KjAlertActions` setting `role="group"` on a `<div>`.** Browsers
    expose `role="group"` reliably; AT support is good. If we end up
    wrapping a single button, the group adds noise — consider an
    `effect()` warning when the actions container has only one child
    (suggest dropping the directive). Not blocking.

10. **No first-class link to a "Toast vs. Alert" decision doc.** When
    Toast analysis is updated, add a back-link to this file's
    "Source comparison" matrix discussing the dynamic-vs-transient
    axis. Otherwise consumers will keep mixing them up — every other
    library does.

11. **Configurable preset shape — `KJ_ALERT_CONFIG`.** Mirrors
    `KJ_BUTTON_CONFIG` exactly:
    ```ts
    export interface KjAlertConfig extends KjBindablePresetConfig {
      variants: ['info', 'success', 'warning', 'error', 'neutral'];
      sizes: ['sm', 'md', 'lg'];
      defaults: { variant: 'info'; size: 'md' };
    }
    ```
    Reuse `bindPresets(KJ_ALERT_CONFIG)` in the directive's `providers`.
    Same pattern Button uses; no new infrastructure needed.

12. **Form-level error summary cross-cut.** The form-summary alert
    pattern (example 8) overlaps with what `KjForm` will eventually
    own (collecting all field errors and rendering a summary). Until
    `KjForm` ships, consumers compose this manually. When `KjForm`
    ships, decide whether it auto-renders the summary as an Alert or
    exposes a slot — flag in `data-input/form.md`.
