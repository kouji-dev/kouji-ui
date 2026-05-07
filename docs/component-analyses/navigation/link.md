# Link

A styled `<a>`. The smallest possible navigation primitive — but
genuinely a primitive, because every other component in the library
ends up consuming it (Card's linked title, Breadcrumb's crumb, the
nav rail, the in-prose `<a>` inside `kj-prose`, the "Learn more"
that lives at the bottom of an Empty State, the legal links inside a
Toast). Link is what kouji-ui hands a consumer when they want a
hyperlink that **looks like the design system** and **behaves
correctly for AT and keyboard users** without writing the same
defensive `target="_blank"` plumbing on every page of the app.

Three shapes hide under one name:

1. **Inline prose link** — an `<a>` inside a paragraph or sentence;
   underlined by default for in-content link affordance (WCAG 1.4.1
   "colour is not the only means").
2. **Standalone navigation link** — a stand-alone `<a>` outside
   prose; in a footer column, in a sidebar nav, in a card footer,
   in a breadcrumb. Underline-on-hover by default; the surrounding
   layout already signals "this is a link" via grouping.
3. **External link** — an `<a target="_blank">` (or one explicitly
   marked external). Adds `rel="noopener noreferrer"` automatically,
   appends a small "(opens in new tab)" affordance for AT, and
   shows a discreet leading or trailing icon for sighted users.

> **Not on disk yet.** No `packages/core/src/link/`, no
> `packages/components/src/link/`. This analysis specifies the
> shape before any code lands. The recommendation is **yes, ship
> a minimal core directive** — `KjLink` on `<a>` (`a[kjLink]`) —
> plus a thin styled wrapper (`KjLinkComponent`, selector
> `<kj-link>`) for ergonomics. The case for the directive is in
> [Decision (core directive)](#decision-core-directive). It is not
> a "useless `data-*` directive" (per
> [`rules/code_style.md`](../../../rules/code_style.md) "What NOT
> to Build") because it owns three real pieces of behaviour:
> external-link `rel` + AT suffix plumbing, focus-ring composition,
> and disabled-link enforcement.

For the **interactive sibling** — buttons, button-shaped links —
see [`../actions/button.md`](../actions/button.md). The rule of
thumb (lifted from
[Nielsen Norman: Buttons vs. Links](https://www.nngroup.com/articles/buttons-vs-links/)):
**buttons act, links navigate**. If the activation changes the URL
or the document context, it is a link; if it triggers an action
within the current document context, it is a button. `<a kjButton>`
is the pre-existing pattern for "link styled as button" (a CTA in
a hero unit, the primary action on a card footer); `<a kjLink>` is
the pattern for "this looks and behaves like a normal hyperlink".
The two are not in tension — they live on the same `<a>` element
in different contexts.

For the **typographic sibling**, see
[`../data-display/typography.md`](../data-display/typography.md).
Typography's `kj-prose` container already styles `<a>` descendants;
this analysis coordinates the styling so consumers writing
`<a kjLink>` inside `<article class="kj-prose">` get exactly one
ruleset, not two competing ones. See
[Open question 1](#open-questions--risks).

For the **composite consumers**:

- [`../data-display/card.md`](../data-display/card.md) — Card's
  "linked title" pattern uses `<a kjLink>` inside
  `<kj-card-title>`; Card's "whole-card link" uses
  `<a kjCardInteractive>` (Card-owned directive) and **does not**
  compose `KjLink` (the visual is the card surface, not text). See
  [card.md §192–200, §374](../data-display/card.md).
- [`./breadcrumb.md`](./breadcrumb.md) (planned) — every crumb is
  a `<a kjLink>` until the last (current page), which is a styled
  `<span aria-current="page">`. Breadcrumb owns the container
  semantics (`<nav aria-label="Breadcrumb">`, `<ol>`); Link owns
  the per-crumb styling.
- [`../data-display/list.md`](../data-display/list.md) — list rows
  whose entire row navigates use `<a kjLink>` as the row's primary
  action; the `kjMuted` secondary text comes from Typography. The
  whole-row hit area is List's responsibility (see
  [list.md](../data-display/list.md)), not Link's.
- [`../feedback/toast.md`](../feedback/toast.md) (planned) — a
  toast may include a "Learn more" link in its body; that link is
  `<a kjLink kjVariant="muted">` with the toast's variant context
  cascading the colour token.

## Source comparison

The reference field is the second-most lopsided of any component
covered so far (Typography is the most lopsided): three of the four
ship literally nothing as a first-class component, and only daisyUI
ships even a CSS class for it. The gap is real — every consuming
app re-implements the same five lines on every navigation surface.

| Concern | PrimeNG | Angular Material | shadcn/ui | daisyUI |
|---|---|---|---|---|
| First-class component | **No.** PrimeNG ships zero link primitives. The docs site styles `<a>` via global theme CSS. Consumers reach for `<p-button [link]="true">` when they want an "action that looks like a link" — but that is a Button shape, not a Link. | **No** dedicated *component*. Material ships **anchor variants** of buttons (`<a mat-button>`, `<a mat-stroked-button>`) for "link styled as button", and otherwise tells consumers to use a plain `<a>` with theme CSS. The `MatAnchor` directive exists internally but is private to the Button feature. | **No exported component.** A documentation page exists but it is part of Typography (link is a sub-section of "Typography"); no `<Link>` import. The project's own nav uses Next.js `<Link>` (a routing primitive, not a styling component) wrapped around an `<a>` styled with Tailwind. | **CSS only.** `.link`, `.link-primary`, `.link-secondary`, `.link-accent`, `.link-neutral`, `.link-success`, `.link-info`, `.link-warning`, `.link-error`, plus `.link-hover` (only underlines on hover). No JS, no a11y plumbing, no external-link handling. |
| Selector / surface | n/a | n/a (private `MatAnchor` directive on `<a mat-button>`) | n/a | `class="link"` on `<a>` |
| Variants / colours | n/a | Theme `color`, only on the button-shaped anchor | n/a (Tailwind classes per-`<a>`) | Eight (`primary`/`secondary`/`accent`/`neutral`/`success`/`info`/`warning`/`error`/`base`) |
| Sizes | n/a | n/a | n/a | n/a — links inherit text size |
| Underline | n/a | n/a | n/a | Always (default) or `link-hover` (only on hover); no "never" — the consumer drops the class |
| External link | None | None | None | None |
| `routerLink` integration | Native `<a [routerLink]>` | Native; `MatAnchor` works alongside | n/a (Next.js stack) | n/a |
| Disabled link | None | None — the button-shape anchor uses `aria-disabled` | None | None |
| Focus ring | None | Inherited from button-shape anchor only | n/a | None |
| A11y | None — native `<a>` semantics | None for plain `<a>` | None | None — class only |

**Read-off.**

- **PrimeNG and Angular Material both abstain.** The two largest
  Angular component libraries ship zero link primitives. This is
  partly a "native HTML `<a>` is already accessible" stance, and
  partly an oversight — neither ships an external-link helper, a
  themable underline policy, or a "this `<a>` behaves correctly when
  disabled" pattern. Every consuming app re-implements them.
- **shadcn folds Link into Typography.** Their stance is: an `<a>`
  inside prose is a Typography concern, an `<a>` outside prose is a
  Tailwind class string. This is consistent with shadcn's "the docs
  page is the API" approach but leaves the consumer to author the
  external-link AT plumbing on every link — which they will not do.
- **daisyUI ships eight colour classes and an underline-mode class.**
  Closest to a useful link API in the field, and the **single
  feature we copy directly**: the `link-hover` distinction (default:
  always underlined, modifier: only on hover) maps cleanly onto our
  `kjUnderline: 'always' | 'hover' | 'none'` input. daisyUI's
  miss is the same as everyone else's — no external-link handling,
  no focus-ring, no disabled story.

The gap is the entire reason this primitive earns a directive in
core. A consumer who writes `<a href="https://example.com" target="_blank">`
on a marketing page is one click away from a tabnabbing
vulnerability ([OWASP: target="_blank" without rel="noopener"](https://owasp.org/www-community/attacks/Reverse_Tabnabbing));
a consumer who writes `<a aria-disabled="true" href="...">` does
not get the disabled experience they think they wrote (the link
still navigates on click and Enter — the only thing `aria-disabled`
does is announce a state to AT). Both are well-known footguns.
The directive's job is to remove them.

The split kouji is converging on:

| Surface | Selector | Job |
|---|---|---|
| **Core directive** | `[kjLink]` (also matches `a[kjLink]`) | Owns `KjVariant` + `KjSize` + `KjFocusRing` composition, external-link `rel` + AT suffix plumbing, disabled-link enforcement (capture-phase click suppression + `tabindex="-1"`), and the underline-mode reflection. |
| **Wrapper component** | `<kj-link>` | Renders a host-bound `<a>` underneath; re-exposes every directive input plus `kjHref` and an optional `kjAriaLabel`. Useful when the consumer doesn't want to type `<a kjLink>` and prefers the kj-prefixed component name. |
| **CSS layer** | `.kj-link` (paired with `data-variant`, `data-size`, `data-underline`, `data-external`, `data-disabled`, `data-focus-visible`) | Lives in `packages/components/src/link/link.css`. Reads from `--kj-color-link`, `--kj-color-link-hover`, `--kj-color-link-visited`, plus the variant tokens for the colour-coded shapes. |

Two consumer paths, one styling system. The directive sets the
attributes; the CSS class keys off them. Same pattern as
[`../data-display/typography.md`](../data-display/typography.md)'s
`kj-prose` + directive split, applied to a much smaller surface.

## Decision (core directive)

**Yes — minimal.** The directive earns its keep on three concrete
behaviours, each of which a CSS-only solution cannot deliver:

1. **External-link `rel` + AT suffix plumbing.** When a consumer
   writes `<a kjLink href="https://example.com" target="_blank">`,
   the directive auto-fills `rel="noopener noreferrer"` (preserving
   any consumer-supplied `rel` tokens — additive, not destructive)
   and appends a visually-hidden "(opens in new tab)" `<span>` to
   the host's accessible name. The same applies when the consumer
   sets `kjExternal` explicitly (auto-detect handles the common
   case; the explicit input handles the case where the URL goes
   to a different origin via a router but still warrants the
   indicator). A pure CSS class cannot do either.

2. **Disabled-link enforcement.** `<a>` does not have a native
   `disabled` attribute. The well-known workaround
   ([WAI-ARIA APG: Link Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/link/),
   [MDN: Disabled buttons](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-disabled),
   inverted) is `aria-disabled="true"` + `tabindex="-1"` + click
   prevention + `Enter` key prevention. Every part of that
   workaround is wrong if any part is missing: `aria-disabled`
   alone still navigates; `tabindex="-1"` alone still announces the
   link as enabled to AT. The directive owns the whole bundle in
   one place. A consumer who wants disabled links will not
   correctly hand-author all four pieces, and even if they do, a
   second consumer five components later will not.

3. **Focus-ring + variant + size composition.** Same hostDirective
   pattern as Button (`KjVariant` + `KjSize` + `KjFocusRing`),
   reflected through `data-variant` / `data-size` /
   `data-focus-visible` for the components-package CSS to key off.
   This is a routing job — the directive is one of the eight or so
   places in the library that earns this composition, and bundling
   it in `KjLink` saves consumers from importing four host
   directives onto their `<a>`.

The directive is **small** — under 80 lines of TypeScript (the
external-link auto-detect runs in `afterNextRender`; the
disabled-state click suppression is a capture-phase listener
identical to `KjButton`'s). It is **stateless** in the sense that
it does not own any signals beyond the auto-detect's `isExternal`
computed; everything else is host-attribute reflection. It is
**not a useless data-attribute directive** because each of the
three behaviours above is real, error-prone work the consumer
would otherwise hand-author per usage.

### Why not just CSS?

A CSS-only `.kj-link` class (parallel to `.kj-prose`) was
considered. Rejected on three grounds:

- **External-link AT plumbing requires DOM mutation.** Adding a
  visually-hidden `(opens in new tab)` span to the accessible name
  cannot be done from CSS. `::after { content: " (opens in new tab)" }`
  would visually duplicate the indicator and ATs do not consistently
  read `::after` content into the accessible name.
- **Disabled-link plumbing requires event handling.** Capture-phase
  click suppression is not expressible in CSS. `pointer-events: none`
  on the disabled state blocks mouse clicks but does not block
  keyboard `Enter` activation, and breaks hover-tooltip behaviour
  for sighted users discovering the disabled state.
- **The `rel` token mutation requires attribute writes.** CSS cannot
  add `rel="noopener noreferrer"` to an `<a target="_blank">`.

Each one is a hard requirement, not a nicety. The directive wins.

### Why not a wrapper component only (no directive)?

A `<kj-link>` wrapper that internally renders `<a>` and skips the
directive layer was also considered. Rejected because:

- **`<a kjLink routerLink="/foo">` is the canonical Angular routing
  shape.** A wrapper-only API forces consumers using `routerLink`
  to write `<kj-link routerLink="/foo">`, which works (Angular
  forwards `routerLink` to the rendered anchor under the hood) but
  loses one of the most natural composition sites in the library.
  The directive lets the consumer keep their `<a [routerLink]>`
  and add `kjLink` as an attribute.
- **Wrappers are not preferable to directives for primitives that
  may sit on hand-authored anchors.** Inline prose links inside
  `<article class="kj-prose">` written by a consumer's CMS plugin
  are `<a>`s, not `<kj-link>`s. The directive applies to them
  uniformly when the consumer adds `kjLink` to their renderer's
  output (or relies on the prose container's `a` selector inheriting
  the same tokens — see [Open question 1](#open-questions--risks)).

We ship **both** — directive + wrapper — matching Button's
"directive plus styled wrapper" pattern. The directive is the
canonical surface; the wrapper is ergonomic sugar.

### Class naming

Per [`CLAUDE.md`](../../../CLAUDE.md), drop the Angular type suffix
unless there's a collision. The primary directive is `KjLink`
(file: `link.ts`). The wrapper is `KjLinkComponent` (file:
`link.ts` under `packages/components/src/link/`) — same suffix
collision pattern Button uses. Configuration token is
`KJ_LINK_CONFIG`; default factory is `KJ_LINK_DEFAULTS`.

## What exists today

Nothing on disk. No `packages/core/src/link/`, no
`packages/components/src/link/`. The library's existing CSS does
not declare `--kj-color-link`, `--kj-color-link-hover`, or
`--kj-color-link-visited` tokens; those need to be added to the
theme layer alongside the directive's first PR. (The Typography
analysis already references `--kj-color-link` as the token the
prose container's `a` selector reads from — see
[typography.md §858](../data-display/typography.md). The two
analyses agree on the token name; this is the analysis that
formalises it.)

The expected build order:

1. Add `--kj-color-link`, `--kj-color-link-hover`,
   `--kj-color-link-visited` to the theme layer
   (`packages/components/src/styles/tokens.css`). Default values
   pulled from `--kj-color-primary` / a darker shade for hover /
   `--kj-color-secondary` for visited (or a dedicated visited
   colour at 7:1 against `base-100`). Verify AAA contrast in
   light / dark / high-contrast themes — see
   [Accessibility](#accessibility-wcag-21-aaa).
2. Ship `KjLink` core directive +
   `KJ_LINK_CONFIG` / `provideKjLink` per the bind-presets pattern
   (`packages/core/src/link/`).
3. Ship `KjLinkComponent` wrapper + CSS layer
   (`packages/components/src/link/`).
4. Cross-link to Typography (`kj-prose a` selector defers to the
   same tokens) and to Card (the linked-title example uses
   `<a kjLink>`).
5. Migrate Breadcrumb (when written) to compose `KjLink` for crumbs.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Variants (preset, configurable) | `KJ_LINK_CONFIG.variants` via `KjVariant` host directive | Default list: `'primary' \| 'secondary' \| 'muted' \| 'destructive'`. **Open**: should `'inherit'` be a fifth variant for the case where the link should pick up the surrounding container's colour (e.g. inside an `<kj-alert kjVariant="error">` body)? Lean yes — see [Open question 4](#open-questions--risks). |
| Sizes (preset, configurable) | `KJ_LINK_CONFIG.sizes` via `KjSize` host directive | Default list: `'sm' \| 'md' \| 'lg' \| 'inherit'`. **`'inherit'` is the default** — links inherit the surrounding text's size. The numeric sizes are for standalone links (sidebar nav row, footer column heading) where the consumer wants a discrete size choice rather than picking up whatever `<p>` ambient size happens to be. |
| Underline mode | `kjUnderline: 'always' \| 'hover' \| 'none'` input | **Default depends on context**: inside `kj-prose` → `'always'` (a11y best practice for in-content links per [WCAG Technique G182](https://www.w3.org/WAI/WCAG21/Techniques/general/G182)). Standalone (default) → `'hover'`. The directive does **not** auto-detect prose context (would require parent traversal); the consumer sets it explicitly when standalone. The `kj-prose a` CSS selector sets `data-underline="always"` on prose-descendant anchors via CSS attribute selector, overriding the directive's default for that case. See [Open question 1](#open-questions--risks). |
| External link auto-detect | `kjExternal: boolean \| undefined` input + auto from `target="_blank"` | Tri-state. Unset (`undefined`) → directive auto-detects from `target="_blank"` on the host. Explicit `true` → forces external treatment regardless of `target`. Explicit `false` → forces internal treatment (suppresses the icon and AT suffix even if `target="_blank"`). Reflects `data-external="true"` and applies the trailing icon + visually-hidden suffix. |
| `rel` token plumbing | Composed inside `KjLink` | When `data-external="true"`, the directive ensures `rel` includes both `noopener` and `noreferrer`. **Additive**: existing `rel` tokens (e.g. `nofollow`, `me`, `bookmark`) are preserved; the directive only adds the missing security tokens. Set in `afterNextRender` and re-evaluated when `kjExternal` or `target` changes. See [OWASP](https://owasp.org/www-community/attacks/Reverse_Tabnabbing). |
| External-link AT suffix | Composed inside `KjLink` | When `data-external="true"` and the consumer has not supplied an `aria-label`, the directive appends a `KjVisuallyHidden` `<span>` child to the host's projected content reading `(opens in new tab)`. If the consumer has supplied `aria-label`, it is honoured as-is — the consumer is presumed to have included the suffix themselves (or deliberately omitted it). |
| External-link icon | CSS layer (components package) | Discreet trailing icon shown via CSS pseudo-element (`::after { content: url("…external.svg"); }`) reading from `data-external="true"`. **`aria-hidden`** by virtue of being CSS content — does not enter the accessibility tree. The AT suffix is the AT story; the icon is the sighted-user story. The icon is **trailing** (after the link text) per the [Nielsen Norman group recommendation](https://www.nngroup.com/articles/external-links/). |
| Disabled state | `kjDisabled: boolean` input — composed via `KjDisabled` plus directive-owned plumbing | Reflects `aria-disabled="true"`, `data-disabled=""`, sets `tabindex="-1"`, and capture-phase intercepts `click` + `keydown.enter` to call `preventDefault()` + `stopImmediatePropagation()`. Same pattern as Button's `effectiveDisabled` but without the `loading` axis (links don't load). Disabled links **stay focusable** in the AT tree — the `tabindex="-1"` removes them from the keyboard tab sequence but `aria-disabled="true"` keeps them announceable. **Open**: should we keep them in the tab sequence (matching Button's `disabledInteractive` stance)? See [Open question 2](#open-questions--risks). |
| `routerLink` composition | Native — no special handling | `<a kjLink routerLink="/foo">` works because `routerLink` is itself a directive on the same `<a>` that owns `href` synthesis and click handling for client-side routing. `KjLink`'s capture-phase disabled-click handler runs **before** Angular Router's bubble-phase handler (capture order); when disabled, the navigation is suppressed. When not disabled, both directives run in their natural order and the route changes. Verified pattern: same as Button. |
| Visited state | CSS layer | `:visited` pseudo-class styled via `--kj-color-link-visited`. **Limited by browser privacy rules**: `:visited` accepts only colour, background-colour, border-colour, outline-colour, and SVG fill / stroke (per [the post-2010 :visited restrictions](https://developer.mozilla.org/en-US/docs/Web/CSS/:visited)). We honour the restriction — visited links are coloured differently and that is all. |
| Focus ring | Composed `KjFocusRing` host directive | Reflects `data-focus-visible=""` on keyboard focus. Components-package CSS reads it and paints the outline. |
| Touch target | CSS layer | Inline prose links inherit text-line-height and use the [WCAG 2.5.5 inline-text exception](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) — inline links inside a paragraph are exempt from the 44×44 minimum. Standalone links (sidebar nav row, footer link, breadcrumb crumb) get `min-height: 2.75rem` (44px) when `kjSize` is `md` or larger; the small size's 44px guarantee is via CSS padding rather than `min-height` (so `kjSize="sm"` standalone links stay visually small but pad outward to a 44px hit area). See [Accessibility](#accessibility-wcag-21-aaa). |
| Anchor as button | **Not Link's job.** | Use `<a kjButton>` per [`../actions/button.md`](../actions/button.md). Link is for "looks like a hyperlink"; Button is for "looks like a button". The two visual systems do not blend. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG Link Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/link/),
[ARIA in HTML §`<a>`](https://www.w3.org/TR/html-aria/#el-a),
[WCAG Technique G182 — Ensuring that additional visual cues are
available when text colour differences are used to convey
information](https://www.w3.org/WAI/WCAG21/Techniques/general/G182),
[WCAG Technique G201 — Giving users advanced warning when opening
a new window](https://www.w3.org/WAI/WCAG21/Techniques/general/G201).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Links use `<a>` with `href`. External links are programmatically distinguishable. | Native — `<a href>` is the host. The directive reflects `data-external="true"` for AT-discoverable distinction (the AT suffix `(opens in new tab)` is the user-facing distinction). |
| 1.4.1 Use of Colour (AA) | Link is distinguishable from surrounding text by **more than colour alone**. | Inline prose links default to `kjUnderline="always"` inside `kj-prose`; the underline is the additional cue. Standalone links (`kjUnderline="hover"`) rely on layout grouping (sidebar nav row, footer column) for the additional cue — the link sits in a list of links, all rendered with the link colour, in a region that is itself signalled by surrounding chrome. Colour-blind testing is the canonical verification path; we verify in light / dark / high-contrast themes. |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | Link colour against the page background ≥ 4.5:1 (AA) / ≥ 7:1 (AAA). Visited link colour, hover colour, focus ring colour all meet the same bar. | Theme tokens — `--kj-color-link`, `--kj-color-link-hover`, `--kj-color-link-visited` are tuned for ≥ 7:1 against `base-100`, `base-200`, `base-300` in default theme. **Verify** in light / dark / high-contrast themes before declaring v1. The `kjVariant="muted"` shape is the contrast-risk shape — see [Open question 3](#open-questions--risks). |
| 1.4.11 Non-text Contrast (AA) | Focus ring ≥ 3:1 against page background; external-link icon ≥ 3:1 against page background. | Theme tokens for the focus ring; the external-link icon ships at the same colour as the link text (≥ 7:1 by virtue of the link colour token), so passes 3:1 trivially. |
| 1.4.13 Content on Hover or Focus (AA) | If the underline is hover-revealed, the underline is dismissible (Esc), hoverable, persistent. | `kjUnderline="hover"` reveals the underline via `:hover` and `:focus-visible`; both are native browser states. Dismissal is the cursor moving away (native); persistence is until the cursor moves (native); hoverability is trivial (the underline is on the link itself). 1.4.13 cleared. |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | Links reachable + activatable via keyboard. Disabled links removed from tab sequence. | Native: `Tab` reaches the link, `Enter` activates. **Disabled**: `tabindex="-1"` removes from the tab sequence; capture-phase listeners on `click` and `keydown.enter` `preventDefault()` and `stopImmediatePropagation()`. The link is still focusable programmatically (e.g. via `.focus()` from a screen-reader's link-list) so AT users can discover the disabled state. |
| 2.4.4 Link Purpose (In Context, AA) / 2.4.9 Link Purpose (Link Only, AAA) | Each link's accessible name describes the destination. | **Consumer's job.** The directive does not auto-generate names. Documentation and dev-mode warnings call out the canonical anti-pattern (`<a>click here</a>`) and the AAA recommendation (link text alone describes the destination — `<a kjLink href="/billing">Manage billing</a>`, not `<a kjLink href="/billing">here</a>`). See [Open question 5](#open-questions--risks). |
| 2.4.7 Focus Visible (AA) | Visible focus indicator on `:focus-visible`. | `KjFocusRing` host directive composed; CSS layer paints the ring. |
| 2.4.13 Focus Appearance (WCAG 2.2 AAA) | Focus indicator is at least 2px thick, has at least 3:1 contrast against the focused control's adjacent colour, and at least 3:1 contrast against the unfocused state. | Components-package CSS uses `outline: 2px solid var(--kj-focus-ring); outline-offset: 2px` — verified against link text in default theme. |
| 2.5.5 Target Size (AAA) | Interactive targets ≥ 44×44 CSS px. | **Inline prose links**: exempt under the inline-text exception. **Standalone links**: `min-height: 2.75rem` (44px) at `md` size and larger; padding ensures `sm` size also clears 44px hit area. **Disabled links**: still clear the target size (the size doesn't disappear with the disabled state). See [Open question 6](#open-questions--risks) for the breadcrumb / inline-list edge case. |
| 2.5.8 Target Size (Minimum, AA) | 24×24 fallback. | Inherent — even `sm` standalone links exceed 24px. |
| 3.2.5 Change on Request (AAA) | Links that open new windows / tabs are announced before activation. | The visually-hidden `(opens in new tab)` suffix in the accessible name fulfils [WCAG Technique G201](https://www.w3.org/WAI/WCAG21/Techniques/general/G201). The trailing icon fulfils the sighted-user story. |
| 4.1.2 Name, Role, Value | Native `<a href>` provides role `link` and the name from text content. The directive does not override role. | All host bindings are `[attr.data-*]` or composition via host directives. The only ARIA attribute the directive sets directly is `aria-disabled` (when disabled) — and it never sets `role`, never strips `href`, never reflects `aria-label` (consumer territory). |

### External-link AT story — the one real subtlety

The `(opens in new tab)` suffix can land in three places, each
with different AT consequences:

1. **As a visually-hidden `<span>` child of the `<a>`.** The
   accessible name (read from the `<a>`'s text content) becomes
   `"Documentation (opens in new tab)"`. **AT pairings tested**:
   NVDA/Chrome, NVDA/Firefox, JAWS/Chrome, VoiceOver/Safari all
   read the suffix. **Chosen approach.** Implementation: directive
   appends a `KjVisuallyHidden`-styled child via DOM insertion in
   `afterNextRender` when `data-external="true"` and no
   consumer-supplied `aria-label` is present.

2. **As a CSS `::after` pseudo-element with `content: " (opens in new tab)"`.**
   Read inconsistently — VoiceOver reads it, NVDA/Firefox reads it,
   NVDA/Chrome historically did not (fixed in NVDA 2023.x but the
   long tail of installed versions matters). Visually duplicates
   the icon if the icon is also a pseudo-element. **Rejected.**

3. **As an `aria-label` override.** Rewrites the entire accessible
   name to `"Documentation (opens in new tab)"` — but the
   consumer's link text is no longer the accessible name. If the
   text says "Documentation, our complete API reference" and the
   directive overwrites with `aria-label="Documentation (opens in new tab)"`,
   the rich descriptive text is lost. **Rejected** as automatic
   behaviour; the consumer can still set their own `aria-label` if
   they want full control.

Approach (1) is the chosen path and matches WCAG Technique G201
("supplementary information added to the link text"). The
visually-hidden span is a `KjVisuallyHidden`-styled element
(`position: absolute; width: 1px; height: 1px; …`) appended as a
sibling to the projected `<ng-content>`; the CSS layer also ships
a `.kj-link-external-suffix` class that the directive applies for
deterministic styling.

### Disabled-link AT story — the four-part bundle

Each of the following is wrong if any other is missing:

1. **`aria-disabled="true"`** — announces the disabled state to AT.
   **Without** the others, the link still navigates on click and
   Enter (only the announcement changes).
2. **`tabindex="-1"`** — removes from keyboard tab sequence.
   **Without** click suppression, the link still navigates on
   mouse click. **Without** the keydown.enter suppression,
   programmatic focus + Enter still navigates.
3. **Capture-phase `click` interceptor** — `preventDefault()` +
   `stopImmediatePropagation()`. **Without** it, mouse click
   navigates. Capture phase ensures it runs before any
   consumer-bound `(click)` handlers and before Angular Router's
   own click handler (so `routerLink` navigation is also
   suppressed).
4. **Capture-phase `keydown.enter` interceptor** — same. **Without**
   it, Enter on a focused-by-AT link navigates.

The directive owns all four. A consumer hand-authoring this on
each disabled-link site will inevitably miss one. This is the
single biggest justification for the directive existing at all.

The disabled link **does not** set `role="link"` or `role="generic"`;
the native `<a>` role is preserved so AT correctly announces "link,
disabled" rather than "disabled" alone.

### Visited-link contrast

`:visited` styling is browser-restricted to colour properties for
privacy reasons (the post-2010 `:visited` lockdown — see
[Mozilla blog post](https://hacks.mozilla.org/2010/03/privacy-related-changes-coming-to-css-vistited/)).
The directive does not set the visited colour itself; the CSS layer
reads `--kj-color-link-visited`. The risk is contrast: visited
purple on white is the canonical example, but kouji's tokens may
land it elsewhere. **Verify** ≥ 7:1 in default theme; ≥ 4.5:1 if
AAA cannot be reached without losing the visited-vs-unvisited
distinguishability (a tradeoff WCAG explicitly acknowledges in the
Note to 1.4.6: "Where text or images of text are used to convey
information, contrast is required regardless of the visited state").

## Composition model

```
[Core directive]                              (folder: packages/core/src/link/)
  └── KjLink                                  (selector: a[kjLink], [kjLink])
      hostDirectives:
        ├── KjVariant (inputs: kjVariant)
        ├── KjSize    (inputs: kjSize)
        └── KjFocusRing
      providers:
        └── bindPresets(KJ_LINK_CONFIG)
      owns:
        ├── kjUnderline reflection ([attr.data-underline])
        ├── kjExternal auto-detect + reflection ([attr.data-external])
        ├── kjDisabled bundle (aria-disabled + tabindex + click/keydown suppression)
        ├── rel="noopener noreferrer" injection (additive)
        └── (opens in new tab) AT suffix injection

[Wrapper component]                           (folder: packages/components/src/link/)
  └── KjLinkComponent                         (selector: kj-link)
      template: <a [href]="kjHref()" [attr.aria-label]="kjAriaLabel() || null"
                   kjLink [kjVariant]="..." [kjSize]="..."
                   [kjUnderline]="..." [kjExternal]="..." [kjDisabled]="...">
                  <ng-content />
                </a>

[Configuration]                               (file: packages/core/src/link/config.ts)
  ├── KJ_LINK_DEFAULTS = { variants, sizes, defaults }
  ├── KJ_LINK_CONFIG = new InjectionToken(...)
  └── provideKjLink(config: Partial<KjLinkConfig>): Provider[]

[CSS layer]                                   (file: packages/components/src/link/link.css)
  └── .kj-link, .kj-link[data-variant=…], .kj-link[data-underline=…],
      .kj-link[data-external=true]::after, .kj-link[data-disabled],
      .kj-link[data-focus-visible], .kj-link:visited
```

One root directive. No child directives. No context tokens (Link
is a leaf — no parent / child coordination). No services. The
wrapper is presentational only. The CSS layer is independent of
both and reads the same data attributes whether the consumer used
the directive directly or the wrapper.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | `hostDirectives` | Routes `kjVariant` input to `data-variant` attribute, validates against `KJ_LINK_CONFIG.variants`. Standard preset pattern. |
| `KjSize` | `hostDirectives` | Routes `kjSize` input to `data-size` attribute, validates against `KJ_LINK_CONFIG.sizes`. Standard preset pattern. |
| `KjFocusRing` | `hostDirectives` | Reflects `data-focus-visible=""` on keyboard focus. |
| `KjDisabled` | `hostDirectives` (forwarded as `kjDisabled: kjDisabled`) | Provides the `aria-disabled` / `data-disabled` reflection. The capture-phase click + keydown suppression and the `tabindex="-1"` flip live in `KjLink` itself (richer contract than the bare primitive provides). Same arrangement as Button's `effectiveDisabled` plumbing. See [Open question 2](#open-questions--risks) for whether to extend `KjDisabled` itself or keep the richer logic in `KjLink`. |
| `KjVisuallyHidden` | Programmatic — used to style the appended `(opens in new tab)` suffix `<span>` | Class-only application (`element.classList.add('kj-visually-hidden')`) so the directive does not need to render the span through Angular's template engine. The same CSS is used wherever VisuallyHidden lives. |
| `KjFormControl` / `KjLiveRegion` / `KjFocusTrap` / `KjRovingTabindex` / `KjAriaDescribedby` | **Not used.** | Link is a leaf navigation control. No form-control duties, no live region, no focus trap, no roving tabindex (that lives on the container — Breadcrumb's `<ol>` if applicable, or the page's nav-list — not on Link), no described-by wiring (the consumer's `aria-describedby` flows through unchanged when present, but Link does not orchestrate it). |

### Cross-component pointers

- [`../data-display/typography.md`](../data-display/typography.md)
  — the prose container's `a` selector reads the same
  `--kj-color-link` token Link uses, ensuring identical styling
  whether the consumer wrote `<a kjLink>` or just `<a>` inside
  `<article class="kj-prose">`. The `kj-prose a` rule sets
  `data-underline="always"` via CSS attribute selector to honour
  the in-prose underline policy. See typography.md
  [Open question 6](../data-display/typography.md) for the
  coordination story; this Link analysis closes that question.
- [`../data-display/card.md`](../data-display/card.md) — Card's
  "linked title" pattern uses `<a kjLink>` inside
  `<kj-card-title>`. The card surface does not become a link; the
  title text does. Hit-area extension is via `::after` overlay on
  the title's parent (Card-owned), not on the link itself. See
  card.md §192–200.
- [`../actions/button.md`](../actions/button.md) — `<a kjButton>`
  is the "anchor styled as button" path; `<a kjLink>` is the
  "anchor styled as link" path. They share the underlying `<a>`,
  the variant / size / focus-ring composition pattern, and the
  capture-phase disabled-click suppression. They differ in CSS
  (Button ships button-shaped chrome; Link ships text-shaped
  underline + colour) and in semantic intent (Button is for
  primary CTAs at the bottom of cards; Link is for in-text links
  and nav rows).
- [`./breadcrumb.md`](./breadcrumb.md) (planned) — every breadcrumb
  except the last is `<a kjLink kjVariant="muted" kjSize="sm">`;
  the last is `<span aria-current="page">` styled as the muted
  variant without the link decoration. Breadcrumb composes Link;
  Link does not need to know about Breadcrumb.
- [`../data-display/list.md`](../data-display/list.md) — list rows
  whose entire row is a navigation target use `<a kjLink>` as the
  row's primary action. The row's whole-area hit extension is
  List's responsibility (a `::after` overlay or a wrapping `<a>`
  around the row's cells); Link contributes the colour + focus-ring
  + external-link discipline.
- [`../feedback/toast.md`](../feedback/toast.md) (planned) and
  [`../feedback/alert.md`](../feedback/alert.md) — bodies may
  contain a `<a kjLink>` for "Learn more" / "Undo" navigation.
  The toast / alert variant context cascades the link's colour
  token (the parent's `data-variant="error"` selector colours
  descendant `.kj-link` elements through the
  `--kj-color-link` token override). Open question:
  whether Link should expose a `kjVariant="inherit"` mode for this
  case explicitly — see [Open question 4](#open-questions--risks).

## Inputs / Outputs / Models

All public-facing inputs / outputs / models are `kj`-prefixed per
[`rules/code_style.md`](../../../rules/code_style.md).

### Core directive (`KjLink`, selector `[kjLink]` / `a[kjLink]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | `string` (validated against preset) | `'primary'` (from `KJ_LINK_CONFIG`) | Forwarded to `KjVariant` host directive. Preset list: `'primary' \| 'secondary' \| 'muted' \| 'destructive'`. |
| `kjSize` | `string` (validated against preset) | `'inherit'` (from `KJ_LINK_CONFIG`) | Forwarded to `KjSize` host directive. Preset list: `'sm' \| 'md' \| 'lg' \| 'inherit'`. `'inherit'` means the link picks up the surrounding text size. |
| `kjUnderline` | `'always' \| 'hover' \| 'none'` | `'hover'` | Reflects `[attr.data-underline]`. Inside `kj-prose`, the prose CSS overrides to `'always'` via attribute selector — the directive default is the standalone-link default. |
| `kjExternal` | `boolean \| undefined` | `undefined` | Tri-state. `undefined` → auto-detect from `target="_blank"` on host. `true` → forces external treatment. `false` → forces internal treatment (suppresses icon + suffix). Reflects `[attr.data-external]`. |
| `kjDisabled` | `boolean` | `false` | Forwarded to `KjDisabled` host directive (which sets `aria-disabled` + `data-disabled`). Directive additionally sets `tabindex="-1"` and capture-phase intercepts `click` + `keydown.enter` to call `preventDefault()` + `stopImmediatePropagation()`. |
| (host) `[attr.data-variant]` / `[data-size]` / `[data-underline]` / `[data-external]` / `[data-disabled]` / `[data-focus-visible]` | host bindings | computed | CSS layer keys off these. |
| (host) `[attr.aria-disabled]` | host binding | computed | Provided by composed `KjDisabled`. |
| (host) `[attr.tabindex]` | host binding | computed | `'-1'` when `kjDisabled()` is `true`; otherwise unset (preserves any consumer-supplied `tabindex` — additive policy). |
| (host) `[attr.rel]` | host binding | computed | When `data-external="true"`, ensures `rel` includes `noopener noreferrer` (additive — preserves consumer-supplied tokens). When `data-external="false"`, leaves `rel` alone. |

No outputs. No models. Link is stateless — the parent owns the
navigation target (`href`, `routerLink`) and the directive only
observes / decorates.

### Wrapper component (`KjLinkComponent`, selector `kj-link`)

Re-exposes everything above, plus:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjHref` | `string \| undefined` | `undefined` | Bound to native `<a [href]>`. **Required** in the wrapper (dev-mode warning if unset and `kjRouterLink` is also unset). |
| `kjRouterLink` | `string \| any[] \| undefined` | `undefined` | Bound to `[routerLink]` on the rendered `<a>`. Wrapper forwards it through. Either `kjHref` or `kjRouterLink` must be set; both is a dev-mode warning (Angular's router precedence applies — `routerLink` wins). |
| `kjTarget` | `'_self' \| '_blank' \| '_parent' \| '_top' \| string` | `'_self'` | Bound to `[attr.target]`. Setting `_blank` triggers the external-link auto-detect in `KjLink`. |
| `kjAriaLabel` | `string \| undefined` | `undefined` | Bound to `[attr.aria-label]`. When set, suppresses the AT suffix injection (consumer is presumed to have authored a complete name). |

The wrapper renders `<a [href] [routerLink] [target] [attr.aria-label]
kjLink [kjVariant] [kjSize] [kjUnderline] [kjExternal] [kjDisabled]>
<ng-content /></a>` — all props pass through to the inner `<a>`,
and the directive does its work on that `<a>`. No additional
behaviour at the wrapper layer.

### Configuration (`KJ_LINK_CONFIG`)

Same shape as `KJ_BUTTON_CONFIG`:

```ts
export interface KjLinkConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

export const KJ_LINK_DEFAULTS: KjLinkConfig = {
  variants: ['primary', 'secondary', 'muted', 'destructive'],
  sizes: ['sm', 'md', 'lg', 'inherit'],
  defaults: { variant: 'primary', size: 'inherit' },
};

export const KJ_LINK_CONFIG = new InjectionToken<KjLinkConfig>('kj.link.config', {
  factory: () => KJ_LINK_DEFAULTS,
});

export function provideKjLink(config: Partial<KjLinkConfig>): Provider[];
```

Identical extension story to Button: `provideKjLink({ variants:
[...KJ_LINK_DEFAULTS.variants, 'brand'] })` adds a brand-coloured
link variant at the application or feature scope.

## Examples to ship

Match the cadence of Button's example set:

1. **Default** — `link.example.ts`. One inline link inside a
   sentence. `<p>Visit <a kjLink href="/about">our about page</a> for more.</p>`
2. **Variants** — `link.variants.example.ts`. `primary`,
   `secondary`, `muted`, `destructive` side-by-side.
3. **Sizes** — `link.sizes.example.ts`. `sm`, `md`, `lg`, `inherit`
   side-by-side, each shown both inline (inside a `<p>`) and
   standalone.
4. **Underline modes** — `link.underline.example.ts`. Three rows:
   `always`, `hover`, `none`. Demonstrates the three policies and
   when each is appropriate.
5. **External link** — `link.external.example.ts`. Two cases:
   (a) auto-detected (`<a kjLink href="https://example.com" target="_blank">`)
   showing the trailing icon and the AT suffix; (b) explicit
   (`<a kjLink href="/internal" [kjExternal]="true">`) for the
   case where the URL goes to a different origin via routing
   without a `target="_blank"` flag.
6. **Disabled** — `link.disabled.example.ts`. Includes an active +
   disabled link side-by-side; consumer click handler on the
   disabled link demonstrates that the handler does not fire.
7. **In prose** — `link.in-prose.example.ts`. An
   `<article class="kj-prose">` containing a paragraph with several
   inline `<a kjLink>` links. Demonstrates that the prose
   container's `a` selector and `KjLink`'s direct rules do not
   conflict — both read the same `--kj-color-link` token.
8. **With `routerLink`** — `link.router.example.ts`. `<a kjLink
   routerLink="/billing">Manage billing</a>` showing the natural
   composition with Angular Router. Includes a disabled case
   demonstrating that `routerLink` navigation is suppressed when
   `kjDisabled` is true.
9. **In a card title** — `link.in-card.example.ts`. A `<kj-card>`
   whose `<kj-card-title>` contains `<a kjLink>` — the canonical
   "linked title" pattern. Anchors the composition with Card.
10. **In a breadcrumb** — `link.in-breadcrumb.example.ts`. A
    `<nav aria-label="Breadcrumb"><ol>` of `<li>` cells, each
    containing `<a kjLink kjVariant="muted" kjSize="sm">` except
    the last. Anchors the composition with Breadcrumb.
11. **Configured presets** — `link.configured.example.ts`. Extends
    the variant list with a `brand` variant via `provideKjLink`.
12. **Themed (core-only)** — `link.example.ts`,
    `link.retro.example.ts`, `link.finance.example.ts` under
    `packages/core/`. Confirms the directive works under arbitrary
    theme CSS without the wrapper.

## Open questions / risks

1. **Coordination with `kj-prose a` selector — who wins?**
   The prose container's CSS sets `data-underline="always"` on
   descendant `<a>` elements via attribute selector
   (`.kj-prose a:not([data-underline]) { /* implicit always */ }`
   or equivalent). When the consumer writes
   `<a kjLink kjUnderline="hover">` inside `<article class="kj-prose">`,
   which wins? **Decision: the directive wins.** A consumer who
   explicitly sets `kjUnderline="hover"` is asking for hover
   behaviour even inside prose, and the explicit input should
   override the prose default. Implementation: `kj-prose a` rules
   match `[data-underline=""]` (unset) but **not**
   `[data-underline="hover"]` etc. (explicit). The directive sets
   `data-underline` to its current value always, so the prose
   default only applies when no directive is present (a raw `<a>`
   inside prose without `kjLink`). Tested in
   `link.in-prose.example.ts`.

2. **Disabled-link tab behaviour — `tabindex="-1"` or stay in tab
   sequence (matching Button's `disabledInteractive`)?**
   Button keeps disabled buttons in the tab sequence (focusable,
   `aria-disabled="true"`, click suppression) so AT users can
   discover them via Tab navigation. Should Link follow the same
   policy, or is the link case different because navigation
   semantics make the disabled state more obviously "broken"?
   **Lean: same policy as Button — keep in tab sequence.** A
   disabled link is still a discoverable target; AT users
   navigating by Tab learn that the link exists but is currently
   inactive (which is meaningful — "the Save link is disabled
   until you make a change"). The current design above sets
   `tabindex="-1"`, which is the more conservative option;
   reconsider in light of Button's stance and either flip Link
   or — more likely — flip both to a single shared policy.
   **Resolution path**: spike both; if Button's
   `disabledInteractive` reads well in user-testing, mirror it
   here. The capture-phase click + keydown suppression stays
   regardless of tab behaviour.

3. **`kjVariant="muted"` AAA contrast against `base-300`.**
   The muted variant reads from `--kj-color-base-content` mixed at
   ~70% opacity (per Typography's `kjMuted` token decision in
   [typography.md §461](../data-display/typography.md)). On a
   `base-300` page background (sidebar surfaces, secondary cards),
   the muted link colour may drop below the AAA bar even at 70%
   opacity. **Mitigation**: the muted variant for Link reads from a
   separate token (`--kj-color-link-muted`) that the theme can tune
   independently of the Typography muted token. Verify ≥ 7:1 in the
   contrast matrix (light / dark / high-contrast × `base-100` /
   `base-200` / `base-300`) before shipping. If any cell fails,
   bump the muted opacity; the visual difference is subtle and
   AAA wins.

4. **`kjVariant="inherit"` — should this be a fifth variant?**
   When a `<a kjLink>` lives inside an `<kj-alert kjVariant="error">`
   body, the consumer wants the link to pick up the alert's error
   colour, not the global link primary colour. The current design
   relies on the parent's `data-variant="error"` selector
   cascading into the descendant link's colour via CSS. That
   works for the alert / toast / banner cases, but is implicit —
   the consumer cannot opt *into* the parent's variant context
   without also relying on it being there. **Lean: yes, ship
   `'inherit'` as a fifth variant.** When set, the directive
   reflects `data-variant="inherit"` and the CSS layer reads
   `--kj-color-link` from `currentColor` (so the link picks up
   the surrounding text colour, whatever it is). This is the
   explicit opt-in for "this link should look like text". Defer
   to v1.1 if the implicit cascade covers the real cases; do not
   block v1 on it.

5. **Dev-mode warning for "click here" / "here" / "learn more"
   anti-patterns?**
   WCAG 2.4.9 (AAA) demands that link text alone describes the
   destination. The five worst offenders ("click here", "here",
   "more", "read more", "learn more") are well-known. Should the
   directive warn in dev mode when the host's text content matches
   one of these? **Lean: yes, but as an opt-in.** Default off
   (consumers pasting third-party CMS content should not see a
   wall of warnings); opt-in via
   `provideKjLink({ devModeWarnAmbiguousText: true })`. The
   warning should also fire when the link has no text content
   (icon-only links without `aria-label`). Defer to v1.1; not
   blocking v1.

6. **Touch-target story for breadcrumb-style inline link rows.**
   A breadcrumb is a row of small links separated by `>` separators.
   Each crumb's `<a kjLink kjSize="sm">` should be ≥ 44px hit area
   (WCAG 2.5.5 AAA), but the small visual size and the inline
   layout fight that. The CSS layer applies `padding: 0.5rem 0`
   to the small standalone link to extend the hit area
   vertically without changing the visual size — but the **inline**
   layout means crumbs sit on the same baseline, so the vertical
   padding overlaps with the row above and below. **Mitigation**:
   rely on the inline-text exception (WCAG 2.5.5 explicitly
   exempts inline text links inside a sentence-like flow);
   breadcrumbs are arguably a row of inline links and the
   exception applies. Verify with an a11y reviewer before
   declaring v1; if the exception does not cleanly apply,
   Breadcrumb's own analysis owns the mitigation (e.g. `display:
   inline-flex; min-height: 44px` per crumb).

7. **`download` attribute — special handling?**
   `<a href="…" download>` is a "save this URL as a file" link.
   It has the same external-link feel (the action is "leaves the
   document context") but does not open a new tab. Should the
   directive treat `download` links as external? **Lean: no.**
   The download-link icon (typically a downward-arrow) is a
   different visual semantic from the external-link icon
   (typically a square-with-arrow). The AT suffix is also
   different ("(downloads file)" vs. "(opens in new tab)").
   Future option: ship a `kjDownload` boolean input or a
   `kjLinkType: 'navigation' | 'external' | 'download'` enum that
   covers all three. Defer to v1.1 if and when consumers ask;
   not blocking v1.

8. **`mailto:` / `tel:` / `sms:` — special handling?**
   These protocols open the user's mail / phone / SMS client. They
   are arguably "external" in the same sense that `target="_blank"`
   is, but they are not new-tab links and the suffix would be
   misleading. **Lean: no special handling for v1.** Consumers
   who want a "(opens in your mail client)" suffix can author it
   themselves via `aria-label`. Document the pattern in the
   examples. Reconsider if user-feedback shows the gap.

9. **SSR / hydration.** All directive logic except the
   external-link AT suffix injection runs synchronously on host
   bindings, so the SSR HTML carries the right `data-*`
   attributes. The AT suffix injection runs in `afterNextRender`
   (browser-only) — the `(opens in new tab)` `<span>` does not
   appear in the SSR HTML, but it appears post-hydration without
   a layout shift (visually-hidden). The `rel` attribute injection
   runs in the same `afterNextRender` hook for parallel reasoning.
   **Risk**: the SSR HTML for an external link does not have
   `rel="noopener noreferrer"` until hydration completes. For
   server-rendered pages with consumer-clickable external links,
   this is a tabnabbing-window vulnerability of < 100ms.
   **Mitigation**: the directive applies the `rel` synchronously
   via host binding (read `target` from the consumer's template
   binding rather than from the rendered DOM), so the SSR HTML
   carries the right `rel`. Implementation note: read `target`
   via `@HostBinding`-equivalent or via `inject(ElementRef)
   .nativeElement.getAttribute('target')` inside the host-binding
   computation. Verify in SSR snapshot tests.

10. **Visited state tracking inside SPAs.**
    `:visited` is browser-managed via the user's history. In a
    Single-Page Application using Angular Router, the browser's
    history API is updated on each route change, so `:visited`
    fires correctly for routed links. **Risk**: if the consumer's
    routing scheme uses query-parameter-only navigation
    (`?page=billing`), the browser's `:visited` history may not
    distinguish `/?page=billing` from `/?page=settings` in the way
    the consumer expects. This is an edge case and not Link's
    responsibility — the consumer's routing scheme owns the URL
    shape.

11. **External-link icon is browser-rendered (CSS pseudo-element)
    or library-shipped (inline SVG)?**
    A pseudo-element with `content: url(…)` is the simplest
    approach but bakes the icon into the CSS layer. An inline SVG
    appended by the directive gives the consumer a way to swap the
    icon (via icon-registry slot). **Lean: pseudo-element for v1.**
    The icon is small, semantic, and rarely needs themed
    replacement. If a consumer needs a custom icon, they can
    override the pseudo-element via CSS variable
    (`--kj-link-external-icon: url("…")`). Re-evaluate if a
    consumer ships a meaningfully different external-link icon
    (e.g. a brand-specific arrow) — at which point an icon
    registry pattern (parallel to whatever the wider icon story
    becomes) is the upgrade path.

12. **Why no separate `<kj-text-link>` component for inline use?**
    Considered: a wrapper specifically for inline prose use that
    sets `kjUnderline="always"` and `kjSize="inherit"` by default,
    versus the `<kj-link>` wrapper above which leans toward
    standalone-link defaults. **Rejected.** The defaults for
    `<kj-link>` are tunable per usage; shipping two wrappers with
    different defaults is API sprawl. Documentation calls out the
    in-prose pattern (`<a kjLink kjUnderline="always">`) and the
    standalone pattern (`<a kjLink>`); consumers pick. If the
    explicit `kjUnderline="always"` reads as too much typing,
    revisit — but the cost of an extra component to save four
    characters is worse than the typing.

13. **`aria-current="page"` for the current-page link in a
    breadcrumb / nav rail.**
    The current-page indicator is `aria-current="page"` per
    [WAI-ARIA APG: aria-current](https://www.w3.org/TR/wai-aria-1.1/#aria-current).
    Should `KjLink` expose a `kjCurrent` input that reflects this?
    **Lean: no — the consumer's framework already handles it.**
    Angular Router's `routerLinkActive` directive sets a CSS class
    on the active link; consumers wire `aria-current="page"`
    themselves through that mechanism (or via `[attr.aria-current]`
    binding in the template). Adding a `kjCurrent` input to
    `KjLink` would duplicate `routerLinkActive`'s job.
    Documentation calls out the recommended pattern. The CSS
    layer does honour `[aria-current="page"]` styling (slightly
    bolder, no underline-on-hover, often the "muted" variant) so
    consumers who set the attribute get the visual for free.

14. **Print stylesheet — show the URL in parentheses?**
    A common print convention is to render the link's `href` after
    the link text (`This article (https://example.com/article)`)
    so printed pages remain useful without the hyperlink. The
    `kj-prose` print styles do this for prose links; should the
    standalone-link CSS layer also do it? **Lean: yes, with an
    opt-out.** `@media print { .kj-link::after { content: " (" attr(href) ")"; } }`
    is one rule; consumers who don't want it can override. Defer
    to v1.1; not blocking v1.

15. **Internationalisation — `(opens in new tab)` AT suffix
    translation.**
    The suffix is currently an English string. For an i18n'd
    application the suffix should translate (`(s'ouvre dans un
    nouvel onglet)` etc.). **Mitigation**: expose the suffix via
    `provideKjLink({ externalSuffix: $localize`:@@kj.link.external:opens in new tab` })`
    or a similar mechanism. The directive reads the configured
    string from injection. Defer to v1.1; not blocking v1, but
    flagged so the field is on the config interface from day one
    rather than added later.
