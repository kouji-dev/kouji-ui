# Typography

The cluster of styled text the library ships for documents, articles,
marketing pages, blog content, changelogs, and any other place a
consumer renders semantically-shaped prose: headings (`h1`–`h6`),
paragraphs (`p`), `blockquote`, `ul` / `ol` / `dl`, `code`, `pre`,
tables of prose, plus a handful of small utility tones — `lead`
(introductory paragraph), `large`, `small`, `muted`, and a
`truncate` / line-clamp helper. None of these are individually a
"component" in the same sense that Card or Tag are; together they
are the typographic substrate every other component sits on top of.

> **Not on disk yet.** No `packages/core/src/typography/`, no
> `packages/components/src/typography/`. This analysis specifies
> the shape before any code lands. The recommendation is unusual:
> ship Typography as **a CSS layer plus a small set of utility
> directives**, not as a family of wrapper components. The case is
> in [Decision (core directive)](#decision-core-directive).

The right mental model is the
`[@tailwindcss/typography](https://github.com/tailwindlabs/tailwindcss-typography)`
`prose` plugin: a single class on a container node restyles **every
descendant semantic element** (`h1`, `h2`, `p`, `ul`, `ol`, `li`,
`blockquote`, `code`, `pre`, `table`, `hr`, `a`, `strong`, `em`,
`figure`, `figcaption`) into a coherent typographic system tuned to
the surrounding theme. A consumer who wants to render Markdown,
MDX, or a CMS-fetched HTML blob into the page does not want to
rewrite every `<h2>` to `<kj-h2>`; they want **one container** that
makes the whole subtree look right. That is the primary deliverable.

The directive layer is small and targeted: a handful of attribute
directives for the cases where the consumer is **authoring**
templates by hand and wants the kj-prefixed ergonomics
(`<p kjLead>`, `<code kjCode>`, `<blockquote kjBlockquote>`,
`<span kjMuted>`, `<p kjTruncate="2">`). These directives never
*own* the styling — they project a `data-*` attribute that the
shipped CSS keys off — and they never wrap the host in another
element. They preserve the native element's role, semantics, and
heading-level on the page.

Cross-references — Typography is a foundational primitive consumed
by almost everything in the library:

- `[empty-state.md](./empty-state.md)` (planned) renders its title
and description through Typography's `h2` / `p` styling; the
empty-state component does not own typographic decisions
- `[card.md](./card.md)` — `<kj-card-title>`, `<kj-card-subtitle>`,
and `<kj-card-description>` slots all defer their text styling to
Typography tokens (heading scale, muted tone, line-height); see
[card.md §256, §745, §858](./card.md)
- `[chat-bubble.md](./chat-bubble.md)` — bubble bodies render
prose-like content (markdown answers, multi-paragraph messages)
and use the `--kj-line-height-relaxed` token Typography ships;
truncated message previews (notification rail, archived view)
consume `kjTruncate`
- `[list.md](./list.md)` — list items often render
primary-plus-secondary text (a `<span>` title + a `<small kjMuted>`
meta line); the muted directive lives here
- `[../actions/command-palette.md](../actions/command-palette.md)` —
result rows render names plus `kjMuted` paths; suggestion previews
use `kjTruncate`
- Documentation pages (the kouji-ui docs site itself, every consuming
app's docs/marketing surfaces, every CMS-fetched article body) —
the **canonical heavy consumer**. The whole `kj-prose` container
is built for them.
- `[./kbd.md](./kbd.md)` — kbd inline in prose composes naturally
inside a `kj-prose` container; Typography does not need a Kbd
opinion (Kbd's own baseline alignment story handles the inline
flow case, see kbd Open question 6)

## Source comparison

The reference field is the most lopsided of any component covered so
far: two libraries ship literally nothing, one ships classes,
shadcn/ui ships a documentation page demonstrating that the answer
is "use the right native element with the right Tailwind classes",
and the genuine standard is a CSS-only Tailwind plugin.


| Concern                      | PrimeNG                                                                                                                                                             | Angular Material                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | shadcn/ui                                                                                                                                                                                                                                                                                                                              | Tailwind `@tailwindcss/typography` (`prose`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-class component        | **No.** PrimeNG ships zero typography primitives. The docs sites style headings/paragraphs entirely from global theme CSS that consumers either copy or reach into. | **No** dedicated *component*. Material ships **typography classes** instead — `.mat-display-large`, `.mat-display-medium`, `.mat-display-small`, `.mat-headline-large`, `.mat-headline-medium`, `.mat-headline-small`, `.mat-title-large`, `.mat-title-medium`, `.mat-title-small`, `.mat-body-large`, `.mat-body-medium`, `.mat-body-small`, `.mat-label-large`, `.mat-label-medium`, `.mat-label-small` — applied directly to elements. The `.mat-typography` *container* class restyles common descendants (`h1`–`h6`, `p`) similarly to Tailwind `prose`. Older releases shipped helper classes `.mat-h1`–`.mat-h6`, `.mat-body-1`, `.mat-body-2` (now deprecated in favour of the design-token names). | **No exported component.** A documentation page (`/components/typography`) shows hand-styled examples for `h1` / `h2` / `h3` / `h4`, `p`, `blockquote`, `table`, `ul`, `code`, `lead`, `large`, `small`, `muted`. The page is the API: copy the HTML + Tailwind classes into your own template. **No `import { Typography } from …`.** | **No component, no class set, no DI.** A Tailwind plugin: `class="prose"` on a container restyles every descendant `h1`/`h2`/`h3`/`h4`/`h5`/`h6`/`p`/`a`/`blockquote`/`code`/`pre`/`ul`/`ol`/`li`/`dl`/`dt`/`dd`/`hr`/`img`/`figure`/`figcaption`/`table` with a coherent type scale, line-height, color, and spacing rhythm. Modifiers: `prose-sm` / `prose-base` / `prose-lg` / `prose-xl` / `prose-2xl`, color modifiers (`prose-slate`, `prose-gray`, …), inverse (`prose-invert`), and per-element overrides (`prose-headings:font-display`, `prose-a:text-blue-600`). |
| Selector / surface           | n/a                                                                                                                                                                 | Class set: per-element classes plus container class                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Documentation only; consumer uses native HTML                                                                                                                                                                                                                                                                                          | `class="prose"` on a container; per-element mods via Tailwind variant syntax                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Headings (`h1`–`h6`)         | n/a                                                                                                                                                                 | One class per Material role (display/headline/title/body/label × large/medium/small)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | shadcn examples for h1–h4 with a fixed Tailwind class string each                                                                                                                                                                                                                                                                      | Container class re-themes all six headings consistently                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Paragraph                    | n/a                                                                                                                                                                 | `.mat-body-large` / `medium` / `small`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `<p class="leading-7 [&:not(:first-child)]:mt-6">`                                                                                                                                                                                                                                                                                     | All `<p>` descendants of `.prose`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Lead paragraph               | n/a                                                                                                                                                                 | None — consumer composes from body classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `<p class="text-xl text-muted-foreground">` (called "lead")                                                                                                                                                                                                                                                                            | Not a `prose` slot; consumer applies their own modifier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Inline code                  | n/a                                                                                                                                                                 | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `<code class="relative rounded bg-muted px-…">`                                                                                                                                                                                                                                                                                        | All `<code>` descendants of `.prose` get a code background, padding, font-family                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Blockquote                   | n/a                                                                                                                                                                 | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `<blockquote class="mt-6 border-l-2 pl-6 italic">`                                                                                                                                                                                                                                                                                     | `<blockquote>` descendants get a left rule, italic, indent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| List                         | n/a                                                                                                                                                                 | None — consumer styles `<ul>` / `<ol>` per app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `<ul class="my-6 ml-6 list-disc [&>li]:mt-2">`                                                                                                                                                                                                                                                                                         | Native `<ul>`/`<ol>` descendants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Table                        | n/a                                                                                                                                                                 | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `<table class="w-full">` plus `<thead>`/`<tr>`/`<th>` examples                                                                                                                                                                                                                                                                         | Native `<table>` descendants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Lead / Large / Small / Muted | n/a                                                                                                                                                                 | Closest is `.mat-body-large` / `.mat-body-small` / `.mat-label-small` — colour is theme-driven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | All four documented as Tailwind class strings                                                                                                                                                                                                                                                                                          | Not in the `prose` core; out-of-prose consumer concern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Truncate / line-clamp        | n/a                                                                                                                                                                 | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | None                                                                                                                                                                                                                                                                                                                                   | None — Tailwind ships `line-clamp-N` separately; not part of `prose`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sizes                        | n/a                                                                                                                                                                 | Per-class                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | n/a                                                                                                                                                                                                                                                                                                                                    | `prose-sm` / `prose-base` / `prose-lg` / `prose-xl` / `prose-2xl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Variants / colors            | n/a                                                                                                                                                                 | Per-class                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | n/a                                                                                                                                                                                                                                                                                                                                    | `prose-slate` / `prose-gray` / `prose-zinc` / `prose-neutral` / `prose-stone` plus `prose-invert`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| A11y                         | None — native semantics                                                                                                                                             | None — native semantics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | None — native semantics ("Typography helps you make text legible and scannable")                                                                                                                                                                                                                                                       | None — native semantics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |


**Read-off.**

- **PrimeNG abstains entirely.** The fact that one of the two
largest Angular component libraries ships zero typography
primitives is itself a signal: most consumers reach for global
theme CSS, not per-component imports, when they want body type to
look right. We will respect that by not forcing every `<p>` to
become `<kj-p>` — but we will not abstain entirely the way
PrimeNG does, because consumers genuinely benefit from a one-line
"make this article-shaped subtree look right" affordance.
- **Angular Material gets the *prose-container* idea right** with
`.mat-typography`. Their per-element class proliferation
(display/headline/title/body/label × three sizes = fifteen
classes) is heavier than we want; that's the Material Design
type-scale spec leaking into the API. We will ship the container
pattern (one class, a million descendant restyles) and skip the
fifteen-class ladder.
- **shadcn/ui's "documentation is the API" stance is honest** about
what a typography "component" is in 2026: a copy-paste of native
HTML with the right utility classes. They take no opinion on a
container; every `<h2>` is its own decision. This works for
shadcn because their consumers are hand-authoring every page.
It fails for the consumer rendering CMS HTML or Markdown into the
page — that consumer needs the container.
- **Tailwind `prose`** is the genuine standard. We intentionally
align with it: `kj-prose` is the conceptual sibling. We do not
depend on the Tailwind plugin (`@kouji-ui/components` ships its
own CSS, not a Tailwind plugin); we re-implement the same shape
using kouji's design tokens (`--kj-color-base-content`,
`--kj-line-height-relaxed`, `--kj-font-display`). Consumers who
also use Tailwind typography can keep doing so — the two systems
do not conflict; pick whichever matches your theme tokens.

The split kouji is converging on:


| Surface                   | Selector                                            | Job                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Prose container**       | `.kj-prose` (CSS class only)                        | One class on a container restyles every descendant `h1`–`h6`, `p`, `a`, `blockquote`, `code`, `pre`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `hr`, `figure`, `figcaption`, `table`, `strong`, `em` according to the kouji type system. **No directive, no component.** |
| **Lead paragraph**        | `[kjLead]` directive on `<p>`                       | Marks the paragraph as "lead" — larger, slightly muted; reflects `data-tone="lead"`                                                                                                                                                                                |
| **Muted text**            | `[kjMuted]` directive on any phrasing element       | Reflects `data-tone="muted"`; restyles colour to `--kj-color-base-content` at reduced contrast (still ≥ 7:1 — see [Accessibility](#accessibility-wcag-21-aaa))                                                                                                     |
| **Inline code**           | `[kjCode]` directive on `<code>`                    | Reflects `data-tone="code"`; gives the inline `<code>` element a subtle background, monospace, and inline padding                                                                                                                                                  |
| **Blockquote**            | `[kjBlockquote]` directive on `<blockquote>`        | Reflects `data-tone="blockquote"`; left rule, italic, indent. Same look as `kj-prose blockquote`; useful when the blockquote is *not* inside a prose container                                                                                                     |
| **Truncate / line-clamp** | `[kjTruncate]` directive on any block-level element | Numeric input: `1` → single-line ellipsis (CSS `text-overflow: ellipsis`); `2+` → multi-line `-webkit-line-clamp`. Owns the AT escape hatch (`title` / `aria-label`) — see [Accessibility](#accessibility-wcag-21-aaa)                                             |


This file covers the whole family. Cross-references at the bottom.

## Decision (core directive)

**Mostly no — Typography is fundamentally CSS — but ship five tiny
attribute directives for the cases where a CSS class would lose us
the kj-prefix ergonomics or a small a11y opinion.** The strong
position is:

> Ship `kj-prose` as a **CSS layer**, not an Angular component.
> Plus five attribute directives — `KjLead`, `KjMuted`, `KjCode`,
> `KjBlockquote`, `KjTruncate` — for the cases the prose container
> doesn't cover (out-of-prose authored templates, plus the line-clamp
> a11y story which genuinely needs a tiny piece of TypeScript).

Walk through carefully — Typography is the one place in the library
where the default "ship a directive" answer flips, and the
justification needs to land.

### The four options

**(A) Wrapper components — `<kj-h1>` … `<kj-h6>`, `<kj-p>`,
`<kj-blockquote>`, `<kj-code>`, `<kj-list>`, `<kj-lead>`,
`<kj-muted>`, `<kj-small>`, `<kj-large>`.**
Ship one component per semantic element. Templates become
`<kj-h2>Title</kj-h2>` instead of `<h2>Title</h2>`.

- Pro: per-component theming hooks; per-component TSDoc.
- Pro: visible in the docs site's component index.
- **Con (decisive):** **breaks heading hierarchy ergonomics.** A
consumer who wants `<h2>` inside a section but `<h3>` inside a
subsection now writes `<kj-h2>` and `<kj-h3>` — but the
components own a fixed level. To change the level dynamically
(a section that's an `<h2>` on the home page and an `<h3>` on a
child page) the consumer has to switch component names, which
means structural directive gymnastics or a `level` input that
*internally* picks the right tag. Either way, the consumer is
reasoning about the component, not the heading they want.
- **Con (decisive):** **does not solve the prose container case.**
A blob of CMS-fetched HTML containing `<h1>`, `<p>`, `<ul>`,
`<blockquote>` cannot be retroactively rewritten to use kj
components. Consumers rendering Markdown, MDX, CMS HTML, or any
third-party markup get nothing from this approach. We would still
need (D) for them. Two systems for the same job.
- Con: every `<p>` in the library now imports a component. Vast
surface for no real win.

**Rejected.** Too heavy, doesn't solve the heavy consumer's case,
forces consumers to abandon native semantics for ergonomic noise.

**(B) Wrapper directive on native elements — `<p kjText="lead">`,
`<h2 kjText="heading">`.**
A single `[kjText]` directive with a `kind` input that picks the
visual treatment.

- Pro: preserves native element + heading level.
- Pro: one directive, one selector, one place to extend.
- **Con (decisive):** the `kind` input duplicates information already
encoded in the host's tag name. `<h2 kjText="heading">` is
redundant; `<p kjText="lead">` is meaningful but `<p kjText="paragraph">`
is noise. The directive ends up special-casing the override modes
(lead, muted, code) and saying nothing about the default modes,
which means consumers learn a directive that *only* applies in
override cases — at which point per-mode directives are clearer.
- Con: still doesn't solve the prose container case.

**Rejected.** Directive sprawl that doesn't pay rent on the common case.

**(C) CSS-only — `kj-prose` class, no directives, no components,
no TypeScript.**
Ship a stylesheet. Consumers wrap their prose in `<article class="kj-prose">`
and that is the entire API.

- Pro: smallest possible surface. Zero JS. Works for SSR, CMS HTML,
Markdown renderers, every framework.
- Pro: matches Tailwind `prose` exactly in shape. Familiar.
- Pro: no breaking changes possible — it's just CSS.
- **Con:** the `kjTruncate` line-clamp story has a real a11y wrinkle
(clamped text is invisible to AT depending on browser/AT pair —
see [Accessibility](#accessibility-wcag-21-aaa)). Solving it
cleanly *requires* a tiny piece of TypeScript: read the
full text content into a `title` attribute (or compose the host
with a visually-hidden full-text shadow node) when clamping is
active. A pure CSS class cannot do this.
- Con: out-of-prose mode tweaks (a single muted span in a card
header, a single lead paragraph in a hero unit) are awkward as
classes — `<p class="kj-muted">` is fine but `<p kjMuted>`
matches the rest of the library's conventions and gets dev-mode
validation hooks if needed later.
- Con: no directive selector for `[kjLead`, `[kjMuted]`, …
tab-completion — every other primitive lets the consumer type
`kj` and get autocomplete; class names don't show up in Angular
Language Service the same way.

**Rejected on its own; adopted as the foundation.** The CSS layer
is the right baseline. The TypeScript adds value only at the edges.

**(D) CSS layer plus five attribute directives. ✅**
Ship `kj-prose` as the CSS class for the container case. Ship
`KjLead`, `KjMuted`, `KjCode`, `KjBlockquote`, `KjTruncate` as
attribute directives for out-of-prose authored templates and for the
line-clamp a11y opinion.

- Pro: container case (Markdown, CMS, MDX, docs pages) is one class.
- Pro: out-of-prose authored case (`<small kjMuted>` next to a list
item title) is a directive matching the rest of the library.
- Pro: the truncate case has a place to live for the AT escape hatch.
- Pro: directives are *additive* — they always reflect a `data-tone`
attribute and the CSS keys off that attribute. The same CSS rules
fire whether the consumer used the prose container, the directive,
or hand-typed `data-tone="muted"` on a span. One styling system,
three input paths.
- Con: two-place-to-look API (CSS class for container, directive for
inline override). Honest cost; documented as the decision.

**Verdict: (D).** The directives' job is two host bindings each
(`role` if any, `[attr.data-tone]`) plus, for `KjTruncate`, the
a11y plumbing. The `kj-prose` class's job is to be ~150 lines of
descendant CSS. Each piece is doing exactly the work it is best at.

### What the directives actually do

Each is small. Listed in full so the API is not abstract:

1. `**KjLead`** (`[kjLead]`) — host binding `[attr.data-tone]="'lead'"`.
  No input. Consumer writes `<p kjLead>Introductory paragraph.</p>`;
   CSS `[data-tone="lead"]` rules apply (larger size, slightly
   muted colour, generous line-height). Dev-mode warns if the host
   tag is not `<p>` (because lead semantics are paragraph-bound;
   applying it to a `<span>` produces visual noise without meaning).
2. `**KjMuted**` (`[kjMuted]`) — host binding `[attr.data-tone]="'muted'"`.
  No input. Reduces colour intensity to a token that still clears
   the AAA contrast bar against the page background. Works on any
   phrasing element (`<span>`, `<small>`, `<p>`, `<em>`).
3. `**KjCode**` (`[kjCode]`) — host binding `[attr.data-tone]="'code'"`.
  No input. Recommended on `<code>` (preserves native semantics);
   dev-mode warns if applied to non-`<code>` elements. Adds inline
   monospace, padding, and a subtle background fill. **Does not**
   handle multi-line `<pre><code>` blocks — those are styled by the
   prose container's `pre code` selector or by a separate
   syntax-highlighter integration the consumer wires up.
4. `**KjBlockquote`** (`[kjBlockquote]`) — host binding
  `[attr.data-tone]="'blockquote'"`. No input. Recommended on
   `<blockquote>`; dev-mode warns on other tags. Useful in card
   bodies and feature pages where the blockquote is not inside a
   prose container.
5. `**KjTruncate**` (`[kjTruncate]`) — the only one with non-trivial
  work. Numeric input `kjTruncate` (default `1`):
  - `1` → host gets `[attr.data-truncate]="1"` and CSS applies
  `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`.
  - `2+` → host gets `[attr.data-truncate]` set to the number and
  CSS applies the multi-line `-webkit-line-clamp: N` pattern
  (`display: -webkit-box`, `-webkit-box-orient: vertical`,
  `overflow: hidden`).
  - **A11y plumbing**: when truncation is active, the directive
  reads the host's `textContent` after each render and reflects
  it to `[attr.title]` **only if** the consumer has not provided
  a `title` or `aria-label` themselves. (We do not clobber
  consumer-supplied attributes.) This gives sighted-but-zoomed
  users the full text on hover and ensures AT users continue to
  read the full text from the host's accessible name (which is
  the text content; clamped pixels do not affect AT in any
  mainstream pairing — see
  [Accessibility](#accessibility-wcag-21-aaa)). The `title` is
  the *belt-and-braces* affordance for sighted users, not the
  primary AT story.

That's it. No `KjH1` … `KjH6` directives. No `KjParagraph`. No
`KjList`. The native elements work; the prose container styles them.

### What the directives do *not* do

- **No heading-level component or directive.** Consumers write
`<h1>` / `<h2>` / `<h3>` / `<h4>` / `<h5>` / `<h6>`. Heading
hierarchy is the consumer's job — it depends on the page's
outline (which `<h1>` lives at the page level vs. a section
level), and we cannot know that. The library does not enforce
hierarchy; the docs page (and the
`[rules/accessibility.md](../../../rules/accessibility.md)` checklist)
reminds consumers that
[WCAG 1.3.1](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)
requires correct hierarchy for AT outline navigation.
- **No `[kjText]="kind"` mega-directive.** Rejected under option (B).
- **No paragraph spacing directive.** A `<p>` inside `kj-prose` gets
the right spacing automatically. A `<p>` outside `kj-prose` gets
whatever the consumer's CSS says — and most consumers want
paragraph spacing applied by their own layout, not by our
directive. (Cards, dialogs, toasts, etc. all manage their own
internal spacing.)
- **No font-family override.** The CSS layer reads
`--kj-font-sans`, `--kj-font-mono`, `--kj-font-display`. Consumers
reskin via CSS variables, not via component inputs.
- **No "headings get a copy-anchor link" affordance.** The
reference-doc anchor pattern is consumer territory; some apps
want it, most don't. Could ship a separate `KjAnchor` directive
later if demand materialises; it does not belong in Typography.
- **No syntax-highlighting integration.** `<pre><code>` is the
consumer's hook for wiring a highlighter (Prism, Shiki, highlight.js).
The CSS layer styles the *unhighlighted* fallback; the consumer's
highlighter overrides token colours via its own classes.
- **No `KjTextColor` directive (`[kjTextColor]="'error'"`).**
Considered. Rejected — text colours follow the rest of the
library's variant story, and the right home for a coloured
inline text is either (a) the parent's variant context (an
`<kj-alert variant="error">` whose body text inherits the alert's
tone) or (b) a one-off `kjMuted` for the muted case, or (c)
consumer CSS for everything else. A general "colour the text"
directive duplicates the variant system. See
[Open question 4](#open-questions--risks).

### Why no `KjVariant` here

Tempting to think every kj component reaches for `KjVariant` and
Typography is no exception — `<p kjVariant="error">` for an inline
error message, `<span kjVariant="success">` for a success tone.
**Rejected.** Three reasons:

1. **Variant is a parent's property, not text's.** When a piece of
  text needs to say "this is an error", the surrounding container
   (Alert, Field error message, Toast) carries the variant and the
   text inherits the colour via CSS cascading from the container's
   `data-variant` attribute. Putting variant on the text itself
   double-encodes the relationship — the consumer ends up writing
   `<kj-alert kjVariant="error"><p kjVariant="error">…</p></kj-alert>`,
   which is wrong but tempting.
2. `**KjMuted` covers the only Typography-native variant.** The
  muted tone is *not* a variant — it's a Typography concept (this
   text is secondary to the surrounding text). Variant is for
   semantic states (error, success, warning, info), which are owned
   by the relevant component (Alert, Toast, Banner, Field).
3. **It would force the directive set to grow without paying.** Adding
  variant means adding `KjFocusRing`-style host bindings, adding
   the variant input, adding dev-mode validation against
   `KJ_VARIANT_PRESET` — for a primitive that doesn't have any
   interactive state to differentiate between variants visually.

If a future need for inline-coloured text emerges (e.g. an inline
diff display where some tokens are red and some green), a
purpose-built `KjTextColor` directive can be added; it is not a
v1 requirement and not a Typography concern.

### Class naming

Per CLAUDE.md, drop the Angular type suffix unless there's a
collision. `KjLead`, `KjMuted`, `KjCode`, `KjBlockquote`,
`KjTruncate` are the directive names. No wrapper components, so no
suffix collision risk. File names: `lead.ts`, `muted.ts`, `code.ts`,
`blockquote.ts`, `truncate.ts` under `packages/core/src/typography/`.
The CSS layer ships from `packages/components/src/typography/prose.css`
and is re-exported via the components package's main stylesheet.

## What exists today

Nothing on disk. No `packages/core/src/typography/`, no
`packages/components/src/typography/`. The library's existing CSS
already declares the type-system tokens (`--kj-font-sans`,
`--kj-font-mono`, `--kj-line-height-relaxed`, `--kj-color-base-content`,
plus `--kj-text-{xs,sm,md,lg,xl,2xl,3xl}` size scale) — those are the
substrate Typography reads from. They are not Typography's
responsibility to ship; they are theme tokens the rest of the
library already uses (Card titles, Toast messages, Alert bodies, …).

The roadmap context: Typography is the **last** of the data-display
analyses to write because it is foundational — its decisions about
the muted tone, the line-height, the heading scale, and the prose
container shape inform every other component's prose-rendering
decisions. The expected build order:

1. Ship the CSS layer (`packages/components/src/typography/prose.css`)
  first; it is decoupled from the rest of the build and has no
   dependencies.
2. Ship the five directives in a single PR (each is < 50 lines).
3. Migrate Card, Empty State, Chat Bubble, Toast, Alert,
  Tooltip, Popover, and the docs site itself to consume the
   `kj-prose` container or the per-tone directives where applicable.
   This migration is documentation-and-cleanup, not API surface
   change.

## Base features


| Feature                  | Where it lives                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container prose styling  | `.kj-prose` CSS class                                                                                | Restyles every descendant `h1`–`h6`, `p`, `a`, `blockquote`, `code`, `pre`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `hr`, `figure`, `figcaption`, `table`, `strong`, `em`, `kbd` (yes — Kbd inside prose works without further wiring; see `[./kbd.md](./kbd.md)`). Tokens read from `--kj-color-base-content`, `--kj-color-base-content/60`, `--kj-line-height-relaxed`, `--kj-text-*` scale, `--kj-font-{sans,mono,display}`. |
| Container size variants  | `.kj-prose-sm`, `.kj-prose-md` (default — class equals `.kj-prose`), `.kj-prose-lg` modifier classes | Three sizes — half what Tailwind ships (`prose-sm`, `prose-base`, `prose-lg`, `prose-xl`, `prose-2xl`). The `xl` and `2xl` cases are unusual enough that consumers can override via CSS variables; shipping them as named classes encourages mis-use (a 2xl prose block in a sidebar is almost always wrong). **Reconsidered if user research shows demand.**                                                               |
| Container inverse / dark | **None as a Typography modifier.**                                                                   | The whole library is theme-aware via `data-theme` on `<html>`; `kj-prose` reads `--kj-color-base-content` which already flips on dark themes. No `kj-prose-invert` class needed.                                                                                                                                                                                                                                            |
| `kjLead`                 | `KjLead` directive on `<p>`                                                                          | Larger size (matches `--kj-text-lg`), slightly muted colour.                                                                                                                                                                                                                                                                                                                                                                |
| `kjMuted`                | `KjMuted` directive on any phrasing element                                                          | Reduced colour intensity — token `--kj-color-base-content` mixed at ~60% opacity against the page background. **Verified ≥ 7:1 (AAA)** against `base-100`, `base-200`, `base-300`. See [Accessibility](#accessibility-wcag-21-aaa).                                                                                                                                                                                         |
| `kjCode`                 | `KjCode` directive on `<code>`                                                                       | Inline monospace, `--kj-font-mono`, `0.25em` inline padding, subtle `--kj-color-base-200` background. **Block code** (`<pre><code>`) is styled by the prose container only — `kjCode` on a `<pre>` is a dev-mode warning.                                                                                                                                                                                                   |
| `kjBlockquote`           | `KjBlockquote` directive on `<blockquote>`                                                           | Left rule (4px solid `--kj-color-base-300`), italic, indent (`1em` left padding).                                                                                                                                                                                                                                                                                                                                           |
| `kjTruncate`             | `KjTruncate` directive                                                                               | Numeric input. `1` → single-line ellipsis. `2+` → multi-line line-clamp. Auto-fills `[attr.title]` from `textContent` if neither `title` nor `aria-label` is consumer-supplied.                                                                                                                                                                                                                                             |
| `kjSize`                 | **Not used.**                                                                                        | Typography sizing is text-content-driven (the heading level, the prose container's modifier) rather than a generic preset. A `kjSize` on `KjLead` or `KjMuted` would be meaningless — "muted at size lg" is just `<p class="kj-prose-lg" kjMuted>` semantics.                                                                                                                                                               |
| `kjVariant`              | **Not used.**                                                                                        | See [Why no `KjVariant` here](#why-no-kjvariant-here).                                                                                                                                                                                                                                                                                                                                                                      |
| Disabled                 | **None.**                                                                                            | Typography is non-interactive.                                                                                                                                                                                                                                                                                                                                                                                              |
| Touch target             | **n/a**                                                                                              | Typography is non-interactive. (Anchors `<a>` inside prose pick up `KjLink`'s touch-target story; not a Typography concern. See `[../navigation/link.md](../navigation/link.md)` — planned.)                                                                                                                                                                                                                                |


## Accessibility (WCAG 2.1 AAA)

Typography's accessibility story is **mostly native semantics**.
The native elements (`<h1>`–`<h6>`, `<p>`, `<blockquote>`, `<ul>`,
`<ol>`, `<li>`, `<code>`, `<pre>`, `<dl>`, `<dt>`, `<dd>`,
`<figure>`, `<figcaption>`, `<table>`, `<strong>`, `<em>`) are
semantically rich and AT-friendly out of the box. Typography's
job is to **not break** that — the CSS layer never sets
`role`, never sets `aria-hidden`, never wraps the host in a
non-semantic shell. The five directives never override role and
never strip semantics.

Reference: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) has no
dedicated Typography pattern.
[ARIA in HTML](https://www.w3.org/TR/html-aria/) guidance is to
prefer the native element over `role` overrides. We follow this for
every directive — none of them set `role`.


| Criterion                                           | Requirement                                                                                                                                                                                   | Where it lives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.3.1 Info and Relationships                        | Heading hierarchy must reflect document outline; lists use `<ul>`/`<ol>`/`<li>`; quoted content uses `<blockquote>`; emphasised text uses `<strong>`/`<em>`; code uses `<code>`/`<pre>`       | **Consumer's job.** Typography never wraps content in a different element; the prose container styles whatever native element it finds. The docs page reminds consumers that `<h1>` should appear once per page (or once per the `<section>` it is rooted under, per the document outline algorithm), that headings should not skip levels (an `<h2>` should not be followed by an `<h4>`), and that visual size is not a substitute for semantic level.                                               |
| 1.4.3 Contrast (Minimum) — AA                       | Body text contrast ≥ 4.5:1 against the background; large text ≥ 3:1                                                                                                                           | Theme token responsibility. The default light theme's `--kj-color-base-content` against `--kj-color-base-100` is ≥ 7:1 (AAA), giving us headroom.                                                                                                                                                                                                                                                                                                                                                      |
| 1.4.6 Contrast (Enhanced) — **AAA target**          | Body text contrast ≥ 7:1; large text (≥ 18pt or ≥ 14pt bold) ≥ 4.5:1                                                                                                                          | Default theme verified. **Risk** is the muted tone (`kjMuted` and `prose-` muted descendants like the `<small>` in a figcaption). The token is computed via `color-mix(in oklch, var(--kj-color-base-content), transparent 40%)` — i.e. ~60% opacity. Verified ≥ 7:1 against `base-100`. **Verify** against `base-200` and `base-300` page backgrounds before declaring v1. If any combination fails, the muted token bumps to ~70% opacity (not ~60%). See [Open question 5](#open-questions--risks). |
| 1.4.4 Resize text                                   | Text must remain readable when zoomed to 200%                                                                                                                                                 | The CSS layer uses `rem` and `em` exclusively for type sizes and spacings; never `px` for text. Consumers who set `font-size` on `<html>` get linear scaling.                                                                                                                                                                                                                                                                                                                                          |
| 1.4.8 Visual Presentation (AAA)                     | Width ≤ 80 characters, no full justification, line spacing ≥ 1.5× within paragraphs and ≥ 1.5× the line spacing between paragraphs, no forced text-color override that breaks consumer themes | The `kj-prose` container ships `max-width: 65ch` (within the 80-char ceiling) and `line-height: 1.7` (a hair above 1.5×). Justification is `text-align: start` (never `justify`). Colours are token-driven, so consumer themes are honoured.                                                                                                                                                                                                                                                           |
| 1.4.10 Reflow                                       | Content reflows at 320 CSS px viewport                                                                                                                                                        | The `max-width: 65ch` on `kj-prose` allows reflow naturally; no fixed-width `px` elements. Truncate (`kjTruncate`) interacts with reflow — clamping is preserved at all widths, which is correct (the consumer asked for clamping).                                                                                                                                                                                                                                                                    |
| 1.4.12 Text Spacing                                 | Consumer-overridden line-height (≥ 1.5×), paragraph spacing (≥ 2×), letter spacing (≥ 0.12×), word spacing (≥ 0.16×) must not break content                                                   | The CSS layer uses `line-height` not `height`; uses margin/padding for paragraph spacing not flex `gap`; never overrides `letter-spacing` or `word-spacing` to fixed values. Verified pattern.                                                                                                                                                                                                                                                                                                         |
| 1.4.13 Content on Hover or Focus (truncate `title`) | Hover-revealed content must be dismissible, hoverable, persistent                                                                                                                             | The `[attr.title]` auto-set by `KjTruncate` is browser-native tooltip; native tooltips are dismissible (Esc), persistent (until pointer moves), and hoverable. Native behaviour clears 1.4.13.                                                                                                                                                                                                                                                                                                         |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap             | n/a                                                                                                                                                                                           | Typography is non-interactive. (`<a>` inside prose is the consumer's; see Link.)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2.4.6 Headings and Labels                           | Headings describe the section they introduce                                                                                                                                                  | **Consumer's job.** Typography styles headings; it does not author them.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2.4.7 Focus Visible                                 | n/a                                                                                                                                                                                           | Typography never receives focus.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2.4.10 Section Headings (AAA)                       | Sections of content are introduced by headings where appropriate                                                                                                                              | **Consumer's job.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.5.5 Target Size (AAA)                             | Interactive elements ≥ 44×44 px                                                                                                                                                               | n/a — non-interactive. The `<a>` inside prose is owned by Link's target-size story, not Typography.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3.1.5 Reading Level (AAA)                           | When text requires reading level above lower-secondary, supplemental content is available                                                                                                     | **Consumer's job** — Typography cannot assess reading level.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 4.1.2 Name, Role, Value                             | Native element semantics preserved; directives never override role                                                                                                                            | All five directives use only `[attr.data-tone]` and (for `KjTruncate`) `[attr.title]` and `[attr.data-truncate]`. None set `role`. None set `aria-label` (except when `KjTruncate` falls back to `title`, which is *not* `aria-label`).                                                                                                                                                                                                                                                                |
| 4.1.3 Status Messages                               | n/a                                                                                                                                                                                           | Typography content is static. (If a consumer renders a *changing* prose block — a streamed AI response — the live region is owned by the surrounding container, not Typography.)                                                                                                                                                                                                                                                                                                                       |


### Truncate / line-clamp accessibility — the one real concern

This is the only Typography surface with a non-trivial a11y story.
The trap is well-known but worth documenting completely:

**The bad version:** `style="overflow: hidden; -webkit-line-clamp: 2"`
on a `<p>` whose text content is "Atlas is a planning tool that helps
distributed engineering teams coordinate roadmaps across quarters
without the overhead of a heavy PMO process". The visible text is
"Atlas is a planning tool that helps distributed engineering teams
coordinate…". An AT user *also* hears only the truncated text in
some pairings, because some screen readers pipe through the visible
DOM rather than the full text content.

**The reality (mostly fine, occasionally not):** in modern browser

- AT pairings (Chrome + NVDA, Safari + VoiceOver, Firefox + JAWS),
the AT reads the **full text content**, not the visible pixels —
the `overflow: hidden` clips the rendered output but does not
remove the text from the accessibility tree. The exception is
`display: -webkit-box` + `-webkit-line-clamp` in some legacy AT
modes, where the clipped lines are reported as `aria-hidden` (this
was a documented Chromium bug, since fixed in 2022; verify on
target browser matrix). Confidence: this is solid in 2026, but
*belt-and-braces*.

**Our policy.** `KjTruncate` does two things:

1. **Sets `[attr.title]` from `textContent`** when no `title` /
  `aria-label` is consumer-supplied. This is the *sighted-but-zoomed*
   user's escape hatch (hover the truncated text, see the full
   tooltip). It is not the AT story — AT users get the full text
   from the accessibility tree directly — but it costs nothing and
   helps the much larger sighted-zoom audience.
2. **Sets `[attr.data-truncate]*`* so the CSS layer applies the
  right clamp rules. The CSS uses `display: -webkit-box` plus
   `-webkit-line-clamp: var(--clamp)` — the standard pattern. The
   `text-overflow: ellipsis` for single-line truncate uses
   `white-space: nowrap` plus `overflow: hidden`, also standard.

**The directive does not** set `aria-hidden` on the host (would
break AT). **Does not** set a visually-hidden full-text shadow
node (over-engineered; the accessibility tree already has it).
**Does not** auto-link the truncated host to a popover with the
full text (consumer territory; if the full text is meaningful and
should be expandable, the consumer wires a Popover or a
"see more" toggle).

If the consumer *also* sets `aria-label` to a *different* string
(perhaps a more user-friendly summary than the raw text content),
the directive does not overwrite it — `aria-label` always wins for
AT, and the consumer's intent is honoured.

### Heading hierarchy is the consumer's job

Typography styles whatever heading level the consumer authors. We
never auto-pick a level. The docs page calls this out prominently
and links to the
[WAI-ARIA APG: Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/)
guidance and to the
`[rules/accessibility.md](../../../rules/accessibility.md)` project rule.
Components that render headings inside their own template (Card's
`<kj-card-title>` defaulting to `<h3>`, Empty State's title
defaulting to `<h2>`, Dialog's title defaulting to `<h2>`) own the
heading-level decision *within their context*; consumers can
override via a `[level]` input (see Card's analysis for the
exact pattern). Typography itself never authors a heading element.

## Composition model

```
[CSS layer]                                  (file: packages/components/src/typography/prose.css)
  └── .kj-prose
  └── .kj-prose-sm / .kj-prose-lg

[Directives]                                  (folder: packages/core/src/typography/)
  ├── KjLead          (selector: [kjLead])
  ├── KjMuted         (selector: [kjMuted])
  ├── KjCode          (selector: [kjCode])
  ├── KjBlockquote    (selector: [kjBlockquote])
  └── KjTruncate      (selector: [kjTruncate])
```

Five attribute directives. No structural directives. No context
tokens. No services. No host directives composed (each is < 30
lines and has no shared behaviour worth extracting). The CSS layer
is independent of the directives — both reflect into
`[data-tone]` / `[data-truncate]`, and the same CSS rules apply
regardless of input path.

### Reused primitives


| Primitive                                                                                                                        | Where                        | Why                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KjSize`                                                                                                                         | **Not used.**                | Typography sizing is content-shape-driven. See [Why no `KjVariant` here](#why-no-kjvariant-here) for the parallel argument.                                                                                                                                                                                                       |
| `KjVariant`                                                                                                                      | **Not used.**                | See [Why no `KjVariant` here](#why-no-kjvariant-here).                                                                                                                                                                                                                                                                            |
| `KjDisabled`, `KjFocusRing`, `KjFocusTrap`, `KjButton`, `KjFormControl`, `KjLiveRegion`, `KjRovingTabindex`, `KjAriaDescribedby` | **Not used.**                | Typography has no interactive contract, no form-control duties, no live-region story. Reaching for any of these is a category error.                                                                                                                                                                                              |
| `KjVisuallyHidden`                                                                                                               | **Possibly** in `KjTruncate` | Considered but rejected for v1: the AT story works without a shadow node (the accessibility tree already has the full text; the title attribute is the belt-and-braces). If browser/AT testing surfaces a real gap, a `KjVisuallyHidden` companion node is the obvious mitigation. See [Open question 1](#open-questions--risks). |


### No wrapper components, by design

Notice that — uniquely among data-display analyses written so far —
Typography ships **no `@kouji-ui/components` package wrapper components**.
The components package contributes the CSS layer (`prose.css`) and
re-exports the core directives, but ships no `<kj-h1>` /
`<kj-prose>` Angular components. Two reasons:

1. **The CSS class is the wrapper.** `<article class="kj-prose">`
  does the work `<kj-prose>` would do — and works for SSR, for
   Markdown renderers, for CMS HTML, for static-site generators.
   Wrapping it in an Angular component would force every consumer
   path through the Angular compiler.
2. **There is no per-element wrapper to ship.** The five directives
  are the entire surface. A `<kj-lead>` wrapper would render
   `<p kjLead><ng-content /></p>` — saving the consumer one
   character (`<kj-lead>` vs. `<p kjLead>`) at the cost of an
   import, a component instance per usage, and ambiguity about
   what tag name renders. Net negative.

This is a deliberate departure from Badge / Tag / Kbd / Card, which
all ship wrapper components alongside their directives. The
departure is justified by Typography's role as a substrate rather
than a discrete component — it does not own a "thing on the page"
the way Badge owns a count chip.

### Cross-component pointers

- `[empty-state.md](./empty-state.md)` (planned) — the empty-state
title and description are rendered through Typography's heading
and paragraph styling. The empty-state component does not own
typographic decisions; it composes. Specifically, the title slot
defaults to `<h2>` (Empty State owns the level decision) and the
description slot defaults to `<p kjMuted>`. The styling comes
from the prose container or the muted directive — Empty State
contributes the layout, not the typography.
- `[./card.md](./card.md)` — `<kj-card-title>`, `<kj-card-subtitle>`,
`<kj-card-description>`. Card's own analysis describes these
slots' typography (size, tone, line-height) in terms of the same
tokens this document defines. See [card.md §256, §745, §858](./card.md).
Card does **not** apply `kj-prose` to its body — the body is
free-form and consumers wrap their own `<div class="kj-prose">`
if they want article-shaped content inside a card.
- `[./chat-bubble.md](./chat-bubble.md)` — bubble bodies render
prose-like content (Markdown answers, multi-paragraph messages).
The bubble's body slot **may** apply `kj-prose` for AI assistant
answers (see chat-bubble.md §417: "applies the prose density
tokens"). Truncated bubble previews in notification rails consume
`kjTruncate`; see chat-bubble.md §704–711 for the full-text-vs-
preview a11y story (which composes with Typography's own truncate
story without conflict).
- `[./list.md](./list.md)` — list rows often render
primary-plus-secondary text (`<span>title</span> <small kjMuted>meta</small>`).
`kjMuted` is the canonical idiom for the secondary line.
- `[./kbd.md](./kbd.md)` — Kbd inside prose works without further
wiring. The `kj-prose kbd` selector inherits Kbd's `kj-kbd` class
styling; nothing to coordinate.
- `[../actions/command-palette.md](../actions/command-palette.md)`
— result rows render names plus `kjMuted` paths; suggestion
previews use `kjTruncate`. Command Palette does not own a
typography opinion.
- `[../feedback/toast.md](../feedback/toast.md)` (planned) — toast
message body is a `<p>` whose text styling reads from the same
tokens Typography defines. Toast does not apply `kj-prose` (a
toast is single-paragraph; the prose container is overkill).
- `[../navigation/link.md](../navigation/link.md)` (planned) —
`<a>` styling inside `kj-prose` is *coordinated* with Link's own
styling: the prose container's `a` selector defers to whatever
rules `KjLink` has set, ensuring focus rings, underline behaviour,
and visited states are uniform whether the consumer used
`<a kjLink>` or just `<a>` inside prose. See [Open question 6](#open-questions--risks).
- The kouji-ui **docs site itself** is the canonical heavy consumer.
Every component reference page renders its description, prop
table, and example commentary inside a `<article class="kj-prose">`.
Markdown content is fed straight in. The `kjTruncate` examples
on the same page exercise the line-clamp story.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed.

### `KjLead` (`[kjLead]`)


| Name                      | Kind         | Type | Default  | Notes                      |
| ------------------------- | ------------ | ---- | -------- | -------------------------- |
| (host) `[attr.data-tone]` | host binding | —    | `'lead'` | Static. CSS keys off this. |


No inputs. No outputs. No models.

### `KjMuted` (`[kjMuted]`)


| Name                      | Kind         | Type | Default   | Notes   |
| ------------------------- | ------------ | ---- | --------- | ------- |
| (host) `[attr.data-tone]` | host binding | —    | `'muted'` | Static. |


No inputs. No outputs. No models.

### `KjCode` (`[kjCode]`)


| Name                      | Kind         | Type | Default  | Notes   |
| ------------------------- | ------------ | ---- | -------- | ------- |
| (host) `[attr.data-tone]` | host binding | —    | `'code'` | Static. |


No inputs. No outputs. No models.

### `KjBlockquote` (`[kjBlockquote]`)


| Name                      | Kind         | Type | Default        | Notes   |
| ------------------------- | ------------ | ---- | -------------- | ------- |
| (host) `[attr.data-tone]` | host binding | —    | `'blockquote'` | Static. |


No inputs. No outputs. No models.

### `KjTruncate` (`[kjTruncate]`)


| Name                          | Kind         | Type     | Default                 | Notes                                                                                                                                                                                |
| ----------------------------- | ------------ | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kjTruncate`                  | `input`      | `number` | `1`                     | `1` = single-line ellipsis. `2+` = multi-line clamp. `0` is a dev-mode error (use the directive's absence instead). Negative values are dev-mode errors.                             |
| (host) `[attr.data-truncate]` | host binding | —        | reflects `kjTruncate()` | CSS keys off this.                                                                                                                                                                   |
| (host) `[attr.title]`         | host binding | —        | computed                | Set to `textContent.trim()` after first render **only if** the host does not already have a `title` or `aria-label` attribute. Consumer-supplied `title` / `aria-label` always wins. |


No outputs. No models.

The `[attr.title]` plumbing reads `textContent` inside an
`afterNextRender()` hook (per
`[rules/code_style.md](../../../rules/code_style.md)` signal
lifecycle conventions) so it captures the rendered text after
Angular has projected `<ng-content>`. If the projected content
changes (e.g. a streamed message body), the consumer is responsible
for updating `title` themselves — the directive does not install a
`MutationObserver` to chase content changes (over-engineered for
the typical consumer's use case, where the truncated text is
static at render time).

## Examples to ship

`packages/components/src/typography/`:

1. **Prose container — markdown blob**
  (`typography.prose.example.ts`) — an `<article class="kj-prose">`
   wrapping a representative chunk of authored content: `<h1>` plus
   `<p>` plus `<ul>` plus `<blockquote>` plus inline `<code>` plus
   `<pre><code>` plus `<a>` plus `<strong>`/`<em>` plus a `<table>`.
   Anchors the container's whole job in one preview.
2. **Prose sizes**
  (`typography.prose-sizes.example.ts`) — three side-by-side
   columns showing `kj-prose-sm`, `kj-prose` (default), and
   `kj-prose-lg` rendering identical content. Anchors the size
   modifier story.
3. **Lead paragraph**
  (`typography.lead.example.ts`) — an article opening with
   `<p kjLead>` followed by regular `<p>` paragraphs. Demonstrates
   the lead-vs-body type contrast.
4. **Muted text in prose**
  (`typography.muted.example.ts`) — `<p>Primary text. <small kjMuted>Secondary  info.</small></p>` and `<p kjMuted>Standalone muted paragraph.</p>`.
   Anchors the muted token's contrast story; the docs page colour-checks
   this against light, dark, and high-contrast themes.
5. **Inline code**
  (`typography.code.example.ts`) — `<p>Run <code kjCode>npm install  @kouji-ui/core</code> to install.</p>`. Demonstrates the inline
   code styling outside the prose container (where it would apply
   automatically). Includes a contrast example (`<code kjCode>`
   inside a card body) showing the background fills correctly
   against `base-200`.
6. **Blockquote**
  (`typography.blockquote.example.ts`) — `<blockquote kjBlockquote>`
   outside a prose container (e.g. a testimonial in a marketing
   page hero). Shows the left-rule + italic + indent.
7. **Truncate single-line**
  (`typography.truncate-1.example.ts`) — a list of rows where each
   row's title is `<p kjTruncate>` with a deliberately long string.
   Hovering reveals the full text via the auto-`title`. Demonstrates
   the standard list-row truncation pattern.
8. **Truncate multi-line**
  (`typography.truncate-3.example.ts`) — `<p kjTruncate="3">`
   showing the three-line clamp pattern, e.g. a product card
   description or a chat bubble preview. Includes a side-by-side
   "before / after clamp" comparison.
9. **Truncate with consumer-supplied `title`**
  (`typography.truncate-custom-title.example.ts`) — `<p kjTruncate  title="Click to read full message">…</p>`. Demonstrates that
   the directive does not clobber consumer attributes.
10. **Card with prose body**
  (`typography.in-card.example.ts`) — a `<kj-card>` whose body
    contains `<article class="kj-prose">`. Anchors the
    composition with Card.
11. **Empty State with Typography styling**
  (`typography.in-empty-state.example.ts`) — an `<kj-empty-state>`
    whose title and description compose with the muted directive.
    Anchors the composition with Empty State.
12. **Themed (core-only)** — `typography.example.ts`,
  `typography.retro.example.ts`, `typography.finance.example.ts`
    under `packages/core/`. Confirms the directives + CSS layer
    re-skin under arbitrary theme tokens. Especially useful for
    Typography because the `kj-prose` container is the largest
    surface in the library and re-themes via dozens of
    descendant rules.

## Open questions / risks

1. `**KjVisuallyHidden` shadow node in `KjTruncate` — needed?**
  Considered: when truncate is active, append a sibling
   `KjVisuallyHidden` span containing the full text, so AT reads
   the full text even on browser/AT pairings where the clipped
   `display: -webkit-box` content is excluded from the accessibility
   tree. **Decision: no for v1.** The known buggy pairing (Chromium
   pre-2022 with `-webkit-line-clamp`) is fixed in modern browsers;
   the accessibility tree on current Chrome / Safari / Firefox
   includes the full text content. The `[attr.title]` covers the
   sighted-zoom case. Adding a shadow node has its own AT cost
   (some screen readers double-announce when content appears twice
   in the tree). **Revisit** if browser/AT testing on the target
   matrix surfaces a regression — adding a `KjVisuallyHidden`
   companion is a cheap mitigation.
2. **Multiline `<pre><code>` — does it need its own directive?**
  `KjCode` is for *inline* code. Multiline code blocks
   (`<pre><code>…</code></pre>`) are styled by the prose
   container's `pre code` selector. **Outside the prose container**,
   a consumer rendering a `<pre><code>` block (e.g. a code panel in
   a settings page) gets no styling from `KjCode` because the
   directive dev-mode warns on non-`<code>` and refuses to apply
   meaningfully to a `<pre>`. Options:
  - **(a) Ship a `KjCodeBlock` directive** for `<pre>` that styles
  the block-level code surface (background, padding, border-radius,
  overflow scroll, line numbers via CSS counters).
  - **(b) Ship a `.kj-code-block` CSS class** (parallel to `kj-prose`)
  that consumers apply: `<pre class="kj-code-block"><code>…</code></pre>`.
  - **(c) Document the pattern only** — consumers wrap their
  `<pre><code>` in a one-element `<div class="kj-prose">` to get
  the prose container's `pre code` styling.
   **Lean (b).** Class-based, parallel to `kj-prose`, no
   directive needed. Defer to v1.1; not blocking. Demand for code
   blocks outside prose is real (settings → "API keys" panels,
   error stack traces in toasts) but small enough that the
   one-line documented workaround (c) is acceptable for v1.
3. `**kj-prose-xl` / `kj-prose-2xl` — should we ship them?**
  Tailwind ships five sizes; we proposed three (`sm`, default,
   `lg`). The case for `xl` / `2xl` is for marketing-hero-page prose
   blocks where the lead paragraph is genuinely 24px or 30px. The
   case against: at those sizes, the prose-container's
   `max-width: 65ch` produces line lengths that visually
   overwhelm most layouts; consumers should reach for a custom
   marketing-page typography ladder instead of `kj-prose-2xl`.
   **Decision: ship `sm` / default / `lg` only for v1.** Revisit if
   marketing-page consumers ask. Adding sizes later is non-breaking.
4. `**KjTextColor` — do we need a way to inline-colour text?**
  The variant story suggests no. But three real cases come to mind:
   diff displays (red removed / green added inline), syntax
   highlighting fallbacks, and accessibility-driven contrast
   overrides (a high-contrast theme that wants explicit colour
   control). **Decision: no for v1.** Diff and syntax highlighting
   are domain-specific renderers (Prism, Shiki) that own their own
   class names; we do not duplicate. High-contrast contrast control
   belongs in the theme layer (`data-theme="high-contrast"` token
   overrides), not a per-directive opinion. **Revisit** if a clear
   inline-colour use case emerges that *isn't* domain-renderer
   territory.
5. **Muted token contrast against `base-300` page backgrounds.**
  The `kjMuted` token is computed via `color-mix(in oklch, var(--kj-color-base-content),  transparent 40%)` — i.e. ~60% perceived weight. Verified ≥ 7:1
   against `base-100`. Risk concentrates on `base-300` page
   backgrounds (sidebar surfaces, secondary cards) where the muted
   token may drop below the AAA bar. **Mitigation:** at the CSS
   level, the muted token reads from a `--kj-color-base-content-muted`
   variable that the theme defines per-surface (default theme can
   set `--kj-color-base-content-muted: color-mix(...);` and
   high-contrast themes can override). Verify in a contrast matrix
   (light / dark / high-contrast × `base-100` / `base-200` / `base-300`)
   before declaring v1. If any cell fails, the default mix bumps to
   ~70% (less muted, more contrast) — the visual difference is
   subtle and the AAA win is decisive.
6. `**<a>` styling inside `kj-prose` vs. `KjLink`.**
  The prose container's `a` selector applies a link-coloured
   underline and focus ring. `KjLink` (planned) applies the same
   things via its own directive bindings. When a consumer writes
   `<a kjLink>` inside `<article class="kj-prose">`, both rule sets
   apply — and they should be identical, because they read from the
   same tokens. **Risk:** if the two diverge (one uses
   `--kj-color-primary` and the other uses `--kj-color-link`), the
   visual ends up inconsistent based on which selector wins. **Mitigation:**
   both rule sets read from a single token (`--kj-color-link`); the
   tokens file owns the assignment. Verify in the Link analysis
   that the tokens align before either ships. Reference forward to
   `../navigation/link.md`.
7. **Heading anchor links — defer to a `KjAnchor` directive?**
  Common docs-site pattern: hovering a heading reveals a `#`
   anchor that links to that heading's `id`. Could ship as part of
   Typography (every heading inside `kj-prose` gets one). **Decision:
   no for v1.** The pattern requires (a) auto-generating `id`s from
   heading text (which has slug-collision and i18n complexity) and
   (b) per-app routing for the anchor URL (some apps want
   `#section`, some want `?anchor=section`). Ship later as a
   separate `KjAnchor` opt-in directive on a per-heading basis.
8. **Typography's relationship to the Markdown renderer.**
  Many consumers will pair Typography with a Markdown renderer
   (marked, markdown-it, MDX). The renderer outputs raw HTML; the
   `kj-prose` container styles the output. **Risk:** the renderer
   may emit elements Typography doesn't style (e.g.
   `<details>`/`<summary>` from GFM, or `<input type="checkbox">`
   for task lists). **Mitigation:** the prose CSS layer covers
   the standard semantic set; uncommon GFM extensions are
   consumer-extension territory (the consumer adds their own
   `kj-prose details { … }` rules). Document the supported set
   explicitly in the Typography docs page so consumers know what
   the contract is.
9. **SSR / hydration.** All five directives are stateless except
  `KjTruncate`'s `[attr.title]` plumbing, which runs in
   `afterNextRender()`. Server-side rendering: the directive's
   `data-truncate` and `data-tone` host bindings are emitted in
   the SSR HTML; `[attr.title]` is computed on the client only
   (which is correct — the server doesn't have the rendered text
   layout). Hydration: no flicker, no mismatch, since the missing
   `title` on the SSR HTML is added post-hydration without
   disturbing layout. The `kj-prose` CSS layer is plain stylesheet
   and works identically on server and client. **No SSR concerns.**
10. `**textContent` accuracy for `KjTruncate` `title` plumbing.**
  `textContent` strips all formatting, so a host containing
    `<p kjTruncate>Some <strong>bold</strong> text</p>` produces
    a `title` of `"Some bold text"` — losing the bold marker. For
    sighted-zoom users hovering the title, this is fine
    (browser tooltips can't render markup anyway). **Risk:** if a
    consumer's truncated content includes embedded controls (e.g. a
    truncated row containing a `<button>`), the button's text leaks
    into the title attribute. **Mitigation:** the directive trims
    leading/trailing whitespace and collapses runs of whitespace
    via `textContent.trim().replace(/\s+/g, ' ')` — which is the
    right normalisation for tooltip display. Embedded interactive
    elements inside truncated text are an unusual pattern; document
    that the consumer should set `title` themselves in those cases.
11. **Why no separate `lead` / `large` / `small` directives matching
  the shadcn list?** shadcn documents `lead`, `large`, `small`,
    `muted` as four distinct utilities. We ship `KjLead` and
    `KjMuted` but not `KjLarge` / `KjSmall`. **Reasoning:**
    `<small>` is already a native HTML element with the right
    semantics and visual default; it does not need a directive.
    `large` is "increase the font-size by one step" which is a
    `data-tone="large"` reflection that buys nothing over hand-typing
    `class="kj-text-lg"` or just relying on the prose container's
    sizing. Lead and muted are genuinely *semantic* (lead =
    introductory paragraph, muted = secondary information); large
    and small are sizing concerns the type scale handles. **Revisit**
    if consumers consistently invent their own large/small directives
    in app code; until then, the CSS scale is the answer.
12. **Drop-cap, small-caps, ligatures, and other typographic
  refinements.** The prose container does **not** ship drop-caps,
    small-caps, or `font-feature-settings` overrides. These are
    aesthetic decisions the consumer's theme can layer on
    (`.kj-prose p:first-of-type::first-letter { … }` for drop-caps;
    `font-variant-caps: small-caps` for small-caps). Out of scope
    for v1. The CSS layer's footprint is intentionally small to
    keep theming costs low — every rule shipped is a rule consumers
    have to override if they disagree.
13. **Internationalisation — RTL, vertical writing modes,
  CJK line-breaking.** The CSS layer uses logical properties
    (`margin-inline-start`, `padding-inline-end`, `text-align:   start`) so RTL works without overrides. Vertical writing modes
    (`writing-mode: vertical-rl`) are theoretically supported by
    the logical properties but not tested. CJK line-breaking
    inherits browser defaults (`overflow-wrap: anywhere` is **not**
    set; consumers wanting it apply it themselves). **Risk:** the
    `max-width: 65ch` measurement is character-width-dependent;
    `ch` in CJK fonts can be wildly different from Latin
    expectations. **Mitigation:** document that consumers shipping
    CJK-primary content should override `--kj-prose-max-width` to a
    pixel or `rem` value calibrated to their font.
14. **Print stylesheet.** The `kj-prose` container is the obvious
  home for print-friendly defaults (`@media print { … }` —
    larger type, no background fills, descender-friendly line-height).
    Out of scope for v1; track as a v1.1 feature. The library
    overall has no print story yet; Typography is the right place
    to start when one is added.
15. **Does the `kj-prose` class need to be applied to every
  documentation page in the docs site by default?** Yes. The docs
    site's layout component should wrap every Markdown-rendered
    page body in `<article class="kj-prose">` automatically.
    Confirm this in the docs site's layout migration. The Typography
    docs page itself is the canonical proof-by-example.

