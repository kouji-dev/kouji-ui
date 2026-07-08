import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  TemplateRef,
  ViewEncapsulation,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import {
  KjCommandPalette,
  KjCommandInput,
  KjCommandList,
  KjCommandGroup,
  KjCommandSeparator,
  KjCommandEmpty,
  KjListItem,
  injectListItem,
} from '@kouji-ui/core';

/**
 * Marker directive for projecting custom footer content into a
 * `<kj-command-palette>`. When present, the wrapper hides its default
 * keyboard-hint footer and renders the projected content instead.
 *
 * @doc-css-var
 *   --kj-command-item-direction — Flex direction on each command row. Defaults to `row`; switch to `column` for stacked layouts.
 *   --kj-command-item-align     — Cross-axis alignment of row contents. Defaults to `center`.
 *   --kj-command-item-gap       — Gap between icon and label inside a row. Defaults to --kj-space-md.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 * @doc-description Themed Cmd-K modal command palette with fuzzy filtering, grouped results, and keyboard navigation.
 */
@Directive({
  selector: '[kjCommandPaletteFooter]',
  standalone: true,
})
export class KjCommandPaletteFooter {}

/**
 * Marker directive for the per-item template used by `<kj-command-palette>`
 * when the consumer passes `[kjItems]`. The template's implicit context is the
 * item itself; `index` is also exposed.
 *
 * @example
 * ```html
 * <kj-command-palette [kjItems]="results">
 *   <ng-template kjCommandPaletteItemTemplate let-item let-i="index">
 *     <kj-command-item [kjValue]="item.id">{{ item.label }}</kj-command-item>
 *   </ng-template>
 * </kj-command-palette>
 * ```
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: 'ng-template[kjCommandPaletteItemTemplate]',
  standalone: true,
})
export class KjCommandPaletteItemTemplate<T = unknown> {
  readonly tpl = inject<TemplateRef<{ $implicit: T; index: number }>>(TemplateRef);
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
 *   The palette is a modal dialog with backdrop and an inert siblings posture
 *   while open. The search input keeps focus; the active item is tracked via
 *   `aria-activedescendant`. When projected items are filtered out, groups
 *   auto-hide so the announced "results found" count stays accurate. The
 *   `[kjAutoCloseOnActivate]` posture (true by default) closes the palette
 *   after activation and restores focus to the trigger.
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
  imports: [NgTemplateOutlet, KjCommandInput, KjCommandList, KjCommandEmpty],
  hostDirectives: [{
    directive: KjCommandPalette,
    inputs: ['kjShouldFilter', 'kjLoading', 'kjAutoActivateFirst', 'kjDismissOnActivate', 'kjValue', 'kjQuery', 'kjFilter'],
    outputs: ['kjValueChange', 'kjQueryChange', 'kjActivate'],
  }],
  template: `
    <div class="kj-command-palette__shell" [class.is-open]="kjOpen()">
      <div class="kj-command-palette__backdrop" (click)="close()" aria-hidden="true"></div>
      <div
        class="kj-command-palette__dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="kjAriaLabel()"
        (keydown.escape)="close()"
      >
        <div class="kj-command-palette__input-wrapper">
          <svg class="kj-command-palette__search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            #searchInput
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
        <div kjCommandList class="kj-command-palette__list">
          <div kjCommandEmpty class="kj-command-palette__empty">No results found.</div>
          @if (itemTpl(); as t) {
            @for (item of kjItems(); track $index; let i = $index) {
              <ng-container *ngTemplateOutlet="t.tpl; context: { $implicit: item, index: i }" />
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
export class KjCommandPaletteComponent {
  /** Input placeholder text. */
  readonly kjPlaceholder = input<string>('Search commands…');

  /** Show an `esc` kbd badge on the right of the input. @default true */
  readonly kjEscBadge = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Accessible label for the dialog. @default 'Command palette' */
  readonly kjAriaLabel = input<string>('Command palette');

  /** Two-way bindable open state. */
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

  protected readonly itemTpl = contentChild(KjCommandPaletteItemTemplate);
  protected readonly customFooter = contentChild(KjCommandPaletteFooter);

  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  /** The composed headless palette (host directive) — owns query + active state. */
  private readonly palette = inject(KjCommandPalette);

  constructor() {
    // Reset the search query + active item when the palette closes, so the
    // next open starts fresh instead of restoring the previous search. Paired
    // with KjCommandInput reflecting the query signal back to the DOM input,
    // this also clears the visible text.
    let wasOpen = false;
    effect(() => {
      const open = this.kjOpen();
      if (wasOpen && !open) {
        this.palette.kjQuery.set('');
        this.palette.kjValue.set(null);
      }
      wasOpen = open;
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const handler = (e: KeyboardEvent) => {
        const chord = this.kjHotkey();
        if (chord && this.matchesHotkey(e, chord)) {
          e.preventDefault();
          this.kjOpen.update(v => !v);
        }
      };
      document.addEventListener('keydown', handler);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', handler));
    });

    // Focus the search input when the palette opens.
    effect(() => {
      if (!this.kjOpen()) return;
      if (!isPlatformBrowser(this.platformId)) return;
      queueMicrotask(() => {
        document.querySelector<HTMLInputElement>('.kj-command-palette__dialog .kj-command-palette__input')?.focus();
      });
    });
  }

  /** Programmatically close the palette. */
  close(): void {
    this.kjOpen.set(false);
  }

  /** Programmatically open the palette. */
  open(): void {
    this.kjOpen.set(true);
  }

  protected onActivate(): void {
    if (this.kjAutoCloseOnActivate()) this.close();
  }

  private matchesHotkey(event: KeyboardEvent, chord: string): boolean {
    const parts = chord.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needsMod = parts.includes('mod');
    const needsShift = parts.includes('shift');
    const needsAlt = parts.includes('alt');

    const isMac = typeof navigator !== 'undefined' &&
      (navigator.platform?.toLowerCase().includes('mac') ||
       (navigator as Navigator & { userAgentData?: { platform: string } })
         .userAgentData?.platform?.toLowerCase().includes('mac'));
    const modPressed = isMac ? event.metaKey : event.ctrlKey;

    if (needsMod && !modPressed) return false;
    if (needsShift && !event.shiftKey) return false;
    if (needsAlt && !event.altKey) return false;
    return event.key.toLowerCase() === key;
  }
}

/**
 * Styled command item. Renders a `<button>` with `[kjCommandItem]` applied.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-item',
  standalone: true,
  // Compose `KjListItem` directly on the wrapper host so that
  // `KjCommandPalette.items = contentChildren(KjListItem)` resolves to
  // the wrapper element itself — content queries do not cross into a
  // child component's view template, so the previous shape (an inner
  // `<button kjCommandItem>` inside this view) left the palette's
  // `items()` empty and the empty-state slot permanently visible.
  //
  // The `role`, `data-active`, and `aria-selected` semantics that the
  // `KjCommandItem` directive ordinarily contributes are inlined below
  // because Angular's `hostDirectives` input-forwarding does not chain
  // transitively (composing `KjCommandItem` here and re-forwarding its
  // forwarded inputs fails the NG2017 check).
  hostDirectives: [{
    directive: KjListItem,
    inputs: [
      'kjItemValue:kjValue',
      'kjItemKeywords:kjKeywords',
      'kjShortcut',
      'kjDisabled',
    ],
  }],
  template: `<ng-content />`,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-command-item',
    'role': 'option',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.data-active]': 'isActive() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandItemComponent {
  /** Value emitted on activation. */
  readonly kjValue = input<unknown>(undefined);
  /** Extra filter keywords. */
  readonly kjKeywords = input<readonly string[]>([]);
  /** ARIA keyboard shortcut hint (bound to `aria-keyshortcuts`). */
  readonly kjShortcut = input<string | null>(null);
  /** Disable this item. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  private readonly _item = injectListItem<unknown>();
  private readonly _palette = inject(KjCommandPalette);

  /** Whether this item is the active (highlighted) one in the palette. */
  protected readonly isActive = computed(() =>
    this._palette.activeId() !== null && this._palette.activeId() === this._item.id,
  );
}

/**
 * Styled command group. Auto-hides when all child items are filtered out.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-group',
  standalone: true,
  hostDirectives: [KjCommandGroup],
  template: `
    @if (kjLabel()) {
      <div class="kj-command-group__label">{{ kjLabel() }}</div>
    }
    <ng-content />
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandGroupComponent {
  /** Optional visible label for the group. */
  readonly kjLabel = input<string>('');
}

/**
 * Styled command input wrapper. Renders an `<input type="search">` with
 * the combobox ARIA wiring from `[kjCommandInput]`. Useful when consumers
 * build a custom palette layout outside `<kj-command-palette>`.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-input',
  standalone: true,
  imports: [KjCommandInput],
  template: `
    <input
      kjCommandInput
      type="search"
      class="kj-command-input"
      [placeholder]="kjPlaceholder()"
    />
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandInputComponent {
  /** Input placeholder text. */
  readonly kjPlaceholder = input<string>('Search commands…');
}

/**
 * Styled separator between command groups.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-separator',
  standalone: true,
  hostDirectives: [KjCommandSeparator],
  template: ``,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-separator' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandSeparatorComponent {}

/**
 * Styled empty state slot. Shown when no items match the current query.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-empty',
  standalone: true,
  hostDirectives: [KjCommandEmpty],
  template: `<ng-content />`,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-empty' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandEmptyComponent {}
