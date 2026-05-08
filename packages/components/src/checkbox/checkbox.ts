import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input, viewChild, ElementRef } from '@angular/core';
import { KjCheckbox } from '@kouji-ui/core';

let checkboxIdCounter = 0;

/**
 * Styled wrapper around the headless `KjCheckbox` directive.
 *
 * The host renders a `<label>` wrapping the checkbox box and any projected
 * content (label text). Clicking anywhere on the label checks/unchecks the
 * box. When `disabled` is set, both the box and label text dim via
 * `[data-disabled]` on the host.
 *
 * @doc-example Default
 *   @doc-file checkbox.default.example.ts
 * @doc-example Checked
 *   @doc-file checkbox.checked.example.ts
 * @doc-example Indeterminate
 *   @doc-file checkbox.indeterminate.example.ts
 * @doc-example Disabled
 *   @doc-file checkbox.disabled.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name checkbox
 * @doc-is-main
 */
@Component({
  selector: 'kj-checkbox',
  standalone: true,
  imports: [KjCheckbox],
  template: `
    <!-- Click-region wrapper. The focusable element is the inner kjCheckbox span
         (role="checkbox", tabindex, Space handler); this div only proxies pointer
         events from the label area, so the lint rules below don't apply. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <div class="kj-checkbox-inner" (click)="onLabelClick($event)">
      <span
        #box
        kjCheckbox
        tabindex="0"
        class="kj-checkbox-box"
        [(kjChecked)]="checked"
        [kjDisabled]="disabled()"
        [attr.data-size]="size()"
        [attr.data-indeterminate]="indeterminate() ? '' : null"
        [attr.aria-labelledby]="labelId"
      ></span>
      <span class="kj-checkbox-label" [id]="labelId"><ng-content /></span>
    </div>
  `,
  styleUrl: './checkbox.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-checkbox',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input(false);
  readonly indeterminate = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly labelId = `kj-checkbox-${++checkboxIdCounter}`;

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  /** Forward label-area clicks to the checkbox box. The box itself bubbles
   *  through, so we early-return to avoid a double-toggle. */
  protected onLabelClick(e: MouseEvent): void {
    if (this.disabled()) return;
    const boxEl = this.box().nativeElement;
    const target = e.target as Node;
    if (target === boxEl || boxEl.contains(target)) return;
    boxEl.click();
  }
}
