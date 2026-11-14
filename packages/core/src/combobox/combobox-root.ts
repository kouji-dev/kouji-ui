import {
  Directive,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { KjDisabled } from '../primitives';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjFilterableList,
  KjListItem,
  ownListItems,
  KjListNavigator,
  KjSelectionModel,
  type KjFilterFn,
  type KjListNavigatorConfig,
  type KjListSelectionMode,
  type KjListVirtualSource,
} from '../primitives/list';
import { KjId } from '../primitives/overlay/id';

/** Default substring filter — case-insensitive contains match. */
export const kjContainsFilter = (query: string, label: string): boolean => {
  if (!query) return true;
  return label.toLowerCase().includes(query.toLowerCase());
};

/** Case-insensitive prefix match. */
export const kjStartsWithFilter = (query: string, label: string): boolean => {
  if (!query) return true;
  return label.toLowerCase().startsWith(query.toLowerCase());
};

/**
 * Root combobox / autocomplete container. Provides
 * KJ_LIST_NAVIGATOR_CONFIG via contentChildren(KjListItem),
 * KjSelectionModel (single mode), KjFilterableList, and the shared
 * KjOverlayController. Children (`KjComboboxInput`, `KjComboboxListbox`,
 * `KjComboboxOption`) inject `KjCombobox` directly.
 *
 * Compound shape — pair with [kjComboboxInput], [kjComboboxListbox] and
 * [kjComboboxOption]:
 *
 * ```html
 * <div kjCombobox [(kjValue)]="country" [(kjQuery)]="q">
 *   <input kjComboboxInput placeholder="Search countries" />
 *   <div kjComboboxListbox>
 *     <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
 *     <button kjComboboxOption [kjOptionValue]="'de'">Germany</button>
 *   </div>
 * </div>
 * ```
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjCombobox]',
  standalone: true,
  exportAs: 'kjCombobox',
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  providers: [
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjCombobox) },
    KjSelectionModel,
    KjFilterableList,
    KjOverlayController,
  ],
  host: {
    '[attr.data-state]': "open() ? 'open' : 'closed'",
  },
})
export class KjCombobox implements KjListNavigatorConfig {
  /** The currently selected value. Two-way bindable. */
  readonly kjValue = model<unknown>(null);

  /**
   * Implements `KjListNavigatorConfig.value`. The selection model reads
   * and writes through this same signal — one source of truth.
   */
  readonly value = this.kjValue as unknown as WritableSignal<
    unknown | readonly unknown[] | null
  >;

  /** Implements `KjListNavigatorConfig.mode`. Combobox is always single. */
  readonly mode: Signal<KjListSelectionMode> = signal('single');

  /** Input half of the two-way `kjQuery`; seeds {@link kjQuery}. Default `''`. */
  // eslint-disable-next-line @angular-eslint/no-input-rename -- alias keeps the public `kjQuery` name distinct from this internal linkedSignal-backed property
  readonly kjQueryInput = input<string>('', { alias: 'kjQuery' });

  /** The current query string typed into the input. Two-way bindable via `kjQuery`. */
  readonly kjQuery: WritableSignal<string> = linkedSignal(this.kjQueryInput);

  /** Whether the directive should run its built-in synchronous filter. Default `true`. */
  readonly kjShouldFilter = input(true, { transform: booleanAttribute });

  /** Whether the consumer is currently fetching options. Reflects `aria-busy` on the input. */
  readonly kjLoading = input(false, { transform: booleanAttribute });

  /** Whether free-text values (not from the option set) may be committed. */
  readonly kjFreeText = input(false, { transform: booleanAttribute });

  /** Filter function used for synchronous filtering. Default {@link kjContainsFilter}. */
  readonly kjFilter = input<(query: string, label: string) => boolean>(kjContainsFilter);

  /** Whether the first matching option is auto-activated as the user types. Default `true`. */
  readonly kjAutoActivateFirst = input(true, { transform: booleanAttribute });

  /** Emitted with the new query on every keystroke. */
  readonly kjQueryChange = output<string>();

  /** Emitted on commit (option selected, free-text submitted). */
  readonly kjCommit = output<unknown>();

  private readonly controller = inject(KjOverlayController);
  private readonly filter     = inject(KjFilterableList);
  private readonly _selection = inject(KjSelectionModel);

  /** Implements `KjListNavigatorConfig.compareBy`. */
  readonly compareBy = signal((a: unknown, b: unknown) => Object.is(a, b));

  /** Stable listbox id for `aria-controls` wiring. */
  readonly listboxId = inject(KjId).mint('combobox');

  /**
   * Raw content query. `descendants: true` reaches straight through a
   * list composite nested inside this combobox, so it is never read
   * directly — `items` narrows it to this container's own scope.
   */
  private readonly allItems = contentChildren(KjListItem, { descendants: true });
  private readonly _viewItems = signal<Signal<readonly KjListItem<unknown>[]> | null>(null);
  private readonly viewItems = computed(() => this._viewItems()?.() ?? null);

  /**
   * @internal Register rows a wrapper stamps in its OWN view.
   *
   * A content query only reaches what is projected into the host element
   * and never crosses into a component's view, so `<kj-combobox [options]>`
   * — which renders its rows from its own template — has to hand them over
   * explicitly or they would never join `items()`, and nothing would filter,
   * number or navigate them.
   */
  _setViewItems(items: Signal<readonly KjListItem<unknown>[]> | null): void {
    this._viewItems.set(items);
  }

  /**
   * Every row this combobox owns — the ones its wrapper stamped plus the
   * ones projected in. Rows owned by a list composite nested inside this one
   * (a select inside a palette, a menu inside a select) answer to that
   * composite, not to this one.
   */
  readonly items = ownListItems(this, this.allItems, this.viewItems);

  /** Filter-aware visible items, exposed for KjListNavigatorConfig. */
  readonly visibleItems = computed(
    () => this.filter.visibleItems() as readonly KjListItem<unknown>[],
  );

  /**
   * Text the user typed since the list last closed or a value was picked —
   * the only text that filters the list. `kjQuery` also carries the picked
   * row's name (so the field reads as a picker), and filtering by it would
   * list nothing but the picked row on every later open.
   */
  private readonly _typed = signal('');
  readonly filterQuery = this._typed.asReadonly();

  /** Public surface read by children. */
  readonly query         = this.kjQuery.asReadonly();
  readonly open          = this.controller.isOpen;
  readonly loading       = this.kjLoading;
  readonly allowFreeText = this.kjFreeText;
  readonly shouldFilter  = this.kjShouldFilter;
  readonly visibleCount  = computed(() => this.filter.visibleCount());

  private readonly _inputEl = signal<HTMLElement | null>(null);
  readonly inputElement = this._inputEl.asReadonly();

  /** @internal — set by KjComboboxInput's lifecycle. Signal so auto-activate
   *  effects can re-run when the navigator becomes available. */
  private readonly _nav = signal<KjListNavigator | null>(null);
  _setNavigator(n: KjListNavigator | null): void { this._nav.set(n); }

  /** Currently active descendant id (or null). */
  readonly activeId = computed(() => this._nav()?.activeId() ?? null);

  /** Adapts the consumer `(query, label) => boolean` shape into the
   *  primitive's `KjFilterFn` shape. Derived; no effect/setter needed. */
  private readonly adaptedFilter = computed<KjFilterFn>(() => {
    const userFn = this.kjFilter();
    return (q, hs) => (hs.some(h => userFn(q, h)) ? 1 : 0);
  });

  private readonly _virtual = signal<KjListVirtualSource | null>(null);

  /**
   * Implements `KjListNavigatorConfig.virtual`. Non-null only while a
   * windowed wrapper (`<kj-combobox [virtual]>`) renders a slice of its
   * `[options]` — `KjListNavigator` then walks the option data by index, so
   * ArrowDown reaches option 4 000 although only a window of rows exists.
   */
  readonly virtual = this._virtual.asReadonly();

  /**
   * @internal Register (or clear) the windowed cursor.
   *
   * While one is registered the combobox stands down from the two jobs the
   * wrapper has taken over: filtering (only matching rows are ever
   * rendered, so a second per-row filter would re-decide the same question
   * against DOM text) and seeding the active option (the cursor is a data
   * index, not a rendered id).
   */
  _setVirtualSource(source: KjListVirtualSource | null): void {
    this._virtual.set(source);
  }

  /** @internal Point `aria-activedescendant` at a rendered row, for a wrapper that owns the cursor. */
  _setActiveId(id: string | null): void {
    this._nav()?.setActive(id);
  }

  constructor() {
    this.filter.bind({
      items:             this.items,
      query:             this._typed,
      filterFn:          this.adaptedFilter,
      // A windowed wrapper has already filtered the DATA; every rendered
      // row is a match by construction.
      shouldFilter:      computed(() => this.kjShouldFilter() && this._virtual() === null),
      autoActivateFirst: this.kjAutoActivateFirst,
    });
    this._selection.bind({
      value:     this.value,
      items:     this.items,
      mode:      this.mode,
      compareBy: this.compareBy,
    });
    effect(() => this.kjQueryChange.emit(this.kjQuery()));

    // Typed text lasts until the list closes (a pick closes it too).
    effect(() => {
      if (!this.open()) untracked(() => this._typed.set(''));
    });

    // Place the cursor on open, on typing and once the navigator attaches.
    // Typed text: the first match, so Enter commits it without an ArrowDown
    // (APG combobox 1.2). No typed text: the picked row when it is listed,
    // else the first — never the first row while another one is picked, or
    // two rows read as chosen.
    effect(() => {
      const typed = this._typed();
      this.open();
      const nav = this._nav();
      if (!this.kjAutoActivateFirst() || !nav || this._virtual() !== null) return;
      untracked(() => {
        const visible = this.filter.visibleItems() as readonly KjListItem<unknown>[];
        const picked = typed === '' ? visible.find(i => this.isPicked(i)) : undefined;
        nav.setActive((picked ?? visible[0])?.id ?? null);
      });
    });

    // Write the picked row's name into the field when the VALUE changes, or
    // when that row's text first renders (`label()` falls back to the row's
    // text after its first render). Never because the user emptied the
    // field: an empty field lists every option. A windowed wrapper owns this
    // too: `items()` is a window, so a value whose row is scrolled out would
    // never be found here.
    let shown: { readonly value: unknown; readonly label: string } | null = null;
    let seeded = false;
    effect(() => {
      const v = this.kjValue();
      if (v === null || v === undefined) { shown = null; return; }
      if (this._virtual() !== null) return;
      const label = this.items().find(i => i.value() === v)?.label();
      if (!label) return;
      if (shown && Object.is(shown.value, v) && shown.label === label) return;
      shown = { value: v, label };
      const first = !seeded;
      seeded = true;
      untracked(() => {
        // A consumer-bound `kjQuery` beats the preset value's name on first render.
        if (first && this.kjQuery() !== '') return;
        this.kjQuery.set(label);
      });
    });
  }

  private isPicked(item: KjListItem<unknown>): boolean {
    const v = item.value();
    return v !== undefined && this._selection.isSelected(v);
  }

  /** Text typed into the input: sets the query, filters the list by it and opens it. */
  setQuery(value: string): void {
    if (this.kjQuery() !== value) this.kjQuery.set(value);
    this._typed.set(value);
    this.controller.open();
  }

  /**
   * Programmatic select used by `commitActive()` (Enter on the input
   * with a navigator-active item) and the free-text Enter fallback in
   * `KjComboboxInput`. Sets the value through the shared signal, then
   * runs the same post-selection side-effects `afterSelect()` runs for
   * option clicks — keeping both paths converged.
   */
  select(value: unknown): void {
    this.kjValue.set(value);
    this._finishSelect(value);
  }

  /**
   * Implements `KjListNavigatorConfig.afterSelect`. Called by
   * `KjListItem` after it toggles the shared selection model, so option
   * clicks / Enter / Space don't need a per-option `activate.subscribe`.
   */
  afterSelect(value: unknown, closeRequested: boolean): void {
    if (!closeRequested) return;
    this._finishSelect(value);
  }

  private _finishSelect(value: unknown): void {
    this.controller.close('programmatic');
    // Reflect the chosen item's label in the input so the combobox
    // reads as a picker (e.g. "France") instead of leaving the user's
    // typed query text behind. Matches the autocomplete UX of
    // `kj-select`.
    const match = this.items().find(i => i.value() === value);
    this.kjQuery.set(match ? match.label() : String(value ?? ''));
    this.kjCommit.emit(value);
  }

  show():   void { this.controller.open(); }
  hide():   void { this.controller.close('programmatic'); }
  toggle(): void { this.controller.toggle(); }

  move(delta: 1 | -1): void {
    if (!this.controller.isOpen()) this.controller.open();
    this._nav()?.moveBy(delta);
  }

  commitActive(): void {
    const item = this._nav()?.activeItem();
    if (item && !item.disabled()) {
      const v = item.value();
      if (v !== undefined) { this.select(v); return; }
    }
    if (this.kjFreeText()) this.select(this.kjQuery());
  }

  setInputElement(el: HTMLElement | null): void { this._inputEl.set(el); }
}
