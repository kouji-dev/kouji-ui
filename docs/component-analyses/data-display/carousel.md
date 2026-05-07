# Carousel

A rotating set of slides — images, content cards, testimonials,
hero banners. The user advances through a single-visible (or
multiple-visible) sequence with previous/next buttons, indicator
dots, optional autoplay, and pointer/touch swipe gestures. APG calls
this the **carousel pattern** and treats it as one of the heaviest
single-component a11y exercises in the catalogue: rotating content
that announces itself, keyboard equivalents for every gesture, an
autoplay contract that obeys WCAG 2.2.2 (Pause, Stop, Hide), and
optional loop semantics that ripple through focus management,
indicator state, and live-region copy.

> Not yet shipped. This analysis is the v1 design. Carousel is the
> single heaviest a11y component on the kouji roadmap; budget it
> accordingly. If you only read one section, read
> [Accessibility (WCAG 2.1 AAA)](#accessibility-wcag-21-aaa) and
> [Open questions / risks](#open-questions--risks).

For the **selected-one-of-many with persistent panels** pattern
(headers always visible, no rotation), see
[`../navigation/tabs.md`](../navigation/tabs.md). Tabs and
Carousel share the indicator-dots-as-tabs option (the APG "tabbed
carousel" variant), but Tabs assumes the user picks freely while
Carousel assumes the system rotates and the user occasionally
intervenes. For the **page-of-N indicator without rotation**
pattern, see [`../navigation/pagination.md`](../navigation/pagination.md);
the dot indicators here borrow that visual language but encode
"current slide of total" rather than "page of pages." For the
**single-disclosure** flavor with one trigger and one panel, see
[`./accordion.md`](./accordion.md).

## Source comparison

| Concern | PrimeNG `p-carousel` | Angular Material | shadcn/ui `Carousel` (Embla) |
|---|---|---|---|
| Primary surface | One component (`<p-carousel>`) with templated `item` slot, optional `header` / `footer` / `previousicon` / `nexticon` / `indicator` slots | **Not shipped.** No first-class carousel exists. The Material team has explicitly held off citing accessibility complexity (issue [#7843](https://github.com/angular/components/issues/7843), open since 2017) | Compound primitives (`<Carousel>`, `<CarouselContent>`, `<CarouselItem>`, `<CarouselPrevious>`, `<CarouselNext>`) wrapping the Embla engine |
| Engine | Hand-rolled scroll/translate; CSS transitions for slide motion | — | Embla Carousel — third-party JS (`embla-carousel-react`) handling scroll snap, drag, plugins (Autoplay, Fade, ClassNames) |
| Slides per view | `numVisible` (per breakpoint via `responsiveOptions: { breakpoint, numVisible, numScroll }`) | — | `slidesToScroll` per view (Embla option); responsive via Embla breakpoint plugin |
| Orientation | `orientation: 'horizontal' \| 'vertical'` | — | `orientation: 'horizontal' \| 'vertical'` |
| Autoplay | `autoplayInterval: number` (ms); pause on hover via `[autoplay]` API; no built-in pause-button | — | Plugin (`Autoplay({ delay, stopOnInteraction, stopOnMouseEnter })`); pause/resume exposed via `embla.plugins().autoplay` |
| Loop / wrap | `circular: boolean` | — | `loop: boolean` |
| Touch / swipe | Built-in pointer drag | — | Inherited from Embla (pointer drag, momentum) |
| Keyboard | Left/Right on the focused container; no Home/End; no per-slide arrows; Tab does not enter the slide region | — | Left/Right when component (the buttons) has focus. Embla itself does not handle keyboard; shadcn binds keydown on the root |
| ARIA | `role="region" aria-roledescription="carousel"` on the root; `role="group" aria-roledescription="slide" aria-label="N of M"` on each item; `aria-live` toggled to `off` when autoplay is on (sic — bug; APG says the opposite — see Open questions) | — | `role="region" aria-roledescription="carousel"` on root; group/slide on items; previous/next buttons get `aria-label`; **no live region** |
| Indicators | Built-in dot list with `aria-label="Page N"` and `aria-current="true"` on active. Two layout modes (`indicatorsContentClass`); not focusable composite — each is its own tab stop | — | Not shipped in the base recipe — consumers add their own via `embla.scrollTo(i)` |
| Pause/Play button | Not built-in; consumer-implemented | — | Not built-in; consumer composes with `embla.plugins().autoplay.play() / .stop()` |
| `prefers-reduced-motion` | Not respected — CSS transitions fire regardless | — | Not respected by default; consumers must disable Embla `duration` and the autoplay plugin manually |
| Dependencies | None (PrimeNG is self-contained) | — | Embla Carousel (~7 kB gzipped) + plugins |

**Read-off.**

- **Material's silence is the loudest data point.** The team
  explicitly does not ship a carousel because it cannot be made
  accessible without strong opinions about the slide content,
  autoplay defaults, and live-region timing. We are choosing to
  ship one — so we must adopt those opinions explicitly rather than
  hand them to consumers as configuration.
- **PrimeNG ships everything in one component.** The slot system
  works for simple cases but the consumer cannot reach inside to,
  for example, render a custom pause button that integrates with
  the same autoplay state. It also wires `aria-live="off"` while
  autoplay is on, which is wrong (APG: live region should always
  be `polite` when the user has not paused; switch to `off` only
  while paused or while the user is actively dragging — see Open
  question 1).
- **shadcn/Embla is the spiritual model for the gesture and snap
  behaviour** but conflicts with two kouji rules: no third-party
  UI runtime, and no opaque animation engines. We will replicate
  the user-facing API surface (loop, orientation, slides-per-view,
  drag, autoplay) using vanilla CSS scroll-snap + pointer events,
  not Embla. See the [Engine](#engine) section.

## Decision (core directive)

**Yes — heaviest core directive on the roadmap.** The state
machine (current index, autoplay timer, paused-by-user vs.
paused-by-hover-or-focus vs. paused-by-reduced-motion, drag
in-progress, programmatic vs. user-driven advance, loop wrap),
the keyboard contract, the ARIA wiring, the live-region cadence,
and the pointer-drag math all need to be share-once-implement-many.
Wrappers should only have to drop in styled `<button>`s and CSS;
they should not be reproducing timer logic or boundary handling.

Six-directive family:

```
KjCarousel              (selector: [kjCarousel], provides KJ_CAROUSEL)
  ├── KjCarouselViewport     (selector: [kjCarouselViewport])
  │     └── KjCarouselSlide  (selector: [kjCarouselSlide], provides KJ_CAROUSEL_SLIDE)
  ├── KjCarouselPrevious     (selector: [kjCarouselPrevious])
  ├── KjCarouselNext         (selector: [kjCarouselNext])
  ├── KjCarouselIndicators   (selector: [kjCarouselIndicators])
  │     └── (auto-renders one button per slide; or projects KjCarouselIndicator items)
  ├── KjCarouselAutoplay     (selector: [kjCarouselAutoplay])
  └── KjCarouselPauseToggle  (selector: [kjCarouselPauseToggle])
```

Why split the viewport from the root: the root carries
`role="region" aria-roledescription="carousel"` and is the *region
landmark*; the viewport is the scroll/translate container that the
slides actually live inside. Without a separate viewport directive
the consumer would have to hang `overflow: hidden`, scroll-snap,
and the translation transform on the same element that owns the
region role, which mixes concerns and breaks if a wrapper wants
its own border / padding chrome on the region.

**String-keyed slides.** Each `KjCarouselSlide` declares a
required `kjSlideValue: input.required<string>`. The root tracks
the `currentValue: WritableSignal<string>` rather than an index.
String keys are stable across `@for` reorders and across
async-loaded slides, and they let consumers two-way bind to a
persisted route param or analytics key — same rationale as
[Accordion](./accordion.md#string-keyed-item-identity).

**Autoplay is its own directive, not a flag on the root.** Two
reasons. (1) WCAG 2.2.2 requires a pause control whenever
autoplay duration exceeds 5 s; making autoplay opt-in via a child
directive forces the consumer to think about it as an attached
behaviour rather than a forgotten boolean. (2) The
`prefers-reduced-motion` and "user has clicked pause" gates need
a directive to host them — a flag would push that logic into the
root and bloat its API surface.

**No CDK, no Embla, no third-party engine.** Implement scroll-snap
on the viewport (`scroll-snap-type: x mandatory` + `scroll-snap-align:
center` on slides) for natural pointer drag, and translate-X for
keyboard-driven advances. Detect end of pointer drag with the
standard pointer events; no `@HostListener` swipe libraries. See
[Engine](#engine).

**Two control patterns, one directive family.** APG lists two
flavours:

1. **Buttons + slide region** (recommended default) — previous /
   next buttons, optional dot list, slides are `role="group"`
   inside a `role="region"`. Indicators are buttons; `aria-current`
   marks the active one.
2. **Tabs + tabpanel** ("tabbed carousel") — the indicator dots
   become a `role="tablist"`; each slide becomes a
   `role="tabpanel"` keyed to its dot. Previous / Next buttons
   are still allowed but become an alternative to arrow keys on
   the tablist.

Decision: ship (1) as the default. Expose `kjControlPattern: 'buttons'
| 'tabs'` on `KjCarouselIndicators` to switch into (2) for the
gallery / hero use case where the dots *are* the primary
navigation. Behaviour, ARIA, and keyboard contract diverge between
the two — keep both wired in the directive layer, with the wrapper
exposing the choice as a single string input.

## Engine

The viewport uses CSS scroll-snap for the gesture path and
JS-controlled `scroll-behavior: smooth` (or
`element.scrollTo({ left, behavior })`) for programmatic advances:

1. `KjCarouselViewport` is a horizontal flex container with
   `overflow: auto`, `scroll-snap-type: x mandatory`, and
   `scrollbar-width: none` (and the WebKit equivalent). Vertical
   orientation swaps `x` for `y`.
2. Each `KjCarouselSlide` host has `flex: 0 0 var(--kj-carousel-slide-basis)`
   and `scroll-snap-align: center` (or `start` per
   `kjSlideAlign` input).
3. Pointer drag is the browser's native scroll. We do *not*
   implement custom drag math — the user's left-down-move-up
   produces a momentum-aware scroll, and scroll-snap settles on
   the nearest slide. This handles touch and trackpad
   simultaneously without Pointer Events code we have to maintain.
4. **Programmatic advance** (`next()`, `prev()`, `goTo(value)`,
   indicator click, autoplay tick) calls
   `viewport.scrollTo({ left: slide.offsetLeft - viewport.offsetLeft,
   behavior: prefersReducedMotion() ? 'auto' : 'smooth' })`.
   `prefers-reduced-motion: reduce` collapses the animation to an
   instant jump per WCAG 2.3.3 / 2.2.2.
5. **Reading the active slide back** uses an `IntersectionObserver`
   on the viewport with `threshold: 0.6`. The slide whose ratio
   crosses 0.6 becomes the canonical active value. This is more
   reliable than tracking `scrollLeft` because it works under
   variable slide widths, RTL flipping, and resize.
6. **Loop / wrap** (`kjLoop="true"`) appends a clone of the first
   slide to the end and a clone of the last to the start (Embla
   pattern), but renders them with `aria-hidden="true"` and `inert`
   so they are invisible to AT and Tab. On reaching a clone we
   silently scroll-jump to the real twin during the next animation
   frame, with `behavior: 'auto'`. This is the only correct
   wrap-around UX — straight modulo-N produces a long sweep
   backwards that confuses users.

`IntersectionObserver` and `ResizeObserver` instantiation is
guarded with `isPlatformBrowser(inject(PLATFORM_ID))` so SSR
hydration paints the initial slide without observer churn.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Current slide identity | `KjCarousel.kjValue` (`model<string \| null>`, two-way) | String-keyed; null = use first slide on init. |
| Slides-per-view | `KjCarousel.kjSlidesPerView` (`number \| 'auto'`, default `1`) | Drives `--kj-carousel-slide-basis: calc(100% / N)` on the viewport. `'auto'` lets each slide use its content width — useful for thumbnail strips. |
| Slides to scroll per advance | `KjCarousel.kjSlidesPerAdvance` (`number`, default `1`) | The number of slides moved by `next()` / `prev()`. Independent of slides-per-view. |
| Orientation | `KjCarousel.kjOrientation` (`'horizontal' \| 'vertical'`, default `'horizontal'`) | Swaps the scroll-snap axis and the keyboard arrow mapping (Left/Right ↔ Up/Down). |
| Loop | `KjCarousel.kjLoop` (`boolean`, default `false`) | Clone-edge wrap (see [Engine](#engine)). When `false`, `next()` is a no-op at the last slide and Previous/Next buttons go disabled at the boundaries. |
| Slide alignment | `KjCarouselSlide.kjSlideAlign` (`'start' \| 'center' \| 'end'`, default inherited from carousel input `kjAlign`, default `'start'`) | Drives `scroll-snap-align`. |
| Drag / swipe | Always on; can be disabled by `kjDraggable: false` | Not exposed as a runtime override per slide — UX consistency. |
| Autoplay | `KjCarouselAutoplay` directive on the root, with `kjAutoplayDelay: number` (ms, default `5000`) | Opt-in by composition. See dedicated section. |
| Pause control | `KjCarouselPauseToggle` directive — wraps a real `<button>` | Required when autoplay delay > 5000 ms (WCAG 2.2.2). See [Accessibility](#accessibility-wcag-21-aaa). |
| Indicator dots | `KjCarouselIndicators` directive — auto-projects one indicator per slide, or accepts projected `KjCarouselIndicator` children | `kjControlPattern: 'buttons' \| 'tabs'`, default `'buttons'`. |
| Programmatic API | `KjCarousel.next()`, `prev()`, `goTo(value: string)`, `play()`, `pause()`, `paused: Signal<boolean>` | Exposed publicly. |
| Slide announce | `KjCarouselLiveRegion` (composed `KjLiveRegion`) | Announces "Slide N of M: <slide-label>" when the active slide changes due to user action. Throttled / suppressed during autoplay (see [Accessibility](#accessibility-wcag-21-aaa)). |
| Variant / size | `KjCarousel` host-composes `KjVariant` and `KjSize` | Affects chrome only — button styling, indicator size, spacing. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — Carousel
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
This is the dominant section of the design — most of the directive
work exists to satisfy it.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Root is `role="region" aria-roledescription="carousel"`; each slide is `role="group" aria-roledescription="slide" aria-label="N of M"` (or `aria-labelledby` to a slide-internal heading); indicator dots are buttons with `aria-label="Slide N"` and `aria-current="true"` on the active dot | `KjCarousel` host bindings; `KjCarouselSlide` host bindings (computed from index + `kjSlideLabel` / projected heading id); `KjCarouselIndicators` and indicator items |
| 1.3.2 Meaningful Sequence | Slides are siblings of the viewport in DOM order; `aria-hidden="true"` is *not* applied to off-screen slides — they remain in the accessibility tree per APG so AT can navigate them with the virtual cursor | `KjCarouselViewport` does not toggle `aria-hidden`. Loop clones *do* get `aria-hidden="true"` because they are duplicates. |
| 2.1.1 Keyboard | Every gesture has a keyboard equivalent; previous / next / pause buttons reachable via Tab; arrow keys advance when the slide region or an indicator has focus | See [Keyboard contract](#keyboard-contract) below |
| 2.1.2 No Keyboard Trap | Focus can leave the carousel via Tab in either direction | Inherent — slides do not auto-focus on advance. |
| 2.2.2 Pause, Stop, Hide | Any auto-updating content > 5 s must be pausable; the pause must persist across slide transitions; the user must be able to fully stop the motion | `KjCarouselPauseToggle` is *required* (dev-mode warn if absent and autoplay delay > 5000 ms); pause hover/focus auto-pause within the carousel; `prefers-reduced-motion: reduce` disables autoplay entirely |
| 2.3.3 Animation from Interactions (AAA) | Motion triggered by interaction can be disabled | `prefers-reduced-motion: reduce` short-circuits all `scrollTo({ behavior: 'smooth' })` calls to `'auto'`. |
| 2.4.3 Focus Order | Tab order: previous button → viewport (if focusable) → next button → indicator group → pause button. Within indicators, roving tabindex collapses N dots to a single tab stop | `KjCarousel` does not set `tabindex` on the viewport by default — the viewport is *not* a tab stop. APG explicitly says either is acceptable; we choose "not a tab stop" because the keyboard equivalents on the buttons cover advance, and a focusable scroll container conflicts with screen-reader virtual-cursor navigation through slide content |
| 2.4.6 Headings & Labels (AAA) | The region needs an accessible name (`aria-label` or `aria-labelledby`); each slide should have a name | `KjCarousel.kjLabel` (required input) → `aria-label` on the root, or `kjLabelledby` → `aria-labelledby`; per-slide labels via `kjSlideLabel` or a projected heading whose id is registered with the slide directive |
| 2.4.7 Focus Visible | Focus ring on every interactive element | All controls compose `KjFocusRing` via `hostDirectives` |
| 2.5.5 Target Size (AAA) | Buttons ≥ 44×44 CSS px | Wrapper responsibility — default Tailwind tokens push previous / next / indicator buttons above 44 px |
| 4.1.2 Name, Role, Value | Region has role + accessible name; slides have role + label; buttons have label; indicators announce current state | Wired across the family per the rows above |
| 4.1.3 Status Messages | Slide change announcement when user advances; not on autoplay tick (would be a stream of interruptions) | `KjCarouselLiveRegion` — announces only on user-initiated change; suppressed during autoplay |

### Keyboard contract

| Key | Where focus must be | Behaviour | Required by APG? |
|---|---|---|---|
| `Tab` | Anywhere | Move to next focusable: prev button → next button → indicator group (one tab stop) → pause button → out | Required |
| `Enter` / `Space` | Previous / Next / Pause / Indicator | Activate (native `<button>`) | Required |
| `ArrowLeft` / `ArrowRight` | An indicator dot (buttons mode) or an indicator tab (tabs mode) | Move focus to the previous / next indicator (with wrap when `kjLoop`); in **tabs** mode also activate (per APG tabs pattern); in **buttons** mode, do not activate — Enter/Space activates | Required |
| `ArrowLeft` / `ArrowRight` | Previous / Next button | No-op (the button does its own thing on Enter/Space) | — |
| `Home` / `End` | An indicator | Jump focus to the first / last indicator | Recommended; we ship it |
| `Escape` | Anywhere within the carousel | If autoplay is running and the user has *not* explicitly paused, pause it. (APG does not list this; treat as a quality-of-life affordance — verify with axe / NVDA before locking in.) | Optional |
| Vertical orientation | — | `ArrowUp` / `ArrowDown` replace Left/Right; Left/Right become no-ops | Required when `kjOrientation="vertical"` |

The viewport itself is not focusable, so there is no "left/right
arrow when the slide is focused" path. APG offers that as an
option; we omit it because (a) it conflates "focus on slide
content" (where Tab-into-content is the right idiom) with "focus
on the slide as a unit," and (b) the indicator dots already cover
the per-slide jump case with explicit semantics.

### Autoplay contract

Autoplay is the highest-risk axis of the entire component. Five
gates, all of which must be open before the timer ticks:

1. `kjAutoplay` is true (or `KjCarouselAutoplay` directive is
   present — composition is the on switch).
2. `prefers-reduced-motion: reduce` does **not** match. If it
   matches, autoplay never starts; the directive is a no-op and
   the pause button is hidden (or rendered disabled with an
   `aria-label="Autoplay disabled by motion preferences"`).
3. The user has not pressed the pause button (`paused` signal is
   false). Pause persists across slide changes — clicking next
   does not resume autoplay.
4. Pointer is not currently hovering the carousel root, *or*
   `kjPauseOnHover` is false (default true). On `mouseenter` the
   timer suspends; on `mouseleave` it resumes (only if the user
   has not also pressed pause — gate 3 still applies).
5. Focus is not currently inside the carousel root, *or*
   `kjPauseOnFocus` is false (default true). Required by APG —
   keyboard users need the same "pause while interacting" affordance
   that hover provides for pointer users.

The pause button itself toggles gate (3). When autoplay is paused
because of (4) or (5), the pause button still shows the "pause"
icon (the user has not paused) and is not visually toggled — only
gate (3) flips its `aria-pressed`.

### Live-region announcements

Use `KjLiveRegion` with `kjPoliteness="polite"`, hosted on a
visually-hidden child of the carousel root (compose
`KjVisuallyHidden`). Announce in this format:

```
Slide 3 of 7: Mountain meadow at dusk
```

Cadence:

- **User-initiated advance** (button click, indicator click, key,
  swipe end): announce immediately on the new slide settling.
- **Autoplay advance**: do **not** announce. Autoplay produces an
  endless stream and would flood AT. APG explicitly recommends
  `aria-live="off"` (or no announcements) while autoplay is
  active. We satisfy this by not calling `announce()` from the
  autoplay tick path; the live region's own `aria-live="polite"`
  attribute can stay on because we never write to its text node
  during autoplay.
- **User pauses autoplay**: announce "Autoplay paused" once.
- **User resumes autoplay**: announce "Autoplay resumed" once.

### Touch / swipe

Native scroll-snap handles touch entirely. We do not implement
custom touch-event listeners, so there is no `touch-action`
override needed beyond Tailwind's defaults. Verify on iOS Safari
that `scroll-snap-stop: always` keeps drag from skipping multiple
slides at once; if drift is observed, set `scroll-snap-stop:
always` on `KjCarouselSlide` host CSS.

The drag-end → settle path emits the same active-slide change
event as a button click, so the live-region announcement path is
shared.

## Composition model

```
KjCarousel                          (provides KJ_CAROUSEL)
  ├── KjCarouselViewport            (injects KJ_CAROUSEL)
  │     └── KjCarouselSlide         (provides KJ_CAROUSEL_SLIDE, injects KJ_CAROUSEL)
  ├── KjCarouselPrevious            (injects KJ_CAROUSEL)
  ├── KjCarouselNext                (injects KJ_CAROUSEL)
  ├── KjCarouselIndicators          (injects KJ_CAROUSEL; provides KJ_CAROUSEL_INDICATORS)
  │     └── KjCarouselIndicator     (injects KJ_CAROUSEL_INDICATORS, KJ_CAROUSEL)
  ├── KjCarouselAutoplay            (injects KJ_CAROUSEL; lifecycle directive — no DOM)
  └── KjCarouselPauseToggle         (injects KJ_CAROUSEL)
```

Three injection tokens:

- `KJ_CAROUSEL` — root context. Exposes `currentValue: Signal<string
  | null>`, `currentIndex: Signal<number>`, `slideCount: Signal<number>`,
  `orientation: Signal<'horizontal' | 'vertical'>`, `loop: Signal<boolean>`,
  `paused: Signal<boolean>`, `autoplayActive: Signal<boolean>`,
  `next()`, `prev()`, `goTo(value)`, `play()`, `pause()`,
  `register(slide)`, `unregister(slide)`, `announce(message)`.
- `KJ_CAROUSEL_SLIDE` — per-slide context. Exposes `value:
  Signal<string>`, `index: Signal<number>`, `isActive:
  Signal<boolean>`, `slideLabelId: Signal<string>`. Used by an
  optional `KjCarouselSlideHeading` helper that registers a
  projected heading id back into the slide so its
  `aria-labelledby` resolves automatically.
- `KJ_CAROUSEL_INDICATORS` — indicator-group context. Exposes
  `controlPattern: Signal<'buttons' | 'tabs'>`, `activate(value)`,
  and the registered indicator collection. Splitting this out
  keeps indicators reusable: a custom indicator group built
  from a thumbnail strip can re-implement the same contract
  without subclassing the dot list.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjFocusRing` | `hostDirective` on `KjCarouselPrevious`, `KjCarouselNext`, `KjCarouselPauseToggle`, `KjCarouselIndicator` | Centralises the design-system focus ring on every keyboard target. |
| `KjDisabled` | `hostDirective` on `KjCarouselPrevious`, `KjCarouselNext` | Auto-disables prev at first / next at last when `kjLoop` is false. The directive owns `aria-disabled`, `tabindex` removal, and pointer-events. |
| `KjVariant`, `KjSize` | `hostDirectives` on `KjCarouselComponent` (wrapper) | Standardises variant / size token routing — chrome only. |
| `KjLiveRegion` | Composed onto an internal `<div>` inside the root template (wrapper-side) — paired with `KjVisuallyHidden` | Polite announcements of slide changes. Reused, not redefined. |
| `KjVisuallyHidden` | Same node as the live region; also on the per-slide "Slide N of M" prefix when the slide already has a visible label that the prefix would duplicate | Keeps the live region invisible; lets slide labels stay terse for sighted users. |
| `KjRovingTabindex` + `KjRovingTabindexItem` | `KjCarouselIndicators` composes `KjRovingTabindex`; each `KjCarouselIndicator` composes `KjRovingTabindexItem` | Indicators are a single tab stop; arrow keys move active focus per APG. We pass `orientation` into `KjRovingTabindex` (extension required — see Open question 9 of [Accordion](./accordion.md#open-questions--risks); same upgrade lands here). |

### Wrapper composition (components package)

`<kj-carousel>` applies `KjCarousel` via `hostDirectives` and
exposes `value` (mapped from `kjValue`), `loop`, `orientation`,
`slidesPerView`, `slidesPerAdvance`, `align`, `label`,
`labelledby`. The wrapper also renders the visually-hidden live
region as part of its template — we do not ask consumers to add a
live region.

`<kj-carousel-viewport>`, `<kj-carousel-slide>`,
`<kj-carousel-previous>`, `<kj-carousel-next>`,
`<kj-carousel-indicators>`, `<kj-carousel-pause>` are the styled
counterparts. Previous, next, and pause render real `<button>`s
inside their templates (their host elements use `display: contents`
to stay layout-transparent). The slide wrapper exposes `[label]`
shorthand to set `kjSlideLabel`.

`<kj-carousel-autoplay [delay]="5000" [pauseOnHover]="true"
[pauseOnFocus]="true">` is a structureless directive — it has no
visible DOM — that the consumer drops next to the carousel
content as an attached behaviour:

```html
<kj-carousel [(value)]="active" label="Featured products">
  <kj-carousel-autoplay [delay]="6000" />
  <kj-carousel-pause aria-label="Pause carousel" />
  <kj-carousel-previous aria-label="Previous slide" />
  <kj-carousel-viewport>
    @for (item of items; track item.id) {
      <kj-carousel-slide [value]="item.id" [label]="item.title">
        <article>…</article>
      </kj-carousel-slide>
    }
  </kj-carousel-viewport>
  <kj-carousel-next aria-label="Next slide" />
  <kj-carousel-indicators />
</kj-carousel>
```

### Cross-component pointers

- [`../navigation/tabs.md`](../navigation/tabs.md) — alternative
  control pattern. When `KjCarouselIndicators` is in
  `controlPattern="tabs"` the wiring (`role="tablist"`,
  `role="tab"`, `aria-selected`, arrow-key activation) mirrors
  Tabs almost exactly. After both ship, audit whether
  `KjCarouselIndicators[controlPattern="tabs"]` can compose the
  Tabs primitives directly rather than re-implementing the tab
  semantics. Today: ship them independently and resist DRYing
  prematurely.
- [`../navigation/pagination.md`](../navigation/pagination.md) —
  similar dot-indicator visual language. Pagination encodes "page
  N of total pages" as content; carousel indicators encode "slide
  N of total slides" as in-place state. Different semantics
  (`aria-current="page"` vs. `aria-current="true"`); same chrome
  primitives. Wrappers can share the dot CSS via a private
  `kj-dot-indicators` mixin once both land.
- [`./accordion.md`](./accordion.md) — same string-keyed identity
  pattern (`kjItemValue` → `kjSlideValue`), same single-source-of-truth
  on the root, same per-item id generation for ARIA wiring. The
  ARIA-id-pair pattern documented there
  ([`headerId` / `contentId`](./accordion.md#kjaccordionitem-kjaccordionitem))
  applies here as `slideLabelId` for the per-slide accessible name.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) —
  reference for `aria-controls` wiring on a button that targets a
  remote region. The previous / next buttons should set
  `aria-controls` to the viewport id so AT users see the relationship.
- [`../feedback/toast.md`](../feedback/toast.md) — reference for
  `KjLiveRegion` cadence and politeness choices. Carousel
  announcements are `polite`; toast is `polite` or `assertive`
  depending on severity. Lift any throttling helper that lands in
  toast first.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; wrappers re-map via `hostDirectives` `inputs`.

### `KjCarousel` (`[kjCarousel]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `model` | `string \| null` | `null` | Two-way bound. Null on init defers to the first registered slide. |
| `kjLoop` | `input` | `boolean` | `false` | Drives clone-edge wrap and unblocks prev/next at the boundaries. |
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives `aria-orientation`, the scroll-snap axis, and the keyboard arrow mapping. |
| `kjSlidesPerView` | `input` | `number \| 'auto'` | `1` | Sets `--kj-carousel-slides-per-view`; viewport CSS computes `flex-basis`. |
| `kjSlidesPerAdvance` | `input` | `number` | `1` | Number of slides moved per `next()` / `prev()` call. Must be ≤ `kjSlidesPerView` in practice; not enforced. |
| `kjAlign` | `input` | `'start' \| 'center' \| 'end'` | `'start'` | Default `scroll-snap-align` for slides; per-slide override via `KjCarouselSlide.kjSlideAlign`. |
| `kjLabel` | `input` | `string \| undefined` | `undefined` | Sets `aria-label` on the region. Either this or `kjLabelledby` must be present (dev-mode warn otherwise). |
| `kjLabelledby` | `input` | `string \| undefined` | `undefined` | Sets `aria-labelledby` on the region. |
| `kjDraggable` | `input` | `boolean` | `true` | When false, viewport sets `overflow: hidden` and disables touch-action drag. Programmatic advance still works. |
| `currentValue` | `Signal<string \| null>` | — | — | Read-only. Mirrors `kjValue()` after settling, or null pre-init. |
| `currentIndex` | `Signal<number>` | — | — | Read-only. -1 pre-init. |
| `slideCount` | `Signal<number>` | — | — | Read-only. |
| `paused` | `Signal<boolean>` | — | — | True only when the user has explicitly paused (gate 3). Hover/focus pauses do not flip this. |
| `autoplayActive` | `Signal<boolean>` | — | — | True when an autoplay directive is registered and all five gates are open. |
| `next()`, `prev()`, `goTo(value)`, `play()`, `pause()` | methods | — | — | Public API. |

Host bindings:

| Host binding | Source |
|---|---|
| `[attr.role]` | `'region'` |
| `[attr.aria-roledescription]` | `'carousel'` |
| `[attr.aria-label]` | `kjLabel() ?? null` |
| `[attr.aria-labelledby]` | `kjLabelledby() ?? null` |
| `[attr.aria-orientation]` | `kjOrientation()` |
| `[attr.data-paused]` | `paused() ? '' : null` |
| `[attr.data-autoplay]` | `autoplayActive() ? '' : null` |

### `KjCarouselViewport` (`[kjCarouselViewport]`)

No public inputs.

| Host binding | Source |
|---|---|
| `[attr.id]` | generated viewport id (consumed by Previous / Next as `aria-controls`) |
| `[style.--kj-carousel-slides-per-view]` | `carousel.kjSlidesPerView()` |
| `[attr.data-orientation]` | `carousel.kjOrientation()` |

### `KjCarouselSlide` (`[kjCarouselSlide]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjSlideValue` | `input.required` | `string` | — | Stable string id. |
| `kjSlideLabel` | `input` | `string \| undefined` | `undefined` | Used to compute `aria-label="N of M: <label>"` if present, else fall back to plain `aria-label="N of M"`. Projected headings can override via the slide context's `slideLabelId`. |
| `kjSlideAlign` | `input` | `'start' \| 'center' \| 'end' \| undefined` | `undefined` | Per-slide override of `kjAlign`. |
| `index` | `Signal<number>` | — | — | Index in registration order. |
| `isActive` | `Signal<boolean>` | — | — | Computed from `carousel.currentValue() === kjSlideValue()`. |

| Host binding | Source |
|---|---|
| `[attr.role]` | `'group'` (default) or `'tabpanel'` (when the indicator group is in `controlPattern="tabs"`) |
| `[attr.aria-roledescription]` | `'slide'` (only when role is `'group'`) |
| `[attr.aria-label]` | `\`${index() + 1} of ${carousel.slideCount()}${kjSlideLabel() ? ': ' + kjSlideLabel() : ''}\`` (when no projected heading id) |
| `[attr.aria-labelledby]` | projected heading id (when present) |
| `[attr.id]` | generated slide id (consumed by indicator dots in `controlPattern="tabs"` as `aria-controls`) |
| `[attr.data-active]` | `isActive() ? '' : null` |

### `KjCarouselPrevious` (`[kjCarouselPrevious]`) and `KjCarouselNext` (`[kjCarouselNext]`)

No public inputs.

| Host binding | Source |
|---|---|
| `[attr.aria-controls]` | viewport id |
| `[attr.aria-disabled]` | `!carousel.kjLoop() && atBoundary() ? 'true' : null` (composed via `KjDisabled`) |
| `[attr.aria-label]` | inherited from consumer-supplied `aria-label` on the wrapper (no default — wrapper enforces a value or warns) |
| `(click)` | `carousel.next()` / `carousel.prev()` |

The wrapper requires `aria-label` (e.g. `"Previous slide"`) at the
`<kj-carousel-previous>` element. Dev-mode warn if missing.

### `KjCarouselIndicators` (`[kjCarouselIndicators]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjControlPattern` | `input` | `'buttons' \| 'tabs'` | `'buttons'` | Switches between APG variants. |
| `kjAriaLabel` | `input` | `string` | `'Slide controls'` | Label for the indicator group / tablist. |

| Host binding | Source |
|---|---|
| `[attr.role]` | `kjControlPattern() === 'tabs' ? 'tablist' : 'group'` |
| `[attr.aria-label]` | `kjAriaLabel()` |
| `[attr.aria-orientation]` | `carousel.kjOrientation()` |

Composes `KjRovingTabindex`.

### `KjCarouselIndicator` (`[kjCarouselIndicator]`)

A single dot. Auto-projected by `KjCarouselIndicators` (one per
slide, label `"Slide N"`), or hand-projected for custom chrome
(thumbnails, numbered chips).

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjForValue` | `input.required` | `string` | — | Slide value this indicator targets. |

| Host binding | Source |
|---|---|
| `[attr.role]` | `indicators.kjControlPattern() === 'tabs' ? 'tab' : null` (it is already a `<button>` in buttons mode) |
| `[attr.aria-current]` | buttons mode: `isActive() ? 'true' : null` |
| `[attr.aria-selected]` | tabs mode: `isActive() ? 'true' : 'false'` |
| `[attr.aria-controls]` | tabs mode: the slide id |
| `[attr.aria-label]` | wrapper-supplied (e.g. `"Slide 3"`) |
| `(click)` | `carousel.goTo(kjForValue())` |

Composes `KjRovingTabindexItem` and `KjFocusRing`.

### `KjCarouselAutoplay` (`[kjCarouselAutoplay]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAutoplayDelay` | `input` | `number` (ms) | `5000` | Interval between advances. Per WCAG 2.2.2, delays > 5000 ms make a pause control mandatory; we warn in dev mode if `KjCarouselPauseToggle` is absent. |
| `kjPauseOnHover` | `input` | `boolean` | `true` | Auto-pause while pointer is over the carousel root. |
| `kjPauseOnFocus` | `input` | `boolean` | `true` | Auto-pause while focus is within the carousel root. APG-required affordance for keyboard users. |

No DOM. The directive lives on the same element as `KjCarousel`
(or any descendant — it injects `KJ_CAROUSEL`). It manages a
`setInterval` (cleared on `OnDestroy`, on pause, and on
`prefers-reduced-motion: reduce`), and posts ticks to
`carousel.next()`. Re-evaluates the five gates on every relevant
signal change via an `effect`.

### `KjCarouselPauseToggle` (`[kjCarouselPauseToggle]`)

No public inputs. Wraps a real `<button>` (host element) and
composes `KjFocusRing` and `KjDisabled`.

| Host binding | Source |
|---|---|
| `[attr.aria-pressed]` | `carousel.paused() ? 'true' : 'false'` |
| `[attr.aria-label]` | wrapper-supplied (e.g. `"Pause carousel"` / dynamic via `aria-labelledby` to a label that toggles) |
| `[attr.disabled]` | `prefersReducedMotion() ? '' : null` (the button is meaningless when autoplay is off) |
| `(click)` | `carousel.paused() ? carousel.play() : carousel.pause()` |

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-carousel>` | `value` | `kjValue` (two-way: `[(value)]`) |
| `<kj-carousel>` | `loop` | `kjLoop` |
| `<kj-carousel>` | `orientation` | `kjOrientation` |
| `<kj-carousel>` | `slidesPerView` | `kjSlidesPerView` |
| `<kj-carousel>` | `slidesPerAdvance` | `kjSlidesPerAdvance` |
| `<kj-carousel>` | `align` | `kjAlign` |
| `<kj-carousel>` | `label` | `kjLabel` |
| `<kj-carousel>` | `labelledby` | `kjLabelledby` |
| `<kj-carousel>` | `draggable` | `kjDraggable` |
| `<kj-carousel>` | `variant` | `KjVariant` (host-composed) |
| `<kj-carousel>` | `size` | `KjSize` (host-composed) |
| `<kj-carousel-slide>` | `value` | `kjSlideValue` |
| `<kj-carousel-slide>` | `label` | `kjSlideLabel` |
| `<kj-carousel-slide>` | `align` | `kjSlideAlign` |
| `<kj-carousel-indicators>` | `controlPattern` | `kjControlPattern` |
| `<kj-carousel-autoplay>` | `delay` | `kjAutoplayDelay` |
| `<kj-carousel-autoplay>` | `pauseOnHover` | `kjPauseOnHover` |
| `<kj-carousel-autoplay>` | `pauseOnFocus` | `kjPauseOnFocus` |

## Examples to ship

1. **Default — image gallery, no autoplay.** Five slides, prev /
   next buttons, dot indicators in `buttons` mode. Demonstrates
   the simplest correct usage and anchors the API for screenshots.
2. **Autoplay with required pause control.** `kjAutoplayDelay=6000`,
   `<kj-carousel-pause>` button, `pauseOnHover` and `pauseOnFocus`
   on. Demonstrates WCAG 2.2.2 compliance and the
   `prefers-reduced-motion` short-circuit (open DevTools → Rendering
   → "Emulate CSS media feature prefers-reduced-motion: reduce" to
   verify autoplay never starts).
3. **Tabbed carousel.** `<kj-carousel-indicators controlPattern="tabs">`
   with named slide tabs ("Overview", "Pricing", "FAQ"). Demonstrates
   the tablist variant; useful for marketing-page hero rotators.
4. **Loop + multiple visible.** `loop="true" slidesPerView="3"
   slidesPerAdvance="1" align="start"`. Thumbnail strip pattern;
   demonstrates clone-edge wrap and the difference between
   `slidesPerView` and `slidesPerAdvance`.
5. **Vertical orientation.** `orientation="vertical"` for a card
   stack. Verifies the keyboard mapping flip (Up/Down replace
   Left/Right) and the scroll-snap axis swap.
6. **Two-way bound value persisted to query string.** `[(value)]`
   piped through an `effect` that pushes to the URL. Anchors the
   string-keyed model and demonstrates deep-linking.
7. **Custom indicator chrome.** Hand-projected `KjCarouselIndicator`
   children rendering thumbnails instead of dots. Demonstrates the
   indicator-context API and the buttons-vs-tabs ARIA difference.
8. **Reduced-motion baseline.** A side-by-side example showing the
   behaviour change under `prefers-reduced-motion: reduce` —
   autoplay disabled, pause button hidden, smooth-scroll collapsed
   to instant. Validates the contract end-to-end.
9. **Programmatic control.** A consumer page with external "First
   slide" and "Last slide" buttons calling `carousel.goTo(...)`.
   Anchors the imperative API and the read-only `currentValue`
   signal.

## Open questions / risks

1. **PrimeNG-style `aria-live="off" while autoplay is on` is a
   bug, not a pattern.** APG's recommendation is more nuanced:
   the live region itself should announce *user-initiated*
   changes politely, and stay silent during autoplay. We satisfy
   that by gating the `announce()` call, not by toggling
   `aria-live`. Confirm with NVDA + JAWS + VoiceOver that no
   announcement leaks during autoplay; if any AT independently
   reads `aria-live="polite"` text changes that we *do* push (we
   do not, but in case the implementation drifts), we can fall
   back to toggling `aria-live` to `off` while autoplay runs.
   Verify before v1.

2. **`IntersectionObserver` threshold tuning.** 0.6 works for
   single-visible carousels but flickers for `slidesPerView=3`
   with the active slide centred — at boundaries two slides can
   simultaneously cross 0.6 in the same frame. Plan: track *all*
   intersecting slides and pick the one closest to the viewport
   centre (compute `Math.abs(slideRect.center - viewportRect.center)`).
   That math is straightforward but adds an allocation per
   slide per scroll event; benchmark before locking in.

3. **Loop-clone strategy and SSR.** Cloning slides in JS happens
   after hydration, which means the initial paint sees the real
   slides only — fine for first render. But if the consumer
   sets `kjValue` to the last slide on init, and `kjLoop` is
   true, the "scroll to first via the trailing clone" behaviour
   cannot fire on first render (no clone exists yet). Decision:
   on init, when `kjLoop` is true, materialise the clones
   synchronously inside `ngAfterContentInit` (we know slide
   count at that point), then schedule the first
   `scrollTo({ behavior: 'auto' })`. Acceptable single-frame
   shift; the alternative (SSR clones) is too heavy.

4. **Pause-on-focus interacts badly with sticky tooltip /
   popover content inside a slide.** If a slide hosts an input
   with a help popover, focusing the input pauses autoplay (per
   gate 5). On blurring back out, autoplay resumes — possibly
   while the popover is still open. Decision: define
   `kjPauseOnFocus` strictly as "focus is within the carousel
   root or any descendant via DOM `focusin` events," and let
   consumers who need finer control disable it and re-implement.
   Document in TSDoc.

5. **`scroll-snap` versus programmatic `scrollTo` smoothness on
   Safari.** WebKit historically clamped `scroll-behavior:
   smooth` to 0 ms when scroll-snap was active, producing
   instant jumps. Status as of 2026-Q2: WebKit 17.4+ animates
   correctly. Older Safari falls back to instant scrolling,
   which is functionally fine and arguably better than a
   half-snapped settle. Leave as-is; do not implement a manual
   `requestAnimationFrame` tween (would conflict with reduced-motion
   handling and add maintenance burden).

6. **Required pause control enforcement.** WCAG 2.2.2 requires
   a pause for autoplay > 5 s. We dev-mode warn when
   `KjCarouselAutoplay` is present, `kjAutoplayDelay > 5000`, and
   no `KjCarouselPauseToggle` injects from the same root. The
   detection runs in `afterNextRender`. Risk: false negatives if
   the consumer renders the pause button conditionally (`@if`).
   Fallback: re-check on every signal change of the conditional;
   if still absent on any tick, log once. Acceptable noise.

7. **Indicator auto-projection vs. hand-projection.** Today's
   plan: when `<kj-carousel-indicators>` has no projected
   children, it auto-renders a `<kj-carousel-indicator>` per
   slide. If it has projected children, it leaves them alone.
   That branch is decided in the wrapper, not the directive,
   so the directive layer stays predictable. Verify
   `contentChildren(KjCarouselIndicator)` resolves before the
   first render; if not, fall back to a flag input
   `[autoIndicators]="true"` (default true) and let the
   consumer turn it off explicitly.

8. **`KjLiveRegion.announce()` does a 50 ms clear-and-set.** Two
   rapid user advances (smash the next button twice) could
   cause the second announcement to land before the first is
   read. Plan: queue announcements in a single-slot buffer —
   if a new one arrives within 100 ms of the previous, replace
   instead of stacking. Implement once and lift to `KjLiveRegion`
   itself if other components hit the same issue. Defer to
   post-v1.

9. **`kjOrientation="vertical"` and viewport overflow on mobile.**
   A vertical carousel needs `height: <something>` on the viewport
   to make sense. We can default to `aspect-ratio: 1` on the
   wrapper, but consumers will frequently want a fixed height.
   Document the requirement in the example; do not bake a default
   height into the components package — it would be wrong as often
   as right.

10. **Drag detection across button focus.** Pointer drag inside
    the viewport scrolls naturally. But if the user starts a drag
    and lets go on top of a previous / next button, the click
    fires *and* the drag-end snaps to a new slide — double
    advance. Mitigation: on `pointerdown` inside the viewport,
    record the start position; on `pointerup` over a button, if
    delta > 10 px, `event.preventDefault()` on the click. Adds a
    pointer-tracking effect inside `KjCarousel`. Verify with axe
    that preventing the click does not break keyboard activation
    paths (it should not — keyboard never sees pointer events).

11. **Multi-touch hijack.** A two-finger pinch inside the
    viewport currently triggers scroll-snap on every touch
    settle. Acceptable; document.

12. **Slide content focus on advance.** APG explicitly does
    *not* require moving focus to the new slide on advance, and
    we do not. But some consumers (e.g. wizards built on top of
    carousel) will want to. Decision: do not provide an
    `autoFocusSlide` flag in v1; if the demand arises, the
    consumer can `effect()` over `currentValue` and call `.focus()`
    on a slide-internal element themselves.

13. **`role="region"` with no name fails axe.** `kjLabel` /
    `kjLabelledby` are not technically required at the
    directive level (we cannot enforce one of two without an
    `effect`), but the wrapper makes one of them required at
    compile time via TypeScript discriminated input typing
    (`{ label: string } | { labelledby: string }`). Same shape
    we use in [`../actions/dialog.md`](../actions/dialog.md).

14. **No `KjCarouselContext` interface declaration on the root.**
    Same drift risk as
    [Accordion item 14](./accordion.md#open-questions--risks) —
    the root has the right shape but should `implements
    KjCarouselContext` to lock the public contract.

15. **Heaviest test surface on the roadmap.** `axe` / NVDA /
    JAWS / VoiceOver / VoiceOver-iOS on every example; reduced-motion
    matrix; pointer-drag matrix on iOS Safari + Chrome Android +
    desktop Firefox; loop boundary + non-loop boundary; autoplay
    pause-resume across hover and focus and explicit pause; SSR
    hydration with default and non-default initial values. Budget
    accordingly; do not declare v1 until the matrix is green.
