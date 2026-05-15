import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';
import {
  KjCombobox,
  KjComboboxInput,
  KjComboboxListbox,
  KjComboboxOption,
} from '@kouji-ui/core';

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
  imports: [KjComboboxInput, KjComboboxListbox],
  template: `
    <input
      kjComboboxInput
      #trig="kjComboboxInput"
      class="kj-combobox-input"
      [placeholder]="placeholder()"
      [disabled]="disabled() || null" />
    <div kjComboboxListbox [kjFor]="trig" class="kj-combobox-listbox">
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
export class KjComboboxComponent {
  /** Placeholder text shown in the input when empty. */
  readonly placeholder = input<string>('');
  /** Whether the combobox is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
}

/**
 * Single combobox option. Project as a child of `<kj-combobox>`.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name combobox
 */
@Component({
  selector: 'kj-combobox-option',
  standalone: true,
  imports: [KjComboboxOption],
  template: `<button type="button" kjComboboxOption [kjOptionValue]="value()" class="kj-combobox-option" [disabled]="disabled() || null"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxOptionComponent {
  /** Value committed when this option is selected. */
  readonly value = input.required<unknown>();
  /** Whether this option is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
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
export class KjComboboxEmptyComponent {
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
export class KjComboboxLoadingComponent {
  /** @internal */
  readonly cb = inject(KjCombobox);
}
