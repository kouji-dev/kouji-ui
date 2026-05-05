import { Component, ChangeDetectionStrategy, ViewEncapsulation, ElementRef, input, viewChild } from '@angular/core';
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
  hostDirectives: [{ directive: KjRadioGroup, inputs: ['kjValue: value'], outputs: ['kjValueChange: valueChange'] }],
  template: `<ng-content />`,
  styleUrl: './radio.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-radio-group',
    '[attr.data-orientation]': 'orientation()',
    '[attr.aria-label]': 'ariaLabel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioGroupComponent {
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly ariaLabel = input<string | undefined>(undefined);
}

let radioIdCounter = 0;

/**
 * Single radio button. Must live inside `<kj-radio-group>`.
 *
 * The host renders a `<label>` that wraps the radio dot AND the projected
 * content. Clicking anywhere on the label (including the text) selects the
 * radio because the label's native click-forwarding behaviour fires the
 * directive's click handler. When `disabled` is set, both the dot and the
 * label text dim (see `[data-disabled]` rules in `radio.css`).
 */
@Component({
  selector: 'kj-radio',
  standalone: true,
  imports: [KjRadio],
  template: `
    <!-- Click-region wrapper. The focusable element is the inner kjRadio span
         (role="radio", tabindex, Space/Enter handlers); this div only proxies
         pointer events from the label area, so the lint rules below don't apply. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <div class="kj-radio-inner" (click)="onLabelClick($event)">
      <span
        #dot
        kjRadio
        tabindex="0"
        class="kj-radio-dot"
        [kjRadioValue]="value()"
        [kjDisabled]="disabled()"
        [attr.aria-labelledby]="labelId"
      ></span>
      <span class="kj-radio-label" [id]="labelId"><ng-content /></span>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-radio',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioComponent {
  readonly value = input.required<unknown>();
  readonly disabled = input(false);

  protected readonly labelId = `kj-radio-${++radioIdCounter}`;

  private readonly dot = viewChild.required<ElementRef<HTMLElement>>('dot');

  /** Forward label-area clicks to the radio dot. The dot itself bubbles
   *  through, so we early-return to avoid a double-select. */
  protected onLabelClick(e: MouseEvent): void {
    if (this.disabled()) return;
    const dotEl = this.dot().nativeElement;
    const target = e.target as Node;
    if (target === dotEl || dotEl.contains(target)) return;
    dotEl.click();
  }
}
