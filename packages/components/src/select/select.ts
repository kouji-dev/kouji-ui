import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  booleanAttribute,
  contentChildren,
  forwardRef,
  input,
  inject,
  computed,
  signal,
  effect,
  untracked,
  afterNextRender,
  viewChild,
  viewChildren,
  ElementRef,
  Injector,
  DestroyRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  KjIcon,
  KjSelect,
  KjSelectTrigger,
  KjSelectContent,
  KjListItem,
  KjListNavigator,
  KjId,
  injectListItem,
} from '@kouji-ui/core';
import { KjOptionGroup } from './option-group';

/** One keyboard stop in the panel: an option row or a collapsible heading. */
interface Stop {
  readonly el: HTMLElement;
  readonly item?: KjListItem<unknown>;
  readonly group?: KjOptionGroup;
}

/**
 * Select root. Two-way bind via `[(value)]`.
 *
 * Users only need `<kj-select>` and `<kj-option>`. The trigger button and
 * listbox panel are rendered internally so the consumer markup stays minimal,
 * with theme tokens, placeholder text, and keyboard navigation already wired.
 *
 * Add `kjSearchable` for a filter field at the top of the panel, and wrap
 * options in `<kj-option-group kjLabel="…">` for headings — with
 * `kjCollapsible` / `[(kjCollapsed)]` a heading folds its group.
 *
 * Or pass the options as data: `[kjOptions]="users" kjValueKey="id"
 * kjLabelKey="name"`, plus `kjGroupKey="team"` (and `kjGroupsCollapsible`)
 * for headings. `[kjDisplayWith]` names a value no option matches.
 *
 * Limits:
 * - `kjOptions` rows are plain text (the label). For icons or two-line rows,
 *   project `<kj-option>`s instead. Both may be mixed; the data rows render
 *   first.
 * - Each `kjOptions` value must be unique (rows are tracked by value), and
 *   values are compared with `Object.is` — with `kjValueKey` unset an object
 *   item matches only the same reference.
 * - `kjGroupKey` groups keep their own fold state; there is no per-group
 *   `[(kjCollapsed)]` binding. Project `<kj-option-group>`s to control it.
 * - `kjDisplayWith` runs only for a value no option has; a matched value
 *   always shows its option's label.
 * - Search is a case-insensitive substring match on the option label
 *   (`kjLabel`, else its text). No fuzzy match, no async source — use
 *   `kj-combobox` for those.
 * - The query resets every time the panel opens.
 * - Fold keys follow the APG treeview: ArrowLeft on an option folds its
 *   group and moves to the heading; ArrowRight or Enter on a folded heading
 *   unfolds it. In the search field they only fold while the field is empty;
 *   once it holds text they move the caret, and every group with a match is
 *   shown expanded anyway.
 * - A group heading is a `button` inside a `role="group"` of the listbox.
 *   ARIA allows only options there, so some screen readers read the heading
 *   as a plain button with its expanded state rather than as part of the list.
 * - With `multiple` and search, clicking an option moves focus out of the
 *   field; click the field to type again.
 *
 * @doc-keyboard
 *   Enter|Space    — Opens the listbox from the trigger; activates the focused option when open
 *   ArrowDown|ArrowUp|Alt+ArrowDown — Opens the listbox from the trigger; focus lands on the selected (else first) option
 *   ArrowDown      — Moves focus to the next option (wraps at the end)
 *   ArrowUp        — Moves focus to the previous option (wraps at the start)
 *   Home           — Moves focus to the first option
 *   End            — Moves focus to the last option
 *   A-Z (type-ahead) — Focuses the first option whose visible text starts with the typed character
 *   Escape         — Closes the listbox and returns focus to the trigger
 *   Tab            — Closes the listbox, returns focus to the trigger and moves on to the next focusable element
 *   Printable keys (kjSearchable) — Typed into the search field, which is focused on open; filters the options by label
 *   Escape (kjSearchable) — Clears the search field when it holds text, else closes the listbox
 *   ArrowDown|ArrowUp (groups) — Also stop on each `kjCollapsible` group heading, in document order
 *   ArrowLeft (groups) — On an option of a collapsible group: folds the group and moves to its heading
 *   ArrowRight (groups) — On a folded heading: unfolds it
 *   Enter|Space (groups) — On a heading: folds or unfolds it
 *
 * @doc-aria
 *   aria-haspopup        — set to "listbox" on the trigger button ("dialog" with [kjSearchable])
 *   aria-expanded        — set on the trigger; reflects the open/closed state of the listbox
 *   aria-controls        — links the trigger to the panel id
 *   tabindex             — roving: the focused option is the active one ("0"), every other option is "-1"
 *   aria-multiselectable  — set on the panel to "true" when [multiple] is true
 *   role="listbox"       — on the content panel; with [kjSearchable] the panel is role="dialog" holding the search combobox above an inner role="listbox"
 *   role="option"        — on each kj-option child
 *   aria-selected        — set on each option to "true" or "false"
 *   aria-disabled        — set on options when [kjDisabled] is true
 *   data-disabled / data-multiple — mirrors of the disabled / multiple state for CSS
 *   role="combobox"      — on the search field ([kjSearchable]), outside the listbox; `aria-controls` names the listbox, `aria-autocomplete="list"`, `aria-expanded`, and `aria-activedescendant` tracks the active option (or heading) while DOM focus stays in the field
 *   role="group"         — on each `<kj-option-group>`, named by its heading through `aria-labelledby`
 *   aria-expanded        — on a `kjCollapsible` group's heading button
 *   role="status"        — on the "no matches" message, announced politely
 *
 * @doc-css-var
 *   --kj-select-trigger-height — Height of the trigger button. Sizes (sm/md/lg) override.
 *
 * @doc-touch
 *   Default trigger height is 36px. Apply `data-size="lg"` on `<kj-select>` to bump the trigger to 2.75rem (44px) and meet WCAG 2.5.5 for touch-first layouts. Options have padding-only sizing and rely on their text affordance.
 *
 * @doc-a11y
 *   The listbox follows the WAI-ARIA combobox/listbox pattern. The panel is
 *   portalled to `document.body` so it escapes clipping ancestors while still
 *   being announced as the trigger's popup via `aria-controls`. Selection
 *   tracking uses `Object.is` so primitive and reference values both work.
 *   In single-select mode the panel closes on activation; in multi mode
 *   ([multiple]="true") the panel stays open and `aria-multiselectable="true"`
 *   is exposed for assistive tech.
 *
 * @doc-related combobox,cascade-select,radio-group
 *
 * @doc-example Default
 *   A single-value fruit picker — the bare-minimum recipe.
 *   @doc-file select.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — placeholder, pre-selected,
 *   and disabled. Use this as the copy-paste starting point.
 *   @doc-file select.usage.example.ts
 * @doc-example With placeholder
 *   `placeholder="…"` is shown until a value is bound.
 *   @doc-file select.placeholder.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the trigger from the tab order.
 *   @doc-file select.disabled.example.ts
 * @doc-example Grouped options
 *   Cluster options under `<kj-option-group>` headings; `kjCollapsible` makes a heading fold its group.
 *   @doc-file select.grouped.example.ts
 * @doc-example Data-driven options
 *   `[kjOptions]` with `kjValueKey` / `kjLabelKey` / `kjGroupKey`, and `[kjDisplayWith]` for a value not in the list.
 *   @doc-file select.data.example.ts
 * @doc-example Searchable
 *   `kjSearchable` puts a filter field at the top of the panel; `[kjSelectEmpty]` replaces the "No matches" text.
 *   @doc-file select.searchable.example.ts
 * @doc-category Library/Data input
 * @doc
 * @doc-name select
 * @doc-description Themed dropdown select with a trigger button, listbox panel, and keyboard navigation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-select',
  standalone: true,
  hostDirectives: [
    { directive: KjSelect, inputs: ['kjSelectValue: value'], outputs: ['kjSelectValueChange: valueChange'] },
  ],
  imports: [KjIcon, KjSelectTrigger, KjSelectContent, KjOptionGroup, forwardRef(() => KjOptionComponent)],
  template: `
    <button type="button" kjSelectTrigger #trig="kjSelectTrigger" class="kj-select-trigger" [disabled]="disabled() || null" [kjMultiple]="multiple()">
      <span class="kj-select-trigger-label">{{ displayLabel() }}</span>
      <span kjIcon="chevron-down" class="kj-select-trigger-caret" aria-hidden="true"></span>
    </button>
    <kj-select-content
      [kjFor]="trig"
      class="kj-select-content"
      [kjSearchable]="kjSearchable()"
      [kjFocusMode]="kjSearchable() ? 'activedescendant' : 'roving'"
      [kjHostActiveDescendant]="!kjSearchable()"
      [attr.aria-labelledby]="kjSearchable() ? searchId : null"
    >
      @if (kjSearchable()) {
        <input
          #search
          [id]="searchId"
          type="text"
          class="kj-select-search"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded="true"
          [attr.aria-controls]="listboxId"
          [attr.aria-label]="kjSearchPlaceholder()"
          [attr.aria-activedescendant]="activeDescendant()"
          [placeholder]="kjSearchPlaceholder()"
          [value]="query()"
          (input)="query.set(search.value)"
          (keydown)="onListKeydown($event)"
        />
      }
      <!-- Without search the panel itself is the listbox and this wrapper is
           a role-less pass-through; with search it is the listbox. Its key
           handlers catch keys bubbling up from the focused option or heading. -->
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
      <div
        class="kj-select-listbox"
        [id]="listboxId"
        [attr.role]="kjSearchable() ? 'listbox' : null"
        [attr.aria-labelledby]="kjSearchable() ? searchId : null"
        [attr.aria-multiselectable]="kjSearchable() && multiple() ? 'true' : null"
        (keydown)="onListKeydown($event)"
        (focusin)="onListFocusin($event)"
      >
        @for (g of dataGroups(); track g.key) {
          @if (g.key === null) {
            @for (o of g.rows; track o.value) {
              <kj-option [value]="o.value" [kjLabel]="o.label">{{ o.label }}</kj-option>
            }
          } @else {
            <kj-option-group [kjLabel]="g.key" [kjCollapsible]="kjGroupsCollapsible()">
              @for (o of g.rows; track o.value) {
                <kj-option [value]="o.value" [kjLabel]="o.label">{{ o.label }}</kj-option>
              }
            </kj-option-group>
          }
        }
        <ng-content />
      </div>
      @if (noMatches()) {
        <div class="kj-select-empty" role="status" aria-live="polite">
          <ng-content select="[kjSelectEmpty]">No matches</ng-content>
        </div>
      }
    </kj-select-content>
  `,
  styleUrl: './select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-multiple]': "multiple() ? '' : null",
    '[attr.data-size]': "kjSize() === 'md' ? null : kjSize()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectComponent {
  /** Text shown on the trigger while nothing is selected. Defaults to `'Select…'`. */
  readonly placeholder = input<string>('Select…');

  /** Disables the trigger and removes it from the tab order. Defaults to `false`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Lets the listbox hold more than one value. Defaults to `false`. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Control height preset, reflected as `data-size`. Defaults to `'md'`. */
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  /** Adds a search field at the top of the panel that filters options by label. Defaults to `false`. */
  readonly kjSearchable = input(false, { transform: booleanAttribute });

  /** Placeholder and accessible name of the search field. Defaults to `'Search…'`. */
  readonly kjSearchPlaceholder = input<string>('Search…');

  /**
   * Options as data: objects or primitives, rendered as `<kj-option>` rows
   * (inside `<kj-option-group>`s with `kjGroupKey`). May be mixed with
   * projected `<kj-option>`s: the data rows come first. Defaults to `[]`.
   */
  readonly kjOptions = input<readonly unknown[]>([]);

  /** Property of each `kjOptions` item used as its value. Unset: the item itself. */
  readonly kjValueKey = input<string | null>(null);

  /**
   * Property of each `kjOptions` item shown in the list, on the trigger and
   * matched by search. Unset: `String(item)`.
   */
  readonly kjLabelKey = input<string | null>(null);

  /**
   * Property of each `kjOptions` item to group by: one `<kj-option-group>`
   * per distinct value, in first-seen order, headed by `String(value)`. Items
   * whose value is `null` / `undefined` stay ungrouped. Unset: no groups.
   */
  readonly kjGroupKey = input<string | null>(null);

  /** Makes every `kjGroupKey` group `kjCollapsible`. Defaults to `false`. */
  readonly kjGroupsCollapsible = input(false, { transform: booleanAttribute });

  /**
   * Trigger text for a value no option matches (a raw id whose option is not
   * loaded yet, say). Unset: `String(value)`.
   */
  readonly kjDisplayWith = input<((value: unknown) => string) | null>(null);

  /** @internal — `kjOptions` resolved to rows, bucketed by group (`key: null` = ungrouped). */
  protected readonly dataGroups = computed(() => {
    const vk = this.kjValueKey();
    const lk = this.kjLabelKey();
    const gk = this.kjGroupKey();
    const field = (item: unknown, k: string): unknown => (item as Record<string, unknown> | null)?.[k];
    const groups = new Map<string | null, { key: string | null; rows: { value: unknown; label: string }[] }>();
    for (const item of this.kjOptions()) {
      const g = gk ? field(item, gk) : null;
      const key = g === null || g === undefined ? null : String(g);
      let bucket = groups.get(key);
      if (!bucket) groups.set(key, (bucket = { key, rows: [] }));
      bucket.rows.push({
        value: vk ? field(item, vk) : item,
        label: String((lk ? field(item, lk) : item) ?? ''),
      });
    }
    return [...groups.values()];
  });

  private readonly select = inject(KjSelect);

  /** The search field's text. Reset every time the panel opens. */
  readonly query = signal('');

  private readonly searchEl = viewChild<ElementRef<HTMLInputElement>>('search');
  /** @internal — the panel's navigator, read for the field's `aria-activedescendant`. */
  protected readonly nav = viewChild(KjListNavigator);
  /** @internal — id of the active option, or `null`. */
  readonly activeId = computed(() => this.nav()?.activeId() ?? null);
  /** @internal — the collapsible group whose heading holds the keyboard cursor. */
  private readonly activeHeader = signal<KjOptionGroup | null>(null);
  /** @internal — what the search field's `aria-activedescendant` points at. */
  readonly activeDescendant = computed(() => this.activeHeader()?.labelId ?? this.activeId());
  private readonly ids = inject(KjId);
  /** @internal */
  protected readonly searchId = this.ids.mint('select-search');
  /** @internal */
  protected readonly listboxId = this.ids.mint('select-listbox');
  private readonly contentGroups = contentChildren(KjOptionGroup, { descendants: true });
  private readonly viewGroups = viewChildren(KjOptionGroup);
  private readonly groups = computed(() => [...this.viewGroups(), ...this.contentGroups()]);

  /** @internal */
  protected readonly noMatches = computed(
    () =>
      this.kjSearchable() &&
      this.query().trim() !== '' &&
      this.options().every(o => !o._row.visible()),
  );

  constructor() {
    const injector = inject(Injector);
    const win = inject(DOCUMENT).defaultView;
    this.select._setViewItems(this.viewItems);

    // Filter and fold decide every option's visibility in one pass.
    effect(() => {
      const q = this.kjSearchable() ? this.query().trim().toLowerCase() : '';
      const folded = new Set<KjListItem<unknown>>();
      for (const g of this.groups()) {
        g._searching.set(q !== '');
        if (g._folded()) for (const item of g._items()) folded.add(item);
      }
      for (const opt of this.options()) {
        const row = opt._row;
        row.setVisible(!folded.has(row) && (q === '' || row.label().toLowerCase().includes(q)));
      }
    });

    effect(() => {
      const active = this.activeHeader();
      for (const g of this.groups()) g._cursor.set(g === active);
    });

    // A new query puts the cursor on the first match (APG combobox).
    effect(() => {
      this.query();
      untracked(() => {
        this.activeHeader.set(null);
        if (!this.kjSearchable() || !this.select.open()) return;
        afterNextRender(() => this.nav()?.moveToFirst(), { injector });
      });
    });

    // Open: start from an empty query with the field focused.
    effect(() => {
      if (!this.select.open() || !this.kjSearchable()) return;
      untracked(() => {
        this.query.set('');
        this.activeHeader.set(null);
      });
      afterNextRender(() => this.searchEl()?.nativeElement.focus(), { injector });
    });

    // Escape clears a non-empty query instead of closing. The overlay stack
    // listens on `document` in the capture phase, so only a capture listener
    // on `window` runs before it.
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || this.query() === '') return;
      if (e.target !== this.searchEl()?.nativeElement) return;
      e.stopPropagation();
      e.preventDefault();
      this.query.set('');
    };
    win?.addEventListener('keydown', onKeydown, true);
    inject(DestroyRef).onDestroy(() => win?.removeEventListener('keydown', onKeydown, true));
  }

  /**
   * @internal Keyboard for groups, on both the search field and the listbox:
   * ArrowUp / ArrowDown also stop on collapsible headings, ArrowLeft folds the
   * active option's group onto its heading, ArrowRight unfolds a heading and
   * Enter / Space toggle it. Runs before the panel's navigator, which skips
   * any key handled here.
   */
  onListKeydown(e: KeyboardEvent): void {
    const nav = this.nav();
    if (e.defaultPrevented || !nav) return;
    const header = this.activeHeader();
    const searching = this.query().trim() !== '';
    const inField = e.target === this.searchEl()?.nativeElement;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const stops = this.stops();
        if (!stops.some(s => s.group)) return;
        const current = header ? header._header() : nav.activeItem()?._host() ?? null;
        const d = e.key === 'ArrowDown' ? 1 : -1;
        let i = stops.findIndex(s => s.el === current);
        i = i === -1 ? (d > 0 ? 0 : stops.length - 1) : (i + d + stops.length) % stops.length;
        e.preventDefault();
        this.moveTo(stops[i]);
        return;
      }
      case 'ArrowLeft': {
        if (searching) return;
        const item = nav.activeItem();
        const g = header ?? (item ? this.groups().find(x => x._items().includes(item)) : undefined);
        const el = g?._header();
        if (!g || !el) return;
        e.preventDefault();
        g.kjCollapsed.set(true);
        this.moveTo({ el, group: g });
        return;
      }
      case 'ArrowRight':
        if (!header || searching) return;
        e.preventDefault();
        header.kjCollapsed.set(false);
        return;
      case 'Enter':
      case ' ':
        if (!header || (e.key === ' ' && inField)) return;
        // Also cancels the button's native click, so the fold toggles once.
        e.preventDefault();
        header.kjCollapsed.update(v => !v);
        return;
      case 'Escape':
      case 'Tab':
      case 'Shift':
        return;
      default:
        // Home / End / type-ahead belong to the navigator, which moves off the heading.
        if (header) this.activeHeader.set(null);
    }
  }

  /** @internal Roving mode: focus landing on a heading (pointer or script) puts the cursor there. */
  onListFocusin(e: FocusEvent): void {
    const g = this.groups().find(x => x._header() === e.target);
    this.activeHeader.set(g ?? null);
  }

  /** Navigable options plus collapsible headings, in document order. */
  private stops(): Stop[] {
    const stops: Stop[] = (this.nav()?.navigable() ?? []).map(item => ({ el: item._host(), item }));
    for (const group of this.groups()) {
      const el = group._header();
      if (el && !group._searching()) stops.push({ el, group });
    }
    // 4 = Node.DOCUMENT_POSITION_FOLLOWING: b comes after a.
    return stops.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1));
  }

  private moveTo(stop: Stop): void {
    if (stop.group) {
      this.activeHeader.set(stop.group);
      if (!this.kjSearchable()) stop.el.focus();
      return;
    }
    this.activeHeader.set(null);
    const nav = this.nav();
    if (stop.item && nav) {
      nav.setActive(stop.item.id);
      nav.focusActive();
    }
  }

  /**
   * Trigger element signal — sourced from the headless `KjSelect` root,
   * which is set the moment the inner `KjSelectTrigger` directive
   * constructs. No view-query lifecycle wait, so callers reading this
   * inside an `effect()` see it resolve as soon as the select is mounted.
   */
  readonly triggerEl = this.select.triggerEl;

  /** Focus the trigger button. Delegates to the headless root. */
  focus(): void {
    this.select.focus();
  }

  /** Direct projection-child query — every `<kj-option>` placed inside this
   *  `<kj-select>` registers here. `forwardRef` is required because
   *  `KjOptionComponent` is declared later in the same file. The trigger
   *  label is resolved by matching the active value against each option's
   *  composed `KjListItem`, which is now the `<kj-option>` host itself. */
  private readonly contentOptions = contentChildren<KjOptionComponent>(
    forwardRef(() => KjOptionComponent) as unknown as typeof KjOptionComponent,
    // descendants: options inside a <kj-option-group> count too
    { descendants: true },
  );
  /** Rows stamped from `kjOptions` — in this view, so no content query sees them. */
  private readonly viewOptions = viewChildren<KjOptionComponent>(
    forwardRef(() => KjOptionComponent) as unknown as typeof KjOptionComponent,
  );
  private readonly viewItems = viewChildren(KjListItem);
  private readonly options = computed(() => [...this.viewOptions(), ...this.contentOptions()]);

  /** Resolve a value to its matching option's label. Falls back to
   *  `kjDisplayWith(v)`, else `String(v)`, when no option has that value. */
  private labelFor(v: unknown): string {
    for (const opt of this.options()) {
      const row = opt._row;
      if (Object.is(row.value(), v)) {
        const explicit = row.kjItemLabel();
        return explicit || String(v);
      }
    }
    return this.kjDisplayWith()?.(v) ?? String(v);
  }

  /** The trigger's rendered text: the selected option label(s), else the placeholder. */
  readonly displayLabel = computed(() => {
    const v = this.select.value();
    if (v === undefined || v === null || v === '') return this.placeholder();
    if (Array.isArray(v)) {
      return v.length === 0
        ? this.placeholder()
        : v.map((entry) => this.labelFor(entry)).join(', ');
    }
    return this.labelFor(v);
  });
}

/**
 * Single option row.
 * @doc
 * @doc-name select
 */
@Component({
  selector: 'kj-option',
  standalone: true,
  // `KjListItem` is composed on THIS host, not on an inner `<div kjOption>`
  // in this component's view: `KjSelect.items` is a content query, and a
  // content query never crosses into a child component's view. With the
  // directive one level down every projected `<kj-option>` registered with
  // nothing — the listbox had no roving tab stop (every row rendered
  // `tabindex="-1"`), no ArrowUp/ArrowDown/Home/End, no type-ahead and no
  // `aria-posinset` / `aria-setsize` (WCAG 2.1.1, 2.4.3, 1.3.1). Same fix,
  // and the same shape, as `<kj-combobox-option>` and `<kj-command-item>`.
  //
  // The `role` / `class` semantics the core `KjOption` directive would have
  // contributed are inlined here, because `hostDirectives` input forwarding
  // does not chain transitively (composing `KjOption` and re-forwarding its
  // own forwarded inputs fails the NG2017 check).
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue: value',
        'kjItemLabel: kjLabel',
        'kjDisabled: disabled',
      ],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-option',
    'role': 'option',
    '[attr.data-active]': "isActive() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOptionComponent {
  /** @internal — the composed row. `KjSelectComponent` reads its value and
   *  its explicit label to render the trigger's displayed text. */
  readonly _row = injectListItem<unknown>();

  private readonly owner = inject(KjSelectComponent, { optional: true });

  /** @internal — the `aria-activedescendant` row while the search field holds focus. */
  protected readonly isActive = computed(
    () => !!this.owner?.kjSearchable() && this.owner.activeDescendant() === this._row.id,
  );
}
