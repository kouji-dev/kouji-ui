import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_COMBOBOX,
  type KjComboboxContext,
  type KjComboboxOptionRegistration,
  kjContainsFilter,
} from './combobox.context';

let _idCounter = 0;
const nextId = (): string => `kj-combobox-${++_idCounter}`;

/**
 * Root combobox / autocomplete container. Manages the committed value, live
 * query string, the active-descendant pointer, and (optionally) the
 * synchronous filter. The actual open/closed state is owned by the overlay
 * primitive `KjOverlayController` provided on `KjComboboxInput`; this
 * directive mirrors that signal so option/filter logic stays reactive.
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
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjCombobox]',
  standalone: true,
  exportAs: 'kjCombobox',
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  providers: [
    { provide: KJ_COMBOBOX, useExisting: KjCombobox },
    KjOverlayController,
  ],
  host: {
    '[attr.data-state]': "open() ? 'open' : 'closed'",
  },
})
export class KjCombobox implements KjComboboxContext {
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

  // ── Internal state ──────────────────────────────────────────────────

  private readonly _activeId = signal<string | null>(null);
  private readonly _inputEl = signal<HTMLElement | null>(null);
  private readonly _options = signal<readonly KjComboboxOptionRegistration[]>([]);
  private readonly _visibleIds = signal<readonly string[]>([]);

  /** @internal — shared overlay controller; input + listbox + options all see this same instance. */
  private readonly controller = inject(KjOverlayController);

  /** Stable id used by the listbox / aria-controls. */
  readonly listboxId = nextId();

  // ── Public reactive surface (KjComboboxContext) ─────────────────────

  readonly value = this.kjValue.asReadonly();
  readonly query = this.kjQuery.asReadonly();
  readonly open = this.controller.isOpen;
  readonly loading = this.kjLoading;
  readonly allowFreeText = this.kjFreeText;
  readonly shouldFilter = this.kjShouldFilter;
  readonly filter = this.kjFilter;
  readonly activeId = this._activeId.asReadonly();
  readonly inputElement = this._inputEl.asReadonly();
  readonly visibleCount = computed(() => this._visibleIds().length);

  constructor() {
    // Re-run synchronous filter whenever the query, options, or filter fn changes.
    effect(() => {
      const q = this.kjQuery();
      const opts = this._options();
      const fn = this.kjFilter();
      const sync = this.kjShouldFilter();

      if (!sync) {
        const visible = opts.map(o => o.id);
        opts.forEach(o => o.setVisible(true));
        this._visibleIds.set(visible);
        return;
      }

      const visible: string[] = [];
      for (const opt of opts) {
        const ok = fn(q, opt.label());
        opt.setVisible(ok);
        if (ok) visible.push(opt.id);
      }
      this._visibleIds.set(visible);
    });

    // If active option becomes hidden, jump to the first visible.
    effect(() => {
      const active = this._activeId();
      const visible = this._visibleIds();
      const q = this.kjQuery();
      if (active && visible.includes(active)) return;
      if (visible.length === 0) {
        this._activeId.set(null);
        return;
      }
      const shouldAuto = this.kjAutoActivateFirst() && q.length > 0;
      if (shouldAuto || active) {
        this._activeId.set(visible[0]);
      }
    });

    // Forward query changes to the output.
    effect(() => {
      const q = this.kjQuery();
      this.kjQueryChange.emit(q);
    });
  }

  // ── KjComboboxContext mutations ─────────────────────────────────────

  setQuery(value: string): void {
    if (this.kjQuery() !== value) this.kjQuery.set(value);
    this.controller.open();
  }

  select(value: unknown): void {
    this.kjValue.set(value);
    this.controller.close('programmatic');
    this.kjCommit.emit(value);
  }

  show(): void {
    this.controller.open();
  }

  hide(): void {
    this.controller.close('programmatic');
  }

  toggle(): void {
    this.controller.toggle();
  }

  move(delta: 1 | -1): void {
    const visible = this._visibleIds();
    if (!visible.length) return;
    if (!this.controller.isOpen()) this.controller.open();
    const current = this._activeId();
    const idx = current ? visible.indexOf(current) : -1;
    let next = idx + delta;
    if (next < 0) next = visible.length - 1;
    if (next >= visible.length) next = 0;
    this._activeId.set(visible[next]);
  }

  commitActive(): void {
    const active = this._activeId();
    if (active) {
      const opt = this._options().find(o => o.id === active);
      if (opt && !opt.disabled()) {
        this.select(opt.value());
        return;
      }
    }
    if (this.kjFreeText()) {
      const q = this.kjQuery();
      this.select(q);
    }
  }

  // ── Option registry (internal) ──────────────────────────────────────

  registerOption(opt: KjComboboxOptionRegistration): void {
    this._options.update(list => [...list, opt]);
  }

  unregisterOption(id: string): void {
    this._options.update(list => list.filter(o => o.id !== id));
    if (this._activeId() === id) this._activeId.set(null);
  }

  setActiveId(id: string | null): void {
    this._activeId.set(id);
  }

  setInputElement(el: HTMLElement | null): void {
    this._inputEl.set(el);
  }
}
