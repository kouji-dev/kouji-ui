import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, inject, computed } from '@angular/core';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from '@kouji-ui/core';

/**
 * Select root. Two-way bind via `[(value)]`.
 *
 * Users only need `<kj-select>` and `<kj-option>`. The trigger button and
 * listbox panel are rendered internally.
 *
 * @doc-example Default
 *   @doc-file select.default.example.ts
 * @doc-example With placeholder
 *   @doc-file select.placeholder.example.ts
 * @doc-example Disabled
 *   @doc-file select.disabled.example.ts
 * @doc-example Grouped options
 *   @doc-file select.grouped.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-select',
  standalone: true,
  hostDirectives: [
    { directive: KjSelect, inputs: ['kjSelectValue: value'], outputs: ['kjSelectValueChange: valueChange'] },
  ],
  imports: [KjSelectTrigger, KjSelectContent],
  template: `
    <button type="button" kjSelectTrigger class="kj-select-trigger" aria-haspopup="listbox" [disabled]="disabled() || null">
      <span class="kj-select-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-select-trigger-caret" aria-hidden="true">▾</span>
    </button>
    <div kjSelectContent class="kj-select-content">
      <ng-content />
    </div>
  `,
  styleUrl: './select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectComponent {
  readonly placeholder = input<string>('Select…');
  readonly disabled = input(false);

  private readonly select = inject(KjSelect);
  readonly displayLabel = computed(() => {
    const v = this.select.value();
    if (v === undefined || v === null || v === '') return this.placeholder();
    return String(v);
  });
}

/** Single option row. */
@Component({
  selector: 'kj-option',
  standalone: true,
  imports: [KjOption],
  template: `<div kjOption [kjOptionValue]="value()" class="kj-option"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOptionComponent {
  readonly value = input.required<unknown>();
}
