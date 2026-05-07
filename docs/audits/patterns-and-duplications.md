# Patterns & Duplications Audit

Goal: spot duplicated patterns across `@kouji-ui/core` directives and `@kouji-ui/components` wrappers. Extract shared primitives. **Preserve WCAG 2.1 AAA.**

## Categories

1. Overlay system (trigger contract + panel shell)
2. Listbox + active descendant navigation
3. Form control bridge (CVA)
4. Item registration
5. Keyboard chord / hotkey
6. Filter/search over list
7. ARIA labelling/describedby wiring
8. Live region announcements

---

## 2. Listbox + active descendant navigation

### Impacted

`select`, `multi-select`, `combobox`, `command-palette`, `tree-select`, `cascade-select`, `dropdown-menu`, `menu`.

### Feature comparison

| Component | ARIA root | Item role | Selection | Active-item | Keys | Item registration | Filter | Disabled | Groups/sep | Container | Open model | Trigger | Duplication notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **select** | `listbox` | `option` | single | `aria-activedescendant` | ↑↓ Home End Enter Space Esc + type-ahead | querySelector query | none | per-item | none | flat | modal/popover | `kjSelectTrigger` | Baseline listbox |
| **multi-select** | `listbox` (`aria-multiselectable`) | `option` | multi | `aria-activedescendant` | ↑↓ Home End Enter Space Esc | DI signal registry + `DestroyRef` | yes (`kjMultiSelectSearch`) | per-item | none | flat | modal/popover | `kjMultiSelectTrigger` | Adds search + select-all to select |
| **combobox** | `listbox` (input `combobox`) | `option` | single / free-text | `aria-activedescendant` | ↑↓ Home End Enter Esc Tab Alt+↓ | DI signal registry | yes (configurable fn) | per-item | none | flat | modal/popover | `kjComboboxInput` | Free-text commit + async filter |
| **command-palette** | `listbox` | `option` | single (action) | `aria-activedescendant` (id) | ↑↓ Home End Enter Esc | `registerItem` + `DestroyRef` | yes (pluggable) | per-item | groups + separators | flat | always-rendered | `kjCommandInput` | No popover; inline shell |
| **tree-select** | `tree` | `treeitem` | single / multi | roving tabindex | ↑↓ ←→ Home End Enter Space Esc + type-ahead | DOM `querySelectorAll` | none | per-item | none | nested tree | modal/popover | `kjTreeSelectTrigger` | Hierarchical, branch toggle |
| **cascade-select** | `tree` (horizontal) | `treeitem` | single (leaf) | per-level `aria-activedescendant` | ↑↓ ←→ Home End Esc Tab + type-ahead | DOM `querySelectorAll` | none | per-item | none | nested panels | modal/popover | reuses `kjSelectTrigger` | Composes select w/ hover sub-panels |
| **dropdown-menu** | `menu` | `menuitem` | none | roving tabindex | ↑↓ Home End Esc Tab + type-ahead | composed roving-tabindex host dir | none | per-item | structural | flat (portal) | modal/popover | `kjDropdownMenuTrigger` | Portal mount |
| **menu** | `menu` | `menuitem` | none | roving tabindex | ↑↓ Home End Esc + type-ahead | DOM `querySelectorAll` | none | per-item | none | flat | always-rendered | `kjMenuTrigger` | Inline simpler dropdown-menu |

### Two clusters by ARIA contract

| Cluster | Members | Active-item | Item role | Focus model |
|---|---|---|---|---|
| Listbox | select, multi-select, combobox, command-palette | `aria-activedescendant` | `option` | virtual (focus stays on input/trigger) |
| Menu/Tree | menu, dropdown-menu, tree-select, cascade-select | roving tabindex | `menuitem` / `treeitem` | real DOM focus moves |

### Shared vs divergent

| Aspect | Shared across all 8 | Divergent (keep separate) |
|---|---|---|
| Arrow-key navigation | ✅ | orientation (v / h / both) |
| Item enumeration | ✅ | flat / nested / tree |
| Disabled-skip | ✅ | — |
| Escape-closes | ✅ | always-rendered vs popover |
| Type-ahead | ✅ | — |
| Signal-based state | ✅ | — |
| ARIA root role | ❌ | `listbox` / `menu` / `tree` |
| Selection model | ❌ | none / single / multi / leaf-only |

### Primitives to extract

| Primitive | Kind | Shape | Replaces in | AAA preservation |
|---|---|---|---|---|
| `KjListNavigator` | hostDirective | config: orientation, wrap/clamp, type-ahead, mode (`activedescendant` \| `roving`) | all 8 | per-instance ARIA root + role left to consumer |
| `KjItemRegistry<T>` | provider service | signal-backed registry; DI + `DestroyRef` cleanup | all 8 | items stay in tree; IDs stable for `aria-activedescendant` |
| `KjFilterableList<T>` | provider service | pluggable filter fn → `visibleItems` signal | multi-select, combobox, command-palette | filtered items keep same role/labels; live count announceable |
| `KjSelectionModel<T, Mode>` | provider service | `toggle/clear/has`; `Mode = 'single' \| 'multi' \| 'leaf'` | select, multi-select, combobox, tree-select, cascade-select | `aria-selected` / `aria-checked` driven by model |
| `KjTypeAhead` | provider service | char buffer + match fn | all 8 | non-blocking; respects disabled |

### Composition decision: option **C** (status quo, deduped underneath)

| Layer | Count | Status |
|---|---|---|
| Components (`<kj-select>` etc.) | 8 | unchanged |
| Root directives (`KjSelect`, `KjMenu`, ...) | 8 | unchanged ARIA, internals refactor |
| Shared behaviour primitives (hostDirectives) | 2 new + 2 reused | new: `KjListNavigator`, `KjOverlayTrigger`. reused: `KjFormControl`, `KjDisabled` |
| Shared state services (providers) | 4 new | `KjItemRegistry<T>`, `KjSelectionModel<T,Mode>`, `KjFilterableList<T>`, `KjTypeAhead` |

**Why not collapse to one mega `<kj-select>`:** ARIA roles `listbox` / `menu` / `tree` / `combobox` have different screen-reader contracts. Branching role at runtime via input breaks AAA. AT users expect "menu, X items" vs "listbox, X of N selected" — not interchangeable.

**Why not 3 roots (one per ARIA cluster):** considered and rejected. Cleaner ARIA boundaries but worse DX and combobox sits awkwardly. Option C achieves same dedup at primitive layer with clearer per-component APIs.

**Wins:**
- AAA contracts locked per directive (no runtime role branching)
- Each component keeps discoverable name + clean API
- Dedup invisible to consumers
- Per-directive migration, low blast radius

### Per-directive composition

| Directive | hostDirectives | providers (services) |
|---|---|---|
| `KjSelect` | `KjFormControl`, `KjDisabled`, `KjOverlayTrigger`, `KjListNavigator{mode:'activedescendant',orient:'v'}` | `KjItemRegistry<Option>`, `KjSelectionModel<_,'single'>`, `KjTypeAhead` |
| `KjMultiSelect` | same as select | `KjItemRegistry`, `KjSelectionModel<_,'multi'>`, `KjFilterableList`, `KjTypeAhead` |
| `KjCombobox` | same as select | `KjItemRegistry`, `KjSelectionModel<_,'single'>`, `KjFilterableList{async:true}` |
| `KjCommandPalette` | `KjListNavigator{mode:'activedescendant',orient:'v'}` *(no overlay — inline)* | `KjItemRegistry`, `KjFilterableList`, `KjSelectionModel<_,'single'>` |
| `KjTreeSelect` | `KjFormControl`, `KjDisabled`, `KjOverlayTrigger`, `KjListNavigator{mode:'roving',orient:'both'}` | `KjItemRegistry<TreeNode>`, `KjSelectionModel<_,'single'\|'multi'>`, `KjTypeAhead` |
| `KjCascadeSelect` | `KjFormControl`, `KjDisabled`, `KjOverlayTrigger`, `KjListNavigator{mode:'activedescendant',orient:'both'}` | per-level `KjItemRegistry`, `KjSelectionModel<_,'leaf'>`, `KjTypeAhead` |
| `KjDropdownMenu` | `KjOverlayTrigger`, `KjListNavigator{mode:'roving',orient:'v'}` | `KjItemRegistry<MenuItem>`, `KjTypeAhead` |
| `KjMenu` | `KjListNavigator{mode:'roving',orient:'v'}` *(no overlay — inline)* | `KjItemRegistry<MenuItem>`, `KjTypeAhead` |

### hostDirective vs provider — when to use which

| Concern | hostDirective | provider service |
|---|---|---|
| Adds host attrs / listeners | ✅ (only way) | ❌ |
| Owns lifecycle (`afterRender`, `DestroyRef`) | ✅ | ✅ |
| Inputs/outputs forwardable to consumer | ✅ | ❌ |
| Multiple instances per directive | ❌ | ✅ |
| DOM cost | binds to host | zero |

Rule: touches DOM/keys/ARIA → directive. Holds reactive state only → service.

---

## 1. Overlay system

### Impacted

`tooltip`, `popover`, `dialog`, `alert-dialog`, `drawer`, `bottom-sheet`, `toast`, `dropdown-menu`, `context-menu`, `menu`, `select`, `multi-select`, `combobox`, `tree-select`, `cascade-select`, `command-palette`, `date-picker`, `color-picker`. (time-picker excluded — no overlay)

### Feature comparison

| Component | Panel kind | Panel ARIA role | Trigger | Modal | Backdrop | Portal | Position | Open model | Trigger dir | Panel dir | Focus return | Esc | Outside-click | aria-expanded/controls |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **tooltip** | tooltip | `tooltip` | hover/focus | ❌ | ❌ | body | anchored | 2-way `kjOpen` | `KjTooltipTrigger` | `KjTooltipContent` | ✅ | ✅ | ❌ | aria-describedby |
| **popover** | popover | `dialog` | click/hover | optional | optional | body | anchored | 2-way `kjOpen` | `KjPopoverTrigger` | `KjPopoverContent` | ✅ | ✅ | ✅ | ✅ |
| **dialog** | modal | `dialog` | click | ✅ | ✅ | body | centered | imperative `open()` | `KjDialogTrigger` | `KjDialog` | ✅ | ✅ | ✅ | ✅ |
| **alert-dialog** | modal | `alertdialog` | click | ✅ | ✅ | body | centered | imperative | `KjAlertDialogTrigger` | `KjAlertDialog` | ✅ | ❌ | ❌ | ✅ |
| **drawer** | sheet | `dialog` | click | ✅ | optional | body | edge | imperative | `KjDrawerTrigger` | `KjDrawerContent` | ✅ | ✅ | ✅ | ✅ |
| **bottom-sheet** | sheet (drag) | `dialog` | click | ✅ | ✅ | body | bottom edge | imperative | `KjBottomSheetTrigger` | `KjBottomSheetContent` | ✅ | ✅ | ✅ | ✅ |
| **toast** | notification | `status` / `alert` | programmatic | ❌ | ❌ | body | viewport corner | service signal | — | `KjToast` | ❌ | ✅ | ❌ | aria-live |
| **dropdown-menu** | menu | `menu` | click/hover | ❌ | ❌ | body | anchored | signal | `KjDropdownMenuTrigger` | `KjDropdownMenu` | ✅ | ✅ | ✅ | ✅ |
| **context-menu** | menu | `menu` | right-click / Shift+F10 | ❌ | ❌ | body | point-anchored | signal | `KjContextMenuTrigger` | reuses dropdown | ✅ | ✅ | ✅ | n/a |
| **menu** (inline) | menu | `menu` | click | ❌ | ❌ | in-place | sibling | signal | `KjMenuTrigger` | `KjMenuContent` | ❌ | ✅ | ✅ | aria-expanded |
| **select** | listbox | `listbox` | click | ❌ | ❌ | in-place | sibling | signal | `KjSelectTrigger` | `KjSelectContent` | ❌ | ✅ | ✅ | n/a |
| **multi-select** | listbox | `listbox` | click | ❌ | ❌ | in-place | sibling | signal | `KjMultiSelectTrigger` | `KjMultiSelectListbox` | ❌ | ✅ | ✅ | ✅ |
| **combobox** | listbox | `listbox` | focus/input | ❌ | ❌ | in-place | below input | signal | `KjComboboxInput` | `KjComboboxListbox` | ❌ | ✅ | ✅ | ✅ |
| **tree-select** | tree | `tree` | click | ❌ | ❌ | in-place | sibling | signal | `KjTreeSelectTrigger` | `KjTreeSelectPanel` | ❌ | ✅ | ✅ | ✅ |
| **cascade-select** | nested listbox | `listbox` | click | ❌ | ❌ | in-place | sibling | inherited | reuses select | `KjCascadeSelectPanel` | ❌ | ✅ | ✅ | inherited |
| **command-palette** | listbox / dialog | `dialog` (modal) | hotkey/programmatic | optional | optional | body (modal) | centered | 2-way `kjOpen` | `KjCommandInput` | `KjCommandPalette` | ✅ | ✅ | ✅ | inherited |
| **date-picker** | calendar | `dialog` | focus/click | ❌ | ❌ | in-place | below input | 2-way `kjOpen` | `KjDatePickerTrigger` | `KjDatePickerCalendar` | ❌ | ✅ | ✅ | n/a |
| **color-picker** | color panel | none / form-ctrl | click | ❌ | ❌ | in-place | sibling | signal | `KjColorPickerTrigger` | `KjColorPickerPanel` | ❌ | ✅ | ✅ | n/a |

### Three clusters by behaviour contract

| Cluster | Members | Modality | Portal | Position | Focus model |
|---|---|---|---|---|---|
| **Tooltip** (informational) | tooltip | non-modal | body | anchored | no focus inside; describedby |
| **Popup** (anchored, focusable) | popover, dropdown-menu, context-menu, menu, select, multi-select, combobox, tree-select, cascade-select, date-picker, color-picker | non-modal | body or in-place | anchored / sibling | virtual or roving inside panel |
| **Modal** (immersive) | dialog, alert-dialog, drawer, bottom-sheet, command-palette (modal mode) | modal | body | centered / edge | focus-trap inside panel |

Toast = its own thing (fire-and-forget, programmatic, no trigger).

### Shared vs divergent

| Aspect | Shared across all overlays | Divergent (keep separate) |
|---|---|---|
| Open/close state signal | ✅ | imperative vs 2-way `kjOpen` |
| Esc closes (when focus inside) | ✅ (alert-dialog opts out) | — |
| `aria-controls` linking trigger ↔ panel | ✅ | role on `aria-haspopup` (`menu`/`listbox`/`dialog`/`tree`) |
| Focus return on close | ✅ for stateful panels | toast/inline-listbox skip |
| Outside-click closes | ✅ for non-modal | alert-dialog opts out |
| Portal mounting | ❌ | body vs in-place |
| Backdrop | ❌ | modal-only |
| Focus trap | ❌ | modal-only |
| Scroll lock | ❌ | modal-only |
| Positioning | ❌ | anchored / centered / edge / corner / sibling |
| ARIA panel role | ❌ | `tooltip`/`dialog`/`alertdialog`/`menu`/`listbox`/`tree`/`status` |

### Primitives to extract

| Primitive | Kind | Shape | Replaces in | AAA preservation |
|---|---|---|---|---|
| `KjOverlayTrigger` | hostDirective | `aria-expanded`, `aria-controls`, `aria-haspopup`; click/hover/focus open; focus return; 2-way `kjOpen` | every trigger directive (15+) | role on `aria-haspopup` left as input |
| `KjOverlayPanel` | hostDirective | id for `aria-controls`; Esc-to-close; outside-click; `data-state="open\|closed"` | every panel directive | role left to consumer |
| `KjFloatingPosition` | provider service | wraps Floating UI; anchored / point / edge / centered; auto-flip; collision | popover, dropdown-menu, tooltip, context-menu, combobox, date-picker | screen-reader unaffected |
| `KjPortal` | provider service | body mount + cleanup; preserves DI context | popover, dialog, drawer, bottom-sheet, dropdown-menu, tooltip, toast, command-palette | mounted node retains ARIA + injection tree |
| `KjFocusTrap` | hostDirective | Tab-cycle; first-focusable on open; restore on close | dialog, alert-dialog, drawer, bottom-sheet, command-palette (modal) | mandatory for modals |
| `KjScrollLock` | provider service | body overflow lock; ref-counted across stacked modals | dialog, alert-dialog, drawer, bottom-sheet, command-palette (modal) | prevents scroll-trap loss on AT |
| `KjOverlayStack` | provider service | global stack; Esc closes top-most; click-through guard | all stateful overlays | correct stacking order for AT |
| `KjBackdrop` | hostDirective | `inert` background siblings; click-to-close opt-in | dialog, alert-dialog, drawer, bottom-sheet | AT skips background |
| `KjLiveAnnouncer` | provider service | polite/assertive region | toast, alert-dialog | proper live-region semantics |

### Composition decision: option **C** (status quo, deduped underneath)

Same call as category 2. ARIA roles diverge too much to collapse — `tooltip` ≠ `dialog` ≠ `menu` ≠ `alertdialog`. Keep components/directives 1:1, refactor internals to consume primitives.

| Layer | Count | Status |
|---|---|---|
| Components (`<kj-popover>` etc.) | unchanged | unchanged |
| Root directives | unchanged | unchanged ARIA, internals refactor |
| Shared behaviour primitives (hostDirectives) | 4 new | `KjOverlayTrigger`, `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop` |
| Shared state services (providers) | 5 new | `KjFloatingPosition`, `KjPortal`, `KjScrollLock`, `KjOverlayStack`, `KjLiveAnnouncer` |

### Per-directive composition

| Directive | hostDirectives on trigger | hostDirectives on panel | providers |
|---|---|---|---|
| **tooltip** | `KjOverlayTrigger{role:'tooltip',events:'hover/focus'}` | `KjOverlayPanel{esc:false,outside:false}` | `KjFloatingPosition`, `KjPortal` |
| **popover** | `KjOverlayTrigger{role:'dialog'}` | `KjOverlayPanel`, opt-in `KjFocusTrap` | `KjFloatingPosition`, `KjPortal`, `KjOverlayStack` |
| **dialog** | `KjOverlayTrigger{role:'dialog'}` | `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop` | `KjPortal`, `KjScrollLock`, `KjOverlayStack` |
| **alert-dialog** | `KjOverlayTrigger{role:'alertdialog'}` | `KjOverlayPanel{esc:false,outside:false}`, `KjFocusTrap`, `KjBackdrop` | `KjPortal`, `KjScrollLock`, `KjOverlayStack`, `KjLiveAnnouncer` |
| **drawer** | `KjOverlayTrigger{role:'dialog'}` | `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop{edge:true}` | `KjPortal`, `KjScrollLock`, `KjOverlayStack` |
| **bottom-sheet** | `KjOverlayTrigger{role:'dialog'}` | `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop` | `KjPortal`, `KjScrollLock`, `KjOverlayStack` |
| **toast** | — (programmatic) | — (managed by service) | `KjPortal`, `KjLiveAnnouncer` |
| **dropdown-menu** | `KjOverlayTrigger{role:'menu'}` | `KjOverlayPanel` | `KjFloatingPosition`, `KjPortal`, `KjOverlayStack` |
| **context-menu** | `KjOverlayTrigger{role:'menu',events:'contextmenu/longpress'}` | reuses dropdown panel | same as dropdown |
| **menu** (inline) | `KjOverlayTrigger{role:'menu',mount:'in-place'}` | `KjOverlayPanel` | `KjOverlayStack` |
| **select** | `KjOverlayTrigger{role:'listbox',mount:'in-place'}` | `KjOverlayPanel` | `KjOverlayStack` |
| **multi-select** | same as select | same | same |
| **combobox** | `KjOverlayTrigger{role:'listbox',events:'focus/input'}` | `KjOverlayPanel` | `KjFloatingPosition`, `KjOverlayStack` |
| **tree-select** | `KjOverlayTrigger{role:'tree',mount:'in-place'}` | `KjOverlayPanel` | `KjOverlayStack` |
| **cascade-select** | inherited from select | sub-panels reuse `KjOverlayPanel` | `KjFloatingPosition` (sub-panels), `KjOverlayStack` |
| **command-palette** | `KjOverlayTrigger{role:'dialog'}` (modal mode) | `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop` | `KjPortal`, `KjScrollLock`, `KjOverlayStack` |
| **date-picker** | `KjOverlayTrigger{role:'dialog',events:'focus/click'}` | `KjOverlayPanel` | `KjFloatingPosition`, `KjOverlayStack` |
| **color-picker** | `KjOverlayTrigger{mount:'in-place'}` | `KjOverlayPanel` | `KjOverlayStack` |

### Mergers from A11Y perspective

Rule: components keep separate identity only if their ARIA role or interaction model differs. Variants of the same role merge into inputs.

| Candidate | Merge into | How | ARIA impact | Verdict |
|---|---|---|---|---|
| **hovercard** | `kj-popover` | `[kjTrigger]="'hover'"` | identical (`role=dialog`) | ✅ merge |
| **context-menu** | `kj-dropdown-menu` | `[kjTrigger]="'contextmenu'"` (right-click + Shift+F10) | identical (`role=menu`) | ✅ merge |
| **alert-dialog** | `kj-dialog` | `[kjAlert]="true"` toggles role + opt-out of esc/outside-click | `role=alertdialog` via input | ✅ merge |
| **bottom-sheet** | `kj-drawer` | `[kjSide]="'bottom'"` + `[kjDrag]="true"` | identical (`role=dialog`) | ✅ merge |
| **menu** (inline) | `kj-dropdown-menu` | `[kjMount]="'inline'"` | identical (`role=menu`) | ✅ merge |
| **multi-select** | `kj-select` | `[kjMultiple]="true"` | adds `aria-multiselectable=true`; same `role=listbox` | ✅ merge |
| **combobox** | `kj-select` | `[kjFilterable]` + `[kjFreeText]` | adds `role=combobox` on input — different widget | ❌ keep separate |
| **command-palette** | `kj-combobox` (modal) | `[kjModal][kjGroups]` | combobox in dialog — composable but UX too distinct | ⚠️ keep (DX) |
| **cascade-select** | `kj-tree-select` | different rendering | `role=listbox` (cascade) vs `tree` (tree-select) | ❌ keep separate |
| **tree-select** | — | — | `role=tree` is unique | ❌ keep separate |

**Net component reduction:** 18 → 13. Removed: hovercard, context-menu, alert-dialog, bottom-sheet, menu (inline), multi-select.

### Component vs directive vs service

Decision rule:

| Question | → Kind |
|---|---|
| User authors content inside? | yes → component |
| Just decorates an existing element? | yes → directive |
| Programmatic / fire-and-forget / no content authoring? | yes → service |
| Sugar preset over a component? | yes → service wrapper |

| Feature | Kind | Public surface | Why |
|---|---|---|---|
| **tooltip** | directive | `[kjTooltip]="'Save'"` on any element | content is a string/template; pure decoration |
| **popover** | directive + component | `[kjPopover]` on trigger + `<kj-popover-content>` for projection | trigger decorates; content needs structure |
| **dialog** | service + skeleton components | `kjDialog.open(MyDialogCmp)`; `<kj-dialog>`, `<kj-dialog-header/body/footer>` | imperative is common; user authors body |
| **alert-dialog** *(merged)* | sugar service | `kjDialog.alert({title,message})` → `Promise<void>` | preset config |
| **confirm-dialog** *(no separate cmp)* | sugar service | `kjDialog.confirm({title,message,danger})` → `Promise<boolean>` | preset config |
| **drawer** *(absorbs bottom-sheet)* | service + skeleton components | `kjDrawer.open(Cmp,{side:'bottom'})`; `<kj-drawer>` | same as dialog |
| **toast** | service + viewport component | `kjToast.success(...)`; `<kj-toast-viewport>` placed once | programmatic only |
| **dropdown-menu** *(absorbs context-menu + inline menu)* | component + trigger directive | `<kj-dropdown-menu>` items inside; `[kjDropdownMenuTrigger]` on user's button | content authoring |
| **select** *(absorbs multi-select)* | component | `<kj-select [kjMultiple]>` with `<kj-option>` | form control + content authoring |
| **combobox** | component | `<kj-combobox>` with options | form control |
| **command-palette** | component only | `<kj-command-palette [kjItems][kjFilter]>` — async filter via input fn / observable | item registry / async filter doesn't fit a global service |
| **tree-select** | component | `<kj-tree-select>` with nodes | form control + hierarchy |
| **cascade-select** | component | `<kj-cascade-select>` with nodes | form control + cascade UX |
| **date-picker** | component | `<kj-date-picker>` form control | form control |
| **time-picker** | component | `<kj-time-picker>` form control | form control |
| **color-picker** | component | `<kj-color-picker>` form control | form control |

### Sugar services worth shipping

| Service | Wraps | API | Saves users from |
|---|---|---|---|
| `kjDialog.alert(opts)` | dialog | `Promise<void>` | authoring an alert dialog component every time |
| `kjDialog.confirm(opts)` | dialog | `Promise<boolean>` | authoring a confirm dialog component every time |
| `kjDialog.prompt(opts)` | dialog | `Promise<string \| null>` | input dialog boilerplate |
| `kjDrawer.open(Cmp, opts)` | drawer | returns `KjDrawerRef` | manual mount + lifecycle |
| `kjToast.{info,success,warning,error}` | toast | returns id (dismiss handle) | mounting + queueing |

> Note: `kjCommandPalette.register()` was considered but rejected — async filtering and result ranking belong at the component level (consumer passes filter fn / observable), not in a global registry.

### Final shipping list

| Layer | Items |
|---|---|
| **Directives (decorative)** | `kjTooltip`, `kjPopover`, `kjDropdownMenuTrigger` |
| **Components (content authoring)** | `kj-popover-content`, `kj-dialog`+children, `kj-drawer`+children, `kj-toast-viewport`, `kj-dropdown-menu`, `kj-select` (+`kj-option`), `kj-combobox`, `kj-command-palette`, `kj-tree-select`, `kj-cascade-select`, `kj-date-picker`, `kj-time-picker`, `kj-color-picker` |
| **Services (programmatic)** | `KjDialog`, `KjDrawer`, `KjToast` (+ sugar: `alert/confirm/prompt`) |
| **Removed (merged)** | hovercard, context-menu, alert-dialog, bottom-sheet, inline menu, multi-select |

## 3. Form control bridge (CVA)

_TBD_

## 4. Item registration

_TBD_

## 5. Keyboard chord / hotkey

_TBD_

## 6. Filter/search over list

_TBD_

## 7. ARIA labelling/describedby wiring

_TBD_

## 8. Live region announcements

_TBD_
