import {
  Directive,
  ElementRef,
  InjectionToken,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjSelectionModel,
  KjTypeAhead,
  type KjCompareFn,
  type KjListNavigatorConfig,
  type KjListSelectionMode,
} from '../primitives/list';

export const KJ_SELECT = new InjectionToken<KjSelect>('KjSelect');

/**
 * Root select container. Implements `KjListNavigatorConfig` (items,
 * value, mode, compareBy) and provides itself under
 * `KJ_LIST_NAVIGATOR_CONFIG` via `forwardRef`. Downstream primitives
 * (`KjSelectionModel`, `KjListNavigator`, `KjTypeAhead`) read whatever
 * they need from this single contract.
 *
 * `KjSelect` itself does NOT inject `KjSelectionModel` — doing so at
 * construction would create a runtime cycle (the model's
 * `inject(KJ_LIST_NAVIGATOR_CONFIG)` would try to resolve a not-yet-
 * constructed `KjSelect` instance, regardless of `forwardRef`). Instead,
 * the model is constructed lazily when a child (`KjOption`, `KjListItem`)
 * first asks for it, by which point `KjSelect` is fully built.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  exportAs: 'kjSelect',
  providers: [
    { provide: KJ_SELECT, useExisting: forwardRef(() => KjSelect) },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjSelect) },
    KjSelectionModel,
    KjTypeAhead,
    KjOverlayController,
  ],
})
export class KjSelect implements KjListNavigatorConfig {
  /** Two-way bindable selected value (single) or values (multi). */
  readonly kjSelectValue = model<unknown>(undefined);

  /**
   * Implements `KjListNavigatorConfig.value`. The selection model reads
   * and writes through this same signal — one source of truth, no
   * bridging effects.
   */
  readonly value = this.kjSelectValue as unknown as WritableSignal<
    unknown | readonly unknown[] | null
  >;

  /** Optional custom equality fn. Defaults to `Object.is`. */
  readonly kjCompareBy = input<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /** @internal — written by `KjSelectTrigger`'s `kjMultiple` input. */
  readonly _multiple = signal(false);
  /** Whether multi-select is enabled. */
  readonly multiple = this._multiple.asReadonly();

  /** @internal — set by `KjSelectTrigger` at construction time. */
  readonly _triggerEl = signal<ElementRef<HTMLElement> | null>(null);
  /**
   * Element ref of the registered trigger button. Resolves the moment
   * `KjSelectTrigger` constructs (no view-query lifecycle wait), so
   * consumers can call `focus()` synchronously from `effect()` blocks
   * even when the select is mounted dynamically.
   */
  readonly triggerEl = this._triggerEl.asReadonly();

  /** Move keyboard focus to the trigger. No-op if no trigger registered. */
  focus(): void {
    this._triggerEl()?.nativeElement.focus();
  }

  /** All `KjListItem`s under this select — source for navigator + type-ahead. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /** Implements `KjListNavigatorConfig.mode`. */
  readonly mode: Signal<KjListSelectionMode> = computed(() =>
    this._multiple() ? 'multi' : 'single',
  );

  /** Implements `KjListNavigatorConfig.compareBy`. */
  readonly compareBy = this.kjCompareBy;

  private readonly controller = inject(KjOverlayController);

  /** Whether the overlay is open. */
  readonly open = this.controller.isOpen;

  /** Directly-injected selection model; wired via `bind()` below. */
  private readonly _selection = inject(KjSelectionModel);

  constructor() {
    this._selection.bind({
      value:     this.value,
      items:     this.items,
      mode:      this.mode,
      compareBy: this.compareBy,
    });
  }

  /**
   * Implements `KjListNavigatorConfig.afterSelect`. Called by
   * `KjListItem` right after it toggles the shared selection model.
   * In single mode (the only mode where `closeRequested` is `true`)
   * we dismiss the overlay; multi mode keeps it open.
   */
  afterSelect(_: unknown, closeRequested: boolean): void {
    if (closeRequested) this.controller.close('programmatic');
  }
}
