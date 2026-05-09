import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  type OnDestroy,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives';
import { KJ_COMBOBOX } from './combobox.context';

let _idCounter = 0;
const nextOptionId = (): string => `kj-combobox-option-${++_idCounter}`;

/**
 * Single option inside a [kjComboboxListbox]. Clicking commits the option's
 * value to the combobox; hovering moves the active descendant. Hidden when
 * the synchronous filter rejects it.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjComboboxOption]',
  standalone: true,
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    'role': 'option',
    'tabindex': '-1',
    '[attr.id]': 'optionId',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.hidden]': '!visible() ? "" : null',
    '(click)': 'handleClick($event)',
    '(mousemove)': 'handleHover()',
  },
})
export class KjComboboxOption implements OnDestroy {
  /** @internal */
  private readonly ctx = inject(KJ_COMBOBOX);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal */
  readonly disabled = inject(KjDisabled).disabled;

  /** Value committed when this option is selected. */
  readonly kjOptionValue = input.required<unknown>();

  /** Stable id used for `aria-activedescendant`. */
  readonly optionId = nextOptionId();

  private readonly _visible = signal(true);
  /** @internal */
  readonly visible = this._visible.asReadonly();

  /** @internal */
  readonly selected = computed(() => this.ctx.value() === this.kjOptionValue());

  /** @internal */
  readonly isActive = computed(() => this.ctx.activeId() === this.optionId);

  constructor() {
    this.ctx.registerOption({
      id: this.optionId,
      el: this.el.nativeElement,
      value: () => this.kjOptionValue(),
      label: () => (this.el.nativeElement.textContent ?? '').trim(),
      disabled: () => this.disabled(),
      setVisible: (v) => this._visible.set(v),
    });
  }

  /** @internal */
  handleClick(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.disabled()) return;
    this.ctx.select(this.kjOptionValue());
  }

  /** @internal */
  handleHover(): void {
    if (this.disabled()) return;
    if (this.ctx.activeId() !== this.optionId) {
      this.ctx.setActiveId(this.optionId);
    }
  }

  ngOnDestroy(): void {
    this.ctx.unregisterOption(this.optionId);
  }
}
