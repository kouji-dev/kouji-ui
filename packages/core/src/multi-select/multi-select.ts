import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KjDisabled, KjFocusRing } from '../primitives';
import { KJ_MULTI_SELECT, type KjMultiSelectContext } from './multi-select.context';

let _multiSelectIdCounter = 0;

/**
 * Root multi-select container. Holds an array of selected values
 * (`readonly unknown[]`), open/close state, compareWith equality, and the
 * search query. Selecting or toggling an option does **not** close the panel
 * — closing is an explicit gesture (Escape, outside-click, or `hide()`).
 *
 * The selection model is **multi**: every option must reflect
 * `aria-selected="true|false"`, the listbox carries `aria-multiselectable="true"`,
 * and the trigger carries `role="combobox"` + `aria-haspopup="listbox"`.
 *
 * Boolean inputs (`kjMultiSelectReadonly`, `kjMultiSelectDisabled`,
 * `kjMultiSelectSearch`) accept the empty-string attribute form via
 * `transform: booleanAttribute`.
 *
 * @example
 * ```html
 * <div kjMultiSelect [(kjMultiSelectValue)]="selected" [kjMultiSelectMax]="3">
 *   <button kjMultiSelectTrigger>Choose tags</button>
 *   <div kjMultiSelectListbox>
 *     <input kjMultiSelectSearch placeholder="Filter..." />
 *     <div kjMultiSelectOption [kjMultiSelectOptionValue]="'a'">A</div>
 *     <div kjMultiSelectOption [kjMultiSelectOptionValue]="'b'">B</div>
 *   </div>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 * @doc-description Root multi-select container — holds the selected-value array, open/close state, search query, and max-cap policy, exposing them via `KJ_MULTI_SELECT` so trigger, listbox, and option directives stay in sync.
 * @doc-is-main
 */
@Directive({
  selector: '[kjMultiSelect]',
  standalone: true,
  exportAs: 'kjMultiSelect',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled: kjMultiSelectDisabled'] },
  ],
  providers: [{ provide: KJ_MULTI_SELECT, useExisting: KjMultiSelect }],
  host: {
    '[attr.data-open]': 'open() ? "" : null',
    '[attr.data-empty]': 'value().length === 0 ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjMultiSelect implements KjMultiSelectContext {
  private readonly _disabledHost = inject(KjDisabled);

  /** Two-way bindable array of selected values. Defaults to `[]`. */
  readonly kjMultiSelectValue = model<readonly unknown[]>([]);

  /** Equality function used to match values against registered options. Defaults to `Object.is`. */
  readonly kjMultiSelectCompareWith = input<(a: unknown, b: unknown) => boolean>(
    Object.is,
  );

  /** Read-only mode: panel does not open; chips are not removable. */
  readonly kjMultiSelectReadonly = input(false, { transform: booleanAttribute });

  /**
   * Disabled state. Forwarded to the shared `KjDisabled` host directive
   * via the alias `kjMultiSelectDisabled`.
   */
  readonly kjMultiSelectDisabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the listbox includes an in-panel search filter. When `true`,
   * a `kjMultiSelectSearch` input filters options by their projected text.
   */
  readonly kjMultiSelectSearch = input(false, { transform: booleanAttribute });

  /**
   * Maximum number of values the user can select. `Infinity` (the default)
   * means uncapped. Once the cap is reached, additional `select` / `toggle`
   * calls that would grow the selection are dropped silently.
   */
  readonly kjMultiSelectMax = input<number>(Infinity);

  /**
   * When `true`, the panel closes on every toggle. PrimeNG-compatible escape
   * hatch — defeats the multi UX, but useful for "tap to add, tap to close"
   * mobile flows.
   */
  readonly kjMultiSelectHideOnSelect = input(false, {
    transform: booleanAttribute,
  });

  /** Read-only signal exposing the current selection. */
  readonly value = this.kjMultiSelectValue.asReadonly();

  /** Stable id used to wire `aria-controls` between trigger and listbox. */
  readonly panelId = `kj-multi-select-panel-${++_multiSelectIdCounter}`;

  private readonly _open = signal(false);
  private readonly _query = signal('');
  private readonly _options = signal<
    Array<{ value: unknown; disabled: () => boolean }>
  >([]);

  readonly open = this._open.asReadonly();
  readonly readonly = computed(() => this.kjMultiSelectReadonly());
  readonly disabled = computed(() => this._disabledHost.disabled());
  readonly compareWith = computed(() => this.kjMultiSelectCompareWith());
  readonly maxSelections = computed(() => this.kjMultiSelectMax());
  readonly query = this._query.asReadonly();
  readonly searchEnabled = computed(() => this.kjMultiSelectSearch());
  readonly registeredValues = computed(() =>
    this._options()
      .filter(o => !o.disabled())
      .map(o => o.value),
  );

  // ── Selection ops ───────────────────────────────────────────────────

  isSelected(target: unknown): boolean {
    const eq = this.kjMultiSelectCompareWith();
    return this.kjMultiSelectValue().some(v => eq(v, target));
  }

  toggle(target: unknown): void {
    if (this.isSelected(target)) {
      this.deselect(target);
    } else {
      this.select(target);
    }
    if (this.kjMultiSelectHideOnSelect()) this.hide();
  }

  select(target: unknown): void {
    if (this.isSelected(target)) return;
    const cap = this.kjMultiSelectMax();
    if (this.kjMultiSelectValue().length >= cap) return;
    this.kjMultiSelectValue.update(arr => [...arr, target]);
  }

  deselect(target: unknown): void {
    const eq = this.kjMultiSelectCompareWith();
    this.kjMultiSelectValue.update(arr => arr.filter(v => !eq(v, target)));
  }

  setSelection(values: readonly unknown[]): void {
    const cap = this.kjMultiSelectMax();
    const next = values.length > cap ? values.slice(0, cap) : [...values];
    this.kjMultiSelectValue.set(next);
  }

  toggleAll(): void {
    const all = this.registeredValues();
    if (all.length === 0) return;
    const allSelected = all.every(v => this.isSelected(v));
    if (allSelected) {
      this.clear();
      return;
    }
    // Select all (capped at max).
    const cap = this.kjMultiSelectMax();
    const next: unknown[] = [];
    const eq = this.kjMultiSelectCompareWith();
    // Preserve existing selections first (so unrelated values aren't lost).
    for (const v of this.kjMultiSelectValue()) next.push(v);
    for (const v of all) {
      if (next.length >= cap) break;
      if (!next.some(x => eq(x, v))) next.push(v);
    }
    this.kjMultiSelectValue.set(next);
  }

  clear(): void {
    this.kjMultiSelectValue.set([]);
  }

  setQuery(query: string): void {
    this._query.set(query);
  }

  // ── Panel ops ───────────────────────────────────────────────────────

  show(): void {
    if (this.disabled() || this.readonly()) return;
    this._open.set(true);
  }

  hide(): void {
    this._open.set(false);
  }

  toggleOpen(): void {
    if (this.open()) this.hide();
    else this.show();
  }

  // ── Option registration (used by KjMultiSelectOption) ───────────────

  registerOption(value: unknown, disabledFn: () => boolean): () => void {
    const entry = { value, disabled: disabledFn };
    this._options.update(list => [...list, entry]);
    return () => {
      this._options.update(list => list.filter(e => e !== entry));
    };
  }
}

/**
 * Trigger button for `KjMultiSelect`. Renders as a `<button>` with
 * `role="combobox"` + `aria-haspopup="listbox"` + `aria-multiselectable="true"`
 * + `aria-expanded` mirroring the panel's open state.
 *
 * The trigger does **not** render chips itself; that's the wrapper's job.
 * Click / Space / Enter open the panel; Escape closes; Down arrow opens
 * and forwards focus into the listbox.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 */
@Directive({
  selector: 'button[kjMultiSelectTrigger], [kjMultiSelectTrigger]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'role': 'combobox',
    'aria-haspopup': 'listbox',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.panelId',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-open]': 'ctx.open() ? "" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjMultiSelectTrigger {
  /** @internal */
  readonly ctx = inject(KJ_MULTI_SELECT);

  /** @internal */
  onClick(event: Event): void {
    event.stopPropagation();
    if (this.ctx.disabled() || this.ctx.readonly()) return;
    this.ctx.toggleOpen();
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) return;
    switch (event.key) {
      case ' ':
      case 'Enter':
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.show();
        break;
      case 'Escape':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.hide();
        }
        break;
    }
  }
}

/**
 * Listbox panel for `KjMultiSelect`. Carries `role="listbox"` and
 * `aria-multiselectable="true"`. Hidden when the parent context is closed.
 * Implements ArrowDown / ArrowUp / Home / End / Escape + Space/Enter to
 * **toggle** the focused option without closing.
 *
 * Outside-click and Escape close the panel via the parent context's
 * `hide()` method. The panel intercepts its own click events to prevent
 * the document-level click handler from misclassifying internal clicks
 * as outside-clicks.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 */
@Directive({
  selector: '[kjMultiSelectListbox]',
  standalone: true,
  exportAs: 'kjMultiSelectListbox',
  host: {
    'role': 'listbox',
    'aria-multiselectable': 'true',
    '[attr.id]': 'ctx.panelId',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.aria-activedescendant]': 'activeId()',
    'tabindex': '-1',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'ctx.hide()',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjMultiSelectListbox {
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly ctx = inject(KJ_MULTI_SELECT);

  private readonly _activeIndex = signal(-1);

  /** @internal */
  readonly activeId = computed(() => {
    const items = this.getOptions();
    const idx = this._activeIndex();
    return items[idx]?.id ?? null;
  });

  /** @internal */
  onDocClick(event: MouseEvent): void {
    if (!this.ctx.open()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.el.nativeElement.contains(target)) return;
    this.ctx.hide();
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const items = this.getOptions();
    if (!items.length) return;
    let idx = this._activeIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        idx = Math.min(idx + 1, items.length - 1);
        if (idx < 0) idx = 0;
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        idx = Math.max(idx - 1, 0);
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'Home':
        event.preventDefault();
        this._activeIndex.set(0);
        items[0]?.el.focus();
        break;
      case 'End':
        event.preventDefault();
        this._activeIndex.set(items.length - 1);
        items[items.length - 1]?.el.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (idx >= 0) {
          const val = items[idx]?.value;
          if (val !== undefined) this.ctx.toggle(val);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.ctx.hide();
        break;
    }
  }

  private getOptions(): Array<{ el: HTMLElement; value: unknown; id: string }> {
    return (
      Array.from(
        this.el.nativeElement.querySelectorAll('[kjMultiSelectOption]'),
      ) as HTMLElement[]
    )
      .filter(el => el.getAttribute('hidden') === null)
      .map((el, i) => ({
        el,
        value: (el as HTMLElement & { __kjOptionValue?: unknown })
          .__kjOptionValue,
        id: el.id || `kj-multi-option-${i}`,
      }));
  }
}

/**
 * Individual option inside a `KjMultiSelectListbox`. Carries `role="option"`
 * and reflects `aria-selected="true|false"` from the parent context's
 * selection set. Clicking, pressing Enter, or pressing Space toggles
 * membership in the parent's selection (does **not** close the panel).
 *
 * When the parent's `kjMultiSelectSearch` is enabled and the parent's
 * `query` is non-empty, the option auto-hides itself if its projected
 * text content does not contain the query (case-insensitive).
 *
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 */
@Directive({
  selector: '[kjMultiSelectOption]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  host: {
    'role': 'option',
    '[attr.tabindex]': 'disabled() ? "-1" : "0"',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.hidden]': 'matchesQuery() ? null : ""',
    '(click)': 'handleClick($event)',
    '(keydown.enter)': '$event.preventDefault(); handleClick($event)',
    '(keydown.space)': '$event.preventDefault(); handleClick($event)',
  },
})
export class KjMultiSelectOption {
  private readonly ctx = inject(KJ_MULTI_SELECT);
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly disabled = inject(KjDisabled).disabled;

  /** Value this option contributes to the parent's selection set. */
  readonly kjMultiSelectOptionValue = input.required<unknown>();

  /** @internal */
  readonly selected = computed(() =>
    this.ctx.isSelected(this.kjMultiSelectOptionValue()),
  );

  /** @internal — true when the option's text matches the parent's search query. */
  readonly matchesQuery = computed(() => {
    if (!this.ctx.searchEnabled()) return true;
    const q = this.ctx.query().trim().toLowerCase();
    if (!q) return true;
    const text = (this.el.nativeElement.textContent ?? '').trim().toLowerCase();
    return text.includes(q);
  });

  constructor() {
    // Stash the value on the host element so the listbox keyboard handler
    // can read it back without a per-option DI lookup.
    const stash = () => {
      (
        this.el.nativeElement as HTMLElement & { __kjOptionValue?: unknown }
      ).__kjOptionValue = this.kjMultiSelectOptionValue();
    };
    afterNextRender(() => {
      stash();
      if (!this.el.nativeElement.id) {
        this.el.nativeElement.id = `kj-multi-option-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
      }
      const unregister = this.ctx.registerOption(
        this.kjMultiSelectOptionValue(),
        () => this.disabled(),
      );
      // Best-effort cleanup — Angular destroys the directive when the host
      // node is removed, so unregistering on next-render is sufficient.
      const root = this.el.nativeElement;
      const observer = new MutationObserver(() => {
        if (!root.isConnected) {
          unregister();
          observer.disconnect();
        }
      });
      if (root.parentNode) observer.observe(root.parentNode, { childList: true });
    });
  }

  /** @internal */
  handleClick(event: Event): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.ctx.toggle(this.kjMultiSelectOptionValue());
  }
}

/**
 * Search input embedded inside a `KjMultiSelectListbox`. Two-way binds the
 * parent's `query` signal. Carries `type="text"` + `role="searchbox"`. ArrowDown
 * forwards focus into the option list.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 */
@Directive({
  selector: 'input[kjMultiSelectSearch]',
  standalone: true,
  host: {
    'type': 'text',
    'role': 'searchbox',
    'autocomplete': 'off',
    'spellcheck': 'false',
    'aria-autocomplete': 'list',
    '[attr.aria-controls]': 'ctx.panelId',
    '[value]': 'ctx.query()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjMultiSelectSearch {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  /** @internal */
  readonly ctx = inject(KJ_MULTI_SELECT);

  /** @internal */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.ctx.setQuery(value);
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const opt = this.el.nativeElement
        .closest('[kjMultiSelectListbox]')
        ?.querySelector('[kjMultiSelectOption]:not([hidden])') as HTMLElement | null;
      opt?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.ctx.hide();
    }
  }
}

/**
 * Tri-state "select all" toggle, intended to live inside the listbox header.
 * Reflects `aria-checked="true|false|mixed"` based on whether all, none, or
 * some of the parent's registered (non-disabled) options are selected.
 * Activating it clears when all-selected, otherwise selects all (subject
 * to `kjMultiSelectMax`).
 *
 * @category Core/Inputs
 * @doc
 * @doc-name multi-select
 */
@Directive({
  selector: 'button[kjMultiSelectAllToggle]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'button',
    'role': 'checkbox',
    '[attr.aria-checked]': 'tristate()',
    '[attr.data-state]': 'tristate()',
    '(click)': 'ctx.toggleAll()',
    '(keydown.space)': '$event.preventDefault(); ctx.toggleAll()',
  },
})
export class KjMultiSelectAllToggle {
  /** @internal */
  readonly ctx = inject(KJ_MULTI_SELECT);

  /** @internal */
  readonly tristate = computed<'true' | 'false' | 'mixed'>(() => {
    const all = this.ctx.registeredValues();
    if (all.length === 0) return 'false';
    const selectedCount = all.filter(v => this.ctx.isSelected(v)).length;
    if (selectedCount === 0) return 'false';
    if (selectedCount === all.length) return 'true';
    return 'mixed';
  });
}
