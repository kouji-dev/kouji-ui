import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input } from '@angular/core';
import { KjCheckbox } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjCheckbox` directive.
 *
 * @doc-example Default
 *   @doc-file checkbox.default.example.ts
 * @doc-example Checked
 *   @doc-file checkbox.checked.example.ts
 * @doc-example Indeterminate
 *   @doc-file checkbox.indeterminate.example.ts
 * @doc-example Disabled
 *   @doc-file checkbox.disabled.example.ts
 * @doc-example With label
 *   @doc-file checkbox.with-label.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-checkbox',
  standalone: true,
  imports: [KjCheckbox],
  template: `
    <span
      kjCheckbox
      tabindex="0"
      class="kj-checkbox"
      [(kjChecked)]="checked"
      [kjDisabled]="disabled()"
      [attr.data-size]="size()"
      [attr.data-indeterminate]="indeterminate() ? '' : null"
      [attr.aria-label]="ariaLabel()"
    ></span>
  `,
  styleUrl: './checkbox.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input(false);
  readonly indeterminate = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input<string | undefined>(undefined);
}
