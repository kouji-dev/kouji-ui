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
  KjListNavigator,
  KjSelectionModel,
  type KjFilterFn,
  type KjListNavigatorConfig,
  type KjListSelectionMode,
} from '../primitives/list';

let _idCounter = 0;
const nextId = (): string => `kj-combobox-${++_idCounter}`;

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

  /** The current query string typed into the input. Two-way bindable. */
  // eslint-disable-next-line @angular-eslint/no-input-rename -- alias keeps the public `kjQuery` name distinct from this internal linkedSignal-backed property
  readonly kjQueryInput = input<string>('', { alias: 'kjQuery' });
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
  readonly listboxId = nextId();

  /** All `KjListItem`s under this combobox — source for nav + filter. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /** Filter-aware visible items, exposed for KjListNavigatorConfig. */
  readonly visibleItems = computed(
    () => this.filter.visibleItems() as readonly KjListItem<unknown>[],
  );

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

  constructor() {
    this.filter.bind({
      items:             this.items,
      query:             this.kjQuery,
      filterFn:          this.adaptedFilter,
      shouldFilter:      this.kjShouldFilter,
      autoActivateFirst: this.kjAutoActivateFirst,
    });
    this._selection.bind({
      value:     this.value,
      items:     this.items,
      mode:      this.mode,
      compareBy: this.compareBy,
    });
    effect(() => this.kjQueryChange.emit(this.kjQuery()));

    // Auto-activate first visible item on query change so Enter can
    // commit it without an explicit ArrowDown press. APG combobox 1.2
    // discoverability pattern.
    effect(() => {
      this.kjQuery();
      const autoFirst = this.kjAutoActivateFirst();
      const nav = this._nav();
      if (!autoFirst || !nav) return;
      untracked(() => {
        const visible = this.filter.visibleItems() as readonly KjListItem<unknown>[];
        nav.setActive(visible.length ? visible[0].id : null);
      });
    });

    // Seed the active item once the navigator attaches (input mounts).
    effect(() => {
      const nav = this._nav();
      if (!nav || !this.kjAutoActivateFirst()) return;
      if (nav.activeId() !== null) return;
      untracked(() => {
        const visible = this.filter.visibleItems() as readonly KjListItem<unknown>[];
        if (visible.length > 0) nav.setActive(visible[0].id);
      });
    });

    // Seed `kjQuery` from the selected item's label whenever the input
    // would otherwise render blank. Covers the case where `kjValue` is
    // bound up-front (preset) but no query text has been typed yet.
    effect(() => {
      const items = this.items();
      const v = this.kjValue();
      if (v === null || v === undefined) return;
      if (this.kjQuery() !== '') return;
      untracked(() => {
        const match = items.find(i => i.value() === v);
        if (match) this.kjQuery.set(match.label());
      });
    });
  }

  setQuery(value: string): void {
    if (this.kjQuery() !== value) this.kjQuery.set(value);
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
