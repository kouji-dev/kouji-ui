# Final Components Roadmap — kouji-ui

**Date:** 2026-05-06
**Status:** Final short list — derived from selections + consolidations in [`2026-05-06-target-components-list.md`](./2026-05-06-target-components-list.md)
**Worktree:** `kouji-target-components` (branch `target-components-list`)

## Status legend

`✓` ships today · `◐` in flight (per `2026-05-05-components-package-expansion-design.md`) · `☐` to build

## Consolidations applied (per user remarks)

| Component (kept)      | Absorbs                                                        |
|-----------------------|----------------------------------------------------------------|
| Button Group          | Toggle Button, Split Button                                    |
| Drawer                | Sheet                                                          |
| List                  | Tree                                                           |
| Table                 | Data Table, Tree Table (all built on a TanStack-based core)    |
| Menu                  | Megamenu, Panel Menu, Tiered Menu, Navigation Menu             |
| Menubar               | Navbar                                                         |
| Stepper               | Steps                                                          |
| Progress Bar          | Radial Progress                                                |

Dropped on top of those merges: Toggle Group / Select Button (duplicates Tabs / Toggle Button).

---

## 1. Actions — 11

| # | Component        | Status | Note |
|---|------------------|--------|------|
| 1 | Button           | ✓      |      |
| 2 | Button Group     | ☐      |      |
| 3 | Speed Dial / FAB | ☐      |      |
| 4 | Dialog           | ◐      |      |
| 5 | Alert Dialog     | ☐      | service-based, not a component |
| 6 | Confirm Popup    | ☐      | helper directive |
| 7 | Drawer           | ☐      |      |
| 8 | Bottom Sheet     | ☐      |      |
| 9 | Dropdown Menu    | ☐      |      |
| 10 | Context Menu    | ☐      |      |
| 11 | Command Palette | ☐      |      |

## 2. Data Input — 24

| # | Component                | Status |
|---|--------------------------|--------|
| 1 | Input                    | ✓      |
| 2 | Textarea                 | ☐      |
| 3 | Number Input             | ☐      |
| 4 | Password Input           | ☐      |
| 5 | Input Mask               | ☐      |
| 6 | Input OTP                | ☐      |
| 7 | Input Group              | ☐      |
| 8 | Field / Form Field       | ☐      |
| 9 | Form                     | ☐      |
| 10 | Checkbox                | ◐      |
| 11 | Radio                   | ◐      |
| 12 | Toggle / Switch         | ◐      |
| 13 | Select                  | ◐      |
| 14 | Multi Select            | ☐      |
| 15 | Combobox / Autocomplete | ☐      |
| 16 | Cascade Select          | ☐      |
| 17 | Tree Select             | ☐      |
| 18 | Slider / Range          | ☐      |
| 19 | File Input / Upload     | ☐      |
| 20 | Date Picker             | ☐      |
| 21 | Calendar                | ☐      |
| 22 | Time Picker             | ☐      |
| 23 | Color Picker            | ☐      |
| 24 | Editor / Rich Text      | ☐      |

## 3. Data Display — 15

| # | Component     | Status | Note |
|---|---------------|--------|------|
| 1 | Accordion     | ◐      |      |
| 2 | Avatar        | ◐      |      |
| 3 | Avatar Group  | ☐      |      |
| 4 | Badge         | ◐      |      |
| 5 | Overlay Badge | ☐      |      |
| 6 | Tag / Chip    | ☐      |      |
| 7 | Card          | ✓      |      |
| 8 | Carousel      | ☐      |      |
| 9 | Chart         | ☐      |      |
| 10 | Chat Bubble  | ☐      |      |
| 11 | Kbd          | ✓      |      |
| 12 | List         | ☐      | tree mode included |
| 13 | Empty State  | ☐      |      |
| 14 | Typography   | ☐      |      |
| 15 | Table        | ☐      | TanStack-based; data-table + tree-table modes included |

## 4. Feedback — 7

| # | Component      | Status | Note |
|---|----------------|--------|------|
| 1 | Toast          | ◐      |      |
| 2 | Alert / Banner | ☐      |      |
| 3 | Tooltip        | ☐      |      |
| 4 | Popover        | ☐      |      |
| 5 | Progress Bar   | ☐      | radial mode included |
| 6 | Spinner        | ☐      |      |
| 7 | Skeleton       | ☐      |      |

## 5. Navigation — 7

| # | Component  | Status | Note |
|---|------------|--------|------|
| 1 | Link       | ✓      |      |
| 2 | Menu       | ◐      | mega / panel / tiered / navigation modes included |
| 3 | Menubar    | ☐      | navbar mode included |
| 4 | Breadcrumb | ☐      |      |
| 5 | Pagination | ☐      |      |
| 6 | Stepper    | ☐      | display-only "steps" mode included |
| 7 | Tabs       | ◐      |      |

## 6. Layout — 1

| # | Component           | Status |
|---|---------------------|--------|
| 1 | Divider / Separator | ☐      |

## 7. Mockup — 0

Category dropped.

---

## Totals

| Category     | ✓     | ◐     | ☐     | Total  |
|--------------|-------|-------|-------|--------|
| Actions      | 1     | 1     | 9     | 11     |
| Data input   | 1     | 4     | 19    | 24     |
| Data display | 2     | 3     | 10    | 15     |
| Feedback     | 0     | 1     | 6     | 7      |
| Navigation   | 1     | 2     | 4     | 7      |
| Layout       | 0     | 0     | 1     | 1      |
| Mockup       | 0     | 0     | 0     | 0      |
| **Total**    | **5** | **11**| **49**| **65** |

> **49 new components to design and build** beyond what currently ships or is already in flight.
