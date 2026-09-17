---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
'@kouji-ui/themes': minor
---

review batch 3: overlay close policy and lifecycle, machine-checked theme contrast and cascade layers, packaging without CDK

**Overlay engine (core).** `closeOnEsc` / `closeOnOutside` are honoured end to
end: `KjOverlayBuilder.create()` applies a role default (an `alertdialog`
answers to neither Escape nor the scrim; every other role closes on Escape and
lets the scrim's own `closeOnClick` decide), and `KjDialog.open()` forwards
`closeOnEsc` / `closeOnOutside` while `KjDrawerService` / `KjSheetService`
forward `closeOnOutside`. `KjOverlayStack` is the single owner of outside
dismissal (a press that begins on the overlay's trigger is never "outside").
Controllers dispose themselves with their host's `DestroyRef` and run the full
close chain synchronously; `KjOverlayTrigger` detaches the trigger-event
strategy it attached. `toggle()` during the close transition re-opens (unless
the close came from an outside press); `onFocus` / `onFocusOrInput` ignore the
focus restore that runs while closing. Overlay toasts register as `passive`
stack entries — Escape reaches the dialog beneath. `KjCloseReason` is now
`'escape' | 'outside' | 'backdrop' | 'trigger' | 'select' | 'tab' |
'programmatic'` (the old `'esc'` spelling is removed — use `'escape'`);
`KjDialogRef` /
`KjDrawerRef` / `KjSheetRef` expose `closeReason()`, and **`afterClosed$` /
`result` now settle on a dismissal by Escape or the scrim** (with `undefined`),
not only after `close()`. `kjMenuClosed` fires once per close with the mapped
reason. Declarative overlays render a real `<kj-backdrop>` when their scope
provides a backdrop strategy; `KjBackdrop` closes with reason `'backdrop'`.
`kjMount` / `kjSide` / `kjAlign` on `<kj-dropdown-menu-content>` are reactive;
`aria-haspopup="menu"` is rendered on dropdown triggers; `[kjDropdownMenu]`
owns `role="menu"`; the confirm popup is an `alertdialog` from first paint with
`aria-describedby` and `aria-modal="false"`. New: `KJ_OVERLAY_CONTAINER`,
`inheritOverlayScope()` (service-launched overlays inherit `data-theme` /
`data-density` / `dir` from the focused element or app root), `onHotkey({
target })` (and it ignores `defaultPrevented` keystrokes), `KjOverlayPanel`
reads its strategy tokens from its own element when bound to a foreign
controller (no more inherited scroll lock / scrim / role from an enclosing
dialog). `--kj-overlay-z-base` is read from the overlay container only while
`KJ_OVERLAY_Z_BASE` is at its default.

**Themes / styles.** New `@kouji-ui/themes/layers.css` export pins the layer
order `kj.reset, kj.base, kj.shared, kj.prose, kj.component, kj.tone,
kj.truncate`; every shipped stylesheet lives inside a layer (stylelint rules
`kouji/layered` + `kouji/known-tokens`, root script `lint:css`, run in CI).
Contrast is machine-asserted per theme (AA for class-A/C ink on the neutral
surfaces and on the `*-subtle` fills, 3:1 for `--kj-border-focus`, and the new
required token **`--kj-border-control`** — the idle boundary of every form
control, ≥ 3:1 on body/surface/field in all 15 themes; `--kj-border-default`
stays decorative). `orrery-light`, `sakura`, `nord`, `light` and `retro` ink /
ring nudges. Every theme declares `color-scheme`. Unthemed documents get the
light tokens (`:root:not([data-theme])`) and dark under
`prefers-color-scheme: dark`. One shared `prefers-reduced-motion` guard in
`base.css` zeroes every token-driven transition; sheets with literal durations
carry their own guard. Control heights ride the `--kj-ctl-h-*` density ladder
(select, date / datetime / time pickers, input-mask, number-input, password
input, calendar cells; compact now shrinks them). `--kj-space-2xs` (2px) and a
`--kj-line-height-*` ladder are declared; `--kj-color-icon-*` re-resolve per
theme root; `--kj-bg-overlay` backs every scrim; `.kj-card[data-shadow="lift"]`
draws `--kj-shadow-md`; `.kj-backdrop--blur` has a rule; `contain: layout` on
the fixed / portalled surfaces. `prose.css` keys on `[data-kj-tone]` /
`[data-kj-truncate]` and the typography directives now reflect those names
(the bare `data-tone` / `data-truncate` selectors are supported spellings, not a
deprecation window — a hand-typed attribute in consumer markup has no compiler
to migrate it, so both remain); `density.css` also matches `[data-kj-density]`. The dead
`.kj-dialog-overlay` rule is gone. Docs: pre-paint theme script, theme
generator emits the full required token set inside `@layer kj.shared`.

**Packaging (core + components).** `@angular/cdk` is no longer a peer of either
package (uninstall it). Angular `^22` peers. `@kouji-ui/core/styles.css` is
published (overlay + icon + prose + motion) and `@kouji-ui/components/src/*.css`
is exported, so both resolve by specifier from Vite / Analog / Node. `marked`
is configured on a private instance (a consumer's own `marked.parse()` no
longer inherits the chat's options). `@tanstack/virtual-core` and
`lucide-static` are optional peers loaded through `import()`:
`KjTableVirtual.virtualRows()` is typed `KjVirtualRow[]` and virtualization
attaches after a dynamic import (a missing peer is reported through
`ErrorHandler` while the seeded window keeps rendering); `provideLucideIcons({
Settings, Trash2 })` registers a tree-shaken subset, `provideLucideIcons()`
loads the whole set as one lazy chunk on the first miss (icons resolve one tick
later on the client; prerender waits). `provideIcons()` scopes per environment
injector (route-level sets layer over the root set). The example barrels no
longer export documentation-only components. Build scripts gate the public API
graph and the published exports map.
