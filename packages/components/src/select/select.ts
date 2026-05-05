import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from '@kouji-ui/core';

/**
 * Select root. Two-way bind via `[(value)]`.
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
  hostDirectives: [{ directive: KjSelect, inputs: ['kjSelectValue: value'], outputs: ['kjSelectValueChange: valueChange'] }],
  template: `<ng-content />`,
  styleUrl: './select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectComponent {
  readonly disabled = input(false);
}

/** Visible button that toggles the listbox. */
@Component({
  selector: 'kj-select-trigger',
  standalone: true,
  imports: [KjSelectTrigger],
  template: `
    <button type="button" kjSelectTrigger class="kj-select-trigger" aria-haspopup="listbox">
      <span class="kj-select-trigger-label"><ng-content /></span>
      <span class="kj-select-trigger-caret" aria-hidden="true">▾</span>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectTriggerComponent {}

/** Listbox panel containing options. */
@Component({
  selector: 'kj-select-content',
  standalone: true,
  imports: [KjSelectContent],
  template: `<div kjSelectContent class="kj-select-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectContentComponent {}

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
