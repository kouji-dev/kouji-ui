import {
  Directive,
  InjectionToken,
  contentChildren,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjSelectionModel,
  KjTypeAhead,
  type KjCompareFn,
  type KjListNavigatorConfig,
} from '../primitives/list';

export const KJ_SELECT = new InjectionToken<KjSelect>('KjSelect');

/**
 * Root select container. Owns the overlay controller + selection model
 * (`KjSelectionModel`) + item query (`contentChildren(KjListItem)`).
 * Trigger / panel / option composites read state from this root via
 * DI tokens.
 *
 * Public API (kjSelectValue, kjCompareBy, isSelected, select, _multiple)
 * is preserved end-to-end — the change is internal composition only.
 *
 * @example
 * ```html
 * <div kjSelect [(kjSelectValue)]="selected">
 *   <button kjSelectTrigger #t="kjSelectTrigger">Choose fruit</button>
 *   <kj-select-content [kjFor]="t">
 *     <div kjOption [kjOptionValue]="'apple'">Apple</div>
 *   </kj-select-content>
 * </div>
 * ```
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  exportAs: 'kjSelect',
  providers: [
    { provide: KJ_SELECT, useExisting: KjSelect },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjSelect },
    KjSelectionModel,
    KjTypeAhead,
    KjOverlayController,
  ],
})
export class KjSelect implements KjListNavigatorConfig {
  private readonly controller = inject(KjOverlayController);
  private readonly selection  = inject(KjSelectionModel);

  /** Two-way bindable selected value (single) or values (multi). */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Optional custom equality fn. Defaults to `Object.is`. */
  readonly kjCompareBy = input<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /** @internal — written by `KjSelectTrigger`'s `kjMultiple` input. */
  readonly _multiple = signal(false);

  /** Read-only signal of the current selection. */
  readonly value = this.kjSelectValue.asReadonly();
  /** Whether multi-select is enabled. */
  readonly multiple = this._multiple.asReadonly();
  /** Whether the overlay is open. */
  readonly open = this.controller.isOpen;

  /** All `KjListItem`s under this select — source for navigator + type-ahead. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  constructor() {
    // Selection model storage IS the kjSelectValue model() — no bridging.
    this.selection.bindValue(this.kjSelectValue as never);
    // Mode follows the kjMultiple flag; compareBy follows kjCompareBy.
    effect(() => this.selection.setMode(this._multiple() ? 'multi' : 'single'));
    effect(() => this.selection.setCompareBy(this.kjCompareBy() as KjCompareFn<unknown>));
  }

  /** True iff `target` is currently selected. */
  isSelected(target: unknown): boolean {
    return this.selection.isSelected(target);
  }

  /**
   * Toggle the value through the selection model. Single mode closes the
   * overlay; multi mode keeps it open. Return shape preserved for backward
   * compat with `KjSelectTrigger`.
   */
  select(target: unknown): { close: boolean } {
    const { closeRequested } = this.selection.toggle(target);
    if (closeRequested) this.controller.close('programmatic');
    return { close: closeRequested };
  }
}
