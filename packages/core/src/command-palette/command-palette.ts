import {
  Directive,
  booleanAttribute,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KJ_COMMAND_PALETTE, type KjCommandItemRegistration, type KjCommandPaletteContext, nextCommandListId } from './command-palette.context';
import { type KjCommandFilter, kjSubstringFilter } from './command-palette.filters';

/** Payload for the `kjActivate` output. */
export interface KjCommandActivateEvent {
  readonly value: unknown;
  readonly query: string;
}

/**
 * Root state container for the command palette. Manages item registration,
 * filtering, active-descendant tracking, and activation. Provides the
 * `KJ_COMMAND_PALETTE` context token to child directives.
 *
 * Compose with `[kjCommandInput]`, `[kjCommandList]`, `[kjCommandItem]`,
 * `[kjCommandGroup]`, `[kjCommandSeparator]`, `[kjCommandEmpty]` for a
 * fully accessible combobox-with-listbox palette.
 *
 * For the modal (Cmd-K) pattern use `[kjCommandPaletteDialog]` which wraps
 * this directive together with `KjDialog`.
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
 * @category Core/Actions
 */
@Directive({
  selector: '[kjCommandPalette]',
  standalone: true,
  exportAs: 'kjCommandPalette',
  providers: [{ provide: KJ_COMMAND_PALETTE, useExisting: KjCommandPalette }],
})
export class KjCommandPalette implements KjCommandPaletteContext {

  // ── Inputs ──────────────────────────────────────────────────────────

  /** Pluggable filter function. Default: case- and diacritic-insensitive substring. */
  readonly kjFilter = input<KjCommandFilter>(kjSubstringFilter);

  /** When `false`, internal filtering is skipped (server-side / consumer-controlled). */
  readonly kjShouldFilter = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Show the loading state. Exposes `loading()` on the context. */
  readonly kjLoading = input<boolean, unknown>(false, { transform: booleanAttribute });

  /**
   * Reset the active item to the first visible item whenever the query changes.
   * Default `true`.
   */
  readonly kjAutoActivateFirst = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Close the host dialog on activation. Default `true`.
   * Requires the palette to be inside a `[kjCommandPaletteDialog]` or
   * for the consumer to wire close logic via the `kjActivate` output.
   */
  readonly kjDismissOnActivate = input<boolean, unknown>(true, { transform: booleanAttribute });

  // ── Models ───────────────────────────────────────────────────────────

  /** Two-way bindable active value (the highlighted item, not a committed value). */
  readonly kjValue = model<unknown>(null);

  /** Two-way bindable query text. */
  readonly kjQuery = model<string>('');

  // ── Outputs ──────────────────────────────────────────────────────────

  /**
   * Fires when an item is activated (click, Enter, programmatic).
   * Payload: `{ value, query }`.
   */
  readonly kjActivate = output<KjCommandActivateEvent>();

  // ── Internal state ───────────────────────────────────────────────────

  /** @internal All registered items in declaration order. */
  readonly _items = signal<KjCommandItemRegistration[]>([]);

  // ── KjCommandPaletteContext ──────────────────────────────────────────

  /** The auto-generated listbox id used for `aria-controls` wiring. */
  readonly listId = nextCommandListId();

  readonly query = computed(() => this.kjQuery());
  readonly activeValue = computed(() => this.kjValue());
  readonly loading = computed(() => this.kjLoading());

  /** Items that pass the current filter. */
  readonly visibleItems = computed(() => {
    const items = this._items();
    const shouldFilter = this.kjShouldFilter();

    if (!shouldFilter) {
      return items;
    }

    const filter = this.kjFilter();
    const q = this.kjQuery();
    return items.filter(item => filter(q, item.haystacks()) > 0);
  });

  constructor() {
    // When query changes, auto-activate the first visible item
    effect(() => {
      this.kjQuery(); // track
      if (this.kjAutoActivateFirst()) {
        // Run after filter stabilises
        const visible = this.visibleItems();
        if (visible.length > 0) {
          this.kjValue.set(visible[0].value);
        } else {
          this.kjValue.set(null);
        }
      }
    });
  }

  // ── Context methods ──────────────────────────────────────────────────

  registerItem(item: KjCommandItemRegistration): void {
    this._items.update(items => [...items, item]);
  }

  unregisterItem(item: KjCommandItemRegistration): void {
    this._items.update(items => items.filter(i => i !== item));
  }

  setQuery(q: string): void {
    this.kjQuery.set(q);
  }

  activate(value: unknown): void {
    const item = this._items().find(i => i.value === value);
    if (item?.disabled()) return;

    this.kjValue.set(value);
    this.kjActivate.emit({ value, query: this.kjQuery() });
  }

  moveActive(delta: number): void {
    const visible = this.visibleItems();
    if (!visible.length) return;
    const currentIndex = visible.findIndex(i => i.value === this.kjValue());
    let nextIndex: number;
    if (currentIndex < 0) {
      nextIndex = delta > 0 ? 0 : visible.length - 1;
    } else {
      nextIndex = (currentIndex + delta + visible.length) % visible.length;
    }
    this.kjValue.set(visible[nextIndex].value);
  }

  setActiveTo(target: 'first' | 'last'): void {
    const visible = this.visibleItems();
    if (!visible.length) return;
    this.kjValue.set(target === 'first' ? visible[0].value : visible[visible.length - 1].value);
  }

  setActiveValue(value: unknown): void {
    this.kjValue.set(value);
  }
}
