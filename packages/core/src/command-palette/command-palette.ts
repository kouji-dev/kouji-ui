import {
  Directive,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjFilterableList,
  KjListItem,
  KjListNavigator,
  KjTypeAhead,
  type KjFilterFn,
  type KjListNavigatorConfig,
} from '../primitives/list';

let _listIdCounter = 0;
/** Allocate a stable command list id. */
export function nextCommandListId(): string {
  return `kj-command-list-${++_listIdCounter}`;
}

/** Payload for the `kjActivate` output. */
export interface KjCommandActivateEvent {
  readonly value: unknown;
  readonly query: string;
}

/**
 * Root state container for the command palette. Provides
 * KJ_LIST_NAVIGATOR_CONFIG (items via contentChildren), KjFilterableList,
 * and KjTypeAhead. Children inject `KjCommandPalette` directly.
 *
 * @doc
 * @doc-example Inline
 *   @doc-file command-palette.example.ts
 * @doc-example Dialog (modal)
 *   @doc-file command-palette.dialog.example.ts
 * @doc-example With groups
 *   @doc-file command-palette.groups.example.ts
 * @doc-example Async search
 *   @doc-file command-palette.async.example.ts
 * @doc-example Fuzzy filter
 *   @doc-file command-palette.fuzzy.example.ts
 * @doc-category Core/Actions
 * @doc-name command-palette
 * @doc-description Unstyled command palette root with item registration, filtering, and activation events.
 * @doc-is-main
 */
@Directive({
  selector: '[kjCommandPalette]',
  standalone: true,
  exportAs: 'kjCommandPalette',
  providers: [
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjCommandPalette },
    KjFilterableList,
    KjTypeAhead,
  ],
})
export class KjCommandPalette implements KjListNavigatorConfig {
  /** Pluggable filter function. */
  readonly kjFilter = input<KjFilterFn | null>(null);
  /** When `false`, internal filtering is skipped (server-side / consumer-controlled). */
  readonly kjShouldFilter      = input<boolean, unknown>(true,  { transform: booleanAttribute });
  /** Show the loading state. */
  readonly kjLoading           = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** Reset the active item to the first visible item on query change. */
  readonly kjAutoActivateFirst = input<boolean, unknown>(true,  { transform: booleanAttribute });
  /** Close the host dialog on activation. */
  readonly kjDismissOnActivate = input<boolean, unknown>(true,  { transform: booleanAttribute });

  /** Two-way bindable active value (highlighted item, not committed). */
  readonly kjValue = model<unknown>(null);
  /** Two-way bindable query text. */
  readonly kjQuery = model<string>('');

  /** Fires when an item is activated. */
  readonly kjActivate = output<KjCommandActivateEvent>();

  /** Stable listbox id for `aria-controls` wiring. */
  readonly listId = nextCommandListId();
  /** All `KjListItem`s under this palette. Source of truth for nav + filter. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  private readonly filterSvc = inject(KjFilterableList);

  /** Visible (filter-passing) items. */
  readonly visibleItems = computed(() => this.filterSvc.visibleItems() as readonly KjListItem<unknown>[]);
  readonly query        = computed(() => this.kjQuery());
  readonly activeValue  = computed(() => this.kjValue());
  readonly loading      = computed(() => this.kjLoading());

  /** Default filter — substring match across haystacks. */
  private readonly defaultFilter: KjFilterFn = (q, hs) => {
    if (!q) return 1;
    const needle = q.toLowerCase();
    return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;
  };

  /** Bound source: custom filter when provided, else default. */
  private readonly resolvedFilter = computed<KjFilterFn>(
    () => this.kjFilter() ?? this.defaultFilter,
  );

  /** @internal — set by `KjCommandInput`'s lifecycle. */
  private readonly _nav = signal<KjListNavigator | null>(null);

  /** @internal */
  _setNavigator(n: KjListNavigator | null): void { this._nav.set(n); }

  /** Currently active descendant id (or null). Wired to input's `aria-activedescendant`. */
  readonly activeId = computed(() => this._nav()?.activeId() ?? null);

  constructor() {
    this.filterSvc.bind({
      items:             this.items,
      query:             this.kjQuery,
      filterFn:          this.resolvedFilter,
      shouldFilter:      this.kjShouldFilter,
      autoActivateFirst: this.kjAutoActivateFirst,
    });

    // Auto-activate first visible item on query change.
    effect(() => {
      this.kjQuery();
      const autoFirst = this.kjAutoActivateFirst();
      if (!autoFirst) return;
      untracked(() => {
        const visible = this.visibleItems();
        const nav = this._nav();
        if (visible.length > 0) {
          this.kjValue.set(visible[0].value());
          if (nav) nav.setActive(visible[0].id);
        } else {
          this.kjValue.set(null);
          if (nav) nav.setActive(null);
        }
      });
    });

    // When items register asynchronously (same query), pick first if nothing highlighted.
    effect(() => {
      const visible = this.visibleItems();
      const active = this.kjValue();
      const autoFirst = this.kjAutoActivateFirst();
      if (!autoFirst || visible.length === 0 || active !== null) return;
      untracked(() => {
        const nav = this._nav();
        this.kjValue.set(visible[0].value());
        if (nav) nav.setActive(visible[0].id);
      });
    });

    // When the navigator is registered (ngOnInit of KjCommandInput), seed
    // the active item so aria-activedescendant is correct from first render.
    effect(() => {
      const nav = this._nav();
      if (!nav) return;
      const autoFirst = this.kjAutoActivateFirst();
      if (!autoFirst) return;
      untracked(() => {
        if (nav.activeId() !== null) return;
        const visible = this.visibleItems();
        if (visible.length > 0) {
          nav.setActive(visible[0].id);
          this.kjValue.set(visible[0].value());
        }
      });
    });
  }

  setQuery(q: string): void {
    this.kjQuery.set(q);
  }

  activate(value: unknown): void {
    this.kjValue.set(value);
    const nav = this._nav();
    if (nav) {
      const item = this.items().find(i => i.value() === value);
      if (item) nav.setActive(item.id);
    }
    this.kjActivate.emit({ value, query: this.kjQuery() });
  }
}
