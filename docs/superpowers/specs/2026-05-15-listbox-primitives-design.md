# Listbox Primitives — Design

Extract shared behavior from the listbox-cluster directives (`KjSelect`,
`KjCombobox`, `KjCommandPalette`) into 5 reusable primitives under
`packages/core/src/primitives/list/`. Public API of the consumer
directives is unchanged. Internals stop duplicating navigation,
selection, filter, and type-ahead logic.

Companion to [`docs/audits/patterns-and-duplications.md`](../../audits/patterns-and-duplications.md)
category **#2 — Listbox + active descendant navigation**. This spec
refines the audit's section 2 with the section 4 conclusion (use
`contentChildren()` instead of a custom item registry) and adds a child
primitive (`KjListItem`) that the audit did not name.

## Scope

In scope (listbox cluster — `aria-activedescendant` ARIA contract):

- `KjSelect` (+ `KjSelectContent`, `KjOption`) — already absorbed
  `multi-select` via `[kjMultiple]`
- `KjCombobox` (+ `KjComboboxInput`, `KjComboboxListbox`, `KjComboboxOption`)
- `KjCommandPalette` (+ `KjCommandList`, `KjCommandItem`, etc.)

Out of scope (menu cluster, roving-tabindex — handled in a follow-up
spec):

- `KjDropdownMenu`, `KjMenu`, `KjTreeSelect`, `KjCascadeSelect`

Out of scope (audit cross-references):

- Overlay-trigger primitives (cat 1 — already shipped)
- Form-control bridge (cat 3 — separate effort)
- ARIA labelling (cat 7 — separate effort)

## Architecture

```
packages/core/src/primitives/list/
├── navigator.ts         — KjListNavigator     (hostDirective)
├── navigator.spec.ts
├── item.ts              — KjListItem          (hostDirective)
├── item.spec.ts
├── selection.ts         — KjSelectionModel<T> (provider service)
├── selection.spec.ts
├── filterable-list.ts   — KjFilterableList<T> (provider service)
├── filterable-list.spec.ts
├── type-ahead.ts        — KjTypeAhead         (provider service)
├── type-ahead.spec.ts
├── inject-helpers.ts    — injectListItem<T>, injectSelectionModel<T>, injectFilterableList<T>
├── tokens.ts            — KJ_LIST_NAVIGATOR_CONFIG + types
└── index.ts
```

Wired up via `KJ_LIST_NAVIGATOR_CONFIG`. Consumer root directives
(`KjSelect` / `KjCombobox` / `KjCommandPalette`) implement the contract
by exposing a `contentChildren(KjListItem, { descendants: true })`
signal — registration is the framework's job, not a custom service.

### Composition table

| Consumer | Items source (`contentChildren`) | Container `hostDirectives` | Item `hostDirectives` | Services provided |
|---|---|---|---|---|
| `KjSelect` (+ content + option) | on root | `KjListNavigator` on `KjSelectContent` | `KjListItem` on `KjOption` | `KjSelectionModel<unknown>` (single + multi), `KjTypeAhead` |
| `KjCombobox` (+ input + listbox + option) | on root | `KjListNavigator` on `KjComboboxInput` | `KjListItem` on `KjComboboxOption` | `KjSelectionModel<unknown>` (single only), `KjFilterableList<unknown>` |
| `KjCommandPalette` (+ list + item) | on root | `KjListNavigator` on `KjCommandList` | `KjListItem` on `KjCommandItem` | `KjFilterableList<unknown>` |

Note for combobox: `KjListNavigator` mounts on the **input element**
(where `aria-activedescendant` lives per APG combobox 1.2), not on the
listbox panel. The items signal is sourced from the root via the
shared config token.

## A11y contract (WCAG 2.1 AAA)

| Concern | Owned by | Criteria |
|---|---|---|
| `aria-activedescendant` | `KjListNavigator` (host binding) | 4.1.2 |
| `aria-selected` (explicit `true`/`false` in multi mode) | `KjListItem` reading `KjSelectionModel` | 4.1.2 |
| `aria-disabled` | `KjListItem` reading composed `KjDisabled` | 4.1.2 |
| `aria-posinset` / `aria-setsize` (visible set, filter-aware) | `KjListItem` stamped by `KjFilterableList` | 1.3.1 |
| `aria-keyshortcuts` | `KjListItem` via `kjShortcut` input (opt-in) | 4.1.2 (AAA UX) |
| `id` (stable, no `afterNextRender` race) | `KjListItem` (monotonic counter at construction) | 4.1.2 |
| `hidden` attribute on filtered-out items (removes from a11y tree) | `KjListItem` reading `visible()` signal | 1.3.1 |
| Result-count announcement on filter change (polite live region) | `KjFilterableList` via `KjLiveAnnouncer` | 4.1.3 |
| `role` (`listbox` / `option` / `combobox`) | **Consumer's outer directive** — varies per cluster | 4.1.2 |
| `aria-label` / `aria-labelledby` on listbox panel | **Consumer's outer directive** | 4.1.2 |
| `aria-multiselectable` on listbox panel | **Consumer's outer directive** (reads `KjSelectionModel.mode()`) | 4.1.2 |
| `aria-expanded`, `aria-controls`, `aria-autocomplete` on combobox input | **Consumer's outer directive** | 4.1.2 |

### Keyboard contract (handled by `KjListNavigator`)

| Key | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | Move active to next/prev non-disabled visible item. Wraps per `kjWrap`. |
| `Home` / `End` | First / last non-disabled visible item. |
| `PageDown` / `PageUp` | Move by `kjPageSize` (default 10). |
| `Enter` / `Space` | Activate current item (delegates to `KjListItem._activate`). |
| Alphanumeric | Delegated to `KjTypeAhead` if provided. |
| `Escape` | NOT handled here — owned by `KjOverlayPanel` (cat 1). |

Per WCAG 2.1.1 all interactive keys must be reachable; the navigator
covers the WAI-ARIA APG listbox keyboard contract in full.

## API surface

### `tokens.ts`

```ts
export interface KjListNavigatorConfig {
  /** All registered items in DOM order. */
  readonly items: Signal<readonly KjListItem<unknown>[]>;
  /** Filter-aware visible subset. Defaults to `items` when not provided. */
  readonly visibleItems?: Signal<readonly KjListItem<unknown>[]>;
}

export const KJ_LIST_NAVIGATOR_CONFIG =
  new InjectionToken<KjListNavigatorConfig>('KJ_LIST_NAVIGATOR_CONFIG');

export type KjListOrientation = 'vertical' | 'horizontal' | 'both';
export type KjListSelectionMode = 'single' | 'multi';
export type KjFilterFn = (query: string, haystacks: readonly string[]) => number;
export type KjCompareFn<T> = (a: T, b: T) => boolean;
```

### `KjListItem<T>`

Hostable on any child element. Composes `KjDisabled`. Provides id,
value, label, haystacks, visibility, and a11y bindings. Consumer's
outer directive sets `role` and subscribes to `activate`.

```ts
@Directive({
  selector: '[kjListItem]',
  exportAs: 'kjListItem',
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    '[id]': 'id',
    '[hidden]': '!visible() || null',
    '[attr.tabindex]': '-1',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-posinset]': 'posInSet()',
    '[attr.aria-setsize]': 'setSize()',
    '[attr.aria-keyshortcuts]': 'kjShortcut() || null',
    '(click)': '_activate()',
    '(keydown.enter)': '$event.preventDefault(); _activate()',
    '(keydown.space)': '$event.preventDefault(); _activate()',
  },
})
export class KjListItem<T = unknown> {
  readonly kjItemValue    = input<T>();
  readonly kjItemLabel    = input<string>('');
  readonly kjItemKeywords = input<readonly string[]>([]);
  readonly kjShortcut     = input<string | null>(null);

  readonly activate = output<T | undefined>();

  readonly id = `kj-list-item-${++_id}`;
  readonly disabled = inject(KjDisabled).disabled;

  readonly value     = computed<T | undefined>(() => this.kjItemValue());
  readonly label     = computed<string>(() => this.kjItemLabel() || this.elText());
  readonly haystacks = computed<readonly string[]>(() => [this.label(), ...this.kjItemKeywords()]);

  /** @internal — KjFilterableList toggles. */
  setVisible(v: boolean): void;
  readonly visible: Signal<boolean>;

  /** @internal — KjFilterableList stamps. null = no filter active. */
  readonly posInSet: WritableSignal<number | null>;
  readonly setSize:  WritableSignal<number | null>;

  /** Aria-selected: null when no selection model; "true"/"false" otherwise. */
  readonly ariaSelected: Signal<'true' | 'false' | null>;

  _activate(): void;
}
```

### `KjListNavigator`

```ts
@Directive({
  selector: '[kjListNavigator]',
  exportAs: 'kjListNavigator',
  host: {
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': '_onKeydown($event)',
  },
})
export class KjListNavigator {
  readonly kjOrientation     = input<KjListOrientation>('vertical');
  readonly kjWrap            = input<boolean>(true);
  readonly kjPageSize        = input<number>(10);
  readonly kjActivateOnHover = input<boolean>(false);

  readonly kjActiveChange = output<string | null>();

  readonly activeId:   Signal<string | null>;
  readonly activeItem: Signal<KjListItem<unknown> | null>;

  moveBy(delta: number): void;
  moveToFirst(): void;
  moveToLast(): void;
  setActive(id: string | null): void;
  activateCurrent(): void;
}
```

### `KjSelectionModel<T>`

```ts
@Injectable()
export class KjSelectionModel<T = unknown> {
  readonly mode:  Signal<KjListSelectionMode>;
  readonly value: Signal<T | readonly T[] | null>;

  /** Defaults to `Object.is`. Consumer root pushes user-provided fn here. */
  setCompareBy(fn: KjCompareFn<T>): void;
  setMode(mode: KjListSelectionMode): void;
  setValue(v: T | readonly T[] | null): void;

  isSelected(target: T): boolean;
  /** Returns `{ closeRequested }` so consumers decide overlay behavior. */
  toggle(target: T): { closeRequested: boolean };
  clear(): void;
}
```

### `KjFilterableList<T>`

```ts
@Injectable()
export class KjFilterableList<T = unknown> {
  readonly query:        Signal<string>;
  readonly visibleItems: Signal<readonly KjListItem<T>[]>;
  readonly visibleCount: Signal<number>;
  readonly isEmpty:      Signal<boolean>;

  setQuery(q: string): void;
  setFilterFn(fn: KjFilterFn): void;
  setShouldFilter(b: boolean): void;
  setAutoActivateFirst(b: boolean): void;

  // Effects (constructor-installed):
  //   1. setVisible() + stamp posInSet/setSize on each item
  //   2. announce visibleCount on query change (debounced, polite)
  //   3. when autoActivateFirst, snap navigator.activeId to first visible
}
```

### `KjTypeAhead`

```ts
@Injectable()
export class KjTypeAhead {
  readonly debounceMs: WritableSignal<number>;
  /** Called by KjListNavigator on single-char keys. Returns matched item id. */
  match(key: string, items: readonly KjListItem<unknown>[]): string | null;
  reset(): void;
}
```

### Typed inject helpers

```ts
// inject-helpers.ts
export const injectListItem        = <T>() => inject(KjListItem)        as KjListItem<T>;
export const injectSelectionModel  = <T>() => inject(KjSelectionModel)  as KjSelectionModel<T>;
export const injectFilterableList  = <T>() => inject(KjFilterableList)  as KjFilterableList<T>;
```

## Consumer wiring — `KjSelect` reference

```ts
@Directive({
  selector: '[kjSelect]',
  exportAs: 'kjSelect',
  providers: [
    { provide: KJ_SELECT, useExisting: KjSelect },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjSelect },
    KjSelectionModel,
    KjTypeAhead,
    KjOverlayController,
  ],
})
export class KjSelect implements KjListNavigatorConfig {
  readonly items = contentChildren(KjListItem, { descendants: true });
  readonly kjSelectValue = model<unknown>(undefined);
  readonly kjCompareBy = input<KjCompareFn<unknown>>(Object.is);

  private readonly selection = injectSelectionModel<unknown>();

  constructor() {
    effect(() => this.selection.setCompareBy(this.kjCompareBy()));
    effect(() => this.selection.setValue(this.kjSelectValue()));
    effect(() => this.kjSelectValue.set(this.selection.value() as unknown));
  }
}

@Component({
  selector: 'kj-select-content',
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
  ],
  host: {
    'role': 'listbox',
    '[attr.aria-multiselectable]':
      'selection.mode() === "multi" ? "true" : null',
  },
})
export class KjSelectContent {
  protected readonly selection = injectSelectionModel<unknown>();
}

@Directive({
  selector: '[kjOption]',
  hostDirectives: [
    { directive: KjListItem, inputs: ['kjItemValue:kjOptionValue', 'kjItemLabel'] },
  ],
  host: { 'role': 'option' },
})
export class KjOption {
  private readonly item       = injectListItem<unknown>();
  private readonly selection  = injectSelectionModel<unknown>();
  private readonly controller = inject(KjOverlayController);

  constructor() {
    this.item.activate.subscribe(value => {
      const { closeRequested } = this.selection.toggle(value);
      if (closeRequested) this.controller.close('programmatic');
    });
  }
}
```

Combobox and command-palette follow the same shape (additionally
providing `KjFilterableList`, and combobox mounting `KjListNavigator`
on the input instead of the panel).

## Migration order

1. **Build the 5 primitives + tests** under `packages/core/src/primitives/list/`. No consumer changes yet.
2. **Migrate `KjSelect`** end-to-end. Simplest case (no filter). Validates `KjListNavigator` + `KjListItem` + `KjSelectionModel` + `KjTypeAhead` against a real consumer.
3. **Migrate `KjCommandPalette`**. Adds `KjFilterableList`, no selection.
4. **Migrate `KjCombobox`**. Adds the full stack (filter + selection + navigator-on-input).
5. **Cleanup**: drop the per-consumer `*.context.ts` registries that are now obsolete (`combobox.context.ts`, `command-palette.context.ts` — keep tokens, drop registration ifaces).
6. **Public exports** via `packages/core/src/public-api.ts` so consumers of `@kouji-ui/core` can use the primitives directly.

Each migration is its own commit; tests stay green at each step.

## Testing strategy

Unit-level (Vitest + Angular testing utils — same as existing `*.spec.ts`):

- `navigator.spec.ts`: arrow/home/end/pageup/pagedown/enter/space dispatch; wrap vs clamp; disabled-skip; orientation horizontal/vertical/both
- `item.spec.ts`: id minted at construction (no race); aria-disabled/selected/posinset/setsize bindings; activate emission; hidden attr toggling
- `selection.spec.ts`: single vs multi `isSelected`/`toggle`; `compareBy` custom fn; `closeRequested` return; explicit `aria-selected="false"` in multi
- `filterable-list.spec.ts`: filter fn application; visibleItems signal; setVisible side-effect; live-announcer call on debounced query change; posInSet/setSize stamping
- `type-ahead.spec.ts`: buffer behavior; debounce window; disabled-skip; reset

Integration (existing `select.spec.ts`, `combobox.spec.ts`,
`command-palette.spec.ts` updated): assert behavior parity — keyboard
nav, selection emission, filter outcome, ARIA exposure — after the
migration.

E2E (manual + docs Playground in Chrome via MCP): walk each consumer
in the docs Playground with VoiceOver/NVDA-compat ARIA output checked
against the existing baseline.

## Out of scope / followups

- Menu cluster (`KjMenu`, `KjDropdownMenu`, `KjTreeSelect`,
  `KjCascadeSelect`) — same primitives reused in a follow-up spec.
  Will require a roving-tabindex mode flag on `KjListNavigator` and a
  small `KjPortalChildRegistry` (audit section 4) for portal'd menu
  children that escape `contentChildren()`.
- Virtualization (`aria-posinset` for huge lists) — deferred per audit
  roadmap item #3.
- `aria-keyshortcuts` discoverability UI (visible kbd hints) — handled
  per-consumer in the docs Playground, not in primitives.

## Risks

| Risk | Mitigation |
|---|---|
| `contentChildren()` doesn't see options projected through templates | Verify with combobox's nested compound; fall back to a small DI register if needed |
| Effect feedback loops between `kjSelectValue` ↔ `selection.value` | Use `untracked` reads inside the bridging effects (pattern already used in command-palette) |
| Double composition of `KjDisabled` (item-side + consumer-side) | `KjListItem` composes it; consumer's outer directive does NOT — reads via `inject(KjDisabled)` only |
| Generic typing erased at DI — runtime `unknown` | Documented; typed inject helpers give compile-time safety |
