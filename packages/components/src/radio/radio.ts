import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjRadioGroup, KjRadio } from '@kouji-ui/core';

/**
 * Radio group root. Two-way bind via `[(value)]`.
 *
 * @doc-example Default
 *   @doc-file radio.default.example.ts
 * @doc-example Group
 *   @doc-file radio.group.example.ts
 * @doc-example Disabled
 *   @doc-file radio.disabled.example.ts
 * @doc-example Inline
 *   @doc-file radio.inline.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-radio-group',
  standalone: true,
  imports: [KjRadioGroup],
  template: `
    <div
      kjRadioGroup
      class="kj-radio-group"
      [(kjValue)]="value"
      [attr.data-orientation]="orientation()"
      [attr.aria-label]="ariaLabel()"
    ><ng-content /></div>
  `,
  styleUrl: './radio.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioGroupComponent {
  readonly value = model<unknown>(undefined);
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly ariaLabel = input<string | undefined>(undefined);
}

/** Single radio button. Must live inside `<kj-radio-group>`. */
@Component({
  selector: 'kj-radio',
  standalone: true,
  imports: [KjRadio],
  template: `
    <span
      kjRadio
      tabindex="0"
      class="kj-radio"
      [kjRadioValue]="value()"
      [kjDisabled]="disabled()"
    ></span>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioComponent {
  readonly value = input.required<unknown>();
  readonly disabled = input(false);
}
