---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 7 (naming + structure): renames are clean breaks, one directive per file, one diagnostics helper

**Every deprecated compatibility alias is gone. This release has breaking
renames with no alias layer** — the new name is the only name. Update imports;
nothing is kept "for one minor".

Classes and types, old → new:

| Removed | Use |
| --- | --- |
| `KjIconDirective` | `KjIcon` |
| `KjCardComponent`, `KjCardContentComponent`, `KjCardCoverComponent`, `KjCardFooterComponent`, `KjCardHeaderComponent`, `KjCardSubtitleComponent`, `KjCardTitleComponent` | `KjCard`, `KjCardContent`, `KjCardCover`, `KjCardFooter`, `KjCardHeader`, `KjCardSubtitle`, `KjCardTitle` |
| `KjEmptyStateComponent` + `Icon` / `Title` / `Description` / `Actions` siblings | `KjEmptyState`, `KjEmptyStateIcon`, `KjEmptyStateTitle`, `KjEmptyStateDescription`, `KjEmptyStateActions` |
| `KjPopoverComponent`, `KjTooltipComponent`, `KjToastWrapperComponent`, `KjOverflowPanelComponent`, `KjPaginationDefaultComponent`, `KjDatetimePickerComponent` | the same names without `Component` |
| `KjTableToolbarComponent`, `KjTablePaginationComponent`, `KjTableStatusBarComponent`, `KjTableSidePanelComponent`, `KjCellTemplateDirective` | `KjTableToolbar`, `KjTablePagination`, `KjTableStatusBar`, `KjTableSidePanel`, `KjCellTemplate` |
| `KjCascadeOptionComponent`, `KjCascadeSubPanelComponent`, `KjComboboxEmptyComponent`, `KjComboboxLoadingComponent`, `KjConfirmPopupActionsComponent`, `KjFormActionsComponent`, `KjFormSummaryComponent` | the same names without `Component` |
| `KjRovingTabindexItemDirective` | `KjRovingTabindexItem` |
| `KjRichTextExtensionDirective` (selector `[kjRichTextExtension]`) | `KjRichTextFeatureDirective` (selector `[kjRichTextFeature]` only) |
| `KjRichTextExtension`, `KjRichTextPlugin` (types) | `KjRichTextFeature` |
| `KJ_RICH_TEXT_EXTENSIONS` | `KJ_RICH_TEXT_FEATURES` |
| `KjDateRange` from the table date filter | `KjDateFilterRange` — it collided with the `date-range-presets` interface of the same name, and `@kouji-ui/components` only ever re-exported the latter |

Inputs, outputs and methods removed with no replacement alias:

- `KjRichTextEditor`: `kjExtensions`, `kjPlugins` → `kjFeatures`;
  `registerExtension()` → `registerFeature()`.
- `<kj-input>`: `kjSize` → `size`.
- `KjSelectTrigger` / `KjTreeSelectTrigger`: the `kjDisabled` read-alias →
  `disabled`. The `kjDisabled` **input** is unchanged; only the duplicate
  getter is gone.
- `KjMenubar`: `kjAutoDisclose` and `kjAutoDiscloseDelayMs`. Both were no-ops —
  the primitives-based menubar never implemented roll-over disclosure. Hover
  is opt-in per consumer via `pointerenter` on `[kjMenubarItem]`.

Internal, no API change: the dialog service class is declared `KjDialogService`
instead of being renamed by its barrel, so the published name and the
declaration finally agree.

**One directive per file.** `core/carousel` joins `color-picker`, `stepper` and
`alert`: the 939-line, nine-directive `carousel.ts` is now nine files plus a
`carousel.ts` aggregator, so `@kouji-ui/core` and the `./carousel` path are
unchanged. The remaining multi-declaration files are listed, with counts, in
`packages/core/src/architecture.spec.ts`, which fails when one grows.

**Diagnostics.** Everything routes through `kjDevWarn` / `kjDevAssert` /
`kjError` in `primitives/diagnostics`, which are `ngDevMode`-guarded, so the
branches *and their message strings* leave a production build. A child that is
used outside its parent now gets `[KjCarouselSlide] must be used inside
\`[kjCarousel]\`…` from the library rather than Angular's `NG0201: No provider
for InjectionToken KjCarousel`, which named neither end. The
`inject(KJ_CAROUSEL) as KjCarousel` casts are gone: `KjCarouselContext`,
`KjAccordionContext` and `KjTabsContext` carry the registration surface their
children actually use, published as `KjCarouselSlideRef`,
`KjCarouselViewportRef`, `KjCarouselAutoplayRef`, `KjAccordionTriggerRef` and
`KjTabRef`.

**Form controls.** `KjFormControl` is the library's only
`ControlValueAccessor`; a new `kouji/no-bespoke-value-accessor` lint rule
refuses a raw `NG_VALUE_ACCESSOR` provider or a hand-written accessor anywhere
outside `primitives/forms/`.

**Overlay refs.** `KjDialogRef` / `KjDrawerRef` / `KjSheetRef` share one
`KjOverlayRef<T, R>` base. Behaviour and public surface are unchanged.
