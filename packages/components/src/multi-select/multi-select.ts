import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  KjMultiSelect,
  KjMultiSelectAllToggle,
  KjMultiSelectListbox,
  KjMultiSelectOption,
  KjMultiSelectSearch,
  KjMultiSelectTrigger,
} from '@kouji-ui/core';
import { KjTagComponent, KjTagRemoveComponent } from '../tag/tag';

/**
 * Styled wrapper around the headless `KjMultiSelect` directive family.
 *
 * Renders the trigger button with selected values as removable Tag chips,
 * the listbox panel with optional search input + select-all toolbar, and
 * the option rows. The full `KjMultiSelect` input surface is exposed via
 * `hostDirectives` aliasing — `[(value)]`, `[max]`, `[search]`,
 * `[disabled]`, `[readonly]`, `[compareWith]`, `[hideOnSelect]`.
 *
 * Selected values render through `<kj-tag>` + `<kj-tag-remove>` for the
 * chip affordance — clicking the × button removes the chip from the
 * selection without opening the panel.
 *
 * @example
 * ```html
 * <kj-multi-select [(value)]="selected" [max]="3" placeholder="Pick tags">
 *   <kj-multi-select-option [value]="'apple'">Apple</kj-multi-select-option>
 *   <kj-multi-select-option [value]="'banana'">Banana</kj-multi-select-option>
 * </kj-multi-select>
 * ```
 *
 * @doc-example Default
 *   @doc-file multi-select.example.ts
 * @doc-example With search
 *   @doc-file multi-select.with-search.example.ts
 * @doc-example Max items
 *   @doc-file multi-select.max-items.example.ts
 * @doc-example Grouped options
 *   @doc-file multi-select.grouped.example.ts
 * @doc-example With chip tags
 *   @doc-file multi-select.with-tags.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-multi-select',
  standalone: true,
  hostDirectives: [
    {
      directive: KjMultiSelect,
      inputs: [
        'kjMultiSelectValue: value',
        'kjMultiSelectMax: max',
        'kjMultiSelectSearch: search',
        'kjMultiSelectDisabled: disabled',
        'kjMultiSelectReadonly: readonly',
        'kjMultiSelectCompareWith: compareWith',
        'kjMultiSelectHideOnSelect: hideOnSelect',
      ],
      outputs: ['kjMultiSelectValueChange: valueChange'],
    },
  ],
  imports: [
    KjMultiSelectTrigger,
    KjMultiSelectListbox,
    KjMultiSelectSearch,
    KjMultiSelectAllToggle,
    KjTagComponent,
    KjTagRemoveComponent,
  ],
  template: `
    <button
      type="button"
      kjMultiSelectTrigger
      class="kj-multi-select-trigger"
      [attr.aria-label]="ariaLabel()"
    >
      @if (selectedValues().length === 0) {
        <span class="kj-multi-select-placeholder">{{ placeholder() }}</span>
      } @else {
        <span class="kj-multi-select-chips">
          @for (val of visibleChips(); track $index) {
            <kj-tag
              kjVariant="ghost"
              kjSize="sm"
              (kjTagRemoved)="removeValue(val)"
              (click)="$event.stopPropagation()"
            >
              {{ chipLabel(val) }}
              @if (!ms.readonly() && !ms.disabled()) {
                <kj-tag-remove>×</kj-tag-remove>
              }
            </kj-tag>
          }
          @if (overflowCount() > 0) {
            <kj-tag kjVariant="ghost" kjSize="sm" class="kj-multi-select-overflow">
              +{{ overflowCount() }} more
            </kj-tag>
          }
        </span>
      }
      <span class="kj-multi-select-caret" aria-hidden="true">▾</span>
    </button>
    <div kjMultiSelectListbox class="kj-multi-select-listbox">
      @if (showSelectAll()) {
        <div class="kj-multi-select-toolbar">
          <button kjMultiSelectAllToggle class="kj-multi-select-all">
            <span aria-hidden="true">☐</span>
            <span>Select all</span>
          </button>
        </div>
      }
      @if (ms.searchEnabled()) {
        <input
          kjMultiSelectSearch
          class="kj-multi-select-search"
          [placeholder]="searchPlaceholder()"
          aria-label="Filter options"
        />
      }
      <div class="kj-multi-select-options">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './multi-select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-multi-select',
    '[attr.data-disabled]': "ms.disabled() ? '' : null",
    '[attr.data-readonly]': "ms.readonly() ? '' : null",
    '[attr.data-open]': "ms.open() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMultiSelectComponent {
  /** Placeholder text shown when no value is selected. */
  readonly placeholder = input<string>('Select…');

  /** Placeholder text shown inside the search input. */
  readonly searchPlaceholder = input<string>('Search…');

  /** When true, render the panel-toolbar "Select all" button. */
  readonly showSelectAll = input(false, { transform: booleanAttribute });

  /**
   * Maximum number of chips to render directly in the trigger before
   * collapsing the rest into a "+N more" overflow chip. Defaults to `3`.
   */
  readonly maxChips = input<number>(3);

  /**
   * Optional resolver for chip labels. When provided, called per value to
   * produce the chip's display text. When omitted, the chip falls back
   * to `String(value)` — sufficient for primitive values.
   */
  readonly getLabel = input<(value: unknown) => string>(
    (value: unknown) => String(value),
  );

  /** Optional ARIA label for the trigger when no visible label exists. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** @internal — public so the template can reach the parent context's signals. */
  readonly ms = inject(KjMultiSelect);

  /** @internal */
  readonly selectedValues = computed(() => this.ms.value());

  /** @internal — first N selected values rendered as chips. */
  readonly visibleChips = computed(() =>
    this.selectedValues().slice(0, this.maxChips()),
  );

  /** @internal — count of overflow values past `maxChips`. */
  readonly overflowCount = computed(() =>
    Math.max(0, this.selectedValues().length - this.maxChips()),
  );

  /** @internal */
  chipLabel(value: unknown): string {
    return this.getLabel()(value);
  }

  /** @internal */
  removeValue(value: unknown): void {
    if (this.ms.readonly() || this.ms.disabled()) return;
    this.ms.deselect(value);
  }
}

/**
 * Single option row for `<kj-multi-select>`. Wraps the headless
 * `KjMultiSelectOption` directive and renders the projected content
 * preceded by a checkbox-like glyph reflecting `aria-selected`.
 *
 * @category Library/Data input
 */
@Component({
  selector: 'kj-multi-select-option',
  standalone: true,
  imports: [KjMultiSelectOption],
  template: `
    <div
      kjMultiSelectOption
      [kjMultiSelectOptionValue]="value()"
      [kjDisabled]="disabled()"
      class="kj-multi-select-option"
    >
      <span class="kj-multi-select-option-check" aria-hidden="true"></span>
      <span class="kj-multi-select-option-label">
        <ng-content />
      </span>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMultiSelectOptionComponent {
  readonly value = input.required<unknown>();
  readonly disabled = input(false, { transform: booleanAttribute });
}

/**
 * Optional group label for related options. Purely visual — does not
 * change ARIA semantics. Use to organise long option lists in
 * `<kj-multi-select>`.
 *
 * @category Library/Data input
 */
@Component({
  selector: 'kj-multi-select-group',
  standalone: true,
  template: `
    <div class="kj-multi-select-group-label">{{ label() }}</div>
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-multi-select-group', role: 'group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMultiSelectGroupComponent {
  readonly label = input<string>('');
}
