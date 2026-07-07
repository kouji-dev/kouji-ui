---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

feat(date-picker): date range presets

Add a keyboard-accessible **date range presets** primitive — a `role="listbox"`
of named quick-selects ("Today", "Last 7 days", "This month", "This quarter",
"Year to date", …) that resolve to an inclusive `{ start, end }` range.

- **core** — headless `KjDateRangePresets` (listbox coordinator, roving
  tabindex, two-way `kjValue`) + `KjDateRangePresetOption`, plus
  `defaultDateRangePresets(weekStartsOn?)`, `resolveDateRangePreset()`, and the
  `KjDateRange` / `KjDateRangePreset` types. Custom presets fully supported.
- **components** — themed `<kj-date-range-presets>` (`KjDateRangePresetsComponent`).

Designed to slot beside a future range calendar, but usable standalone against
any `signal<KjDateRange | null>`. WCAG 2.1 AAA: single tab stop, Arrow/Home/End
navigation, `aria-selected` on the chosen preset, 44px targets.
