# Component Analyses

Per-component architectural analysis for every component on the
[target roadmap](../superpowers/specs/2026-05-06-target-components-roadmap.md).
One markdown file per component, organised by daisyUI category.

**Scope:** 62 components — full roadmap (65) minus Table, Chart, Editor / Rich Text
(deferred per user direction; they have heavier external-dep stories).

**Each file answers:**

1. **Source comparison** — how PrimeNG / Angular Material / shadcn-ui shape the component
2. **Does it need a core directive?** — yes/no with reasoning (stateful behaviour, keyboard contracts, a11y semantics worth sharing)
3. **Base features** — variants, sizes, modes, slots, value/state model
4. **Accessibility** — WCAG 2.1 AAA: role, ARIA attrs, keyboard contract, focus management, touch target, where each piece lives (directive vs. wrapper)
5. **Composition model** — single directive vs. main + supportive directives, names, shared-state mechanism (context tokens, `hostDirectives`), reuse of existing kouji primitives (`KjFocusRing`, `KjVariant`, `KjSize`, `KjDisabled`, `KjFocusTrap`, `KjLiveRegion`, `KjRovingTabindex`, `KjAriaDescribedby`, `KjVisuallyHidden`)
6. **Inputs / Outputs / Models** — `kj`-prefixed signal-input names, types, defaults
7. **Examples to ship** — preview groups for the docs site
8. **Open questions / risks** — flagged for review

Cross-cutting decisions (e.g. shared trigger logic between Dropdown Menu and Context Menu, anchored-content behaviour shared by Tooltip and Popover) are flagged in each file's **Composition model** with a pointer to the related file.

## Index

| Category | Components |
|---|---|
| Actions | [Button](actions/button.md) · [Button Group](actions/button-group.md) · [Speed Dial / FAB](actions/speed-dial.md) · [Dialog](actions/dialog.md) · [Alert Dialog](actions/alert-dialog.md) · [Confirm Popup](actions/confirm-popup.md) · [Drawer](actions/drawer.md) · [Bottom Sheet](actions/bottom-sheet.md) · [Dropdown Menu](actions/dropdown-menu.md) · [Context Menu](actions/context-menu.md) · [Command Palette](actions/command-palette.md) |
| Data input | [Input](data-input/input.md) · [Textarea](data-input/textarea.md) · [Number Input](data-input/number-input.md) · [Password Input](data-input/password-input.md) · [Input Mask](data-input/input-mask.md) · [Input OTP](data-input/input-otp.md) · [Input Group](data-input/input-group.md) · [Field / Form Field](data-input/field.md) · [Form](data-input/form.md) · [Checkbox](data-input/checkbox.md) · [Radio](data-input/radio.md) · [Toggle / Switch](data-input/toggle.md) · [Select](data-input/select.md) · [Multi Select](data-input/multi-select.md) · [Combobox / Autocomplete](data-input/combobox.md) · [Cascade Select](data-input/cascade-select.md) · [Tree Select](data-input/tree-select.md) · [Slider / Range](data-input/slider.md) · [File Input / Upload](data-input/file-upload.md) · [Date Picker](data-input/date-picker.md) · [Calendar](data-input/calendar.md) · [Time Picker](data-input/time-picker.md) · [Color Picker](data-input/color-picker.md) |
| Data display | [Accordion](data-display/accordion.md) · [Avatar](data-display/avatar.md) · [Avatar Group](data-display/avatar-group.md) · [Badge](data-display/badge.md) · [Overlay Badge](data-display/overlay-badge.md) · [Tag / Chip](data-display/tag.md) · [Card](data-display/card.md) · [Carousel](data-display/carousel.md) · [Chat Bubble](data-display/chat-bubble.md) · [Kbd](data-display/kbd.md) · [List](data-display/list.md) · [Empty State](data-display/empty-state.md) · [Typography](data-display/typography.md) |
| Feedback | [Toast](feedback/toast.md) · [Alert / Banner](feedback/alert.md) · [Tooltip](feedback/tooltip.md) · [Popover](feedback/popover.md) · [Progress Bar](feedback/progress-bar.md) · [Spinner](feedback/spinner.md) · [Skeleton](feedback/skeleton.md) |
| Navigation | [Link](navigation/link.md) · [Menu](navigation/menu.md) · [Menubar](navigation/menubar.md) · [Breadcrumb](navigation/breadcrumb.md) · [Pagination](navigation/pagination.md) · [Stepper](navigation/stepper.md) · [Tabs](navigation/tabs.md) |
| Layout | [Divider / Separator](layout/divider.md) |

**Skipped (deferred):** Table, Chart, Editor / Rich Text.
