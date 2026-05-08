import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjDisabled } from '../primitives';
import { KJ_SELECT } from './select-root';

/**
 * Individual option inside a `<kj-select-content>`. Clicking, pressing Enter,
 * or pressing Space delegates to the parent `KjSelect.select(value)`. In
 * single mode the parent emits a close request that the trigger picks up;
 * in multi mode the panel stays open.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  host: {
    'class': 'kj-option',
    'role': 'option',
    '[attr.tabindex]': '"0"',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'handleClick()',
    '(keydown.enter)': '$event.preventDefault(); handleClick()',
    '(keydown.space)': '$event.preventDefault(); handleClick()',
  },
})
export class KjOption {
  private readonly select = inject(KJ_SELECT, { optional: true });
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly disabled = inject(KjDisabled).disabled;

  /** The value this option represents. */
  readonly kjOptionValue = input.required<unknown>();

  /** @internal */
  readonly selected = computed(
    () => this.select?.isSelected(this.kjOptionValue()) ?? false,
  );

  constructor() {
    afterNextRender(() => {
      if (!this.el.nativeElement.id) {
        this.el.nativeElement.id = `kj-option-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
      }
    });
  }

  /** @internal */
  handleClick(): void {
    if (this.disabled() || !this.select) return;
    this.select.select(this.kjOptionValue());
  }
}
