# Stepper

A multi-step, sequenced navigation surface. The user is moving through
an ordered set of N panels — *Account* → *Profile* → *Confirm*,
*Address* → *Shipping* → *Payment* → *Review*, *Diagnostic* →
*Severity* → *Triage* — and the surface communicates **where they
are**, **how far they have come**, **how far is left**, and **whether
each step has been satisfied**. Two operating modes are baked in from
v1:

- **Linear.** The user must satisfy step *N* before step *N+1*
  becomes reachable. Forward-only, with an implicit "back" affordance
  to revisit completed steps for review. The classic checkout / KYC /
  signup wizard.
- **Non-linear.** The user may jump to any step at any time, in any
  order. Used for settings panels, multi-tab "long form" editors
  (think a profile editor with sections that don't depend on each
  other), and step-as-tabs surfaces where the *progress* metaphor is
  visual rather than enforced.

The two modes share the same DOM, the same ARIA, and the same content
projection — they differ in (a) whether the step header is a clickable
button, (b) whether `aria-disabled` is set on un-reached headers, and
(c) whether keyboard navigation rovs across all steps or stops at the
furthest-completed one.

> **Not on disk yet.** No `packages/core/src/stepper/`, no
> `packages/components/src/stepper/`. This file specifies the
> directive family, the linear-vs-non-linear state model, the
> per-step completion / error contract, the ARIA wiring, the
> ProgressBar composition, and the wrapper API to land for v1.

For the **horizontal-tab equivalent** — selected-one-of-many, content
projected by visible tab — see `tabs.md` (planned). Stepper and Tabs
share enormous overlap at the visible level (a row of headers, one
panel visible at a time, roving tabindex on headers, a single
content region per "tab"), but they differ on three axes that justify
two distinct components:

1. **Order matters in Stepper.** A step has an *index* and a
   *predecessor*; in Tabs the order is presentational only. Stepper
   exposes `next()` / `previous()` on the root because *next* and
   *previous* are meaningful; Tabs exposes `select(value)` only.
2. **Completion state is first-class in Stepper.** Each step has
   `completed`, `error`, and `optional` states that the surface
   visualises (checkmark, exclamation, "(optional)" suffix). Tabs
   has no notion of completion — a tab is selected or it isn't.
3. **Linear gating exists in Stepper.** Tabs cannot be "locked" by
   the un-completion of a sibling tab; that's a Stepper concern.

For the **count-and-jump cousin**, see `pagination.md` (planned).
Pagination is "I have N pages of data, jump me to page K" — same
visual rhythm (a row of indexed buttons), entirely different intent
(the user is browsing through data slices, not satisfying a
sequence of forms). Stepper is *unidirectional progress through a
finite, ordered task*; Pagination is *random access into a list*.

For the **fractional-progress companion**, see
[`../feedback/progress-bar.md`](../feedback/progress-bar.md). Stepper
optionally renders a `KjProgressBar` ("Step 3 of 5", 60% complete)
above or below the step row to give a coarse percentage signal; the
Stepper computes the fraction (`completedSteps / totalSteps` for
non-linear, `currentStepIndex / totalSteps` for linear) and passes
it as `kjValue` with `kjAriaValuetext="Step 3 of 5"` so AT does not
read *"60 percent"*. ProgressBar's analysis already forward-references
this pattern (see [`progress-bar.md` §"Cross-component pointers"]).

For **the form integration**, see
[`../data-input/form.md`](../data-input/form.md). Stepper does **not**
manage forms. Each step's content typically wraps a `KjForm`
(reactive form group) and the consumer drives `kjStepCompleted`
from the form's `valid` signal and `kjStepError` from its `invalid +
touched` state. Stepper exposes hooks (`canAdvance`,
`(kjStepEnter)`, `(kjStepLeave)`) so the consumer can run their own
validation gate, but the form lifecycle, the error rendering, and
the field-level `aria-invalid` plumbing are Form's job.

## Source comparison

| Concern | PrimeNG `p-stepper` (modern) / `p-steps` (legacy) | Angular Material `mat-stepper` | shadcn/ui | daisyUI `steps` | WAI-ARIA APG |
|---|---|---|---|---|---|
| Primary surface | **Two components.** `<p-steps>` is a navigation-only step indicator (a row of clickable headers, no panel content); `<p-stepper>` is the wizard (headers + content slots via `<p-stepperPanel>`). Newer API converging on `<p-stepper>` | Single component family: `<mat-stepper>` (or `<mat-horizontal-stepper>` / `<mat-vertical-stepper>`) with `<mat-step>` children. Each `<mat-step>` projects its own content and may wrap a `FormGroup` directly | No first-class component. Community recipes compose `Tabs` + custom step header chrome; some recipes use `RadixGroup` for the indicator | Pure CSS: `<ul class="steps">` with `<li class="step step-primary">`. No JS, no panel content, no completion state — purely decorative | **No dedicated APG pattern.** APG has notes on the [Wizard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/wizard/) (informational, not a formal pattern). The recommendation is loose: ordered list of steps, current step labelled with `aria-current="step"`, headers may be `<button>` if non-linear |
| Linear vs. non-linear | `[linear]` boolean on the wizard; non-linear is the default for `<p-steps>`, configurable on `<p-stepper>` | `[linear]` boolean on `<mat-stepper>`; default `false`. Per-step `completed` and `editable` flags refine which steps remain reachable | n/a — consumer recipe | n/a — purely CSS, no state | n/a — pattern only |
| Step model | `<p-stepperPanel>` with a `header` template slot and a `content` template slot | `<mat-step>` directive with `[stepControl]` (a `FormControl`/`FormGroup` whose validity gates `linear` advancement), `[label]`, `[optional]`, `[completed]`, `[hasError]`, `[editable]` | n/a | n/a | n/a |
| Orientation | `[orientation]="'horizontal' \| 'vertical'"` on `<p-stepper>` | Two distinct components historically (`mat-horizontal-stepper`, `mat-vertical-stepper`); the unified `<mat-stepper>` accepts `[orientation]` | n/a | Inherent to CSS class set; no JS toggle | n/a |
| Selection model | `[(activeStep)]` — number index | `[(selectedIndex)]` — number index, or `selected: MatStep` | n/a | n/a | `aria-current="step"` on the active step header |
| Keyboard | Arrow nav between headers (when reachable in linear mode); Enter/Space activate; Home/End to first/last | Roving tabindex on headers via CDK; ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical); Home/End; Enter/Space activates | n/a | n/a (no JS) | The wizard pattern note: each header should be a button if non-linear; arrow-key roving is recommended |
| Form integration | Manual — consumer wires the form and toggles `[disabled]` on the next button | First-class via `[stepControl]`; `linear` mode reads `stepControl.invalid` to gate advancement automatically | n/a | n/a | n/a |
| Step content visibility | Only the active panel is rendered (or only the active panel is `[hidden]`-toggled, configurable) | `<mat-step>` template content is lazily instantiated by default (each step is a separate template); active step's view is the only one in the DOM | n/a | n/a (no panels) | The active panel should be a region, labelled by the active header |
| Validation visualisation | `[hasError]` on `<p-stepperPanel>`; renders a small error glyph | `[hasError]` on `<mat-step>`; renders the error icon in the indicator | n/a | n/a | n/a |
| Optional steps | `[optional]` on `<p-stepperPanel>` (PrimeNG modern) | `[optional]` on `<mat-step>`; renders "(Optional)" suffix and adjusts the linear advancement gate | n/a | n/a | n/a |
| ARIA wiring | `<p-steps>` uses `<ul role="tablist">` with `role="tab"` headers and `aria-controls`/`aria-selected`; the modern `<p-stepper>` uses an ordered list with `aria-current` instead | `<mat-stepper>` uses `role="tablist"` on the header strip, `role="tab"` on each header, `role="tabpanel"` on the content. Treats it as a tab-like composite | n/a | None — purely visual | Wizard note recommends `<ol>` with each step labelled; `aria-current="step"` on the active step. **Avoids `tablist` semantics** — a wizard is sequenced, tabs are not |

**Read-off.**

- **PrimeNG's split** (`p-steps` for "indicator only", `p-stepper` for
  "indicator + panels") is over-segmented. We collapse the two: a
  Stepper *is* a step indicator that *optionally* projects panel
  content. The "indicator only" use case is `<kj-stepper>` with no
  `<kj-step-content>` children (the consumer renders their own panels
  reactively from `stepper.activeStep()`). One component, two shapes.
- **Material's `[stepControl]`** is convenient, but it couples the
  stepper to Angular reactive forms in a way kouji does not want at
  the directive layer. Stepper is **form-system agnostic**; the
  consumer drives `kjStepCompleted` from a signal of their choosing
  (a form's `valid()`, a remote-validation observable, a custom
  business rule). The wrapper component layer can offer a
  `<kj-step [kjStepFor]="form">` shorthand that wires this for the
  common case (see *Form integration* below), but the directive does
  not import or know `FormGroup`.
- **Material's choice of `tablist` semantics** is a defensible
  shortcut (the keyboard story is well-known, AT support is broad),
  but it elides the *sequence* metaphor: Tabs are unordered;
  Steppers are ordered. We follow APG's wizard guidance and use
  **`<ol>` + `aria-current="step"`** as the primary semantics, and
  emit each step header as a `<button>` (in non-linear mode) or a
  non-interactive `<div role="listitem">` with a `<button>` only
  for completed/active steps (in linear mode). The differences are
  in *Accessibility* below.
- **shadcn / Radix** has no first-class stepper. We pick up the
  *shape* (compound directives + injection token + headless) but
  invent the semantics from scratch.
- **daisyUI** is purely visual; useful as a chrome reference for the
  default theme but provides no behavioural target.

The shape we adopt is **shadcn-flavoured composition** (root + step
+ trigger + content compound) plus **APG-wizard-correct ARIA**
(ordered list, `aria-current="step"`, region content) plus **a
linear-vs-non-linear mode flag that affects keyboard/focus behaviour
but not DOM structure**.

## Decision: needs a core directive?

**Yes, definitively.** Four contracts justify it:

1. **State machine.** Active step index, completed-set,
   error-set, and the linear-vs-non-linear gating rule together
   form a non-trivial state machine. It must enforce:
   - In linear mode, `goTo(i)` is a no-op if `i > activeStep + 1`
     and the steps `0..i-1` are not all completed (or marked
     editable / optional).
   - `next()` advances by exactly one in linear mode (gated on
     `canAdvance`); in non-linear mode it advances by one too,
     wrapping or clamping per `kjLoop`.
   - `previous()` moves back by one without gating (a completed
     or in-progress step is always re-visitable).
   - Marking a step `kjStepError` does not block re-entry but does
     visualise (icon + AT phrasing) and is *cleared by the
     consumer* (typically when the form re-validates), not by the
     stepper.
   This is exactly the state-machine shape that headless
   directives are for. Three different theme implementations
   would each get the linear-gating edge cases subtly wrong.

2. **A11y wiring across N elements.** The `<ol>` root, each
   `<li>` step header, the conditional `<button>` inside each
   header, the active step's `aria-current="step"`, the
   `aria-disabled` on un-reached headers in linear mode, the
   region content with `aria-labelledby` to the active step's
   header id, and the optional roving-tabindex on headers when
   non-linear — all of these have to coordinate. They share the
   same id-generation and the same active-index signal. Putting
   that in three theme-CSS bundles is how a11y bugs ship.

3. **Keyboard contract.** Roving tabindex on headers (non-linear),
   ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical),
   Home/End, Enter/Space to activate. Each step's content also
   needs Tab to land on the next focusable form field — and the
   stepper should *not* trap focus on the headers (this is not a
   modal). The keyboard contract reuses `KjRovingTabindex` but
   adds two pieces of logic (linear-mode reachability mask, and
   the orientation-axis switch) that don't belong in the
   primitive.

4. **ProgressBar coordination.** When `kjShowProgress` is true,
   the directive computes the fraction and the
   `aria-valuetext` phrasing and feeds them to `KjProgressBar` via
   inputs on a wrapper-rendered `<div [kjProgressBar]>`. Three
   theme implementations would each format the phrasing
   differently (*"Step 3/5"* vs *"3 of 5"* vs *"Step 3 (5
   total)"*); centralising the formatter in the directive (with a
   consumer-overridable `kjProgressLabel`) is the right place.

Items beyond these — the chevron between steps, the circle-with-
number indicator, the colour mapping — are reused from existing
primitives (`KjVariant`, `KjSize`) and don't motivate the directive
on their own. The state machine + a11y + keyboard + ProgressBar
combo does.

## Composition model

**Six core directives, shadcn-shaped.** A root that owns the state
machine, an item directive per step that registers itself with the
root and exposes its own context, plus four leaf directives for
the visible parts (label, content, next button, previous button).
A reset button is a small enough surface that it ships as a leaf
too. All standalone, communicating through two injection tokens
(`KJ_STEPPER`, `KJ_STEP`).

```
KjStepper                (selector: [kjStepper], owns state machine, provides KJ_STEPPER, hosts KjVariant + KjSize)
  └── KjStep             (selector: [kjStep], registers with KJ_STEPPER, provides KJ_STEP)
        ├── KjStepLabel      (selector: [kjStepLabel], injects KJ_STEP, host-binds id + click handler)
        ├── KjStepContent    (selector: [kjStepContent], injects KJ_STEP, host-binds role="region" + visibility)
        ├── KjStepperNext    (selector: [kjStepperNext], injects KJ_STEPPER, host-binds (click) + disabled)
        ├── KjStepperPrevious (selector: [kjStepperPrevious], injects KJ_STEPPER, host-binds (click) + disabled)
        └── KjStepperReset   (selector: [kjStepperReset], injects KJ_STEPPER, host-binds (click))
```

Note: `KjStepperNext`, `KjStepperPrevious`, `KjStepperReset` inject
`KJ_STEPPER` *not* `KJ_STEP` — they are stepper-level commands, not
step-level ones, and the consumer typically renders a single Next /
Previous button outside the active step content (or inside it; the
selector accepts both placements because both inject the root).

### Why six directives, not three or one

A three-directive shape (root + step + content) would force the
step header to be implicit DOM that the directive owns. We want the
consumer to write the header markup (a number circle, an icon, a
label, a sub-label) and we just wire ARIA and click on the
appropriate child — that's the `KjStepLabel` directive's job. A
one-directive shape would ship a built-in header chrome the
consumer can't break out of (PrimeNG's mistake on the older
`p-steps`).

The split also lets:
- the **root** be an `<ol>` (proper sequence semantics);
- each **step** be an `<li>` with `aria-current="step"` when
  active;
- the **label** be a `<button>` (non-linear) or `<div>` /
  `<button [disabled]>` (linear, un-reached) inside the `<li>` —
  the `KjStepLabel` directive picks the correct ARIA based on
  reachability;
- the **content** be a sibling `<section role="region">` inside
  the `<li>`, hidden when the step is not active;
- **Next / Previous / Reset** live anywhere in the consumer's
  template (typically below the stepper or inside the active
  step's content) and inject the root context.

This mirrors the Accordion / Dialog / Tabs compound shape used
elsewhere in kouji.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | Composed via `hostDirective` on `KjStepper` | Routes variant tokens (primary / success / warning / error). The variant typically maps the *active* step's circle colour. |
| `KjSize` | Composed via `hostDirective` on `KjStepper` | `xs` / `sm` / `md` / `lg` controls the indicator circle diameter and label font size. Reflected as `data-size`; themes own the actual values. |
| `KjFocusRing` | Composed via `hostDirective` on `KjStepLabel` (when it renders as a button) and on `KjStepperNext` / `KjStepperPrevious` / `KjStepperReset` | Centralises the design-system focus ring. Same posture as Accordion's planned upgrade. |
| `KjRovingTabindex` + `KjRovingTabindexItem` | Composed via `hostDirective` on `KjStepper` (root) and `KjStepLabel` (item) when `kjLinear === false` and `kjArrowNavigation !== false` | Single tab stop on the header strip; ArrowLeft/Right or ArrowUp/Down moves between headers. The primitive needs an `orientation` input (see *Open questions*). |
| `KjDisabled` | Not composed — the `disabled` posture for a Next / Previous button comes from the stepper's reachability state, not a generic `kjDisabled` input. The button host-binds `[attr.aria-disabled]` and `[disabled]` directly from the root context's `canAdvance()` / `canRetreat()` signals | Avoids two sources of truth. |
| `KjProgressBar` (composition, not host directive) | Rendered inside the wrapper template (`<kj-stepper>`) when `kjShowProgress` is true. The wrapper passes `[kjValue]="stepper.progressFraction()"` and `[kjAriaValuetext]="stepper.progressLabel()"` | Stepper does not host-compose ProgressBar; it consumes it as a sibling element. The fraction and phrasing are computed signals on the root. |
| `KjLiveRegion` | Optional, mounted inside the wrapper when `kjAnnounceStepChange` is true. Pushes "Step 3 of 5: Profile" on `(kjStepChange)` | Per-step-transition announcement; AT users who lost focus during a long step (e.g. focus moved to a server-side error) get a re-orientation. Off by default — same posture as ProgressBar's milestone announcements. |

### Cross-component pointers

- [`../feedback/progress-bar.md`](../feedback/progress-bar.md) —
  Stepper composes ProgressBar for fractional progress (`Step 3 of
  5`, 60% complete). The fraction is computed by Stepper; ProgressBar
  is the visual + ARIA value carrier. Use `kjAriaValuetext` so AT
  reads the human phrasing instead of *"60 percent"*. ProgressBar's
  analysis already cross-references this exact pattern.
- [`../data-input/form.md`](../data-input/form.md) — each step's
  content typically wraps a `KjForm`. Stepper does not manage the
  form; the consumer drives `kjStepCompleted` from
  `form.valid()` and `kjStepError` from `form.invalid() &&
  form.touched()`. Stepper exposes `(kjStepLeave)` so the consumer
  can mark the form touched (showing all field errors) when the
  user clicks Next. See *Form integration* below.
- `tabs.md` (planned) — same compound shape, similar roving
  tabindex, but Tabs uses `role="tablist"` semantics and has no
  ordering / completion / linear-gating. After both ship, consider
  extracting a shared `KjOrderedSelectionState` primitive — but
  not yet (the duplication is small enough that DRYing is
  premature).
- `pagination.md` (planned) — superficially similar (a row of
  indexed buttons) but a different intent (random access into a
  list of pages of data). Pagination doesn't need `KjStep` /
  `KjStepContent`; it ships its own `KjPaginationItem`. Cross-
  reference is for *visual* alignment only — the chevron direction,
  the indicator circle size, the ellipsis treatment.
- [`../data-display/accordion.md`](../data-display/accordion.md) —
  vertical Stepper looks like an Accordion at a glance (a column of
  headers with body content under each). The mental model is
  different: Accordion is *zero-or-more open*, Stepper is
  *exactly-one active*. Do not confuse the two; each has its own
  ARIA.
- [`../actions/button.md`](../actions/button.md) — `KjStepperNext`
  / `KjStepperPrevious` / `KjStepperReset` are *not* `KjButton`s —
  they are directives that *go on* a `<button kjButton>` (or any
  button-shaped element). They contribute the `(click)` handler
  and the disabled-from-state binding; KjButton contributes the
  visual chrome. Same composition shape `KjAccordionTrigger` uses
  on `<button kjButton>`.

## Linear vs. non-linear

`kjLinear: input<boolean>(false)`. The single input drives all the
behavioural differences; DOM structure is identical.

| Behaviour | `kjLinear=true` (linear) | `kjLinear=false` (non-linear, default) |
|---|---|---|
| `goTo(i)` | No-op if `i > activeStep+1` AND not all of `0..i-1` are `completed` (or `optional`, or `editable`). Always permitted to go *backwards* to any `0..activeStep`. | Always permitted; jumps directly to step `i`. |
| `next()` | Advances by one if `canAdvance()` is true. `canAdvance` = the active step is `completed`, `optional`, or marked `kjAlwaysAdvance`. | Advances by one, no gating. |
| `previous()` | Always permitted (clamped at 0). | Always permitted (clamped at 0). |
| `KjStepLabel` rendering | Reachable steps (≤ activeStep, plus optionally the next reachable one) host-bind as `<button>` with the click handler; un-reached steps host-bind `aria-disabled="true"` and the click is a no-op. | All steps host-bind as `<button>` with click handlers; nothing is `aria-disabled` (unless the consumer marks `kjStepDisabled`). |
| Roving tabindex | Restricted to the *reachable* set. ArrowRight on the last reachable step is a no-op; the next un-reached header is not in the tab order. | All steps participate in roving. |
| `aria-disabled` | Set on un-reached step labels (header buttons). | Not set, except when the consumer explicitly marks `kjStepDisabled` on an individual step. |

The default `kjLinear=false` matches our "minimum surprise"
posture: a stepper that doesn't gate by default is a tab-strip,
which is the safer landing for ambiguous use cases. Linear mode is
opt-in — the consumer who needs *forward-only signup* asks for it
explicitly.

**`kjAlwaysAdvance` per step.** A linear stepper with one optional
step in the middle ("review your data — you may skip this") needs a
way to permit advancement without marking the step as `completed`
(which would be a lie). Two paths:

- `kjStepOptional: input<boolean>(false)` — semantically *"this
  step does not block linear advancement"*. Renders an
  "(optional)" suffix in the label (theme-owned). This is the
  PrimeNG / Material name and we adopt it.
- `kjStepCompleted: input<boolean>(false)` — explicitly marked
  done. Drives `data-completed="true"` and the checkmark glyph.

In linear mode, `canAdvance` evaluates as:

```ts
canAdvance = computed(() => {
  const active = stepper.activeStep();
  return active.completed() || active.optional();
});
```

Marking a step `kjStepError` does **not** block advancement on its
own — the consumer must combine `kjStepError=true` with
`kjStepCompleted=false` to lock the gate. This separation is
deliberate: an error state visualises *"something went wrong"*, a
not-completed state gates *"can the user move on?"*. Conflating the
two leads to "I marked the step in error, but the user can still
proceed" bugs.

## Orientation

`kjOrientation: input<'horizontal' | 'vertical'>('horizontal')`.

| Concern | Horizontal (default) | Vertical |
|---|---|---|
| Layout | Headers in a row; the active step's content sits below the header row, spanning full width | Headers in a column; the active step's content sits *between* the active header and the next header (Material's vertical-stepper layout) |
| Arrow keys | ArrowLeft / ArrowRight move between headers; ArrowUp / ArrowDown ignored | ArrowUp / ArrowDown move between headers; ArrowLeft / ArrowRight ignored |
| `aria-orientation` | `aria-orientation="horizontal"` on the root `<ol>` | `aria-orientation="vertical"` on the root |
| Connector chrome | A horizontal line / chevron between headers (theme-owned, via `[data-orientation="horizontal"]`) | A vertical line between headers (theme-owned) |
| Best for | 3–5 step wizards in a wide layout (signup, checkout) | 5+ steps, narrow layouts (mobile, sidebar wizards), or when each step's content is short enough to inline next to the header |

The directive does not enforce a step-count limit; consumer + theme
make the call. The `kjOrientation` input drives:
1. `aria-orientation` on the root (a11y),
2. `data-orientation` on the root and on each step (theme),
3. The arrow-key axis in `KjRovingTabindex` (see *Open questions*
   on the primitive needing axis support).

The two orientations share the same DOM layout — what changes is
the CSS (flex-direction, connector orientation). The Stepper
directive does not template a different DOM tree; themes do.

## Step state model

Each `KjStep` exposes through its context:

```ts
export interface KjStepContext {
  /** 0-based index in the parent stepper's step set (auto-assigned by registration order). */
  index: Signal<number>;
  /** True when this step is the active one. */
  active: Signal<boolean>;
  /** True when this step has been completed (consumer-set via kjStepCompleted). */
  completed: Signal<boolean>;
  /** True when this step is in an error state (consumer-set via kjStepError). */
  error: Signal<boolean>;
  /** True when this step is optional (does not gate linear advancement). */
  optional: Signal<boolean>;
  /** True when this step is reachable in the current mode (always true in non-linear). */
  reachable: Signal<boolean>;
  /** True when this step is explicitly disabled by the consumer. */
  disabled: Signal<boolean>;
  /** Stable id for aria-labelledby wiring. */
  labelId: Signal<string>;
  /** Stable id for the content region. */
  contentId: Signal<string>;
  /** Imperative — activate this step. Subject to linear-mode gating. */
  activate(): void;
}
export const KJ_STEP = new InjectionToken<KjStepContext>('KjStep');
```

`completed`, `error`, `optional`, `disabled` are **consumer-driven**
(inputs on `KjStep`). `index`, `active`, `reachable`, `labelId`,
`contentId` are **directive-derived** (computed from registration
order and the parent's `activeStep` / `kjLinear` signals).

**Stateless from the consumer's perspective for completion.** The
directive does not auto-mark a step `completed` when the user
clicks Next. The consumer is the source of truth:

```html
<kj-step [kjStepCompleted]="profileForm.valid()">
  <kj-step-label>Profile</kj-step-label>
  <kj-step-content>
    <form [kjForm]="profileForm">…</form>
  </kj-step-content>
</kj-step>
```

This keeps the directive form-system-agnostic (Form is the source
of validity for forms; the consumer can wire any other source for
non-form completion criteria — server-side validation, derived
business rules, "user accepted the terms" signals).

## Active step model

`KjStepper` owns:

```ts
private _activeStep: WritableSignal<number> = signal(0);
readonly activeStep: Signal<number> = this._activeStep.asReadonly();
```

Plus the public `model`:

```ts
readonly kjActiveStep = model<number>(0);
```

Sync from input → internal via `effect`; sync from internal → output
via `effect` (with equality guard to prevent loops). Same shape
Accordion's `kjOpenValues` model proposes.

Why a number index, not a string-keyed value (as Accordion uses)?
Steppers are inherently *sequenced*. The order is the meaning.
String keys add friction (every step needs a unique key) without
adding value (you can't reorder steps in a wizard mid-flight; if
you do, the user's progress is meaningless anyway). Use `kjStepKey`
as a `kj`-prefixed *display* attribute (for analytics, for
querying) but the active-step pointer is by index.

The single exception: a consumer-driven *named-step* navigation
(`stepper.goTo('profile')`) where the consumer prefers to refer to
steps by semantic name. We accommodate by exposing both methods on
the root:

```ts
goTo(index: number): void;
goToKey(key: string): void;        // walks step list, finds matching kjStepKey, calls goTo(index)
```

`goToKey` is a thin convenience; the canonical API is index-based.

## Base features

- **Variants (preset, configurable):** `primary`, `success`,
  `warning`, `error`. Default `'primary'`. The variant maps the
  *indicator* (the circle around the step number) on the active
  step. Completed steps render in a fixed "completed" colour
  regardless of variant; error steps render in a fixed "error"
  colour. Variant is for *neutral active emphasis*, not state
  visualisation.
- **Sizes (preset, configurable):** `xs`, `sm`, `md`, `lg`. Default
  `'md'`. Drives the indicator diameter and label font size. The
  directive only reflects `data-size`; themes own the actual
  measurements.
- **Linear mode:** `kjLinear: input<boolean>(false)`.
- **Orientation:** `kjOrientation: input<'horizontal' |
  'vertical'>('horizontal')`.
- **Active step (two-way):** `kjActiveStep: model<number>(0)`.
- **Loop on next/previous:** `kjLoop: input<boolean>(false)`.
  Default `false` (clamps at 0 and N-1); when `true`, `next()` from
  the last step wraps to 0 and `previous()` from 0 wraps to N-1.
  Useful for non-linear "settings panels" stepper used as a tab
  strip.
- **Show progress bar:** `kjShowProgress: input<boolean>(false)`.
  Wrapper-only; mounts `<div [kjProgressBar]>` above (or below,
  configurable) the step list. The directive computes the fraction
  and the phrasing.
- **Progress placement:** `kjProgressPlacement: input<'top' |
  'bottom' | 'none'>('top')`. Wrapper-only.
- **Progress label formatter:** `kjProgressLabel: input<(active:
  number, total: number, completed: number) => string>` — defaults
  to `Step {active+1} of {total}`. Wrapper-only.
- **Outputs (root):**
  - `kjStepChange: output<{ from: number; to: number }>()` — emits
    when the active step changes for any reason (next, previous,
    goTo, programmatic).
  - `kjStepLeave: output<{ index: number; reason: 'next' |
    'previous' | 'goTo' }>()` — emits *before* the active step
    changes, on the *outgoing* step. Consumers can use this to
    mark forms touched, persist draft state, etc.
  - `kjStepEnter: output<{ index: number; reason: 'next' |
    'previous' | 'goTo' | 'init' }>()` — emits *after* the active
    step changes, on the *incoming* step. Consumers can use this
    to focus the first form field, lazy-load data for the step,
    etc.
- **Outputs (per step):**
  - `kjStepActiveChange: output<boolean>()` — local mirror of
    active-step change.
- **Imperative API on the root:**
  - `next(): void`
  - `previous(): void`
  - `goTo(index: number): void`
  - `goToKey(key: string): void`
  - `reset(): void` — sets active to 0, optionally clears the
    `completed` and `error` flags on every step (consumer must opt
    into the latter via `kjResetStepStates: boolean = false`).

### State model

The directive owns:

- `_activeStep: WritableSignal<number>` — the canonical pointer.
- `_steps: WritableSignal<KjStep[]>` — the registered children, in
  registration order. Each `KjStep` calls `stepper.register(this)`
  in its `constructor`.

Everything else (`canAdvance`, `canRetreat`, `progressFraction`,
`progressLabel`) is `computed` from these plus the children's
`completed`/`optional`/`error` signals.

**The completed-set is *not* owned by the directive.** Each
`KjStep`'s `kjStepCompleted` is its own input; the directive reads
it but does not mutate it. This is the same posture as ProgressBar's
"value is the consumer's source of truth".

## Accessibility

Target: **WCAG 2.1 AAA**.

Reference: [WAI-ARIA APG — Wizard
note](https://www.w3.org/WAI/ARIA/apg/patterns/wizard/) (informational)
and the Tab pattern (for keyboard contract reuse, with the wizard's
ordered-list semantics on top).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Root is `<ol>`; each step is `<li>`; the active step has `aria-current="step"`; the step content is `<section role="region">` with `aria-labelledby` to the step's label id; `aria-orientation` on the root reflects `kjOrientation` | `KjStepper`, `KjStep`, `KjStepLabel`, `KjStepContent` host bindings |
| 1.3.2 Meaningful Sequence | The DOM order is the step order; the consumer's `<kj-step>` declarations register in that order; visual rearrangement (CSS `flex-direction: row-reverse`) is forbidden — themes that need RTL flip use `dir="rtl"` on the root | Theme convention; the directive does not validate |
| 1.4.1 Use of Color | Step state is conveyed via the indicator (colour + icon: checkmark for completed, exclamation for error, number for active/upcoming), the label text, and the `aria-current` attribute. **Colour alone is never the only cue.** | Theme layer (icon glyphs); directive layer (`data-completed`, `data-error`, `aria-current`) |
| 1.4.6 Contrast (Enhanced, AAA) | ≥7:1 for label text, ≥3:1 for the indicator vs. the page background, ≥4.5:1 for the active-step's outline against the page | Theme layer |
| 1.4.13 Content on Hover or Focus | n/a — Stepper is not a hover surface; sub-labels are inline, not tooltips | — |
| 2.1.1 Keyboard | Headers reachable via Tab (single tab stop in non-linear via roving; per-step tab stops in linear are also acceptable when roving is off); Enter/Space activates a header; Next/Previous buttons are native `<button>`s and inherently keyboardable | `KjStepLabel` host (when rendered as `<button>`); `KjRovingTabindex` composition; native button semantics |
| 2.1.2 No Keyboard Trap | Tab leaves the stepper after the last header / Next button; the active panel's content is in document order and tab continues into form fields normally | Inherent |
| 2.4.3 Focus Order | DOM order: header strip → progress bar (if any) → active panel content → Next/Previous buttons. Tab follows it | Inherent if consumer follows the recommended template |
| 2.4.6 Headings & Labels (AAA) | Each step has a clear label; sub-labels are optional. The directive does not force a heading wrapper but the docs example wraps each `KjStepLabel` in an appropriate `<h2>`/`<h3>` | Documented in examples |
| 2.4.7 Focus Visible | Focus ring on header buttons (when reachable) and Next/Previous buttons | `KjFocusRing` host-composed on `KjStepLabel` (button mode) and on Next/Previous |
| 2.5.5 Target Size (AAA) | Header buttons ≥ 44×44 CSS px; Next/Previous buttons ≥ 44×44 | Theme layer; the wrapper's default theme uses `padding: var(--kj-space-md) var(--kj-space-lg)` on the label, `min-height: 2.75rem` on Next/Previous |
| 4.1.2 Name, Role, Value | Each header has an accessible name (the label content); the active step is identified via `aria-current="step"`; the content region is named via `aria-labelledby`; un-reached steps in linear mode are `aria-disabled="true"` | Host bindings on `KjStepLabel`, `KjStepContent` |
| 4.1.3 Status Messages | Optional `kjAnnounceStepChange` on the wrapper pushes "Step 3 of 5: Profile" through a hidden `[kjLiveRegion]="polite"` on every step transition | Wrapper layer; off by default |

### Why `aria-current="step"`, not `role="tablist"` / `aria-selected`

A wizard is *sequenced* — the user is moving through an ordered
task. Tabs are *unordered* — the user is choosing one of N parallel
views. AT users distinguish the two: `tablist` semantics imply
"these are equivalent views"; `aria-current="step"` on an `<ol>`
implies "you are at step 3 of an ordered task".

Material's `mat-stepper` uses `role="tablist"` + `aria-selected`
because (a) AT support is broader, (b) the keyboard contract reuses
the well-known tab one. We deliberately diverge:

1. AT support for `aria-current="step"` is now broad (NVDA, JAWS,
   VoiceOver all announce *"step, current"* as of 2023+).
2. The semantic mismatch — *"selected tab"* vs *"current step"* —
   matters for users running comprehension software, screen-reader
   verbosity settings, or assistive workflows that key off
   `aria-current` (browser's "find current item", AT skiplinks).
3. Reusing the tab keyboard contract is fine; we do that anyway via
   roving tabindex. We don't need the tab *role* to get the tab
   *keyboard*.

If a consumer specifically needs tablist semantics (their AT setup
demands it), they can apply `role="tablist"` to a wrapper — but the
out-of-the-box semantics are wizard-shaped.

### Keyboard contract

| Key | Behaviour | Required by APG (wizard note)? |
|---|---|---|
| `Tab` / `Shift+Tab` | Move into / out of the header strip; once inside, the strip is a single tab stop (roving) when non-linear, multiple tab stops when linear-with-roving-off | Required (Tab in / Tab out) |
| `ArrowRight` / `ArrowLeft` (horizontal) or `ArrowDown` / `ArrowUp` (vertical) | Move focus to the next / previous *reachable* header. Wraps if `kjLoop=true`; clamps otherwise | Recommended |
| `Home` / `End` | First / last *reachable* header | Recommended |
| `Enter` / `Space` on a focused header | Activate that step (calls `stepper.goTo(index)`) | Required when headers are buttons |
| `Tab` from inside the active panel | Continues into the next focusable element (Next button, surrounding page); not trapped | Required |

Disabled or un-reached headers are *skipped* by ArrowLeft/Right
roving — the focus jumps to the nearest reachable neighbour. Same
posture `KjMenu` and `KjListbox` take with `aria-disabled`
descendants.

### Focus management on step change

When the user clicks Next (or Previous, or a header), focus must
move predictably. The directive's policy:

- **On `next()` / `previous()` / `goTo()` / `goToKey()` triggered
  by a button click:** focus moves to the **first focusable
  element inside the newly-active panel**. If the panel has no
  focusable descendants, focus moves to the active step's *header*
  (the `<button>` inside `KjStepLabel`).
- **On `goTo()` triggered by clicking a header:** focus stays on
  the header that was clicked. (The user is already there; moving
  focus away would be disorienting.)
- **On programmatic `goTo()` from consumer code (no triggering
  event):** focus does not move. The consumer is responsible for
  managing focus if they programmatically navigate (typical for
  *"after server roundtrip, advance to step 3"* — the consumer
  knows which element should hold focus next).

The directive distinguishes the three cases via an internal
`_navigationSource` signal that the click handlers set; the focus
logic runs in a `(kjStepChange)` `effect` that reads that source.

This is the same shape Material uses (their `_keyManager` tracks
"focused via keyboard" vs "focused programmatically") but built on
signals instead of CDK.

### Reduced motion

Step transitions (a horizontal slide from one panel to the next, a
fade between panels) are **theme-owned animations**. The directive
reflects `data-reduced-motion="reduce"` on the root from the shared
`KJ_REDUCED_MOTION` signal; themes neutralise the transition under
that attribute. The directive does not own the animation lifecycle.

### Dev-mode validation

`KjStepper` runs an `effect()` in dev mode that asserts:

1. **At least one `<kj-step>` is registered.** Empty steppers warn
   on first render — the consumer probably forgot to project
   children.
2. **`kjActiveStep` is in `[0, steps.length)`.** Out-of-range
   triggers a one-time warn and clamps.
3. **In linear mode, the initial `kjActiveStep` value is `0` or all
   prior steps are `completed` / `optional`.** Otherwise the
   stepper is in an impossible state (the user can't be on step 3
   if step 1 isn't done in linear mode). Warn once and clamp to
   the first non-completed step.
4. **A step has either a `KjStepLabel` child or a `kjStepLabel`
   string input.** Otherwise the header has no accessible name.
   Warn.
5. **Two `KjStep`s with the same `kjStepKey` warn** — the
   `goToKey` lookup will pick the first match silently otherwise.

Warnings, not throws (except #1 in dev). Same posture as the
icon-only Button warning.

## Form integration

Stepper is form-system-agnostic. The consumer's typical pattern:

```html
<kj-stepper [kjLinear]="true" [(kjActiveStep)]="active">
  <kj-step [kjStepCompleted]="accountForm.valid()"
           [kjStepError]="accountForm.invalid() && accountForm.touched()">
    <kj-step-label>Account</kj-step-label>
    <kj-step-content>
      <form [kjForm]="accountForm">
        <kj-input kjLabel="Email" formControlName="email" required />
        <kj-input kjLabel="Password" formControlName="password" required />
      </form>
    </kj-step-content>
  </kj-step>

  <kj-step [kjStepCompleted]="profileForm.valid()"
           [kjStepError]="profileForm.invalid() && profileForm.touched()">
    <kj-step-label>Profile</kj-step-label>
    <kj-step-content>
      <form [kjForm]="profileForm">…</form>
    </kj-step-content>
  </kj-step>

  <kj-step>
    <kj-step-label>Confirm</kj-step-label>
    <kj-step-content>
      <kj-summary [data]="combinedFormValue()" />
      <kj-stepper-next (click)="submit()">Submit</kj-stepper-next>
    </kj-step-content>
  </kj-step>

  <div class="kj-stepper-actions">
    <button kjButton kjStepperPrevious>Back</button>
    <button kjButton kjStepperNext>Continue</button>
  </div>
</kj-stepper>
```

Key contract:

- **`KjStep.kjStepCompleted`** is bound to the form's validity. The
  Stepper does not call `form.valid` itself — the consumer wires
  the signal.
- **`KjStep.kjStepError`** is bound to *invalid + touched* (only
  show error after the user has interacted). The Stepper renders
  the error glyph; Form renders the per-field error messages.
- **Marking the form touched on Next.** A common pitfall: the user
  clicks Next on an invalid form, the form is `invalid` but
  `pristine`, so error messages don't appear. Solution: in the
  consumer's `(kjStepLeave)` handler, mark the outgoing form as
  touched. The Stepper provides the hook; the consumer applies it.
- **Async validation on Next.** When advancing requires a server
  round-trip ("check email is unique before letting them advance"),
  the consumer intercepts Next: bind `(click)` on a custom
  `<button kjButton>` (not `kjStepperNext`), run the async
  validation, then call `stepper.next()` programmatically on
  success. `kjStepperNext` is for the simple case; bypass it for
  async.

The wrapper layer can offer a `<kj-step [kjStepFor]="form">`
shorthand that wires `kjStepCompleted` / `kjStepError` / "mark
touched on leave" automatically — but this is a v1.x ergonomic
sugar; v1 ships with the explicit form binding above.

## Inputs / Outputs / Models

### `KjStepper` (`[kjStepper]`, `exportAs: 'kjStepper'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjActiveStep` | `model` | `number` | `0` | Two-way bound. The canonical active-step pointer. |
| `kjLinear` | `input` | `boolean` | `false` | Linear vs. non-linear mode. |
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives `aria-orientation`, `data-orientation`, and the arrow-key axis. |
| `kjLoop` | `input` | `boolean` | `false` | When `true`, `next()` from last wraps to 0; `previous()` from 0 wraps to last. Linear mode silently ignores this (you can't loop past un-completed steps). |
| `kjResetStepStates` | `input` | `boolean` | `false` | When `true`, `reset()` also clears all steps' `completed` / `error` / `optional` flags by emitting `(kjReset)` per step. The consumer's bindings are the source of truth for the input values; this is a hint to *also* reset their underlying signals. |
| `kjVariant` | `input` (preset) | `string` (validated against `KJ_STEPPER_CONFIG.variants`) | `'primary'` | Forwarded to `KjVariant`. |
| `kjSize` | `input` (preset) | `string` (validated against `KJ_STEPPER_CONFIG.sizes`) | `'md'` | Forwarded to `KjSize`. |
| `kjArrowNavigation` | `input` | `boolean` | `true` | Whether to apply `KjRovingTabindex`. Default true for stepper (always-on roving is the right default for sequential UI); a consumer who wants every header in the tab sequence can set false. |
| **Outputs** | | | | |
| `kjStepChange` | `output` | `{ from: number; to: number }` | — | Emits whenever active step changes. |
| `kjStepLeave` | `output` | `{ index: number; reason: 'next' \| 'previous' \| 'goTo' \| 'init' }` | — | Emits before active step changes, on the outgoing step. The `'init'` reason fires once on first render for the initial step. |
| `kjStepEnter` | `output` | `{ index: number; reason: 'next' \| 'previous' \| 'goTo' \| 'init' }` | — | Emits after active step changes, on the incoming step. |
| `kjReset` | `output` | `void` | — | Emits when `reset()` is called. Consumers listen to clear their per-step signals if `kjResetStepStates=true`. |

Public API exposed via the context (`KJ_STEPPER`):

```ts
export interface KjStepperContext {
  /** Active step index, 0-based. */
  activeStep: Signal<number>;
  /** Total number of registered steps. */
  totalSteps: Signal<number>;
  /** Linear-mode flag. */
  linear: Signal<boolean>;
  /** Orientation. */
  orientation: Signal<'horizontal' | 'vertical'>;
  /** True when next() will succeed. */
  canAdvance: Signal<boolean>;
  /** True when previous() will succeed. */
  canRetreat: Signal<boolean>;
  /** Fraction in [0, 1] for ProgressBar consumption. */
  progressFraction: Signal<number>;
  /** Human phrasing for ProgressBar's aria-valuetext. */
  progressLabel: Signal<string>;
  /** Imperative navigation. */
  next(): void;
  previous(): void;
  goTo(index: number): void;
  goToKey(key: string): void;
  reset(): void;
  /** Internal — KjStep registration. */
  register(step: KjStepContext): void;
  unregister(step: KjStepContext): void;
}
export const KJ_STEPPER = new InjectionToken<KjStepperContext>('KjStepper');
```

Host bindings:

```ts
host: {
  'role': 'group',                              // <ol> already has list semantics; role="group" optional but explicit
  '[attr.aria-orientation]': 'orientation()',
  '[attr.data-orientation]': 'orientation()',
  '[attr.data-linear]': 'linear() ? "true" : null',
  '[attr.data-active-step]': 'activeStep()',
  '[attr.data-reduced-motion]': 'reducedMotion() ? "reduce" : null',
}
```

The directive expects to be applied to an `<ol>` (the wrapper renders
one); applied to anything else, it warns in dev and the
`role="list"` falls through to whatever the host provides. We do
*not* set `role="list"` ourselves — `<ol>` already carries it.

### `KjStep` (`[kjStep]`, `exportAs: 'kjStep'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjStepCompleted` | `input` | `boolean` | `false` | Consumer-driven. Drives `data-completed` and contributes to linear-advancement gating. |
| `kjStepError` | `input` | `boolean` | `false` | Consumer-driven. Drives `data-error` and the error glyph. Does **not** gate advancement on its own. |
| `kjStepOptional` | `input` | `boolean` | `false` | Permits linear advancement without `completed`. Drives the "(optional)" suffix (theme-owned). |
| `kjStepDisabled` | `input` | `boolean` | `false` | Explicit per-step disable. Independent of linear-mode reachability. |
| `kjStepKey` | `input` | `string \| undefined` | `undefined` | Optional human-meaningful key for `goToKey()` and analytics. Not the active-step pointer. |
| `kjStepLabel` | `input` | `string \| undefined` | `undefined` | Wrapper-only shorthand. When set (and no projected `<kj-step-label>`), renders an internal label with this text. |
| **Outputs** | | | | |
| `kjStepActiveChange` | `output` | `boolean` | — | Local mirror of active-state change. |

Host bindings:

```ts
host: {
  'role': 'listitem',                           // <li> already implies this; explicit for non-<li> hosts
  '[attr.aria-current]': 'active() ? "step" : null',
  '[attr.data-active]': 'active() ? "true" : null',
  '[attr.data-completed]': 'completed() ? "true" : null',
  '[attr.data-error]': 'error() ? "true" : null',
  '[attr.data-optional]': 'optional() ? "true" : null',
  '[attr.data-disabled]': 'disabled() ? "true" : null',
  '[attr.data-reachable]': 'reachable() ? "true" : null',
  '[attr.data-step-index]': 'index()',
}
```

### `KjStepLabel` (`[kjStepLabel]`)

This directive renders ARIA / interaction on whatever element it's
applied to. The wrapper renders it on a `<button>` (non-linear
mode, all steps; linear mode, reachable steps) or on a `<span>`
(linear mode, un-reached steps — non-interactive).

| Host binding (button mode) | Source |
|---|---|
| `[attr.id]` | `step.labelId()` |
| `[attr.aria-controls]` | `step.contentId()` |
| `[attr.aria-disabled]` | `step.disabled() \|\| !step.reachable() ? 'true' : null` |
| `[disabled]` | `step.disabled() \|\| !step.reachable()` (only when host is `<button>`) |
| `[attr.tabindex]` | managed by `KjRovingTabindexItem` when roving is on |
| `(click)` | `step.activate()` (no-op when disabled or unreachable) |
| `(keydown.enter)` / `(keydown.space)` | `step.activate()` (only when host is not a `<button>`; otherwise native handling) |

| Host binding (non-button mode) | Source |
|---|---|
| `[attr.id]` | `step.labelId()` |
| `[attr.aria-disabled]` | `'true'` (always, since this mode is used for un-reached labels) |

The directive picks the mode from `tagName === 'BUTTON'` plus the
step's `reachable()` signal. The wrapper template chooses the
correct host element via `@if`.

No public inputs.

### `KjStepContent` (`[kjStepContent]`)

| Host binding | Source |
|---|---|
| `[attr.role]` | `'region'` |
| `[attr.id]` | `step.contentId()` |
| `[attr.aria-labelledby]` | `step.labelId()` |
| `[attr.hidden]` | `!step.active() \|\| null` |
| `[attr.inert]` | `!step.active() ? '' : null` |
| `[attr.data-state]` | `step.active() ? 'active' : 'inactive'` |
| `[attr.tabindex]` | `step.active() ? '-1' : null` (so the region is programmatically focusable when active, for the focus-on-step-change story) |

`[attr.hidden]` plus `[attr.inert]` is belt-and-braces — `[hidden]`
removes from layout, `[inert]` blocks focus and pointer events for
descendants. Active-only panels avoid the half-rendered-during-
animation problem Accordion's plan addresses; Stepper is simpler
because step transitions are *not* simultaneous (only one panel is
active at a time, ever).

For animated step transitions (a horizontal slide), themes can
opt to render outgoing and incoming panels simultaneously by
overriding `[hidden]` with CSS — the directive's job is to ensure
ARIA correctness (only one `aria-current="step"`, only one
non-`hidden` panel by default), not to manage a transition
choreography.

No public inputs.

### `KjStepperNext` (`[kjStepperNext]`)

Applied to a `<button>` element.

| Host binding | Source |
|---|---|
| `[disabled]` | `!stepper.canAdvance() \|\| stepper.activeStep() === stepper.totalSteps() - 1 && !stepper.kjLoop()` |
| `[attr.aria-disabled]` | (mirrors disabled) |
| `(click)` | `stepper.next()` |
| `[attr.data-stepper-action]` | `'next'` |

No public inputs. The button's accessible name is its content
("Continue", "Next", localised) — same posture as `KjButton`.

### `KjStepperPrevious` (`[kjStepperPrevious]`)

Applied to a `<button>` element.

| Host binding | Source |
|---|---|
| `[disabled]` | `!stepper.canRetreat() \|\| stepper.activeStep() === 0 && !stepper.kjLoop()` |
| `[attr.aria-disabled]` | (mirrors) |
| `(click)` | `stepper.previous()` |
| `[attr.data-stepper-action]` | `'previous'` |

No public inputs.

### `KjStepperReset` (`[kjStepperReset]`)

Applied to a `<button>` element.

| Host binding | Source |
|---|---|
| `(click)` | `stepper.reset()` |
| `[attr.data-stepper-action]` | `'reset'` |

No public inputs. Not gated on state — resetting from the first
step is a no-op but harmless.

### Wrapper components (components package)

`<kj-stepper>` applies `KjStepper` via `hostDirectives`, projects
`<kj-step>` children, and conditionally renders the ProgressBar
slot:

| Element | Wrapper input | Maps to / does |
|---|---|---|
| `<kj-stepper>` | `kjActiveStep`, `kjLinear`, `kjOrientation`, `kjLoop`, `kjVariant`, `kjSize`, `kjArrowNavigation`, `kjResetStepStates` | Pass-through to `KjStepper` via `hostDirectives` `inputs` |
| `<kj-stepper>` | `kjShowProgress: input<boolean>(false)` | Wrapper-only. When true, renders `<div [kjProgressBar] [kjValue]="stepper.progressFraction()" [kjAriaValuetext]="stepper.progressLabel()">…</div>` in the slot |
| `<kj-stepper>` | `kjProgressPlacement: input<'top' \| 'bottom'>('top')` | Wrapper-only. Decides which CSS slot the ProgressBar lands in |
| `<kj-stepper>` | `kjProgressLabel: input<(active, total, completed) => string>` | Wrapper-only. Custom phrasing for ProgressBar's `aria-valuetext` |
| `<kj-stepper>` | `kjAnnounceStepChange: input<boolean>(false)` | Wrapper-only. Mounts a hidden `[kjLiveRegion]="polite"` and announces "Step 3 of 5: Profile" on each `kjStepChange` |
| `<kj-step>` | `kjStepCompleted`, `kjStepError`, `kjStepOptional`, `kjStepDisabled`, `kjStepKey`, `kjStepLabel` | Pass-through to `KjStep` |
| `<kj-step-label>` | (no public input) | Renders a `<button>` (or `<span>` in linear-unreached mode) wrapping `<ng-content>`, applies `[kjStepLabel]` directive |
| `<kj-step-content>` | (no public input) | Renders a `<section>` wrapping `<ng-content>`, applies `[kjStepContent]` directive |
| `<kj-stepper-next>` / `<kj-stepper-previous>` / `<kj-stepper-reset>` | Pass-through `KjButton` inputs (`kjVariant`, `kjSize`, …) | Render a `<button kjButton>` with the corresponding `[kjStepperNext]` / `…` directive |

Wrapper template (sketch, horizontal orientation, with progress):

```html
<div class="kj-stepper" [attr.data-orientation]="kjOrientation()">
  @if (kjShowProgress() && kjProgressPlacement() === 'top') {
    <div [kjProgressBar]
         [kjValue]="stepper.progressFraction() * 100"
         [kjAriaValuetext]="stepper.progressLabel()"
         class="kj-stepper__progress">
      <div kjProgressBarFill class="kj-stepper__progress-fill"></div>
    </div>
  }
  <ol [kjStepper]
      [kjActiveStep]="kjActiveStep()"
      (kjActiveStepChange)="kjActiveStep.set($event)"
      [kjLinear]="kjLinear()"
      [kjOrientation]="kjOrientation()"
      class="kj-stepper__list">
    <ng-content />
  </ol>
  @if (kjShowProgress() && kjProgressPlacement() === 'bottom') { …same… }
  @if (kjAnnounceStepChange()) {
    <span [kjLiveRegion]="'polite'" class="kj-visually-hidden">{{ announcement() }}</span>
  }
</div>
```

Each `<kj-step>` renders:

```html
<li [kjStep] [kjStepCompleted]="kjStepCompleted()" …>
  @if (step.reachable() || !stepper.linear()) {
    <button kjButton kjStepLabel kjVariant="ghost" class="kj-step__label">
      <span class="kj-step__indicator">
        @if (step.completed()) { <kj-icon kjIcon="check" /> }
        @else if (step.error()) { <kj-icon kjIcon="exclamation" /> }
        @else { {{ step.index() + 1 }} }
      </span>
      <ng-content select="kj-step-label" />
    </button>
  } @else {
    <span kjStepLabel class="kj-step__label kj-step__label--disabled">
      <span class="kj-step__indicator">{{ step.index() + 1 }}</span>
      <ng-content select="kj-step-label" />
    </span>
  }
  @if (step.active()) {
    <ng-content select="kj-step-content" />
  }
</li>
```

The `@if (step.active())` around `<kj-step-content>` ensures only
the active panel is in the DOM at all — simplifying both ARIA (no
duplicate `id`s, no risk of a hidden panel's form fields being
accidentally tabbable) and rendering cost. Themes that need an
animated transition between panels override the wrapper's template
or render their own crossfade chrome with absolute positioning.

## Variants & token mapping

| `kjVariant` | When to use | Token pair |
|---|---|---|
| `'primary'` | The default for any neutral wizard (signup, settings). | `--kj-color-primary` for active indicator outline, `--kj-color-primary-bg-soft` for active label |
| `'success'` | The wizard culminates in a successful state (publish flow); the active step's chrome leans positive. | `--kj-color-success` |
| `'warning'` | The wizard contains caution-worthy steps (irreversible deletion, plan downgrade). | `--kj-color-warning` |
| `'error'` | Rare — typically the variant doesn't change the *whole* stepper colour; per-step error is per-step. | `--kj-color-error` |

Themes own the colour mapping; the directive only reflects
`data-variant`. Note that completed steps use a fixed "completed"
token (typically green) regardless of variant — the variant is for
the *active* step's emphasis, not for state visualisation.

## Sizes

| `kjSize` | Indicator diameter (theme-owned) | Label font size |
|---|---|---|
| `'xs'` | 20 px | `--kj-font-size-xs` |
| `'sm'` | 24 px | `--kj-font-size-sm` |
| `'md'` | 32 px | `--kj-font-size-md` |
| `'lg'` | 40 px | `--kj-font-size-lg` |

The directive only reflects `data-size`. Themes own the actual
sizes via `--kj-stepper-indicator-size-*` and label font-size
tokens. The `xs` / `sm` sizes risk dropping below the WCAG 2.5.5
44 px target-size threshold for the *indicator*; the *header
button* (which is the actual interactive surface) is larger
because it includes padding around the indicator and the label
text. Themes must verify the button hit area, not the indicator
diameter, for AAA compliance.

## Examples to ship

Under `packages/core/src/stepper/` (headless, theme-agnostic):

1. **`stepper.example.ts`** — basic three-step stepper, linear mode,
   default theme. Each step's content is a small piece of placeholder
   text; the user clicks Next / Back.
2. **`stepper.retro.example.ts`** / **`stepper.finance.example.ts`** —
   themed variants, mirroring the Toast / Alert / Button pattern.
3. **`stepper.non-linear.example.ts`** — `kjLinear=false`; all steps
   are clickable from the start; demonstrates the tab-strip-shaped
   use of Stepper.
4. **`stepper.vertical.example.ts`** — `kjOrientation='vertical'`;
   demonstrates the column layout and ArrowUp/Down arrow keys.

Under `packages/components/src/stepper/` (wrapper + chrome):

5. **`stepper.default.example.ts`** — `<kj-stepper>` with three
   `<kj-step>` children, each wrapping a `<form [kjForm]>`; demonstrates
   the canonical signup wizard.
6. **`stepper.linear-with-validation.example.ts`** — linear mode,
   `kjStepCompleted` bound to `form.valid()`; the Next button
   disables when the active form is invalid; clicking Next on an
   invalid form (via the explicit consumer-handled override) marks
   the form touched to surface field errors.
7. **`stepper.optional-step.example.ts`** — middle step is
   `kjStepOptional=true`; Next advances even when not completed;
   the label shows "(optional)" suffix.
8. **`stepper.error-state.example.ts`** — server-side validation
   marks the second step `kjStepError=true` after submission; the
   indicator shows the exclamation glyph; the user goes Back, fixes
   the input, the error clears (consumer logic).
9. **`stepper.with-progress-bar.example.ts`** —
   `kjShowProgress=true`; the bar above the stepper shows the
   fraction and `aria-valuetext="Step 3 of 5"`.
10. **`stepper.async-next.example.ts`** — Next button is a custom
    `<button kjButton>` (not `kjStepperNext`); `(click)` runs an
    async server check, then calls `stepper.next()` programmatically
    on success. Demonstrates the bypass pattern for async
    advancement.
11. **`stepper.announce-step-change.example.ts`** —
    `kjAnnounceStepChange=true`; SR users hear "Step 2 of 3:
    Profile" on each transition.
12. **`stepper.reset.example.ts`** — `<button kjButton kjStepperReset>`
    in the final step's content; clicking it returns to step 0;
    `kjResetStepStates=true` and the example demonstrates clearing
    the per-step completion signals via `(kjReset)`.
13. **`stepper.programmatic.example.ts`** — `@ViewChild(KjStepper)`
    on a stepper, with external buttons calling `stepper.goToKey('confirm')`
    to demonstrate the named-step navigation.
14. **`stepper.configured.example.ts`** —
    `provideKjStepper({ variants: [..., 'brand'] })` to extend
    presets.

## Open questions / risks

1. **`KjRovingTabindex` needs an `orientation` input.** Today the
   primitive treats ArrowLeft/Right and ArrowUp/Down equivalently
   (see `packages/core/src/a11y/roving-tabindex.ts`). Stepper's
   `kjOrientation` requires the primitive to honour axis: horizontal
   uses ArrowLeft/Right, vertical uses ArrowUp/Down. This is also a
   blocker for Tabs, Toolbar, and Menu (when those land). Plan: add
   `orientation: input<'horizontal' | 'vertical' | 'both'>('both')`
   to `KjRovingTabindex`; default `'both'` keeps existing consumers
   working; Stepper sets `'horizontal'` or `'vertical'` from
   `kjOrientation`. Implement before Stepper code lands.

2. **Index-based vs. key-based active step.** We chose index-based
   (`kjActiveStep: model<number>`) for canonical-API simplicity and
   added `goToKey(key)` as a thin convenience. The trade-off: a
   consumer who reorders steps mid-flight (rare but possible) sees
   the active pointer drift to the "wrong" step. We accept this —
   reordering steps mid-flight is an antipattern (the user's
   progress becomes meaningless), and the alternative (string-keyed
   active step) makes the common case noisier (every step needs a
   key).

3. **Conditional `hostDirectives` for roving.** Same constraint as
   Accordion: Angular doesn't support conditional `hostDirectives`,
   so we apply `KjRovingTabindex` always and make it a no-op when
   `kjArrowNavigation=false`. Same posture Accordion plans. The
   primitive's keydown handler short-circuits when no items are
   registered or when `kjArrowNavigation()` (read from the
   stepper's context) is false.

4. **Linear-mode reachability of the *next* un-completed step.**
   Two interpretations:
   - **Strict:** only completed/optional + the active step are
     reachable. The user clicks the active header to stay; cannot
     click "ahead".
   - **Lenient:** completed/optional + the active step + the *next*
     step are reachable. The user can click the next header (which
     is equivalent to clicking Next).
   Material chooses strict; PrimeNG chooses lenient (you can click
   the next step header). We pick **strict by default**, with an
   `kjReachableNextStep: input<boolean>(false)` opt-in for the
   lenient mode. Strict is the more conservative landing —
   advancement should be an explicit Next click, not an implicit
   header click — but we name the lenient mode for parity with
   PrimeNG.

5. **Focus on step change is "first focusable in panel" — what if
   the panel has no focusable elements?** Falls back to the active
   step's header. If even the header is `aria-disabled`
   (linear-mode-edge case where `step.reachable()` is false but
   `step.active()` is true — which shouldn't happen but the test
   matrix is wide), fall back to the stepper root with
   `tabindex="-1"`. The test matrix verifies these fallbacks.

6. **Lazy-loading step content.** Some wizards have heavy panels
   (each step pre-loads a different module). The `@if
   (step.active())` template gate already lazy-renders, but if the
   step's *imports* should also lazy-load, that's a routing
   concern (`loadComponent`); Stepper doesn't try to provide a
   built-in lazy-import shape. Document the consumer pattern (one
   route per step, or one defer block per `<kj-step-content>`).

7. **Going back loses unsaved form state.** When the user is on
   step 3 and clicks Back, then clicks Next again, step 3's form
   may have been re-rendered (the `@if (step.active())` removed it
   from the DOM). Two postures:
   - **Re-render every time (current).** Each step's form is
     fresh on entry; consumer re-hydrates from a higher-up signal.
     Simple, correct, but loses transient form state (un-blurred
     fields, validation messages, scroll positions).
   - **Keep all panels in the DOM, only show the active one
     (Material's posture).** Preserves state but keeps N forms in
     memory and risks `id` collisions and accidental tabbability if
     ARIA is wrong.
   We pick (1) for v1 — the active-only-in-DOM model. State
   preservation is the consumer's job (lift form state to a parent
   signal). A `kjPreservePanelDom: input<boolean>(false)` opt-in
   could be added in v1.x if there's demand.

8. **`kjLoop` interaction with linear mode.** Linear + loop is
   non-sensical (you can't loop past un-completed steps). The
   directive silently ignores `kjLoop` when `kjLinear` is true and
   warns once in dev. Document this in the input's TSDoc.

9. **Step indicator content is theme-owned.** The wrapper's default
   theme renders the index number, a checkmark for completed, and
   an exclamation for error. A consumer who wants custom indicator
   content (an icon per step, a letter, a Roman numeral) needs to
   override the wrapper template — or we can expose
   `<kj-step-indicator>` as a fifth content-projection slot. v1
   ships without `<kj-step-indicator>`; if consumer feedback
   demands it, add in v1.x. The headless directive layer doesn't
   need to know.

10. **Sub-label slot.** A "step has a primary label and an optional
    secondary line" pattern (Material's `<mat-step-description>`)
    is common. Two ways to ship:
    - **`<kj-step-sub-label>` content slot** — explicit, projects
      below the primary label. Costs one more directive.
    - **`kjStepSubLabel: input<string>` on `<kj-step>`** — terser
      for the simple case. Limits to plain text.
    Ship the input first; add the slot if consumer feedback wants
    rich sub-label content. v1: input only.

11. **Configurable preset shape — `KJ_STEPPER_CONFIG`.** Mirrors
    `KJ_BUTTON_CONFIG` / `KJ_PROGRESS_BAR_CONFIG`:
    ```ts
    export interface KjStepperConfig extends KjBindablePresetConfig {
      variants: ['primary', 'success', 'warning', 'error'];
      sizes: ['xs', 'sm', 'md', 'lg'];
      defaults: { variant: 'primary'; size: 'md' };
    }
    ```
    Reuse `bindPresets(KJ_STEPPER_CONFIG)` in the directive's
    `providers`. No new infrastructure.

12. **SSR.** No DOM measurement, no `IntersectionObserver`,
    no `setTimeout`. The active panel renders on the server with
    the initial `kjActiveStep` value (default 0); the
    `KJ_REDUCED_MOTION` signal short-circuits to `false` on the
    server (Toast / Carousel pattern). Hydration is straightforward:
    only the active panel's content is in the DOM, and it's the
    same panel before and after hydration.

13. **`<kj-step-content>` outside `<kj-step>`.** A consumer who
    projects `<kj-step-content>` directly inside `<kj-stepper>`
    without a wrapping `<kj-step>` triggers an injection error
    (`KJ_STEP` is not provided). Dev-mode error message: *"`<kj-step-content>`
    must be a child of `<kj-step>`. Wrap the content in
    `<kj-step><kj-step-content>…</kj-step-content></kj-step>`."*
    Same posture other compound components take.

14. **Focus-on-step-change race with `(kjStepEnter)`.** The
    consumer's `(kjStepEnter)` handler may itself move focus
    (e.g. *"focus the email input on entering step 2"*). The
    directive's focus-on-first-focusable logic and the consumer's
    explicit move can race. Plan: directive runs its focus move
    in a microtask (after `(kjStepEnter)` synchronously finishes);
    the consumer's explicit `element.focus()` in the handler wins.
    Document the ordering. Same model PrimeNG's overlay components
    use for *"focus the first input on open"* vs consumer override.

15. **`kjActiveStep` two-way binding with `[kjLinear]=true` and an
    out-of-range initial value.** The consumer sets
    `[(kjActiveStep)]="3"` on a stepper where step 1 isn't
    completed; the directive clamps to the first non-completed
    step (say, 1) and writes 1 back to the model. The consumer's
    signal flips from 3 → 1 in one tick. Document this as expected
    behaviour ("the model is the source of *intent*; the directive
    is the source of *truth* and may correct the model when the
    intent violates linear-mode rules"). Add a unit test.

16. **Label text inside the indicator vs. next to it.** Themes vary
    (Material puts the number *inside* the indicator circle;
    PrimeNG puts it next to the label). The directive does not
    template the indicator at all — it's pure theme chrome. Themes
    own the indicator markup inside `<kj-step-label>`. The
    directive layer's only contract on the label is: it carries
    the step's accessible name, it's clickable when reachable, and
    it host-binds the right ARIA. Where the number renders is
    theme business.

17. **Step index reactivity when steps are added/removed
    dynamically.** A consumer who renders steps from an `@for` over
    a signal of step descriptors can add or remove steps mid-flight.
    The directive's `_steps` is a `WritableSignal<KjStep[]>` updated
    via `register` / `unregister` from each `KjStep`'s `constructor`
    / `DestroyRef.onDestroy()`. Active step pointer:
    - If a step *before* the active one is removed, the active
      pointer decrements (the step that *was* at index N is now at
      N-1; the user's "current step" is preserved by identity).
    - If the active step itself is removed, the pointer stays at
      the same index, which now points to a different step. The
      directive emits `(kjStepLeave)` for the removed step and
      `(kjStepEnter)` for the new step at that index.
    - If a step *after* the active one is added, no change to the
      pointer.
    Document the rule. Add a unit test for each case.

18. **`role="group"` on the root.** `<ol>` already gives list
    semantics; adding `role="group"` is redundant but defensible
    (signals "these list items are related as a wizard"). Some AT
    announce both ("list of 5, group"); some ignore the redundant
    role. Decision: include it — the explicit signal is worth the
    minor redundancy, and it lets the directive be applied to a
    `<div>` host (rare, but possible) without losing group
    semantics. Document that the canonical host is `<ol>`.

19. **The stepper renders inside a `<form>`.** A consumer who wraps
    the entire stepper in a single `<form>` (one form for all
    steps) and uses native form submission risks the Next button
    submitting the form unintentionally. `KjStepperNext` host-binds
    `[type]="'button'"` defensively *only when* the host is a
    `<button>` element with no explicit `type` attribute. (The
    same posture `KjButton` takes for non-form-submitting buttons.)
    Document the multi-step-form pattern: one form per step
    (preferred) or one form with conditional validation (advanced).

20. **Touch/swipe gesture for mobile.** Some mobile wizards support
    swipe-left/right between steps. We do **not** ship gesture
    handling at the directive layer (no Hammer.js, no pointer-event
    swipe detection). Consumers who want swipe wire it themselves
    and call `stepper.next()` / `previous()`. Documented as out of
    scope for v1.

21. **Step content that *is* a stepper.** Nested steppers (a
    multi-step wizard inside a step of an outer wizard) are rare
    but possible. The injection-token pattern handles this naturally
    — each `KjStepper` provides its own `KJ_STEPPER`, and a child
    `KjStepperNext` injects the *nearest* stepper (the inner one).
    No special handling required; document as a working pattern in
    a test.
