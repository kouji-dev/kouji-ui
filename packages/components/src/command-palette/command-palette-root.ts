import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  KJ_VIRTUAL_INDEX_ATTR,
  KjCommandPalette,
  KjCommandInput,
  KjCommandList,
  KjCommandEmpty,
  KjFilterableList,
  KjListItem,
  KjListVirtual,
  KjOverlayController,
  kjSubstringFilter,
  onHotkey,
  type KjListVirtualSource,
} from '@kouji-ui/core';
import { KjCommandPaletteFooter } from './command-palette-footer';
import { KjCommandPaletteItemTemplate } from './command-palette-item-template';
import { KjCommandPaletteSurface } from './command-palette-surface';

/**
 * Default search text for a `[kjItems]` entry when the consumer does not
 * pass `[kjItemHaystacks]`: a string is its own haystack, an object offers
 * its `label` / `title` / `name`, anything else is stringified.
 */
function defaultHaystacks(item: unknown): readonly string[] {
  if (typeof item === 'string') return [item];
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    const out = ['label', 'title', 'name']
      .map(k => o[k])
      .filter((v): v is string => typeof v === 'string');
    if (out.length) return out;
  }
  return [String(item)];
}

/**
 * Modal command palette component. Renders a centered dialog with backdrop
 * when `kjOpen()` is `true`. Composes `[kjCommandPalette]` on its host so all
 * filter/activate semantics work for both projected items and items rendered
 * via `[kjItems]` + `<ng-template kjCommandPaletteItemTemplate>`.
 *
 * Open/close via `[(kjOpen)]` 2-way binding. Optional Cmd-K (or any chord)
 * hotkey via `[kjHotkey]`.
 *
 * @doc-example Default
 *   A trigger button opens the modal; type to filter the projected items.
 *   @doc-file command-palette.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common command-palette usages — Cmd-K hotkey,
 *   grouped rows, and a trigger button.
 *   @doc-file command-palette.usage.example.ts
 * @doc-example With trigger and hotkey
 *   Bind a global `mod+k` chord that toggles the palette open and closed.
 *   @doc-file command-palette.dialog.example.ts
 * @doc-example With groups
 *   `<kj-command-group>` clusters related commands under a label heading.
 *   @doc-file command-palette.groups.example.ts
 * @doc-example Async with item template
 *   `[kjItems]` + `kjCommandPaletteItemTemplate` for remote search results.
 *   @doc-file command-palette.async.example.ts
 * @doc-example Fuzzy filter
 *   Drop in a fuzzy `[kjFilter]` for typo-tolerant matching.
 *   @doc-file command-palette.fuzzy.example.ts
 *
 * @doc-keyboard
 *   ArrowDown|ArrowUp — Moves the active item through the visible list
 *   Enter             — Activates the highlighted item (emits `kjValueChange`)
 *   Escape            — Closes the palette and returns focus to the trigger
 *   mod+k             — Default hotkey toggles open / closed (configurable via `[kjHotkey]`)
 *   Printable keys    — Type into the search input to filter
 *
 * @doc-aria
 *   role="dialog"     — On the panel; `aria-modal="true"` while open
 *   aria-label        — Defaults to "Command palette"; override via `[kjAriaLabel]`
 *   role="listbox"    — On the inner list (provided by `[kjCommandList]`)
 *   role="option"     — On each `[kjCommandItem]`
 *   aria-disabled     — Reflected per item when `[kjDisabled]` is true
 *   aria-live         — The empty state announces "No results found" politely
 *
 * @doc-touch
 *   Each command row enforces `min-height: 2.75rem` (44px) via CSS — every
 *   row is a valid touch target. The footer keyboard hints are decorative.
 *
 * @doc-a11y
 *   Built on the overlay primitive. `KjOverlayController` portals the dialog
 *   into the shared overlay container, renders a real `<kj-backdrop>` that
 *   makes the rest of the page `inert` while it is open (so `aria-modal` is
 *   backed by something), traps Tab inside the panel, locks page scrolling,
 *   and returns focus to whatever opened the palette when it closes. The
 *   search input takes focus on open; the active item is tracked via
 *   `aria-activedescendant`. When projected items are filtered out, groups
 *   auto-hide so the announced "results found" count stays accurate. The
 *   `[kjAutoCloseOnActivate]` posture (true by default) closes the palette
 *   after activation.
 *
 * @doc-related dropdown-menu,dialog,menubar
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 * @doc-is-main
 */
@Component({
  selector: 'kj-command-palette',
  standalone: true,
  imports: [NgTemplateOutlet, KjCommandInput, KjCommandList, KjCommandEmpty, KjListVirtual, KjCommandPaletteSurface],
  hostDirectives: [{
    directive: KjCommandPalette,
    inputs: ['kjShouldFilter', 'kjLoading', 'kjAutoActivateFirst', 'kjDismissOnActivate', 'kjValue', 'kjQuery', 'kjFilter'],
    outputs: ['kjValueChange', 'kjQueryChange', 'kjActivate'],
  }],
  // Only the controller: the strategy bundle lives on `[kjCommandPaletteSurface]`
  // so projected content never inherits it (see that directive).
  providers: [KjOverlayController],
  template: `
      <!-- role="dialog" / aria-modal / data-state / hidden / id all come from
           the composed KjOverlayPanel. tabindex="-1" makes the panel itself a
           focus target (WAI-ARIA dialog pattern) without adding a Tab stop. -->
      <div
        kjCommandPaletteSurface
        class="kj-command-palette__dialog"
        tabindex="-1"
        [attr.aria-label]="kjAriaLabel()"
        (keydown.escape)="onEscape()"
      >
        <div class="kj-command-palette__input-wrapper">
          <svg class="kj-command-palette__search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            kjCommandInput
            type="search"
            class="kj-command-palette__input"
            [placeholder]="kjPlaceholder()"
            autocomplete="off"
            spellcheck="false"
          />
          @if (kjEscBadge()) {
            <kbd class="kj-command-palette__esc-kbd">esc</kbd>
          }
        </div>
        <div
          kjCommandList
          kjListVirtual
          #vlist="kjListVirtual"
          class="kj-command-palette__list"
          [kjVirtualEnabled]="kjVirtual()"
          [kjVirtualCount]="rowCount()"
          [kjVirtualItemSize]="kjVirtualItemSize()"
        >
          <div kjCommandEmpty class="kj-command-palette__empty">No results found.</div>
          @if (itemTpl(); as t) {
            @if (kjVirtual()) {
              <div
                class="kj-command-palette__virtual"
                role="presentation"
                [style.height.px]="vlist.window().totalSize"
              >
                <div
                  class="kj-command-palette__virtual-slice"
                  role="presentation"
                  [style.transform]="'translateY(' + vlist.window().paddingTop + 'px)'"
                >
                  @for (row of windowRows(); track row.index) {
                    <div
                      class="kj-command-palette__row"
                      role="presentation"
                      [attr.data-kj-virtual-index]="row.index"
                    >
                      <ng-container
                        *ngTemplateOutlet="t.tpl; context: { $implicit: row.item, index: row.index }"
                      />
                    </div>
                  }
                </div>
              </div>
            } @else {
              @for (item of kjItems(); track $index; let i = $index) {
                <ng-container *ngTemplateOutlet="t.tpl; context: { $implicit: item, index: i }" />
              }
            }
          }
          <ng-content />
        </div>
        @if (customFooter()) {
          <ng-content select="[kjCommandPaletteFooter]" />
        } @else {
          <div class="kj-command-palette__footer">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        }
      </div>
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-command-palette',
    style: 'display: contents;',
    '(kjActivate)': 'onActivate()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandPaletteComponent implements KjListVirtualSource {
  /** Input placeholder text. */
  readonly kjPlaceholder = input<string>('Search commands…');

  /** Show an `esc` kbd badge on the right of the input. @default true */
  readonly kjEscBadge = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Accessible label for the dialog. @default 'Command palette' */
  readonly kjAriaLabel = input<string>('Command palette');

  /**
   * Two-way bindable open state. Defaults to `false`.
   *
   * Angular's `model()` accepts no `transform`, so the bare-attribute form
   * (`<kj-command-palette kjOpen>`) binds the empty string and reads as
   * `false`. Bind it: `[(kjOpen)]="open"` or `[kjOpen]="true"`.
   */
  readonly kjOpen = model<boolean>(false);

  /**
   * Optional keyboard chord that toggles open/close. Empty string disables.
   * `mod` resolves to `Meta` on macOS, `Ctrl` elsewhere.
   * @default ''
   */
  readonly kjHotkey = input<string>('');

  /** Items list — rendered via `KjCommandPaletteItemTemplate` when provided. */
  readonly kjItems = input<readonly unknown[]>([]);

  /** Close the palette automatically when an item activates. @default true */
  readonly kjAutoCloseOnActivate = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Render only a window of `[kjItems]` instead of every entry.
   *
   * Turn this on for large option sets: 5 000 items otherwise mount 5 000
   * `<kj-command-item>` components, each with a `KjListItem` directive, its
   * host bindings and its own element injector, the moment the palette
   * opens. With it on, the palette renders the rows that fit the list
   * viewport plus a few of overscan, and ArrowUp / ArrowDown / Home / End /
   * Enter keep walking the whole dataset — the row the cursor lands on is
   * scrolled into the window before it becomes the `aria-activedescendant`.
   *
   * Requires `[kjItems]` with an `<ng-template kjCommandPaletteItemTemplate>`;
   * projected `<kj-command-item>` children are not windowed. Filtering moves
   * to the data (see `[kjItemHaystacks]`), because only a window of rows is
   * ever registered.
   *
   * The other supported shape for a large command set is server-filtered
   * paging: `[kjShouldFilter]="false"` plus `[kjItems]` bound to the current
   * page of results and `(kjQueryChange)` driving the fetch. That skips the
   * built-in filter entirely — a keystroke then costs nothing here — and it
   * composes with `[kjVirtual]`, which windows whatever page is bound.
   *
   * @default false
   */
  readonly kjVirtual = input<boolean, unknown>(false, { transform: booleanAttribute });

  /**
   * Row height in px for the windowed path. `0` (the default) measures a
   * rendered row instead, which follows density and font-size changes.
   */
  readonly kjVirtualItemSize = input<number, unknown>(0, { transform: numberAttribute });

  /**
   * Search text for one `[kjItems]` entry, used by the windowed path's
   * data-side filter. Defaults to the entry's `label` / `title` / `name`, or
   * the string itself.
   */
  readonly kjItemHaystacks = input<(item: unknown) => readonly string[]>(defaultHaystacks);

  /**
   * Whether one `[kjItems]` entry is disabled, so the windowed cursor skips
   * it exactly as the navigator skips a disabled rendered row. Defaults to
   * the entry's `disabled` property.
   */
  readonly kjItemDisabled = input<(item: unknown) => boolean>(
    item => !!(item as { disabled?: unknown } | null)?.disabled,
  );

  protected readonly itemTpl = contentChild(KjCommandPaletteItemTemplate);
  protected readonly customFooter = contentChild(KjCommandPaletteFooter);

  private readonly destroyRef = inject(DestroyRef);
  /**
   * This palette's own overlay. It owns the portal, the scrim, the page
   * inerting, the focus trap, the scroll lock and focus restoration; the
   * component only decides *when* it is open.
   */
  private readonly controller = inject(KjOverlayController);
  /** The composed headless palette (host directive) — owns query + active state. */
  private readonly palette = inject(KjCommandPalette);
  /** The palette's filter service — told about the window so ARIA counts stay honest. */
  private readonly filterSvc = inject(KjFilterableList);
  /**
   * Not `.required`: view queries resolve after the first template pass, so
   * a computed the template reads would throw on that pass. Reading it as
   * an optional signal renders an empty window once and re-renders when the
   * query resolves — signal view queries notify their consumers.
   */
  private readonly vlist = viewChild(KjListVirtual);

  /**
   * The dataset the windowed path renders: `[kjItems]` narrowed by the
   * palette's own filter, applied to the DATA. It has to happen here —
   * `KjFilterableList` filters registered `KjListItem`s, and a windowed list
   * only ever registers the rows in view, so a row scrolled out of the
   * window would count as "no match".
   */
  protected readonly rows = computed<readonly unknown[]>(() => {
    const items = this.kjItems();
    if (!this.kjVirtual() || !this.palette.kjShouldFilter()) return items;
    const q = this.palette.kjQuery();
    if (!q) return items;
    const fn = this.palette.kjFilter() ?? kjSubstringFilter;
    const haystacks = this.kjItemHaystacks();
    return items.filter(item => fn(q, haystacks(item)) > 0);
  });

  /** @internal — template binding for the virtualizer's row count. */
  protected readonly rowCount = computed(() => this.rows().length);

  /** @internal — the slice the template stamps, each row carrying its dataset index. */
  protected readonly windowRows = computed<readonly { index: number; item: unknown }[]>(() => {
    const rows = this.rows();
    const w = this.vlist()?.window();
    if (!w) return [];
    const out: { index: number; item: unknown }[] = [];
    for (let i = w.start; i < w.end && i < rows.length; i++) out.push({ index: i, item: rows[i] });
    return out;
  });

  private readonly _cursor = signal(-1);

  // ── KjListVirtualSource ───────────────────────────────────────────────

  /** Rows in the windowed dataset. @internal */
  readonly count = this.rowCount;
  /** Cursor position in the dataset, or `-1`. @internal */
  readonly activeIndex = this._cursor.asReadonly();

  /** @internal */
  isNavigable(index: number): boolean {
    const item = this.rows()[index];
    return item !== undefined && !this.kjItemDisabled()(item);
  }

  /** @internal */
  setActiveIndex(index: number): void {
    this._cursor.set(index);
    // Render the row BEFORE it becomes `aria-activedescendant`: the effect
    // below only finds an id for a row that exists.
    this.vlist()?.scrollToIndex(index);
  }

  /** @internal */
  activateIndex(index: number): void {
    this.rowItemAt(index)?._activate();
  }

  /**
   * The registered `KjListItem` rendering dataset row `index`, or `null`
   * when that row is outside the current window. Matched through the
   * `data-kj-virtual-index` marker rather than by position, so projected
   * rows or a group heading cannot shift the mapping.
   */
  private rowItemAt(index: number): KjListItem<unknown> | null {
    const selector = `[${KJ_VIRTUAL_INDEX_ATTR}="${index}"]`;
    for (const item of this.palette.items()) {
      if (item._host().closest(selector)) return item;
    }
    return null;
  }

  constructor() {
    // Register / unregister the windowed cursor with the headless palette.
    // While registered it stands down from filtering and from auto-
    // activating the first row; both are index work now, and this component
    // owns the index.
    effect(() => {
      this.palette._setVirtualSource(this.kjVirtual() ? this : null);
    });

    // `aria-posinset` / `aria-setsize` describe the dataset, not the window,
    // so row 3 001 announces as "3 001 of 5 000".
    effect(() => {
      if (!this.kjVirtual()) {
        this.filterSvc.setWindow(0, null);
        return;
      }
      this.filterSvc.setWindow(this.vlist()?.window().start ?? 0, this.rowCount());
    });

    // A new query restarts the cursor at the top of the new result set.
    effect(() => {
      this.palette.kjQuery();
      if (!this.kjVirtual() || !this.palette.kjAutoActivateFirst()) return;
      untracked(() => {
        this.vlist()?.scrollToStart();
        this._cursor.set(this.rowCount() > 0 ? 0 : -1);
      });
    });

    // Keep the cursor inside the dataset when it shrinks under it.
    effect(() => {
      const n = this.rowCount();
      if (!this.kjVirtual()) return;
      untracked(() => {
        if (this._cursor() >= n) this._cursor.set(n > 0 ? 0 : -1);
      });
    });

    // Once the cursor's row is rendered, hand its id to the navigator so
    // `aria-activedescendant` points at a node that exists, and mirror its
    // value on the palette the way the non-windowed path does.
    effect(() => {
      if (!this.kjVirtual()) return;
      const index = this._cursor();
      // Re-run when the window re-renders.
      this.palette.items();
      if (index < 0) {
        untracked(() => {
          this.palette._setActiveId(null);
          this.palette.kjValue.set(null);
        });
        return;
      }
      untracked(() => {
        const item = this.rowItemAt(index);
        if (!item) return;
        this.palette._setActiveId(item.id);
        this.palette.kjValue.set(item.value());
      });
    });

    this.destroyRef.onDestroy(() => this.palette._setVirtualSource(null));

    // The hotkey is a trigger-event strategy driven straight off this
    // overlay's controller, so it inherits `onHotkey`'s behaviour: `mod`
    // resolves per platform, and a keystroke another listener already handled
    // is skipped — which is what makes two palettes on one chord resolve
    // first-listener-wins. An empty chord installs no listener. The cleanup
    // runs on a chord change and on destroy.
    effect((onCleanup) => {
      const chord = this.kjHotkey().trim();
      if (!chord) return;
      const hotkey = onHotkey(chord);
      hotkey.attach(this.controller.context);
      hotkey.bindToggle(() => {
        // Same gate as the `[(kjOpen)]` effect below: no panel, no overlay yet.
        if (!this.controller.panelEl()) return;
        this.applyClosePolicy();
        this.controller.toggle();
      });
      onCleanup(() => hotkey.detach());
    });

    // `[(kjOpen)]` → controller.
    //
    // Both directions are gated on `panelEl()`, which `[kjOverlayPanel]` sets
    // in the same effect that attaches the strategy bundle. Without the gate
    // a palette rendered with `[kjOpen]` already `true` would reach `open()`
    // before any strategy existed — this component's effects are created
    // before the ones belonging to directives in its own view — and the
    // controller would move to `opening` with nothing to mount it.
    effect(() => {
      const want = this.kjOpen();
      if (!this.controller.panelEl()) return;
      const isOpen = untracked(() => this.controller.isOpen());
      if (want && !isOpen) { this.applyClosePolicy(); this.controller.open(); }
      if (!want && isOpen) this.controller.close('programmatic');
    });

    // controller → `[(kjOpen)]`, whatever moved it: the hotkey, the scrim,
    // Escape, an activated item, or the controller being disposed with the
    // host view.
    effect(() => {
      const isOpen = this.controller.isOpen();
      if (!this.controller.panelEl()) return;
      const want = untracked(() => this.kjOpen());
      if (isOpen !== want) this.kjOpen.set(isOpen);
    });

    // Reset the search query + active item when the palette closes, so the
    // next open starts fresh instead of restoring the previous search. Paired
    // with KjCommandInput reflecting the query signal back to the DOM input,
    // this also clears the visible text.
    let wasOpen = false;
    effect(() => {
      const open = this.controller.isOpen();
      if (wasOpen && !open) {
        this.palette.kjQuery.set('');
        this.palette.kjValue.set(null);
      }
      wasOpen = open;
    });
  }

  /**
   * Hands Escape to the palette instead of `KjOverlayStack`.
   *
   * `KjCommandInput` gives the first Escape to the search box — it clears a
   * non-empty query and stops the event — and only a second Escape closes
   * the palette. The stack's listener sits on the document in the *capture*
   * phase, so it would see every Escape before the input could stop it and
   * would close on the first press. `closeOnEsc: false` makes the stack
   * ignore Escape for this overlay without swallowing it, leaving the
   * template's `(keydown.escape)` as the single handler.
   *
   * Applied just before opening rather than in the constructor: the strategy
   * bundle only exists once `[kjOverlayPanel]` has attached it, and merging a
   * flag over an existing bundle re-attaches the same strategy instances,
   * which every shipped strategy treats as a no-op.
   */
  private applyClosePolicy(): void {
    const s = this.controller.strategies;
    if (!s || s.closeOnEsc === false) return;
    this.controller.attachStrategies({ ...s, closeOnEsc: false });
  }

  /**
   * Programmatically close the palette. Goes through `kjOpen` rather than
   * straight to the controller, so it works before the panel has attached and
   * the two-way binding stays in step.
   */
  close(): void {
    this.kjOpen.set(false);
  }

  /**
   * Escape from inside the dialog. Only closes when the palette is the
   * topmost overlay — an Escape meant for a select or popover opened from
   * inside the palette is routed to that overlay by `KjOverlayStack`, and
   * must not also dismiss the palette underneath it.
   */
  protected onEscape(): void {
    if (!this.controller.isTopmost()) return;
    this.controller.close('escape');
  }

  /** Programmatically open the palette. See {@link close} for why it goes through `kjOpen`. */
  open(): void {
    this.kjOpen.set(true);
  }

  protected onActivate(): void {
    if (this.kjAutoCloseOnActivate()) this.controller.close('select');
  }
}
