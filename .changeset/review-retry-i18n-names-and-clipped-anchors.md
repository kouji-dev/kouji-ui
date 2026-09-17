---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review retry: every accessible name is translatable, an anchored panel hides when its trigger scrolls away, and the docs example theme stops shadowing the token contract

**Accessible names come from the i18n catalog (cust F-7).** `en.ts` called
itself "the source of truth for kouji-ui's visible / assistive-text strings"
while twenty-two of them were literals in templates, `host` blocks and input
defaults, where no registered catalog could reach them: a consumer who called
`provideKjTranslations({ fr: FR_CATALOG })` still heard "Next month", "Send
message", "Notifications", "Hue". All twenty-two now resolve through
`KjTranslateService`, with new `en` / `fr` keys for calendar, chat, colour
picker, command palette, data table, carousel, date picker, tree select, sheet
and the toast landmark. English output is byte-identical; what changed is that
a catalog can now change it.

Two of those were not merely untranslatable, they were dead. `<kj-color-picker>`
put `aria-label="Open color picker"` on its trigger, which
`KjColorPickerTrigger`'s own `[attr.aria-label]` host binding overwrote on the
first change detection — the string had never reached a screen reader. The
attribute is gone and the directive's name (now `colorPicker.trigger`, which
interpolates the current value) is the only one.

**Behaviour change worth noting:** `<kj-carousel-previous>` / `-next` /
`-pause` previously declared `aria-label` as an input defaulting to `"Previous
slide"` / `"Next slide"` / `"Pause carousel"`. The default is now `undefined`
and falls through to the catalog. Setting `aria-label` on the element still
wins, so only the *default* moved.

`pnpm check:aria-labels` (in CI) grew from two patterns to four — it now also
catches a literal in a `host` block, in a host *binding* expression, and as an
`aria-label` input default — and its debt list is empty.

**An anchored panel hides when its trigger scrolls out of a clipping ancestor
(overlay F-7).** A panel is portalled to the overlay container, so nothing
clips it: scroll the trigger out of an `overflow: hidden` container and the
panel kept painting at the trigger's last viewport position — a live, clickable
menu pointing at nothing. `anchoredTo()` now resolves the trigger's clipping
ancestors once per open (the `getComputedStyle` walk never repeats per frame)
and, while the trigger is entirely outside one of them, gives the panel
`visibility: hidden` + `pointer-events: none` and stops repositioning it. It is
not closed or unmounted — open state and focus belong to the overlay, and
scrolling back restores it exactly. Opt out with
`anchoredTo({ hideWhenDetached: false })`.

**One shared reduced-motion query (perf F-15).**
`KjOverlayController.runTransition` built a fresh
`matchMedia('(prefers-reduced-motion: reduce)')` on every open and every close.
`KjReducedMotion` gained `matchesNow()` — a live, non-reactive read over the
page's single `MediaQueryList` — and the controller uses it. The reactive
`prefersReducedMotion` signal is unchanged and still seeded in
`afterNextRender`, which is why the controller needs the imperative reader: an
overlay opened before the first render would otherwise see a stale `false`.

**`@kouji-ui/components` carousel is one component per file (arch F-12), and
`KjCarouselPauseComponent` is now `KjCarouselPause`** — a clean break, no alias.
`./carousel` is still one import path.

**The docs example theme is off the `--kj-` namespace (styles F-17).**
`packages/core/src/styles/docs-themes.css` declared twenty `--kj-*` properties,
four of which — `--kj-border`, `--kj-shadow-sm`, `--kj-shadow-md`,
`--kj-transition` — are real contract tokens with different meanings. Only
Angular's emulated encapsulation kept `:root { --kj-border: #333 }` out of the
document. They are `--docs-*` now, the file rides the pinned `kj.base` /
`kj.shared` layers instead of two layer names nothing pinned, and it is no
longer exempt from `pnpm lint:css` or from the themes spec. It ships in neither
package.
