import { Directive, computed, inject, input, model, signal } from '@angular/core';
import { KJ_SELECT, KjSelectContext } from './select.context';

/**
 * Root select/combobox container.
 * @example `<div kjSelect [(kjSelectValue)]="fruit"><button kjSelectTrigger>Choose</button><div kjSelectContent role="listbox"><div kjOption [kjOptionValue]="'apple'" role="option">Apple</div></div></div>`
 */
@Directive({ selector: '[kjSelect]', standalone: true, providers: [{ provide: KJ_SELECT, useExisting: KjSelectDirective }] })
export class KjSelectDirective implements KjSelectContext {
  kjSelectValue = model<unknown>(undefined);
  readonly value = this.kjSelectValue.asReadonly();
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();
  select(val: unknown): void { this.kjSelectValue.set(val); this._open.set(false); }
  toggle(): void { this._open.update(v => !v); }
  hide(): void { this._open.set(false); }
}

/** Trigger that opens/closes the select listbox. */
@Directive({ selector: '[kjSelectTrigger]', standalone: true, host: { '[attr.aria-expanded]': 'ctx.open().toString()', '(click)': 'ctx.toggle()' } })
export class KjSelectTriggerDirective { readonly ctx = inject(KJ_SELECT); }

/** Listbox container. Hidden when closed. Add `role="listbox"`. */
@Directive({ selector: '[kjSelectContent]', standalone: true, host: { '[attr.hidden]': '!ctx.open() ? "" : null' } })
export class KjSelectContentDirective { readonly ctx = inject(KJ_SELECT); }

/**
 * Individual option. Sets `aria-selected`. Add `role="option"`.
 * @example `<div kjOption [kjOptionValue]="'apple'" role="option">Apple</div>`
 */
@Directive({ selector: '[kjOption]', standalone: true, host: { '[attr.aria-selected]': 'selected().toString()', '[attr.data-selected]': 'selected() ? "" : null', '(click)': 'select()' } })
export class KjOptionDirective {
  private readonly ctx = inject(KJ_SELECT);
  kjOptionValue = input.required<unknown>();
  readonly selected = computed(() => this.ctx.value() === this.kjOptionValue());
  select(): void { this.ctx.select(this.kjOptionValue()); }
}
