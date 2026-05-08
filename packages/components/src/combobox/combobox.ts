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
 *   @doc-file combobox.example.ts
 * @doc-example Async search
 *   @doc-file combobox.async.example.ts
 * @doc-example Free-text values
 *   @doc-file combobox.free-text.example.ts
 * @doc-example Empty state
 *   @doc-file combobox.empty-state.example.ts
 * @doc-example With icons
 *   @doc-file combobox.with-icons.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name combobox
 * @doc-description Pre-styled autocomplete combobox with built-in case-insensitive filtering, async search support, and free-text mode — project `<kj-combobox-option>` children for the simple case or wire `(queryChange)` for server-driven flows.
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
 * @category Library/Data input
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
 * @category Library/Data input
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
 * @category Library/Data input
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
