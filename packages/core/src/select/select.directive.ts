import { Directive, inject, input, model, signal } from '@angular/core';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import { KjDisabledDirective, KjFocusRingDirective } from '../primitives';
import { KJ_SELECT } from './select.context';

/**
 * Root select container. Wraps CDK `CdkListbox` for full keyboard navigation
 * and ARIA listbox semantics. Manages open/close state via `kjSelectValue` model.
 *
 * @example
 * ```html
 * <div kjSelect [(kjSelectValue)]="selected">
 *   <button kjSelectTrigger aria-haspopup="listbox">Choose fruit</button>
 *   <div kjSelectContent role="listbox">
 *     <div kjOption [kjOptionValue]="'apple'">Apple</div>
 *   </div>
 * </div>
 * ```
 * @category Core/Inputs/Select
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  providers: [{ provide: KJ_SELECT, useExisting: KjSelectDirective }],
})
export class KjSelectDirective {
  /** The currently selected value. Supports two-way binding. */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Read-only signal for the current value. */
  readonly value = this.kjSelectValue.asReadonly();

  private readonly _open = signal(false);

  /** Whether the listbox is currently open. */
  readonly open = this._open.asReadonly();

  /**
   * Selects a value and closes the listbox.
   * @param val The value to select.
   */
  select(val: unknown): void {
    this.kjSelectValue.set(val);
    this._open.set(false);
  }

  /** Toggles the open state of the listbox. */
  toggle(): void {
    this._open.update(v => !v);
  }

  /** Closes the listbox. */
  hide(): void {
    this._open.set(false);
  }
}

/**
 * Trigger button that opens/closes the select listbox.
 * Automatically binds `aria-expanded` to reflect open state.
 *
 * @example
 * ```html
 * <button kjSelectTrigger aria-haspopup="listbox">Choose fruit</button>
 * ```
 * @category Core/Inputs/Select
 */
@Directive({
  selector: '[kjSelectTrigger]',
  standalone: true,
  hostDirectives: [KjFocusRingDirective],
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjSelectTriggerDirective {
  /** @internal */
  readonly ctx = inject(KJ_SELECT);
}

/**
 * Listbox container. Wraps CDK `CdkListbox` for keyboard navigation and
 * ARIA listbox semantics. Hidden when the select is closed.
 *
 * @example
 * ```html
 * <div kjSelectContent role="listbox">
 *   <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * </div>
 * ```
 * @category Core/Inputs/Select
 */
@Directive({
  selector: '[kjSelectContent]',
  standalone: true,
  hostDirectives: [CdkListbox],
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
  },
})
export class KjSelectContentDirective {
  /** @internal */
  readonly ctx = inject(KJ_SELECT);
}

/**
 * Individual option inside a `kjSelectContent`. Wraps CDK `CdkOption` for
 * proper `aria-selected` management and keyboard navigation support.
 * Clicking the option calls `select()` on the parent context.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * ```
 * @category Core/Inputs/Select
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkOption,
      inputs: ['cdkOption: kjOptionValue', 'cdkOptionDisabled: kjDisabled'],
    },
    {
      directive: KjDisabledDirective,
      inputs: ['kjDisabled: kjDisabled'],
    },
  ],
  host: {
    '(click)': '_handleClick()',
  },
})
export class KjOptionDirective {
  /** @internal */
  readonly ctx = inject(KJ_SELECT);

  /** The value this option represents. */
  readonly kjOptionValue = input.required<unknown>();

  /** @internal */
  _handleClick(): void {
    this.ctx.select(this.kjOptionValue());
  }
}
