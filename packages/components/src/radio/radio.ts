import { Component, ChangeDetectionStrategy, ViewEncapsulation, ElementRef, input, viewChild } from '@angular/core';
import { KjRadioGroup, KjRadio } from '@kouji-ui/core';

/**
 * Radio group root. Two-way bind via `[(value)]`.
 *
 * Use `<kj-radio-group>` with `<kj-radio>` children to render a themed
 * single-selection control with label forwarding, disabled propagation, and
 * the design-system tokens applied on top of the headless `KjRadioGroup`.
 *
 * @doc-example Default
 *   A vertical size picker — the bare-minimum recipe.
 *   @doc-file radio.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — vertical and horizontal
 *   groups, disabled option. Use this as the copy-paste starting point.
 *   @doc-file radio.usage.example.ts
 * @doc-example Group
 *   Multiple option groups laid out together — labels stay click-targetable.
 *   @doc-file radio.group.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the option from the tab order and dims it.
 *   @doc-file radio.disabled.example.ts
 * @doc-example Inline
 *   `orientation="horizontal"` lays the radios in a single row.
 *   @doc-file radio.inline.example.ts
 *
 * @doc-keyboard
 *   ArrowUp|ArrowDown    — Moves selection between radios in a vertical group
 *   ArrowLeft|ArrowRight — Moves selection between radios in a horizontal group
 *   Tab                  — Enters the group (focuses the checked or first radio)
 *   Space                — Selects the focused radio
 *
 * @doc-aria
 *   role="radiogroup"  — On the host `<kj-radio-group>` (provided by the directive)
 *   role="radio"       — On each `<kj-radio>` dot
 *   aria-checked       — Reflects the selection state per option
 *   aria-labelledby    — Wired from the option's visible text label id
 *   aria-disabled      — Reflects `[disabled]` on individual radios
 *   data-orientation   — Mirrors `horizontal` / `vertical` for theme hooks
 *
 * @doc-touch
 *   The label wraps both the dot and the text — the entire `<kj-radio>` row
 *   is clickable. Pair with adequate line-height so the row meets WCAG 2.5.5.
 *
 * @doc-a11y
 *   Selection follows the roving-tabindex pattern — only the checked (or
 *   first) radio is tab-focusable; arrow keys cycle within. Group always
 *   exposes a programmatic name — set `ariaLabel` or wire `aria-labelledby`
 *   to a sibling heading.
 *
 * @doc-related checkbox,select,toggle
 *
 * @doc-css-var
 *   --kj-radio-size        — Diameter of the radio dot.
 *   --kj-radio-border      — Border color of the unchecked dot. Inherits --kj-border-default.
 *   --kj-radio-bg-checked  — Inner fill and border color when checked. Inherits --kj-bg-primary.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name radio
 * @doc-description Themed radio group for accessible single-selection forms input with label forwarding.
 * @doc-is-main
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
 * @doc
 * @doc-name radio
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
