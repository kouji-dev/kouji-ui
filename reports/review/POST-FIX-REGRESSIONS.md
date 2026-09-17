# Post-fix regressions — found and fixed after the round-2 fix run

Four regressions the round-2 batches introduced, all found by running the docs
app rather than by reading the diff. Each is fixed; this file records the
mechanism so the same reasoning is not repeated.

---

## R-1 Doc pages hang on "Loading…" — the prerender fallback was overridden

**Cause.** Batch 7 changed `fallback` on `docs/components/:slug` and
`docs/headless/:slug` from `PrerenderFallback.Server` to `.Client`, on the
grounds that a static deploy has no runtime server.

`fallback` governs paths that were **not** prerendered, and prerendering is a
build-time step — so under `ng serve` every request to those routes takes it.
With `Server` the dev server renders the page, which runs
`ServerDocsManifestProvider` and embeds the manifest in TransferState. With
`Client` it returns the bare CSR shell, TransferState is empty, and
`DocsService.loadManifest()` falls back to `GET /api/docs/manifest` — whose only
handler, `apps/docs/src/server.ts`, the same batch deleted as dead code. Two
changes from one batch compounded.

Measured: the route returned **2,533 bytes with no TransferState** before, and
**2.8 MB with TransferState and a rendered `<h1>`** after.

The finding was right about production and wrong that the setting was dead. A
build enumerates every slug (144 pages emitted), so the fallback is never
consulted there, and the static host resolves unknown paths itself.
`PrerenderFallback.Server` is also Angular's documented default when `fallback`
is omitted.

**Fixed:** restored on both routes, with a comment explaining what it governs.
**Guarded:** `apps/docs/e2e/docs-pages.spec.ts` — verified to fail (3/3) with
`Client` and pass (3/3) with `Server`.

---

## R-2 Every `@defer (hydrate on viewport)` block stayed a spinner forever

**Cause.** Batch 7 wrapped 15 blocks in `@defer (hydrate on viewport)`. Every
one contains a `kj-editor`, and none of them ever hydrated, so the component was
never constructed, its render hook never ran, no module was imported and no
request was made. `KjEditor.init()` swallows load failures by design, so nothing
appeared in the console.

Proof, same component on two pages: `/docs/components/editor` (not deferred) had
Monaco loaded and 18 CDN requests; `/docs/components/button` (deferred) had
`window.monaco === undefined`, 0 requests and a permanent spinner. Scrolling the
block into view did not help. Getting-started was 12 blocks, i.e. every code
sample on the page.

**Fixed:** the 15 wrappers removed (12 in getting-started, 2 in code-preview,
1 in component-doc). Incremental hydration is on by default with
`provideClientHydration()`, so why these triggers never fired is still open —
worth its own investigation before `hydrate on` is used again here.

---

## R-3 The navbar theme trigger lost its styling on most pages

**Cause.** Batch 7 replaced `<kj-button>` with a hand-written
`<button kjButton class="kj-button">` in the navbar and the theme toolbar, to
fix a real ARIA problem: `<kj-button>`'s host is `display: contents`, so
`kjDropdownMenuTrigger` on the wrapper put `aria-expanded` / `aria-haspopup` /
`aria-controls` on a box that paints nothing while role and name sat on the
inner button (WCAG 4.1.2).

But `.kj-button` CSS ships with the **component**, and Angular injects a
component's styles only when it is instantiated. The bare directive borrows the
class without instantiating anything, so the trigger was styled on pages that
happened to contain a `<kj-button>` and unstyled everywhere else. On
getting-started there were **zero**, and the trigger rendered as a grey
`display: block` browser default.

This is the same trap `components/src/overlay/overlay.css` documents for the
overlay family.

**Fixed:** both templates restored to `<kj-button>` (and their imports back to
`KjButtonComponent`). The trigger class is now passed with **`kjClass`**, the
input batch 4 added for exactly this, so it reaches the real `<button>` instead
of sitting inert on the collapsed host — which is what a bare `class` did before
the run, too.

**Then fixed properly, in the primitive.** Restoring `<kj-button>` brought the
styling back and re-broke the ARIA, so both were symptoms of one defect:
`KjOverlayTrigger` writes its ARIA to its own host, which for a
`display: contents` wrapper is not the real control. `display: contents` is used
by ~90 styled components, so every one of them has the same latent problem the
moment it hosts a trigger.

A wrapper can now nominate its real control through `KJ_TRIGGER_CONTROL`
(`packages/core/src/primitives/overlay/trigger-control.ts`). When one is
provided, the trigger's host bindings yield `null` and an effect writes
`aria-haspopup` / `aria-expanded` / `aria-controls` / `aria-describedby` /
`data-state` onto the nominated element instead, and binds events there too.
`KjButtonComponent` provides it from a view child of its inner `<button>`.

It is **opt-in**: with no provider the host bindings are byte-identical to
before, so only `<kj-button>` changes today and generalising later is a matter of
adding providers. The architecture is unchanged — core still owns behaviour and
ARIA, the component still owns styles, and the docs UI still uses `<kj-button>`
rather than the bare directive.

One bug caught in the process: moving `bindTrigger` into an effect deferred it
past `triggerStrategy.attach()`, so the tooltip's focus/hover strategies bound
their listeners to nothing and four tooltip specs went red. The bind is
synchronous again; the effect only re-binds when a nominated control appears.

---

## R-4 Read-only editors rendered as if focused

Monaco paints its current-line highlight and caret on line 1 of an unfocused
read-only instance, so a page of snippets read as a page of editors all sitting
on their first line. Nothing was actually focused (`document.activeElement` was
`<body>`; no instance had Monaco's `focused` class) — it only became visible once
R-2 was fixed and the editors rendered again.

**Fixed:** `KjEditor.resolveOptions()` now suppresses `renderLineHighlight`,
`occurrencesHighlight` and `selectionHighlight` when `kjReadonly()` is set.
`kjOptions` still overrides. Highlight elements per page went 24 → 12.

---

## Not a regression

`.kj-navbar-theme-trigger`'s raw pixel values were byte-identical to the
pre-run baseline; only the comment above them changed. They were tokenised
anyway (`--kj-ctl-h-sm`, `--kj-text-xs`, both exact matches, no visual change);
`padding-inline: 10px` sits between two spacing tokens and was left as a
documented literal.


---

## Quarantined e2e specs — pre-existing app bugs, tracked not deleted

CI has not executed a test since 2026-05-07 (arch F-1). The component doc page
was rebuilt into four tabs on 2026-05-14, one week later, which moved every
example and every extracted API item behind a non-default tab — so a large part
of the e2e suite had been red for four months before this run started. Those
were re-pointed at the tabs (`apps/docs/e2e/_helpers.ts`).

Four are **not** stale locators. Each is `test.fixme` with its reason in-file, so
the suite is green and the bug stays visible; each starts passing again the
moment the app is fixed.

| Spec | Bug |
| --- | --- |
| `extractor-v2` icon page | `provideIcons`, `injectKjIconResolver` and `KJ_ICON_REGISTRY` all still carry `@doc-name icon`, but the page's api tab lists 4 items and none of them. The extractor stopped emitting the function / token / type-alias kinds for that page. |
| `input-group` addon | Asserts the addon's background equals the input's. The design has them differ (`--kj-input-bg` `#1f1f1f` vs `--kj-input-group-addon-bg` `#141414`); the fix run changed only their border colours. Needs a design decision, not a code fix. |
| `table` headless page | `/docs/headless/table` does not exist. PR #11 (`be6386db`, 2026-05-21) removed every `@doc*` tag from `packages/core/src/table/*`, so the route silently falls back to the components page. |
| `theme-generator` share URL | `#t=` links are dead both ways: `copyShareLink()` returns `location.href` with no hash and `encode()` has no production caller, and loading a valid `#t=` payload leaves the draft untouched. The navbar share button uses the same service. |

Two more app bugs were found and left alone, both pre-existing: the ai-chat
streaming demo no longer renders on the site (its canonical example is
suppressed by the playground, which mounts a static thread with no prompt
input), and `<kj-button>` drops its label for an `aria-hidden` spinner while
`kjLoading` is set, leaving the control with no accessible name (WCAG 4.1.2).
