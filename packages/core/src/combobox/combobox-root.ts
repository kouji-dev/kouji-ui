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
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjCombobox },
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

  /** The current query string typed into the input. Two-way bindable. */
  readonly kjQuery = model<string>('');

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
  private readonly selection  = inject(KjSelectionModel);
  private readonly filter     = inject(KjFilterableList);

  /** Stable listbox id for `aria-controls` wiring. */
  readonly listboxId = nextId();

  /** All `KjListItem`s under this combobox — source for nav + filter. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /** Filter-aware visible items, exposed for KjListNavigatorConfig. */
  readonly visibleItems = computed(
    () => this.filter.visibleItems() as readonly KjListItem<unknown>[],
  );

  /** Public surface read by children. */
  readonly value         = this.kjValue.asReadonly();
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
    this.selection.setMode('single');
    this.selection.bindValue(this.kjValue);
    this.filter.bind({
      query:             this.kjQuery,
      filterFn:          this.adaptedFilter,
      shouldFilter:      this.kjShouldFilter,
      autoActivateFirst: this.kjAutoActivateFirst,
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
  }

  setQuery(value: string): void {
    if (this.kjQuery() !== value) this.kjQuery.set(value);
    this.controller.open();
  }

  select(value: unknown): void {
    this.selection.setValue(value as never);
    this.controller.close('programmatic');
    this.kjCommit.emit(value);
  }

  show():   void { this.controller.open(); }
  hide():   void { this.controller.close('programmatic'); }
  toggle(): void { this.controller.toggle(); }

  move(delta: 1 | -1): void {
    if (!this.controller.isOpen()) this.controller.open();
    this._nav?.moveBy(delta);
  }

  commitActive(): void {
    const item = this._nav?.activeItem();
    if (item && !item.disabled()) {
      const v = item.value();
      if (v !== undefined) { this.select(v); return; }
    }
    if (this.kjFreeText()) this.select(this.kjQuery());
  }

  setInputElement(el: HTMLElement | null): void { this._inputEl.set(el); }
}
