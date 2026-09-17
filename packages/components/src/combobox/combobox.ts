import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  TemplateRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  KJ_VIRTUAL_INDEX_ATTR,
  KjCombobox,
  KjComboboxInput,
  KjComboboxListbox,
  KjComboboxOption,
  KjFilterableList,
  injectListItem,
  KjListItem,
  KjListVirtual,
  type KjListVirtualSource,
} from '@kouji-ui/core';

/**
 * One row of the data-driven option list, resolved once per `[options]` /
 * accessor change so the template neither calls accessors per row nor
 * re-derives a label on every change-detection pass.
 */
interface ComboRow {
  /** Index in the (filtered) option list — the windowed cursor's address. */
  readonly index: number;
  /** The consumer's own entry, handed to `kjComboboxOptionTemplate`. */
  readonly item: unknown;
  readonly value: unknown;
  readonly label: string;
  readonly disabled: boolean;
  readonly haystacks: readonly string[];
}

/** `item.value` when the entry is an object that has one, else the entry. */
function defaultOptionValue(item: unknown): unknown {
  if (item && typeof item === 'object' && 'value' in item) {
    return (item as { value: unknown }).value;
  }
  return item;
}

/** `item.label`, else `item.name`, else the entry stringified. */
function defaultOptionLabel(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    for (const key of ['label', 'name', 'title']) {
      if (typeof o[key] === 'string') return o[key] as string;
    }
  }
  return String(item);
}

/**
 * Marker for the per-row template used when `<kj-combobox>` renders
 * `[options]`. The implicit context is the entry; `index` is its position in
 * the filtered list.
 *
 * @example
 * ```html
 * <kj-combobox [options]="countries">
 *   <ng-template kjComboboxOptionTemplate let-c>
 *     <img [src]="c.flag" alt="" /> {{ c.name }}
 *   </ng-template>
 * </kj-combobox>
 * ```
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 */
@Directive({
  selector: 'ng-template[kjComboboxOptionTemplate]',
  standalone: true,
})
export class KjComboboxOptionTemplate<T = unknown> {
  readonly tpl = inject<TemplateRef<{ $implicit: T; index: number }>>(TemplateRef);
}

/**
 * Combobox / autocomplete root component.
 *
 * A typeable input bound to a filterable listbox. The default mode runs a
 * synchronous case-insensitive substring filter against the projected
 * `<kj-combobox-option>` children. Set `[shouldFilter]="false"` and bind
 * `(queryChange)` for async / consumer-driven flows. Set `[freeText]="true"`
 * to let the user commit arbitrary typed values that are not in the option
 * set (e.g. a tags input).
 *
 * @doc-example Default — country picker
 *   Country picker with built-in synchronous substring filtering.
 *   @doc-file combobox.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common combobox usages — sync filtering,
 *   placeholder, value binding, and disabled.
 *   @doc-file combobox.usage.example.ts
 * @doc-example Async search
 *   Consumer-driven filtering via `(queryChange)` for remote results.
 *   @doc-file combobox.async.example.ts
 * @doc-example Free-text values
 *   `[freeText]="true"` accepts arbitrary typed input not in the option set.
 *   @doc-file combobox.free-text.example.ts
 * @doc-example Empty state
 *   `<kj-combobox-empty>` slot for the "no matches" message.
 *   @doc-file combobox.empty-state.example.ts
 * @doc-example With icons
 *   Each option projects a leading icon next to the label text.
 *   @doc-file combobox.with-icons.example.ts
 *
 * Pass `[options]` instead of projecting `<kj-combobox-option>` children to
 * drive the list from data, and add `[virtual]="true"` when that data is
 * large: the listbox then renders only the rows that fit its viewport plus a
 * little overscan, while ArrowUp / ArrowDown / Home / End / Enter keep
 * walking the whole option set.
 *
 * @doc-keyboard
 *   ArrowDown        — Opens the listbox; moves to the next option when open
 *   ArrowUp          — Moves to the previous option (wraps at the top)
 *   Home|End         — Jumps to the first / last visible option
 *   Enter            — Selects the active option (or commits the typed value when `freeText`)
 *   Escape           — Closes the listbox and clears the active option
 *   Tab              — Closes the listbox and continues focus
 *   Printable keys   — Filter the listbox in real-time
 *
 * @doc-aria
 *   role="combobox"    — On the input (via `[kjComboboxInput]`)
 *   aria-haspopup      — "listbox" on the input
 *   aria-expanded      — Reflects open / closed state
 *   aria-controls      — Links the input to the listbox id
 *   aria-activedescendant — Tracks the currently-active option without moving DOM focus
 *   aria-busy          — Reflected on the input when `[loading]="true"`
 *   role="option"      — On each `<kj-combobox-option>`
 *   aria-selected      — Mirrors which option matches the committed value
 *
 * @doc-css-var
 *   --kj-bg-field         — Input background. Inherited from the theme.
 *   --kj-border-default   — Input and listbox border color.
 *   --kj-bg-elevated      — Listbox panel background.
 *   --kj-radius-field     — Input and listbox corner radius.
 *
 * @doc-touch
 *   The input grows with its container — pair with a `lg` size from your form
 *   row for ≥ 44px touch height. Options reach 44px via padding plus the
 *   inline-text-link exception inside the listbox.
 *
 * @doc-a11y
 *   The combobox follows the WAI-ARIA Combobox + Listbox pattern. The input
 *   keeps focus; the active option is tracked via `aria-activedescendant`
 *   without moving DOM focus into the listbox. The listbox auto-mounts to
 *   `document.body` to escape clipping and re-anchors to the input. The
 *   `<kj-combobox-empty>` slot uses `role="status"` with `aria-live="polite"`
 *   so screen readers announce the no-results state.
 *
 * @doc-related select,command-palette,field
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 * @doc-description Themed autocomplete combobox with built-in filtering, async search support, and free-text mode.
 * @doc-is-main
 */
@Component({
  selector: 'kj-combobox',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCombobox,
      inputs: [
        'kjValue: value',
        'kjQuery: query',
        'kjShouldFilter: shouldFilter',
        'kjLoading: loading',
        'kjFreeText: freeText',
        'kjFilter: filter',
        'kjAutoActivateFirst: autoActivateFirst',
      ],
      outputs: [
        'kjValueChange: valueChange',
        'kjQueryChange: queryChange',
        'kjCommit: commit',
      ],
    },
  ],
  imports: [
    NgTemplateOutlet,
    KjComboboxInput,
    KjComboboxListbox,
    KjComboboxOption,
    KjListVirtual,
  ],
  template: `
    <input
      kjComboboxInput
      #trig="kjComboboxInput"
      class="kj-combobox-input"
      [placeholder]="placeholder()"
      [disabled]="disabled() || null" />
    <div
      kjComboboxListbox
      kjListVirtual
      #vlist="kjListVirtual"
      [kjFor]="trig"
      class="kj-combobox-listbox"
      [kjVirtualEnabled]="virtual()"
      [kjVirtualCount]="rowCount()"
      [kjVirtualItemSize]="virtualItemSize()"
    >
      @if (virtual()) {
        <div
          class="kj-combobox-virtual"
          role="presentation"
          [style.height.px]="vlist.window().totalSize"
        >
          <div
            class="kj-combobox-virtual-slice"
            role="presentation"
            [style.transform]="'translateY(' + vlist.window().paddingTop + 'px)'"
          >
            @for (row of windowRows(); track row.index) {
              <div class="kj-combobox-row" role="presentation" [attr.data-kj-virtual-index]="row.index">
                @if (optionTpl(); as t) {
                  <ng-container
                    *ngTemplateOutlet="t.tpl; context: { $implicit: row.item, index: row.index }"
                  />
                } @else {
                  <button
                    type="button"
                    kjComboboxOption
                    class="kj-combobox-option"
                    [kjOptionValue]="row.value"
                    [kjOptionLabel]="row.label"
                    [kjDisabled]="row.disabled"
                    [disabled]="row.disabled || null"
                  >{{ row.label }}</button>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        @for (row of rows(); track row.index) {
          @if (optionTpl(); as t) {
            <ng-container
              *ngTemplateOutlet="t.tpl; context: { $implicit: row.item, index: row.index }"
            />
          } @else {
            <button
              type="button"
              kjComboboxOption
              class="kj-combobox-option"
              [kjOptionValue]="row.value"
              [kjOptionLabel]="row.label"
              [kjDisabled]="row.disabled"
              [disabled]="row.disabled || null"
            >{{ row.label }}</button>
          }
        }
      }
      <ng-content />
    </div>
  `,
  styleUrl: './combobox.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-combobox',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxComponent implements KjListVirtualSource {
  /** Placeholder text shown in the input when empty. */
  readonly placeholder = input<string>('');
  /** Whether the combobox is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Data-driven option list. Rendered with
   * `<ng-template kjComboboxOptionTemplate>` when one is projected, else as
   * plain `<button kjComboboxOption>` rows. Projected
   * `<kj-combobox-option>` children still work and are rendered after these.
   */
  readonly options = input<readonly unknown[]>([]);

  /**
   * Render only a window of `[options]` instead of every entry.
   *
   * Turn this on for large option sets: 5 000 options otherwise mount 5 000
   * `KjListItem` directives — eight host bindings, three listeners and an
   * element injector each — the moment the listbox opens. With it on, only
   * the rows that fit the listbox viewport (plus overscan) exist, and the
   * keyboard still walks the whole set: the row the cursor lands on is
   * scrolled into the window before it becomes `aria-activedescendant`.
   *
   * Filtering moves to the data (see `[optionHaystacks]`), because only a
   * window of rows is ever registered. Projected `<kj-combobox-option>`
   * children are not windowed.
   *
   * @default false
   */
  readonly virtual = input<boolean, unknown>(false, { transform: booleanAttribute });

  /**
   * Row height in px for the windowed path. `0` (the default) measures a
   * rendered row instead, so density and font-size changes are followed.
   */
  readonly virtualItemSize = input<number, unknown>(0, { transform: numberAttribute });

  /** Value committed for an `[options]` entry. Defaults to `item.value`, else the entry. */
  readonly optionValue = input<(item: unknown) => unknown>(defaultOptionValue);

  /** Visible text for an `[options]` entry. Defaults to `item.label` / `name` / `title`. */
  readonly optionLabel = input<(item: unknown) => string>(defaultOptionLabel);

  /** Whether an `[options]` entry is disabled. Defaults to its `disabled` property. */
  readonly optionDisabled = input<(item: unknown) => boolean>(
    item => !!(item as { disabled?: unknown } | null)?.disabled,
  );

  /**
   * Search text for an `[options]` entry. Defaults to its label; add
   * synonyms here to widen what the built-in filter matches.
   */
  readonly optionHaystacks = input<((item: unknown) => readonly string[]) | null>(null);

  /** @internal — custom per-row template, when the consumer projected one. */
  protected readonly optionTpl = contentChild(KjComboboxOptionTemplate);

  private readonly cb = inject(KjCombobox);
  private readonly filterSvc = inject(KjFilterableList);
  private readonly destroyRef = inject(DestroyRef);
  /**
   * Rows this component stamps from `[options]`. They live in its own view,
   * which the root's content query cannot see, so they are handed over
   * through `_setViewItems` below.
   */
  private readonly viewItems = viewChildren(KjListItem);
  /**
   * Not `.required`: view queries resolve after the first template pass, so
   * a computed the template reads would throw on that pass. Optional means
   * the first pass renders an empty window and the query's own notification
   * re-renders it.
   */
  private readonly vlist = viewChild(KjListVirtual);

  /** Every `[options]` entry, resolved once per data / accessor change. */
  private readonly allRows = computed<readonly ComboRow[]>(() => {
    const value = this.optionValue();
    const label = this.optionLabel();
    const disabled = this.optionDisabled();
    const haystacks = this.optionHaystacks();
    return this.options().map((item, index) => {
      const text = label(item);
      return {
        index,
        item,
        value: value(item),
        label: text,
        disabled: disabled(item),
        haystacks: haystacks ? haystacks(item) : [text],
      };
    });
  });

  /**
   * The rows the template stamps. On the windowed path the filter runs over
   * the DATA: `KjFilterableList` filters registered `KjListItem`s, and a
   * windowed list only registers the rows in view, so a row scrolled out of
   * the window would otherwise count as "no match". `index` is renumbered
   * over the survivors so the cursor addresses positions in the list the
   * user can actually see.
   */
  protected readonly rows = computed<readonly ComboRow[]>(() => {
    const all = this.allRows();
    if (!this.virtual() || !this.cb.shouldFilter()) return all;
    const q = this.cb.query();
    if (!q) return all;
    const match = this.cb.kjFilter();
    const out: ComboRow[] = [];
    for (const row of all) {
      if (row.haystacks.some(h => match(q, h))) out.push({ ...row, index: out.length });
    }
    return out;
  });

  /** @internal — template binding for the virtualizer's row count. */
  protected readonly rowCount = computed(() => this.rows().length);

  /** @internal — the slice the template stamps. */
  protected readonly windowRows = computed<readonly ComboRow[]>(() => {
    const rows = this.rows();
    const w = this.vlist()?.window();
    if (!w) return [];
    return rows.slice(w.start, w.end);
  });

  private readonly _cursor = signal(-1);

  // ── KjListVirtualSource ───────────────────────────────────────────────

  /** Rows in the windowed option list. @internal */
  readonly count = this.rowCount;
  /** Cursor position in the option list, or `-1`. @internal */
  readonly activeIndex = this._cursor.asReadonly();

  /** @internal */
  isNavigable(index: number): boolean {
    const row = this.rows()[index];
    return row !== undefined && !row.disabled;
  }

  /** @internal */
  setActiveIndex(index: number): void {
    this._cursor.set(index);
    // Render the row BEFORE it becomes `aria-activedescendant`.
    this.vlist()?.scrollToIndex(index);
  }

  /** @internal */
  activateIndex(index: number): void {
    this.rowItemAt(index)?._activate();
  }

  /**
   * The registered `KjListItem` rendering row `index`, or `null` when that
   * row is outside the window. Matched through the `data-kj-virtual-index`
   * marker rather than by position, so a projected option cannot shift the
   * mapping.
   */
  private rowItemAt(index: number): KjListItem<unknown> | null {
    const selector = `[${KJ_VIRTUAL_INDEX_ATTR}="${index}"]`;
    for (const item of this.cb.items()) {
      if (item._host().closest(selector)) return item;
    }
    return null;
  }

  constructor() {
    this.cb._setViewItems(this.viewItems);

    effect(() => {
      this.cb._setVirtualSource(this.virtual() ? this : null);
    });
    this.destroyRef.onDestroy(() => {
      this.cb._setVirtualSource(null);
      this.cb._setViewItems(null);
    });

    // `aria-posinset` / `aria-setsize` describe the option list, not the
    // window, so option 4 001 announces as "4 001 of 5 000".
    effect(() => {
      if (!this.virtual()) {
        this.filterSvc.setWindow(0, null);
        return;
      }
      this.filterSvc.setWindow(this.vlist()?.window().start ?? 0, this.rowCount());
    });

    // A new query restarts the cursor at the top of the new result set —
    // the APG combobox 1.2 discoverability rule the headless root applies to
    // rendered items, applied to indices.
    effect(() => {
      this.cb.query();
      if (!this.virtual()) return;
      untracked(() => {
        this.vlist()?.scrollToStart();
        this._cursor.set(
          this.cb.kjAutoActivateFirst() && this.rowCount() > 0 ? 0 : -1,
        );
      });
    });

    // Keep the cursor inside the list when it shrinks under it.
    effect(() => {
      const n = this.rowCount();
      if (!this.virtual()) return;
      untracked(() => {
        if (this._cursor() >= n) this._cursor.set(n > 0 ? 0 : -1);
      });
    });

    // Once the cursor's row is rendered, hand its id to the navigator so
    // `aria-activedescendant` points at a node that exists.
    effect(() => {
      if (!this.virtual()) return;
      const index = this._cursor();
      // Re-run when the window re-renders.
      this.cb.items();
      untracked(() => {
        if (index < 0) {
          this.cb._setActiveId(null);
          return;
        }
        const item = this.rowItemAt(index);
        if (item) this.cb._setActiveId(item.id);
      });
    });

    // Seed the input text from a preset value. The headless root does this
    // from its rendered items, which a window cannot answer for a value
    // whose row is scrolled out — the data can.
    effect(() => {
      if (!this.virtual()) return;
      const value = this.cb.kjValue();
      const rows = this.allRows();
      if (value === null || value === undefined) return;
      if (this.cb.query() !== '') return;
      untracked(() => {
        const match = rows.find(r => Object.is(r.value, value));
        if (match) this.cb.kjQuery.set(match.label);
      });
    });
  }
}

/**
 * Single combobox option. Project as a child of `<kj-combobox>`, or skip it
 * entirely and pass `[options]` to `<kj-combobox>` instead.
 *
 * The element itself is the `role="option"` row — there is no inner button —
 * so the combobox's content query finds it and can filter, number and
 * navigate it. Activation (click / Enter / Space) is handled by the composed
 * `KjListItem`, and `[disabled]` reaches the listbox as `aria-disabled`.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 */
@Component({
  selector: 'kj-combobox-option',
  standalone: true,
  // `KjListItem` is composed on THIS host, not on an inner `<button>` in
  // this component's view: `KjCombobox.items` is a content query, and a
  // content query never crosses into a child component's view. With the
  // directive one level down, a projected `<kj-combobox-option>` registered
  // with nothing — it was never filtered, never numbered, never navigable
  // and never announced its selected state. Same reasoning, and the same
  // shape, as `<kj-command-item>`.
  //
  // The `role` / `data-active` semantics `KjComboboxOption` would have
  // contributed are inlined here because `hostDirectives` input forwarding
  // does not chain transitively (composing `KjComboboxOption` and
  // re-forwarding its own forwarded inputs fails the NG2017 check).
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue: value',
        'kjItemLabel: label',
        'kjItemKeywords: keywords',
        'kjDisabled: disabled',
      ],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-combobox-option',
    'role': 'option',
    '[attr.data-active]': 'isActive() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxOptionComponent {
  private readonly item = injectListItem<unknown>();
  private readonly cb = inject(KjCombobox);

  /** Whether this option is the currently active (`aria-activedescendant`) one. */
  protected readonly isActive = computed(
    () => this.cb.activeId() !== null && this.cb.activeId() === this.item.id,
  );
}

/**
 * Empty-state slot rendered when no options match the query. Place inside
 * `<kj-combobox>`.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 */
@Component({
  selector: 'kj-combobox-empty',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-combobox-empty',
    'role': 'status',
    'aria-live': 'polite',
    '[attr.hidden]': 'shouldShow() ? null : ""',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxEmpty {
  private readonly cb = inject(KjCombobox);
  /** @internal */
  shouldShow(): boolean {
    return this.cb.open()
      && !this.cb.loading()
      && this.cb.visibleCount() === 0
      && this.cb.query().length > 0;
  }
}

/**
 * Loading-state slot rendered while `loading=true`. Place inside `<kj-combobox>`.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 */
@Component({
  selector: 'kj-combobox-loading',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-combobox-loading',
    'role': 'status',
    'aria-live': 'polite',
    '[attr.hidden]': 'cb.loading() ? null : ""',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxLoading {
  /** @internal */
  readonly cb = inject(KjCombobox);
}
