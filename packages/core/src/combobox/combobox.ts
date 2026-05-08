import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  type OnDestroy,
  output,
  signal,
} from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import {
  KJ_COMBOBOX,
  type KjComboboxContext,
  type KjComboboxOptionRegistration,
  kjContainsFilter,
} from './combobox.context';

let _idCounter = 0;
const nextId = (): string => `kj-combobox-${++_idCounter}`;

/**
 * Root combobox / autocomplete container. Manages the open state, the
 * committed value, the live query string, the active-descendant pointer
 * and (optionally) runs the synchronous filter.
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
 * Set `[kjShouldFilter]="false"` for async / consumer-driven filtering —
 * subscribe to `(kjQueryChange)` and write the filtered result list back
 * into your template (`@for`). Combined with `[kjLoading]` and a
 * `[kjComboboxEmpty]` template inside the listbox, this is the canonical
 * server-search pattern.
 *
 * Set `[kjFreeText]="true"` to allow committing arbitrary typed strings
 * (the value model widens to `T | string | null`).
 *
 * @category Core/Inputs
 * @doc
 * @doc-name combobox
 * @doc-is-main
 */
@Directive({
  selector: '[kjCombobox]',
  standalone: true,
  exportAs: 'kjCombobox',
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  providers: [{ provide: KJ_COMBOBOX, useExisting: KjCombobox }],
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

  private readonly _open = signal(false);
  private readonly _activeId = signal<string | null>(null);
  private readonly _inputEl = signal<HTMLElement | null>(null);
  private readonly _options = signal<readonly KjComboboxOptionRegistration[]>([]);
  private readonly _visibleIds = signal<readonly string[]>([]);

  /** Stable id used by the listbox / aria-controls. */
  readonly listboxId = nextId();

  // ── Public reactive surface (KjComboboxContext) ─────────────────────

  readonly value = this.kjValue.asReadonly();
  readonly query = this.kjQuery.asReadonly();
  readonly open = this._open.asReadonly();
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
        // Consumer-driven: every option is visible from the directive's POV.
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

    // If active option becomes hidden, jump to the first visible. Auto-activate
    // the first match only when filtering (non-empty query) so a bare open with
    // no query lets the user press ArrowDown to land on the first option.
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
    if (!this._open()) this._open.set(true);
  }

  select(value: unknown): void {
    this.kjValue.set(value);
    this._open.set(false);
    this.kjCommit.emit(value);
  }

  show(): void {
    this._open.set(true);
  }

  hide(): void {
    this._open.set(false);
  }

  toggle(): void {
    this._open.update(v => !v);
  }

  move(delta: 1 | -1): void {
    const visible = this._visibleIds();
    if (!visible.length) return;
    if (!this._open()) this._open.set(true);
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

/**
 * Decorates a native `<input>` to act as the combobox trigger.
 *
 * Adds `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`,
 * `aria-controls`, and `aria-activedescendant` per the WAI-ARIA combobox
 * pattern. ArrowDown / ArrowUp move the active option, Enter commits,
 * Escape closes (and clears on a second press), Alt+ArrowDown opens
 * without moving.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name combobox
 */
@Directive({
  selector: 'input[kjComboboxInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'autocapitalize': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    '[attr.aria-autocomplete]': '"list"',
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '[attr.aria-controls]': 'ctx.listboxId',
    '[attr.aria-activedescendant]': 'ctx.activeId()',
    '[attr.aria-busy]': 'ctx.loading() ? "true" : null',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class KjComboboxInput {
  /** @internal */
  readonly ctx = inject(KJ_COMBOBOX);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      this.ctx.setInputElement(this.el.nativeElement);
    });
  }

  /** @internal */
  onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.ctx.setQuery(v);
  }

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey) {
          this.ctx.show();
        } else {
          this.ctx.move(1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) {
          this.ctx.hide();
        } else {
          this.ctx.move(-1);
        }
        break;
      case 'Enter':
        if (this.ctx.open() || this.ctx.allowFreeText()) {
          e.preventDefault();
          this.ctx.commitActive();
        }
        break;
      case 'Escape':
        if (this.ctx.open()) {
          e.preventDefault();
          this.ctx.hide();
        }
        break;
      case 'Tab':
        // Tab closes naturally; let focus continue.
        if (this.ctx.open()) this.ctx.hide();
        break;
    }
  }

  /** @internal */
  onFocus(): void {
    if (!this.ctx.open()) this.ctx.show();
  }

  /** @internal */
  onBlur(): void {
    // Defer slightly so option click events fire before the listbox closes.
    setTimeout(() => this.ctx.hide(), 120);
  }
}

/**
 * The popup listbox that contains [kjComboboxOption] children. Hidden when
 * the combobox is closed; otherwise rendered with `role="listbox"` and an
 * `id` matching the input's `aria-controls`. Anchored beneath the input
 * via inline absolute positioning.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name combobox
 */
@Directive({
  selector: '[kjComboboxListbox]',
  standalone: true,
  host: {
    'role': 'listbox',
    '[attr.id]': 'ctx.listboxId',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '(mousedown)': '$event.preventDefault()',
  },
})
export class KjComboboxListbox {
  /** @internal */
  readonly ctx = inject(KJ_COMBOBOX);
}

/**
 * Single option inside a [kjComboboxListbox]. Clicking commits the option's
 * value to the combobox; hovering moves the active descendant. Hidden when
 * the synchronous filter rejects it (the directive sets `hidden` directly).
 *
 * @category Core/Inputs
 * @doc
 * @doc-name combobox
 */
@Directive({
  selector: '[kjComboboxOption]',
  standalone: true,
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    'role': 'option',
    'tabindex': '-1',
    '[attr.id]': 'optionId',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.hidden]': '!visible() ? "" : null',
    '(click)': 'handleClick($event)',
    '(mousemove)': 'handleHover()',
  },
})
export class KjComboboxOption implements OnDestroy {
  /** @internal */
  private readonly ctx = inject(KJ_COMBOBOX);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal */
  readonly disabled = inject(KjDisabled).disabled;

  /** Value committed when this option is selected. */
  readonly kjOptionValue = input.required<unknown>();

  /** Stable id used for `aria-activedescendant`. */
  readonly optionId = nextId();

  private readonly _visible = signal(true);
  /** @internal */
  readonly visible = this._visible.asReadonly();

  /** @internal */
  readonly selected = computed(() => this.ctx.value() === this.kjOptionValue());

  /** @internal */
  readonly isActive = computed(() => this.ctx.activeId() === this.optionId);

  constructor() {
    this.ctx.registerOption({
      id: this.optionId,
      el: this.el.nativeElement,
      value: () => this.kjOptionValue(),
      label: () => (this.el.nativeElement.textContent ?? '').trim(),
      disabled: () => this.disabled(),
      setVisible: (v) => this._visible.set(v),
    });
  }

  /** @internal */
  handleClick(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.disabled()) return;
    this.ctx.select(this.kjOptionValue());
  }

  /** @internal */
  handleHover(): void {
    if (this.disabled()) return;
    if (this.ctx.activeId() !== this.optionId) {
      this.ctx.setActiveId(this.optionId);
    }
  }

  ngOnDestroy(): void {
    this.ctx.unregisterOption(this.optionId);
  }
}
