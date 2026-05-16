# Listbox Cluster Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the four remaining category-2 (listbox / menu / tree) clusters — `tree-select`, `cascade-select`, `dropdown-menu`, `menubar` — onto the shared list primitives extracted in `2026-05-15-listbox-primitives.md` (`KjListItem`, `KjListNavigator`, `KjSelectionModel`, `KjTypeAhead`, `KjFilterableList`, `KJ_LIST_NAVIGATOR_CONFIG`).

**Architecture:** Same shape as the `KjSelect` / `KjCombobox` / `KjCommandPalette` migration: the root directive implements `KjListNavigatorConfig`, provides itself under the token via `forwardRef`, provides `KjSelectionModel` (selection-bearing clusters only), and uses `KjListItem` as the underlying behaviour primitive on each option / node / menuitem. Per-option `activate.subscribe` boilerplate is replaced by a single `afterSelect(value, closeRequested)` hook on the root.

**Tech Stack:** Angular 21, signals (`signal`, `computed`, `effect`, `model`, `input`, `output`), `contentChildren`, `hostDirectives`, `forwardRef`, WAI-ARIA APG (listbox / tree / menu / menubar), Vitest + `@testing-library/angular` + `jest-axe`.

---

## Phase 1 — `KjListNavigator` roving-tabindex mode (primitive)

`tree-select` and `dropdown-menu` / `menubar` use **roving tabindex** for keyboard focus (real DOM `.focus()`), not `aria-activedescendant`. Today `KjListNavigator` only supports activedescendant. Add a `kjFocusMode: 'activedescendant' | 'roving'` input (default `'activedescendant'`) before migrating consumers — they need it.

### Task 1: Add `kjFocusMode` input to `KjListNavigator`

**Files:**
- Modify: `packages/core/src/primitives/list/navigator.ts`
- Modify: `packages/core/src/primitives/list/item.ts` (read mode from the parent navigator or via `KJ_LIST_NAVIGATOR_CONFIG`)
- Test: `packages/core/src/primitives/list/navigator.spec.ts`

- [ ] **Step 1: Failing test — roving mode binds tabindex to active item only**

```ts
it('roving mode: only the active item is tabbable (tabindex=0); others are -1', async () => {
  @Component({
    standalone: true,
    imports: [KjListNavigator, KjListItem],
    template: `
      <ul kjListNavigator kjFocusMode="roving">
        <li kjListItem [kjItemValue]="'a'">A</li>
        <li kjListItem [kjItemValue]="'b'">B</li>
      </ul>
    `,
  })
  class Host {}
  const { container, fixture } = await render(Host);
  const nav = fixture.debugElement.query(By.directive(KjListNavigator)).injector.get(KjListNavigator);
  const items = container.querySelectorAll('[kjListItem]');
  // No active yet — first item is the entry point
  nav.moveToFirst();
  fixture.detectChanges();
  expect(items[0].getAttribute('tabindex')).toBe('0');
  expect(items[1].getAttribute('tabindex')).toBe('-1');
  nav.moveBy(1);
  fixture.detectChanges();
  expect(items[0].getAttribute('tabindex')).toBe('-1');
  expect(items[1].getAttribute('tabindex')).toBe('0');
});
```

- [ ] **Step 2: Add `kjFocusMode` input + plumb to items via the config token**

Add to `KjListNavigator`:

```ts
readonly kjFocusMode = input<'activedescendant' | 'roving'>('activedescendant');
```

Expose via a `focusMode` field on the config (read-through). The cleanest path: the navigator publishes its `focusMode` signal on `KJ_LIST_NAVIGATOR_CONFIG` *or* via a small new token `KJ_LIST_FOCUS_MODE`. Pick the token route — the config is owned by the root directive, the focus mode is owned by the navigator directive.

```ts
// new token in tokens.ts
export const KJ_LIST_FOCUS_MODE =
  new InjectionToken<Signal<'activedescendant' | 'roving'>>('KJ_LIST_FOCUS_MODE');
```

`KjListNavigator` provides it via a `useFactory` that returns `this.kjFocusMode`. `KjListItem` injects it `{ optional: true }`.

- [ ] **Step 3: Update `KjListItem` host binding for tabindex**

Replace the hard-coded `'[attr.tabindex]': '"-1"'` with a `tabIndex` computed:

```ts
private readonly focusMode = inject(KJ_LIST_FOCUS_MODE, { optional: true });
readonly tabIndex = computed(() => {
  if (this.focusMode?.() !== 'roving') return -1;
  // Roving: tabbable only when this is the active item AND not disabled.
  if (this.disabled()) return -1;
  return this._nav?.activeId() === this.id ? 0 : -1;
});
```

`KjListItem` needs the parent navigator's `activeId`. Inject `KjListNavigator { optional: true }` to read it. (Acceptable circular concern: the navigator is constructed in the same content tree, not as a parent provider of items, so no cycle.)

- [ ] **Step 4: Roving mode auto-focuses the active item**

```ts
constructor() {
  // ... existing
  effect(() => {
    if (this.kjFocusMode() !== 'roving') return;
    const item = this.activeItem();
    untracked(() => item?._host()?.focus());
  });
}
```

`KjListItem` needs an internal `_host()` accessor returning its native element. Add it.

- [ ] **Step 5: Run navigator tests**

```bash
cd packages/core && pnpm vitest run src/primitives/list/navigator.spec.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/primitives/list
git commit -m "feat(core/primitives): KjListNavigator roving-tabindex focus mode"
```

---

## Phase 2 — Migrate `KjTreeSelect`

The tree carries `role="tree"` with `role="treeitem"` children. Selection has tri-state cascade support via `KjSelectionModel`'s `'cascade'` mode (already implemented). Keyboard nav for tree adds ArrowLeft (collapse / move-to-parent) and ArrowRight (expand / move-to-first-child) on top of the standard navigator contract.

### Task 2: Implement `KjListNavigatorConfig` on `KjTreeSelect`

**Files:**
- Modify: `packages/core/src/tree-select/tree-select-root.ts`
- Modify: `packages/core/src/tree-select/tree-select.context.ts` (keep for back-compat; the context's methods become thin delegates to the model)
- Test: `packages/core/src/tree-select/tree-select.spec.ts`

- [ ] **Step 1: Failing test — root provides `KJ_LIST_NAVIGATOR_CONFIG` with `value` writable signal**

```ts
it('provides KJ_LIST_NAVIGATOR_CONFIG with the kjValue writable signal', async () => {
  const { fixture } = await render(singleTemplate, { imports, componentProperties: { selected: undefined } });
  const root = fixture.debugElement.query(By.directive(KjTreeSelect));
  const cfg = root.injector.get(KJ_LIST_NAVIGATOR_CONFIG);
  expect(cfg.value).toBeDefined();
  cfg.value!.set('apple');
  expect(fixture.componentInstance.selected).toBe('apple');
});
```

- [ ] **Step 2: Add `KjListNavigatorConfig` impl + provide `KjSelectionModel`**

```ts
@Directive({
  selector: '[kjTreeSelect]',
  standalone: true,
  providers: [
    { provide: KJ_TREE_SELECT, useExisting: forwardRef(() => KjTreeSelect) },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjTreeSelect) },
    KjSelectionModel,
    KjOverlayController,
  ],
})
export class KjTreeSelect implements KjListNavigatorConfig, KjTreeSelectContext {
  readonly kjValue = model<unknown>(undefined);
  readonly value   = this.kjValue as WritableSignal<unknown | readonly unknown[] | null>;
  readonly kjSelectionMode = input<'single' | 'multi' | 'leaf' | 'cascade'>('single');
  readonly mode      = this.kjSelectionMode;
  readonly compareBy = signal(Object.is as KjCompareFn<unknown>);
  readonly items     = contentChildren(KjListItem, { descendants: true });

  afterSelect(_: unknown, closeRequested: boolean): void {
    if (closeRequested) this.controller.close('programmatic');
  }
  // existing selectNode/toggleNode/isExpanded etc. either delegate to the
  // selection model or stay (expansion is unique to tree).
}
```

- [ ] **Step 3: Delegate `selectNode` / `isSelected` to the model + emit `kjNodeSelect`**

```ts
selectNode(value: unknown): void {
  this.selection.toggle(value);
  this.kjNodeSelect.emit(value);
}
isSelected(value: unknown): boolean { return this.selection.isSelected(value); }
```

Drop the manual `_selectedValues` signal. `kjValue` is now the canonical signal (already a `model()`).

- [ ] **Step 4: Tree-shape provision for cascade/leaf modes**

Add an input `kjTreeShape: KjTreeShape<unknown> | null` that, when set, feeds `selection.setTreeShape(shape)`. The user's `kjNodes` input could derive a shape, but allowing an explicit override keeps the primitive flexible.

```ts
readonly kjTreeShape = input<KjTreeShape<unknown> | null>(null);
constructor() {
  effect(() => this.selection.setTreeShape(this.kjTreeShape()));
}
```

- [ ] **Step 5: Run tree-select tests**

```bash
cd packages/core && pnpm vitest run src/tree-select
```

Expected: existing tests pass; new test from Step 1 passes.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/tree-select
git commit -m "refactor(core/tree-select): root implements KjListNavigatorConfig + uses KjSelectionModel"
```

### Task 3: Compose `KjListItem` on `KjTreeSelectNode`

**Files:**
- Modify: `packages/core/src/tree-select/tree-select-node.ts`
- Test: `packages/core/src/tree-select/tree-select.spec.ts`

- [ ] **Step 1: Failing test — node host gets generated id from `KjListItem`**

```ts
it('node host element has the KjListItem-generated id', async () => {
  const { container } = await render(singleTemplate, { imports, componentProperties: { selected: undefined } });
  const node = container.querySelector('[kjTreeSelectNode]')!;
  expect(node.id).toMatch(/^kj-list-item-\d+$/);
});
```

- [ ] **Step 2: Hoist `KjListItem` into `hostDirectives` with input aliases**

```ts
@Directive({
  selector: '[kjTreeSelectNode]',
  standalone: true,
  exportAs: 'kjTreeSelectNode',
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjValue',
        'kjItemLabel:kjLabel',
        'kjDisabled:kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-tree-select-node',
    'role': 'treeitem',
    '[attr.aria-level]':        'kjNodeLevel()',
    '[attr.aria-setsize]':      'kjNodeSize()',
    '[attr.aria-posinset]':     'kjNodePos()',
    '[attr.aria-expanded]':     'kjHasChildren() ? (isExpanded() ? "true" : "false") : null',
    '[attr.data-expanded]':     'isExpanded() ? "true" : "false"',
    '[attr.data-has-children]': 'kjHasChildren() ? "true" : "false"',
  },
})
export class KjTreeSelectNode {
  // Drop kjValue, kjLabel, kjDisabled (now on KjListItem via aliases)
  // Drop the manual id, manual handleClick, manual Enter/Space — KjListItem owns these.
  // Drop manual isSelected — KjListItem owns aria-selected via the selection model.
  readonly kjNodeLevel  = input<number>(1);
  readonly kjNodeSize   = input<number>(1);
  readonly kjNodePos    = input<number>(1);
  readonly kjHasChildren = input(false, { transform: booleanAttribute });

  private readonly ctx  = inject(KJ_TREE_SELECT);
  private readonly item = injectListItem<unknown>();
  readonly isExpanded   = computed(() => this.ctx.isExpanded(this.item.id));
}
```

- [ ] **Step 3: Wire `kjTreeSelectToggle` to read the composed item id**

```ts
export class KjTreeSelectToggle {
  private readonly ctx  = inject(KJ_TREE_SELECT);
  private readonly node = inject(KjTreeSelectNode);
  // Old: this.ctx.isExpanded(this.node.id)
  // New: this.node.isExpanded()  — already wired
  readonly isExpanded = this.node.isExpanded;
  handleClick(event: Event): void {
    event.stopPropagation();
    if (this.node['_item']().disabled()) return;
    // Toggle by item id + by value, same as before.
    this.ctx.toggleNode(/* itemId */);
  }
}
```

- [ ] **Step 4: Update spec template if the `kjLabel` input alias breaks**

Currently the template uses `kjLabel="Fruits"`. The hostDirective alias `kjItemLabel:kjLabel` preserves this. No template change needed.

- [ ] **Step 5: Run tests**

```bash
cd packages/core && pnpm vitest run src/tree-select
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/tree-select
git commit -m "refactor(core/tree-select): KjTreeSelectNode composes KjListItem"
```

### Task 4: Switch `KjTreeSelectContent` to use `KjListNavigator` (roving mode) for Up/Down/Home/End

**Files:**
- Modify: `packages/core/src/tree-select/tree-select-content.ts`
- Test: `packages/core/src/tree-select/tree-select.spec.ts`

- [ ] **Step 1: Failing test — ArrowDown moves the active item via `KjListNavigator`**

(Adapt existing keyboard tests to assert `aria-activedescendant` won't apply — roving mode uses real focus. Assert `document.activeElement` matches the next visible node.)

- [ ] **Step 2: Compose `KjListNavigator` on the content host**

```ts
@Component({
  selector: 'kj-tree-select-content',
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    { directive: KjListNavigator, inputs: ['kjOrientation:kjOrientation', 'kjFocusMode:kjFocusMode'] },
  ],
  // ... set kjFocusMode default to 'roving' and kjOrientation to 'both' for ArrowLeft/Right.
})
```

- [ ] **Step 3: Keep ArrowLeft / ArrowRight (expand / collapse) as a custom keydown that runs *before* the navigator's**

The navigator's `_onKeydown` only acts when its own arrow keys match. ArrowLeft/Right in `orientation:'both'` would otherwise move focus horizontally — but in a tree, they have semantic meaning (expand/collapse). Override:

- On ArrowRight on a branch: if collapsed → expand; if expanded → move active to first child (KjListNavigator already moves by 1 next visible, which IS the first child since they're now visible).
- On ArrowLeft on a leaf / collapsed branch: move active to parent (search backward for `aria-level - 1`).
- On ArrowLeft on an expanded branch: collapse.

Decide whether to keep `_getVisibleNodes()` DOM-walking (works) or read from the navigator's `navigable()` signal (cleaner). Prefer the latter.

- [ ] **Step 4: Drop the custom Enter / Space / Home / End / type-ahead handlers**

The navigator covers them.

- [ ] **Step 5: Run tests**

```bash
cd packages/core && pnpm vitest run src/tree-select
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/tree-select
git commit -m "refactor(core/tree-select): content composes KjListNavigator (roving) — keep tree ArrowLeft/Right"
```

---

## Phase 3 — Migrate `KjCascadeSelect`

Cascade select renders nested listboxes per branch, with leaf-only selection. Each panel is a listbox; navigation through ArrowRight opens the sub-panel. `KjSelectionModel` `'leaf'` mode already handles "toggle only when target is a leaf".

### Task 5: Audit cascade-select against `KjSelect` + leaf mode

**Files:**
- Read-only: `packages/core/src/cascade-select/*.ts`

- [ ] **Step 1: Identify what cascade-select reuses from `KjSelect`**

It already composes `KjSelect` internally for the top panel — verify, list the sub-panel surface.

- [ ] **Step 2: Document the leaf-mode requirements**

Cascade uses a tree shape derived from nested options. Each option declares `kjOptionChildren` (or similar). The selection model needs `setTreeShape({ getChildren, getParent, isLeaf })` built from the option metadata.

- [ ] **Step 3: Document selectable surface**

Only **leaf** options should be selectable. Branch options open the sub-panel on hover/click/ArrowRight, never enter `value`.

### Task 6: Wire `KjCascadeSelect` to compose `KjListNavigatorConfig` + leaf-mode selection

**Files:**
- Modify: `packages/core/src/cascade-select/cascade-select-root.ts`
- Modify: `packages/core/src/cascade-select/cascade-select.context.ts`
- Test: `packages/core/src/cascade-select/cascade-select.spec.ts`

- [ ] **Step 1: Failing test — selecting a branch is a no-op**

```ts
it('clicking a branch option does not commit the value (leaf-only selection)', async () => {
  // template with one branch + one leaf
  // click the branch → expect kjValue === undefined still
});
```

- [ ] **Step 2: Set `mode = 'leaf'` on the model + provide tree shape**

```ts
readonly mode      = signal<KjListSelectionMode>('leaf');
readonly compareBy = signal(Object.is as KjCompareFn<unknown>);
constructor() {
  effect(() => this.selection.setTreeShape(this.buildShape()));
}
```

`buildShape()` derives `{ getChildren, getParent, isLeaf }` from the projected `KjListItem`s' parent-child relationships (use a registered map by id or by the option's `kjParentValue`).

- [ ] **Step 3: Each sub-panel is its own `KjListNavigator`**

Sub-panels nest inside the root cascade-select. Each panel composes `KjListNavigator{kjFocusMode:'activedescendant', kjOrientation:'vertical'}`. ArrowRight on a branch → open sub-panel + focus it. ArrowLeft → close sub-panel + focus parent.

- [ ] **Step 4: Run tests + commit**

```bash
pnpm vitest run src/cascade-select
git add packages/core/src/cascade-select
git commit -m "refactor(core/cascade-select): leaf-mode KjSelectionModel + per-panel KjListNavigator"
```

---

## Phase 4 — Migrate `KjDropdownMenu`

Menu has `role="menu"` with `role="menuitem"` children. No selection model — items are actions. Keyboard nav uses roving tabindex, Up/Down + Home/End + type-ahead + Esc.

### Task 7: Compose `KjListItem` (without selection) on `KjDropdownMenuItem`

**Files:**
- Modify: `packages/core/src/dropdown-menu/dropdown-menu-item.ts`
- Test: `packages/core/src/dropdown-menu/dropdown-menu.spec.ts`

- [ ] **Step 1: Failing test — Enter on an item fires `kjSelect`**

(Already passes; assert it still does after composing `KjListItem`.)

- [ ] **Step 2: Hoist `KjListItem` via hostDirectives**

```ts
hostDirectives: [
  { directive: KjListItem, inputs: ['kjItemLabel:kjLabel', 'kjDisabled:kjDisabled', 'kjShortcut:kjShortcut'] },
],
```

Drop the directive's own `handleClick` + keydown bindings; subscribe to `KjListItem.activate` and re-emit as `kjSelect`. (No selection model is provided, so `KjListItem._activate` skips the toggle; `afterSelect` is also skipped because the menu root doesn't implement it.)

- [ ] **Step 3: Run tests + commit**

```bash
pnpm vitest run src/dropdown-menu
git add packages/core/src/dropdown-menu
git commit -m "refactor(core/dropdown-menu): items compose KjListItem"
```

### Task 8: Compose `KjListNavigator` (roving) on `KjDropdownMenuContent`

**Files:**
- Modify: `packages/core/src/dropdown-menu/dropdown-menu-content.ts`

- [ ] **Step 1: Failing test — ArrowDown moves DOM focus to the next item**

- [ ] **Step 2: Compose `KjListNavigator{kjFocusMode:'roving', kjOrientation:'vertical'}`**

The root directive (`KjDropdownMenu`) provides `KJ_LIST_NAVIGATOR_CONFIG` with `items: contentChildren(KjListItem, { descendants: true })`. The content host hosts the navigator.

- [ ] **Step 3: Provide `KjTypeAhead` on the menu**

For character-key item jumping (per ARIA APG menu pattern).

- [ ] **Step 4: Drop the old keyboard handling code**

- [ ] **Step 5: Run tests + commit**

```bash
pnpm vitest run src/dropdown-menu
git commit -m "refactor(core/dropdown-menu): content composes KjListNavigator (roving) + KjTypeAhead"
```

---

## Phase 5 — Migrate `KjMenubar`

Menubar has `role="menubar"` with top-level `role="menuitem"` children, each owning a `role="menu"` submenu. Horizontal navigation at the bar level; vertical inside submenus. Reuses `KjDropdownMenu` for the submenus (per audit `inline menu` was merged).

### Task 9: Compose primitives on `KjMenubar`

**Files:**
- Modify: `packages/core/src/menubar/menubar.ts`
- Modify: `packages/core/src/menubar/menubar-item.ts`
- Modify: `packages/core/src/menubar/menubar.context.ts`
- Test: `packages/core/src/menubar/menubar.spec.ts`

- [ ] **Step 1: Failing tests — bar horizontal nav + submenu vertical nav**

- [ ] **Step 2: Bar implements `KjListNavigatorConfig` (items = top-level menubar-items)**

```ts
@Directive({
  selector: '[kjMenubar]',
  providers: [
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjMenubar) },
  ],
  hostDirectives: [
    { directive: KjListNavigator, inputs: ['kjFocusMode:kjFocusMode'] },
  ],
})
```

`kjOrientation = 'horizontal'`, `kjFocusMode = 'roving'`.

- [ ] **Step 3: Each `KjMenubarItem` composes `KjListItem` (the bar's item) + manages its own `KjDropdownMenu` for the submenu**

- [ ] **Step 4: Drop manual keyboard nav in `menubar.ts`**

- [ ] **Step 5: Run tests + commit**

```bash
pnpm vitest run src/menubar
git commit -m "refactor(core/menubar): bar + submenu compose list primitives"
```

---

## Phase 6 — Integration sweep + delete dead context

### Task 10: Remove dead context interfaces

**Files:**
- Delete (or shrink to thin delegates): `packages/core/src/tree-select/tree-select.context.ts`, `cascade-select/cascade-select.context.ts`, `dropdown-menu` (no context today, skip), `menubar/menubar.context.ts`

- [ ] **Step 1: Find external callers** — `grep KJ_TREE_SELECT KJ_CASCADE_SELECT KJ_MENUBAR`
- [ ] **Step 2: If only intra-cluster, delete the context** and inject the root directive directly
- [ ] **Step 3: Update barrels** (`index.ts` per cluster)
- [ ] **Step 4: Run full core test suite**

```bash
cd packages/core && pnpm vitest run
```

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(core): remove dead per-cluster context tokens after primitives migration"
```

### Task 11: Update audit doc + add usage docs

**Files:**
- Modify: `docs/audits/patterns-and-duplications.md` (mark cluster rows ✅ done)
- Modify: usage / overview docs for tree-select, cascade-select, dropdown-menu, menubar to mention the shared primitives

- [ ] Step 1: One row per directive in the cat-2 table reflecting primitive composition.
- [ ] Step 2: Run docs site build smoke test.
- [ ] Step 3: Commit.

---

## Cross-cutting acceptance criteria

For each migrated cluster:

- **A11y unchanged or improved.** Run `jest-axe` in the cluster spec; assert no violations. Existing aria-* attributes remain.
- **Keyboard contract preserved.** Each cluster's existing keyboard tests pass against the new primitive-based wiring.
- **Public API preserved.** Inputs / outputs / exported types on the cluster's directives keep their names. Internal context tokens may be removed.
- **No new `inject(KjSelectionModel)` in a root directive** — that would re-introduce the construction-time cycle the listbox-primitives PR fixed.
- **Roving-tabindex correctness.** First visible non-disabled item is tabbable on first render (`tabindex="0"`); siblings `tabindex="-1"`; active item updates roll the tabindex.
- **AAA contrast / target size unchanged.** No host CSS regressions.
