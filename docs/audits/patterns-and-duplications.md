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

### Final shipping list (overlay-scoped only)

> Scope: this list covers **only overlay-using surfaces**. Non-overlay form controls — `kj-input`, `kj-textarea`, `kj-checkbox`, `kj-radio`, `kj-switch`, `kj-slider`, `kj-rating`, `kj-input-group`, `kj-input-mask`, `kj-input-otp` — are out of scope for category 1 and ship unchanged. They will be revisited in category 3 (Form control bridge).

| Layer | Items |
|---|---|
| **Directives (decorative)** | `kjTooltip`, `kjPopover`, `kjDropdownMenuTrigger` |
| **Components (content authoring)** | `kj-popover-content`, `kj-dialog`+children, `kj-drawer`+children, `kj-toast-viewport`, `kj-dropdown-menu`, `kj-select` (+`kj-option`), `kj-combobox`, `kj-command-palette`, `kj-tree-select`, `kj-cascade-select`, `kj-date-picker`, `kj-time-picker`, `kj-color-picker` |
| **Services (programmatic)** | `KjDialog`, `KjDrawer`, `KjToast` (+ sugar: `alert/confirm/prompt`) |
| **Removed (merged)** | hovercard, context-menu, alert-dialog, bottom-sheet, inline menu, multi-select |

## 3. Form control bridge (CVA)

### Impacted

`input`, `textarea`, `checkbox`, `radio`, `toggle`, `switch`, `slider`, `rating`, `number-input`, `input-mask`, `input-otp`, `select`, `multi-select`, `combobox`, `tree-select`, `cascade-select`, `calendar`, `date-picker`, `time-picker`, `color-picker`.

### Feature comparison

| Directive | Value type | CVA wiring | writeValue | onChange | onTouched | setDisabledState | Validator | 2-way `model()` | Touched/dirty |
|---|---|---|---|---|---|---|---|---|---|
| **KjInput** | string | ✅ via `KjFormControl` | effect → DOM | `notifyChange()` | blur | via FormCtrl | ❌ | ❌ | `formCtrl.touched()` |
| **KjTextarea** | string | ✅ via `KjFormControl` | effect → DOM | `notifyChange()` | blur | via FormCtrl | ❌ | ❌ | ✅ |
| **KjNumberInput** | number\|null | ✅ via `KjFormControl` | effect + parse | `notifyChange()` | blur | via FormCtrl | min/max | `kjValue` | ✅ |
| **KjCheckbox** | boolean | ✅ via `KjFormControl` | via `model()` | `notifyChange()` | blur | via FormCtrl | ❌ | `kjChecked` | ✅ |
| **KjRadio** | unknown | ✅ via `KjFormControl` | via group | `notifyChange()` | blur | via FormCtrl | ❌ | ❌ | ✅ |
| **KjToggle** | boolean | ✅ via `KjFormControl` | via `model()` | `notifyChange()` | blur | via FormCtrl | ❌ | `kjPressed` | ✅ |
| **KjTimePicker** | Date\|string\|null | ✅ via `KjFormControl` | effect + parse | `notifyChange()` | manual | via FormCtrl | min/max | `kjValue` | ✅ |
| **KjColorPicker** | string\|array\|obj | ✅ via `KjFormControl` | effect + parse HSV | `notifyChange()` | manual | via FormCtrl | ❌ | computed | ✅ |
| **KjInputOtp** | string | ✅ via `KjFormControl` | effect → cells | `notifyChange()` | blur delegate | via FormCtrl | ❌ | computed | ✅ |
| **KjInputMask** | string | ✅ via host `KjInput` | via parent | parent | parent | parent | incomplete | ❌ | parent |
| **KjCombobox** | unknown | ⚠️ partial (input only) | n/a | `commitActive()` | manual | via `KjDisabled` | ❌ | `kjValue` | ✅ |
| **KjCascadeSelect** | unknown | ⚠️ via composed `KjSelect` | via `model()` | `select()` | manual | via `KjDisabled` | ❌ | composed | ❌ |
| **KjSlider** | number\|tuple | ❌ none | via `model()` | manual | manual | via `KjDisabled` | min/max bounds | `kjValue`/`kjRange` | ❌ |
| **KjSelect** | unknown | ❌ none | via `model()` | `select()` | manual | via `KjDisabled` | ❌ | `kjValue` | ❌ |
| **KjMultiSelect** | unknown[] | ❌ none | via `model()` | toggle | manual | via `KjDisabled` | ❌ | `kjValue` | ❌ |
| **KjTreeSelect** | unknown\|array | ❌ none | via `model()` | `selectNode()` | manual | via `KjDisabled` | ❌ | `kjValue` | ❌ |
| **KjCalendar** | Date\|null | ❌ none | via `model()` | `selectDate()` | manual | via `KjDisabled` | min/max | `kjValue` | ❌ |
| **KjDatePicker** | Date\|null | ❌ none | via `model()` | `selectDate()` | manual | via `KjDisabled` | min/max | `kjValue` | ❌ |

### The big finding — 3 inconsistent CVA patterns

| Pattern | Members | Problem |
|---|---|---|
| ✅ **Full CVA via `KjFormControl`** | input, textarea, number-input, checkbox, radio, toggle, time-picker, color-picker, input-otp, input-mask | works correctly with Angular Forms |
| ⚠️ **Partial CVA** | combobox, cascade-select | only some flows wired; `formCtrl.touched()` missing on parts |
| ❌ **No CVA at all** | slider, select, multi-select, tree-select, calendar, date-picker | **don't integrate with `[formControl]` / `formControlName`** |

This is a gap, not a feature. Every form control in a UI library MUST integrate with Angular Forms. The "model-only" group breaks reactive forms, validation, `ng-touched` styling, `submitted` state, and `formGroup.valueChanges`.

### A11Y angle — ARIA attributes driven by CVA state

| ARIA attr | Source signal | When applied | AAA gotcha |
|---|---|---|---|
| `aria-disabled` / native `disabled` | `disabled()` (from `KjDisabled`) | always | native `disabled` removes from tab order; `aria-disabled` keeps it focusable. Pick per control type. |
| `aria-invalid="true"` | `invalid() && touched()` | **only after touched** | AAA: never announce error before user interaction (don't shout "invalid" on first paint) |
| `aria-required="true"` | `required()` | always when required | mirrors HTML `required`; SR announces "required" |
| `aria-readonly="true"` | `readonly()` | always | distinct from disabled — value still announced |
| `aria-busy="true"` | `pending()` (async validation) | during validation | prevents SR mid-validate spam |

**Touched gating is the AAA rule.** Showing `aria-invalid` on first render of an empty required field is a known WCAG 3.3.1 violation pattern.

**The 6 "model-only" controls fail A11Y too**, not just Forms — `aria-invalid`, `aria-required`, `aria-busy` are never set because there's no `KjFormControl` host instance to drive them. Migration is an A11Y fix.

### Pattern ownership across categories

| Concern | Cat |
|---|---|
| Is the control disabled / invalid / required / readonly / busy? | **3 (CVA)** |
| What's the label / description text and where is it? | 7 |
| Where is the error message rendered and how is it linked (`aria-describedby`)? | 7 |
| When and how is the error announced to AT? | 8 |

CVA owns the **state**. Cat 7 owns the **wiring**. Cat 8 owns the **announcement**.

### Two clusters by value semantics

| Cluster | Members | Bridge shape |
|---|---|---|
| **Direct** (DOM value === model value) | input, textarea, checkbox, radio, toggle | `writeValue` → DOM attr; `(input)`/`(change)` → `notifyChange` |
| **Parsed** (model ↔ internal representation) | number-input, time-picker, color-picker, slider, date-picker, calendar, select, multi-select, combobox, tree-select, cascade-select, input-otp, input-mask | external value parsed into internal state; commit serialises back |

### Shared vs divergent

| Aspect | Shared (`KjFormControl`) | Divergent (per-control) |
|---|---|---|
| `writeValue` callback storage | ✅ | parsing/coercion logic |
| `registerOnChange` | ✅ | when to call `notifyChange()` |
| `registerOnTouched` | ✅ | what counts as "touched" (blur vs interaction vs commit) |
| `setDisabledState` | ✅ (delegates to `KjDisabled`) | downstream propagation to children |
| `value` / `disabled` / `touched` / `dirty` / `pending` signals | ✅ | shape/type |
| `NG_VALUE_ACCESSOR` provider | ✅ (one place) | — |
| `Validator` (`NG_VALIDATORS`) | ❌ | min/max/pattern/required vary |
| 2-way `model()` ergonomic | ❌ | most controls expose one |

### Primitives to extract / harden

| Primitive | Kind | Shape | A11Y contract |
|---|---|---|---|
| `KjFormControl` *(exists, harden)* | hostDirective | provides `NG_VALUE_ACCESSOR`; **`inject()`s `KjDisabled` from host injector**; signals: `value()`, `disabled()`, `touched()`, `dirty()`, `pending()`, `invalid()`, `required()`, `readonly()`, `showError()` | owns `aria-invalid` (touched-gated), `aria-required`, `aria-readonly`, `aria-busy` |
| `KjDisabled` *(exists, reused)* | hostDirective | owns `disabled()` signal + native `disabled` attr | owns `aria-disabled` / native `disabled`. Reusable on buttons, links, anywhere — **NOT a hostDirective of `KjFormControl`** |
| `KjValidator` | hostDirective | provides `NG_VALIDATORS`; configurable check fn | feeds `invalid()` + `errors()` into `KjFormControl` |
| `KjValueAdapter<TExt, TInt>` | provider service | `parse(external) → internal`; `serialise(internal) → external` | none (data layer) |

### Composition rule — `KjDisabled` lives on the consumer host, not inside `KjFormControl`

`KjFormControl` does **not** declare `KjDisabled` in its `hostDirectives`. Instead it `inject()`s `KjDisabled` from the consumer's host injector, **expecting** the consumer to compose it.

**Why:** `KjDisabled` is reused on buttons, links, toggles, anywhere — not just form controls. Forcing it as a `KjFormControl` hostDirective would tightly couple the two. Keeping the composition at the consumer level lets `KjDisabled` stay independently usable.

```ts
// ❌ Wrong — couples KjDisabled to form-control use only
@Directive({
  selector: '[kjFormControl]',
  hostDirectives: [KjDisabled],  // <— don't do this
})
export class KjFormControl<T> { ... }

// ✅ Right — consumer composes both; KjFormControl injects what it expects
@Directive({
  selector: '[kjFormControl]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: KjFormControl, multi: true }],
  host: {
    '[attr.aria-invalid]': 'showError() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
  },
})
export class KjFormControl<T> implements ControlValueAccessor {
  // Expects KjDisabled to be on the same host. Throws (or fails DI) if missing.
  private readonly disabledDir = inject(KjDisabled);
  readonly disabled = this.disabledDir.disabled;
  // ...
}

// Consumer:
@Directive({
  selector: '[kjInput]',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },     // first — KjFormControl injects it
    { directive: KjFormControl, inputs: ['kjReadonly'] },
  ],
})
export class KjInput { ... }
```

### Composition decision: option **C** (status quo + harden + migrate)

| Action | Scope |
|---|---|
| 1. Standardize on `KjFormControl` as **the** CVA bridge | every form control adopts the host directive |
| 2. **Migrate "no CVA" group** | slider, select, multi-select, tree-select, calendar, date-picker → add `[KjDisabled, KjFormControl]` to `hostDirectives`, route `model()` writes through `formCtrl.notifyChange()` |
| 3. **Fix "partial CVA" group** | combobox, cascade-select → ensure `markTouched()` fires on commit/blur consistently |
| 4. Extract `KjValidator` for min/max/pattern | number-input, slider, date-picker, calendar, time-picker, input-mask |
| 5. Keep `model()` ergonomic | 2-way `kjValue` stays on top of CVA — both fire from a single commit point |
| 6. **`KjDisabled` stays decoupled** | composed on consumer host, injected (not hostDirective'd) inside `KjFormControl` |

### Per-control composition target

| Control | Current | Target hostDirectives |
|---|---|---|
| KjInput | `KjFormControl` | `KjDisabled, KjFormControl` (unchanged in spirit) |
| KjTextarea | `KjFormControl` | `KjDisabled, KjFormControl` |
| KjNumberInput | `KjFormControl` | `KjDisabled, KjFormControl, KjValidator{min,max}` |
| KjCheckbox / KjRadio / KjToggle | `KjFormControl` | `KjDisabled, KjFormControl` |
| KjTimePicker | `KjFormControl` | `KjDisabled, KjFormControl, KjValidator{min,max}` |
| KjColorPicker | `KjFormControl` | `KjDisabled, KjFormControl` |
| KjInputOtp | `KjFormControl` | `KjDisabled, KjFormControl` |
| KjInputMask | host `KjInput` | inherits via parent + `KjValidator{incomplete}` |
| **KjCombobox** | partial | `KjDisabled, KjFormControl` (full) |
| **KjSlider** | none | `KjDisabled, KjFormControl, KjValidator{min,max}` |
| **KjSelect** | none | `KjDisabled, KjFormControl` |
| **KjMultiSelect** | none | `KjDisabled, KjFormControl` |
| **KjTreeSelect** | none | `KjDisabled, KjFormControl` |
| **KjCalendar** | none | `KjDisabled, KjFormControl, KjValidator{min,max}` |
| **KjDatePicker** | none | `KjDisabled, KjFormControl, KjValidator{min,max}` |
| **KjCascadeSelect** | partial via `KjSelect` | `KjDisabled, KjFormControl` (own, not via composed select) |

### Wins

- All form controls integrate uniformly with reactive forms
- All form controls expose `aria-invalid` (touched-gated), `aria-required`, `aria-busy` — A11Y fix for 6 controls
- 6 controls fix a real Angular Forms gap
- Single commit point per directive — no double-source-of-truth bugs
- `KjDisabled` stays reusable on buttons, links, anywhere — not coupled to forms

## 4. Item registration

### What this pattern is

A **container directive** owns a list of **children directives** that need to coordinate. The container needs to know:
- which children exist (count, identity, order)
- which is active / selected / expanded
- which are disabled (skip during keyboard nav)
- where each lives (for `aria-posinset`, `aria-setsize`, `aria-controls`)

Children need a way for the parent to discover them.

Concrete example — `<kj-tabs>` with `<kj-tab>` children:

```html
<kj-tabs [(kjValue)]="active">
  <kj-tab kjValue="one">One</kj-tab>
  <kj-tab kjValue="two" disabled>Two</kj-tab>
  <kj-tab kjValue="three">Three</kj-tab>
</kj-tabs>
```

`<kj-tabs>` must enumerate tabs to handle `→ Home End`, skip disabled, derive `aria-setsize`/`aria-posinset`, link `aria-controls` to panels.

### Three mechanisms in current code

| Way | Members | Issue |
|---|---|---|
| **Explicit register/unregister** (signal-backed) | accordion, tabs, carousel, stepper, breadcrumb, input-group, input-otp | ~30 lines of boilerplate copy-pasted per container |
| **DI + `DestroyRef`** | multi-select, combobox, command-palette | modern shape but still re-implemented per consumer |
| **`querySelectorAll()` at read time** | select, menu, dropdown-menu, tree-select, cascade-select, avatar-group (partial) | misses portal'd children; runs in hot path; OnPush-fragile; misses items added via `@for` until next CD |

### Revised verdict — use the framework first

**Most of these don't need a primitive — they need to stop reinventing what Angular already provides.**

`contentChildren()` (Angular 17.1+, signal-based) walks the parent's logical view tree and returns a `Signal<readonly T[]>`. Zero code on the child side. Reactive. Auto-cleanup.

```ts
@Directive({ selector: '[kjTabs]' })
export class KjTabs {
  readonly tabs = contentChildren(KjTab, { descendants: true });
  readonly setSize = computed(() => this.tabs().length);
}

@Directive({ selector: '[kjTab]' })
export class KjTab { /* nothing — just exists */ }
```

### When `contentChildren()` doesn't reach

| Situation | Why it fails | Fallback |
|---|---|---|
| **Portal'd children** | items mounted into `document.body` via `KjPortal` live in a different `ViewContainerRef`; original parent's content query doesn't see them | DI register + `DestroyRef` |
| **Items from input arrays** | `[kjItems]="['New file', 'Open']"` — items are data, not directives | not a registration pattern at all |
| **Sub-panels rendered on-demand** | dynamic TemplateRef in different context | DI register + `DestroyRef` per sub-panel |
| **Path-keyed deeply-nested registries** | form `'address.street'` | observable registry (existing — keep) |
| **Service-driven runtime queues** | toast — items born from a service, no parent template | service queue (existing — keep) |
| **DOM-sibling grouping** | chat — group by adjacent DOM nodes | WeakMap (existing — keep) |

### Per-container target

| Container | Current | Target |
|---|---|---|
| tabs | explicit register | **`contentChildren()`** |
| accordion | explicit register | **`contentChildren()`** |
| carousel | explicit register | **`contentChildren()`** |
| stepper | explicit register | **`contentChildren()`** |
| breadcrumb | explicit register | **`contentChildren()`** |
| input-group | explicit register | **`contentChildren()`** |
| input-otp | explicit register (Map) | **`contentChildren()`** + index from query order |
| multi-select | DI + `DestroyRef` | **`contentChildren()`** |
| combobox | DI + `DestroyRef` | **`contentChildren()`** |
| avatar-group | `contentChildren()` (already!) | unchanged |
| radio | DI context only | unchanged (single value, no list) |
| select | `querySelectorAll` | **`contentChildren({descendants: true})`** |
| menu | `querySelectorAll` | **`contentChildren({descendants: true})`** |
| tree-select | `querySelectorAll` recursive | **`contentChildren()` + recursion at each node** |
| **dropdown-menu** *(portal'd)* | `querySelectorAll` | **DI register + `DestroyRef`** |
| **context-menu** *(portal'd)* | `querySelectorAll` | **DI register + `DestroyRef`** |
| **cascade-select** *(dynamic sub-panels)* | `querySelectorAll` per panel | **DI register + `DestroyRef`** per sub-panel |
| **command-palette** *(input-array mode)* | DI + `DestroyRef` | input-array: no registry; declarative items: `contentChildren()` |
| toast | service queue | unchanged |
| form | observable registry | unchanged |
| chat | WeakMap DOM-sibling | unchanged |
| pagination | algorithmic | unchanged |

### Primitives — final cut

| Primitive | Kind | Used in |
|---|---|---|
| `contentChildren()` (Angular built-in) | query | ~12 containers — replace explicit register, replace `querySelectorAll` |
| **`KjPortalChildRegistry<T>`** *(small, ~30 lines)* | provider service | 3 portal'd-content cases: dropdown-menu, context-menu, cascade-select sub-panels |
| existing observable registry | service | form (unchanged) |
| existing WeakMap | service | chat (unchanged) |
| existing service queue | service | toast (unchanged) |

`KjChildRegistry<T>` / `KjOrderedRegistry<T>` / `KjTreeRegistry<T>` from earlier draft → **dropped**. `contentChildren()` already orders by DOM and recursion is a child-level concern (each node has its own `contentChildren()`).

### Composition decision: option **C** (delete boilerplate, use framework, keep small portal helper)

| Action | Scope |
|---|---|
| 1. **Migrate 9 explicit-register/DI-register containers to `contentChildren()`** | tabs, accordion, carousel, stepper, breadcrumb, input-group, input-otp, multi-select, combobox — drop ~30 lines per container |
| 2. **Migrate 3 `querySelectorAll` containers to `contentChildren({descendants: true})`** | select, menu, tree-select — gain reactivity + portal-safety |
| 3. **Extract `KjPortalChildRegistry<T>`** *(small)* | dropdown-menu, context-menu, cascade-select sub-panels — keep DI register pattern but in one place |
| 4. **Leave fit-for-purpose registries alone** | toast (service queue), form (observable), chat (WeakMap), pagination (algorithmic), radio (DI context) |

### A11Y derivation comes free

| ARIA attr | Without query | With `contentChildren()` |
|---|---|---|
| `aria-setsize` | manual count | `tabs().length` |
| `aria-posinset` | manual index | `tabs().indexOf(this) + 1` |
| `aria-activedescendant` | id lookup against DOM | id lookup against `tabs()` |
| Skip-disabled in keyboard nav | DOM filter | `tabs().filter(t => !t.disabled())` |

### Wins

- ~30 lines × 9 components of register/unregister → **deleted entirely**
- 3 `querySelectorAll` consumers gain reactivity + portal-safety + OnPush-correctness
- Smaller surface: 1 small primitive (`KjPortalChildRegistry`) instead of 3 (`KjChildRegistry` + `KjOrderedRegistry` + `KjTreeRegistry`)
- Aligned with idiomatic Angular — uses framework primitives over custom ones
- Foundation for cat 5 (hotkey items registry) and cat 6 (filterable list — they consume the `contentChildren()` signal)

## 5. Keyboard chord / hotkey

_TBD_

## 6. Filter/search over list

_TBD_

## 7. ARIA labelling / describedby wiring

### Why this matters

Two fundamental concepts under WCAG 2.1 every interactive widget MUST have:

| Concept | Spec | Without it |
|---|---|---|
| **Accessible name** | WCAG 4.1.2 (Name, Role, Value) | SR announces "button" instead of "Submit". Failing AA. |
| **Accessible description** | WCAG 1.3.1 / 3.3.2 | help/error text floats unattached; SR users can't tell why a field is invalid |

Browser computes these via the W3C **Accessible Name and Description Computation** algorithm. Priority order:

| Accessible **name** sources (first non-empty wins) | Accessible **description** sources |
|---|---|
| 1. `aria-labelledby` (id refs) | 1. `aria-describedby` (id refs) |
| 2. `aria-label` (string) | 2. `aria-description` (string, newer) |
| 3. native HTML label (`<label for>`, `alt`, `title`) | 3. `title` (tooltip, last resort) |
| 4. visible text content (buttons, links) | |
| 5. nothing → unnamed → broken | |

**Antipattern to prevent:** `aria-label` on a control with a visible `<label for>` silently overrides the visible text. A primitive must enforce priority resolution.

### Three labelling sub-patterns in the codebase

| Sub-pattern | Where used | Primitive | Status |
|---|---|---|---|
| **A. Form-field labelling** (label + help + error linked by id) | every form control wrapped in `<kj-field>` | `KjField`, `KjFieldLabel`, `KjFieldHelp`, `KjFieldError`, `KjAriaDescribedBy` | ✅ exists, well-designed |
| **B. Overlay panel labelling** (title + description by id) | dialog, drawer, alert-dialog, alert, bottom-sheet | each panel owns own `titleId`/`descriptionId` signals + `<kj-*-title>`/`<kj-*-description>` register ids | ✅ exists, consistent |
| **C. Standalone `aria-label` input** | spinner, menubar, breadcrumb, calendar, carousel, color-picker, number-input, time-picker segments, slider thumb, file-upload, pagination, etc. | none — each control re-implements `kjAriaLabel` input + host binding | ❌ duplicated 20+ times |

Sub-pattern B has no shared logic to extract beyond id minting (covered by `KjId`). Pattern stays local to each overlay component.

### A — `KjField` ecosystem (already in place)

| Primitive | Role |
|---|---|
| `KjField` | mints `controlId`, `labelId`; registers describedby ids; tracks `required`/`disabled`/`invalid` |
| `KjFieldLabel` | reads `controlId`/`labelId` from context; auto-binds `[for]` and `[id]` |
| `KjFieldHelp` | mints id; calls `field.registerDescribedBy(id, 'help')` |
| `KjFieldError` | mints id; calls `field.registerDescribedBy(id, 'error')`; `role="alert"` + `aria-live="polite"` |
| `KjAriaDescribedBy` | merges `field.describedByIds()` + user-provided `[kjDescribedBy]` into `[attr.aria-describedby]` |

Consumer contract:

```html
<kj-field>
  <label kjFieldLabel>Email</label>
  <input kjInput kjAriaDescribedBy />
  <span kjFieldHelp>We'll never share it.</span>
  <span kjFieldError>Required.</span>
</kj-field>
```

Wires automatically: `<label for="f-1" id="f-1-label">`, `<input id="f-1" aria-describedby="f-1-help f-1-error">`.

### C — Standalone `aria-label` (the duplication)

20+ controls each independently implement:

```ts
readonly kjAriaLabel = input<string | undefined>(undefined);
host: { '[attr.aria-label]': 'kjAriaLabel() ?? null' }
```

Several have **hardcoded English fallbacks**:

| Component | Hardcoded |
|---|---|
| color-picker | "Color saturation and value", "Hue", "Opacity", "Hex color value" |
| command-palette | "Command palette", "Commands" |
| date-picker | "Choose date" |
| tree-select | "Collapse" / "Expand" |
| bottom-sheet | "Resize sheet" |
| time-picker segments | "Hours", "Minutes", "Seconds", "Toggle AM/PM" |
| spinner | "Loading" |

### When to use which

| Situation | Use | Example |
|---|---|---|
| Icon-only button, no visible text | `aria-label` | `<button aria-label="Close">×</button>` |
| Visible label exists elsewhere on page | `aria-labelledby` | `<input aria-labelledby="email-label">` |
| Form control inside `<kj-field>` with `<label kjFieldLabel>` | native `<label for>` (auto-wired) | (KjField does it) |
| Help text / error text linked to a field | `aria-describedby` | `<input aria-describedby="email-help email-error">` |
| Tooltip describing a button | `aria-describedby` (tooltip's id) | done by `KjTooltipTrigger` |
| Decorative element (icon next to a labelled button) | `aria-hidden="true"` | `<svg aria-hidden="true">` |

### Primitives — final cut

| Primitive | Kind | Why a primitive |
|---|---|---|
| `KjField` + children + `KjAriaDescribedBy` *(exists)* | hostDirective + directives | form-field labelling + describedby chain — the complex case |
| **`KjAriaLabel`** *(new)* | hostDirective | fundamental name resolution with `labelledby > label > fallback > i18n` priority; replaces 20+ ad-hoc bindings; prevents silent-override antipattern |
| **`KJ_A11Y_LABELS`** *(new)* | InjectionToken | i18n + per-app override of default strings |
| **`KjId`** *(new — extract from `KjField`)* | provider service | id minting reusable beyond field (overlay panels, anywhere) |
| **`KjAriaCurrent`** *(new, small)* | hostDirective | dedupes `aria-current` across pagination, breadcrumb, stepper, tabs, nav |

`KjOverlayLabelling` was considered and **rejected** — overlay title/description pattern is local to each component; only id minting is shared (covered by `KjId`).

### Composition rule

Same as `KjFormControl` ↔ `KjDisabled`: `KjAriaLabel` is composed by the **consumer**, not declared as a hostDirective inside another primitive. Stays independently usable on any element.

```ts
@Directive({
  selector: '[kjSpinner]',
  hostDirectives: [
    { directive: KjAriaLabel, inputs: ['kjAriaLabel', 'kjAriaLabelledBy'] },
  ],
})
export class KjSpinner {
  private readonly labels = inject(KJ_A11Y_LABELS);
  // KjAriaLabel resolves: explicit input → fallback this directive provides → labels.loading
}
```

Priority resolution inside `KjAriaLabel`:

| Priority | Source |
|---|---|
| 1 | `kjAriaLabelledBy` (input) — wins, label suppressed |
| 2 | `kjAriaLabel` (input) |
| 3 | per-instance fallback (consumer default) |
| 4 | `KJ_A11Y_LABELS` locale default |
| 5 | empty → no `aria-label` attribute |

### Composition decision: option **C** (status quo, harden + extract)

| Action | Scope |
|---|---|
| 1. Keep `KjField` + children + `KjAriaDescribedBy` | already correct; document as the form-field labelling story |
| 2. Document overlay title/description pattern | no primitive; just convention |
| 3. **Extract `KjAriaLabel`** host directive | adopt in 20+ controls that currently roll their own `kjAriaLabel` input |
| 4. **Introduce `KJ_A11Y_LABELS` token** | move all hardcoded strings here; i18n hook |
| 5. **Extract `KjId` service** | id minting reusable outside `KjField` |
| 6. **Introduce `KjAriaCurrent`** | dedupe `aria-current` across pagination, breadcrumb, stepper, tabs, nav |
| 7. **`KjAriaLabel` decoupled** | composed on consumer host; never a hostDirective of `KjField`/`KjFormControl`/etc. |

### Wins

- Eliminates 20+ copy-pasted `kjAriaLabel` inputs + bindings
- All hardcoded English strings become i18n-able via `KJ_A11Y_LABELS` (provideable per-app)
- Consistent priority resolution (`labelledby` > `label` > fallback > i18n default)
- Existing `KjField` story stays; just gets formal sibling primitives
- `aria-current` consistent across navigation widgets

---

## A11Y roadmap — AAA-level attrs to address (post-cat-7)

Survey of every ARIA attribute surface; some already covered, some missing. Roadmap items below are **gaps** worth tracking.

### Already handled by existing categories

| Attribute | Cat | Primitive |
|---|---|---|
| `aria-expanded`, `aria-controls`, `aria-haspopup` | 1 | `KjOverlayTrigger` |
| `aria-modal` | 1 | dialog/drawer/alert-dialog |
| `aria-multiselectable` | 2 | multi-select |
| `aria-activedescendant` | 2 | `KjListNavigator` |
| `aria-selected` | 2 | `KjSelectionModel` |
| `aria-disabled` | 3 | `KjDisabled` |
| `aria-invalid`, `aria-required`, `aria-readonly`, `aria-busy` | 3 | `KjFormControl` (touched-gated) |
| `aria-live`, `aria-atomic`, `aria-relevant` | 8 | live announcer |
| `aria-label`, `aria-labelledby` | 7 | `KjAriaLabel` |
| `aria-describedby` | 7 | `KjAriaDescribedBy` |
| `aria-current` | 7 | `KjAriaCurrent` |

### Per-widget — no primitive needed (intrinsic to role)

| Attribute | Used by | Why local |
|---|---|---|
| `aria-checked` | checkbox, radio, switch | semantics differ (`true`/`false`/`mixed`) |
| `aria-pressed` | toggle button | single component |
| `aria-orientation` | slider, tabs, separator, splitter | static input; 1 line |
| `aria-level` | tree, heading | tree-specific |
| `aria-multiline` | textarea | static |
| `aria-valuemin/max/now/text` | slider, time-picker, progressbar, spinbutton | numeric semantics per widget |
| `aria-sort` | data-table column headers | table-specific |

### Roadmap — gaps to fix

| # | Attribute / Concern | Used by | Severity | Action |
|---|---|---|---|---|
| 1 | **`aria-keyshortcuts`** not set on shortcut-aware items | command-palette items, dropdown-menu items, shortcut-aware buttons | medium (AAA UX, AA passable) | add input on `KjListNavigator` or shortcut-aware item primitives; advertise shortcuts to AT |
| 2 | **`aria-roledescription`** for custom widgets | carousel slide, drawer, color-picker subparts | low | locale-aware, via `KJ_A11Y_LABELS` token |
| 3 | **`aria-posinset` / `aria-setsize`** for virtualized lists | not yet — defer until virtualization | low (deferred) | add to `KjItemRegistry` when virtualization lands |
| 4 | **`aria-owns`** for portal'd children | cascade-select sub-panels (verify), command-palette | low | audit overlay portals; ensure owner relation when DOM detached |
| 5 | **`role="status"` vs `role="alert"`** semantic split | toast, form errors, validation | medium | document in cat 8 |
| 6 | **Reduced motion** support | every animation | medium (WCAG 2.3.3 AAA) | global `prefers-reduced-motion` injection token + components respect it |
| 7 | **High contrast / forced colors** | every styled component | medium (WCAG 1.4.11 AA) | CSS layer audit; ensure `forced-colors: active` doesn't break |
| 8 | **Focus visible AAA** (`:focus-visible` consistently styled, ≥3:1 contrast) | every interactive | high (WCAG 2.4.7 AA, 1.4.11 AA) | already partially via `KjFocusRing`; audit coverage |
| 9 | **Target size AAA** (≥44×44 CSS px for touch targets) | every interactive | high (WCAG 2.5.5 AAA) | design tokens; component default min-size |
| 10 | **Pointer cancellation** (action on `pointerup` not `pointerdown`) | every clickable | medium (WCAG 2.5.2 A) | audit click handlers for cancellable actions |
| 11 | **Skip links / landmark roles** | docs site / app shell — not lib's job | low | document recommended app-shell pattern |
| 12 | **`prefers-color-scheme`** | theming | low | already addressed via tokens; audit |
| 13 | **Screen-reader-only text** utility (`.sr-only`) | widgets needing visually-hidden text | medium | extract a utility class in components package |
| 14 | **`inert` polyfill / fallback** | older browsers | low (deferred — modern targets) | n/a |
| 15 | **Long-press alternative for `right-click` context-menu** | context-menu | medium (mobile A11Y) | already in cat 1 (`KjOverlayTrigger{events:'contextmenu/longpress'}`) |
| 16 | **Auto-complete attributes** (`autocomplete`, `autocorrect`, `inputmode`) | form inputs | medium (WCAG 1.3.5 AA) | input config inputs; document |
| 17 | **Locale-aware date/number/time formatting** | date-picker, time-picker, number-input, calendar | medium | already partial via `LOCALE_ID` injection; extend |

Items 1–4 fit naturally into existing primitives. Items 5–17 cross-cut and need their own micro-categories or living issue tracker. Recommend: track items 5–17 as a separate "A11Y AAA hardening" milestone after primitives extraction lands.

## 8. Live region announcements

_TBD_
