import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
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
  KjCommandItem,
  KjCommandGroup,
  KjCommandSeparator,
  KjCommandEmpty,
} from '@kouji-ui/core';

/**
 * Marker directive for projecting custom footer content into a
 * `<kj-command-palette>`. When present, the wrapper hides its default
 * keyboard-hint footer and renders the projected content instead.
 * @doc
 * @doc-name command-palette
 * @doc-description Themed Cmd-K modal command palette with fuzzy filtering, grouped results, and keyboard navigation.
 * @doc-is-main
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
 *   @doc-file command-palette.example.ts
 * @doc-example With trigger and hotkey
 *   @doc-file command-palette.dialog.example.ts
 * @doc-example With groups
 *   @doc-file command-palette.groups.example.ts
 * @doc-example Async with item template
 *   @doc-file command-palette.async.example.ts
 * @doc-example Fuzzy filter
 *   @doc-file command-palette.fuzzy.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name command-palette
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

  constructor() {
    afterNextRender(() => {
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
 * @category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-item',
  standalone: true,
  imports: [KjCommandItem],
  template: `
    <button
      type="button"
      kjCommandItem
      class="kj-command-item"
      [kjValue]="kjValue()"
      [kjKeywords]="kjKeywords()"
      [kjDisabled]="kjDisabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandItemComponent {
  /** Value emitted on activation. */
  readonly kjValue = input<unknown>(undefined);
  /** Extra filter keywords. */
  readonly kjKeywords = input<readonly string[]>([]);
  /** Disable this item. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });
}

/**
 * Styled command group. Auto-hides when all child items are filtered out.
 *
 * @category Library/Actions
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
 * @category Library/Actions
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
 * @category Library/Actions
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
 * @category Library/Actions
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
