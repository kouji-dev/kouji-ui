import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  booleanAttribute,
  computed,
  input,
  viewChild,
  inject,
} from '@angular/core';
import {
  KjRadioGroup,
  KjRadio,
  KjId,
  KJ_RADIO_GROUP,
  KjRovingTabindex,
  KjRovingTabindexItem,
  injectParent,
} from '@kouji-ui/core';

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
 *   ArrowUp|ArrowDown    — Moves focus between radios; skips disabled options
 *   ArrowLeft|ArrowRight — Moves focus between radios; skips disabled options
 *   Home|End             — Moves focus to the first / last enabled radio
 *   Tab                  — Enters the group once, landing on the checked radio
 *                          (or the first when nothing is selected)
 *   Space|Enter          — Selects the focused radio
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
 *   The group is a single Tab stop (roving tabindex): Tab lands on the
 *   checked radio, or on the first one when nothing is selected, and arrow
 *   keys cycle within while skipping disabled options. Selection is committed
 *   with Space or Enter rather than following focus, so an arrow key never
 *   changes the form value on its way past. Group always exposes a
 *   programmatic name — set `ariaLabel` or wire `aria-labelledby` to a
 *   sibling heading.
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
  hostDirectives: [
    { directive: KjRadioGroup, inputs: ['kjValue: value'], outputs: ['kjValueChange: valueChange'] },
    // One Tab stop for the whole group, arrow keys inside (APG radiogroup,
    // WCAG 2.4.3). Without it an n-option group was n Tab stops, and a
    // disabled option was still one of them.
    KjRovingTabindex,
  ],
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
  /** Layout axis of the options. Reflects `data-orientation`. Defaults to `'vertical'`. */
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');

  /** Accessible name for the `role="radiogroup"` host. Defaults to `undefined` (wire `aria-labelledby` instead). */
  readonly ariaLabel = input<string | undefined>(undefined);
}

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
  imports: [KjRadio, KjRovingTabindexItem],
  template: `
    <!-- Click-region wrapper. The focusable element is the inner kjRadio span
         (role="radio", tabindex, Space/Enter handlers); this div only proxies
         pointer events from the label area, so the lint rules below don't apply. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <div class="kj-radio-inner" (click)="onLabelClick($event)">
      <!-- tabindex is owned by kjRovingTabindexItem: 0 on the checked option,
           -1 on the rest, so the group is a single Tab stop. -->
      <span
        #dot
        kjRadio
        kjRovingTabindexItem
        class="kj-radio-dot"
        [kjRadioValue]="value()"
        [kjDisabled]="disabled()"
        [kjRovingItemDisabled]="disabled()"
        [kjRovingActive]="checked()"
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
  /** The value this option contributes to the group when selected. Required. */
  readonly value = input.required<unknown>();

  /** Removes the option from the tab order and blocks selection. Defaults to `false`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly group = injectParent(KJ_RADIO_GROUP, { child: 'KjRadioComponent', parent: '[kjRadioGroup]' });

  /**
   * Whether this option is the group's selection. Read from the group rather
   * than from the inner `KjRadio` because the roving tab stop has to follow
   * the selection (APG: Tab lands on the checked radio).
   */
  protected readonly checked = computed(() => this.group.value() === this.value());

  protected readonly labelId = inject(KjId).mint('radio');

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
