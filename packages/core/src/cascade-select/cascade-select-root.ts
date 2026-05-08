import {
  Directive,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KJ_SELECT } from '../select/select-root';
import {
  KJ_CASCADE_SELECT,
  type KjCascadeSelectContext,
} from './cascade-select.context';

/**
 * Root cascade-select container. Owns the selection model, the cascade
 * chain state (open sub-panels, active descendants per level), and the
 * shared `KjOverlayController` so the trigger, root panel, sub-panels,
 * and individual options all wire to the same overlay state.
 *
 * Mirrors the `[kjSelect]` pattern: the umbrella root holds context and
 * controller; the trigger, panel, and option directives read from it via
 * DI. The panel directive becomes a thin overlay panel + keyboard handler.
 *
 * @example
 * ```html
 * <div kjCascadeSelect [(kjValue)]="city" [(kjCascadePath)]="path">
 *   <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Pick</button>
 *   <div kjCascadeSelectPanel [kjFor]="t">
 *     <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">…</div>
 *   </div>
 * </div>
 * ```
 *
 * @category Core/Data input
 * @doc
 * @doc-name cascade-select
 * @doc-is-main
 * @doc-description Root container that owns the cascade selection model, the open sub-panel chain, and a shared overlay controller so the trigger, panels, and options all wire to the same state.
 */
@Directive({
  selector: '[kjCascadeSelect]',
  exportAs: 'kjCascadeSelect',
  standalone: true,
  providers: [
    { provide: KJ_CASCADE_SELECT, useExisting: KjCascadeSelect },
    { provide: KJ_SELECT, useExisting: KjCascadeSelect },
    KjOverlayController,
  ],
})
export class KjCascadeSelect implements KjCascadeSelectContext {
  /** @internal — shared overlay controller; trigger + panel + options share this. */
  private readonly _controller = inject(KjOverlayController);

  /** Two-way bindable selected leaf value. */
  readonly kjValue = model<unknown>(undefined);

  /** Two-way bindable path of values from root to selected leaf. */
  readonly kjCascadePath = model<readonly unknown[]>([]);

  /** Sub-panel hover-open delay in ms. Default 100 (matches Dropdown Menu). */
  readonly kjSubPanelOpenDelayMs = input<number>(100);

  /** Sub-panel hover-out close delay in ms. Default 300 (prevents flicker). */
  readonly kjSubPanelCloseDelayMs = input<number>(300);

  /** Emitted when the active-descendant crosses a level boundary. */
  readonly kjLevelChange = output<{ levelIndex: number }>();

  // ── KjSelectContext-compatible surface ──────────────────────────────
  /** Read-only signal mirroring the selected leaf value. */
  readonly value = this.kjValue.asReadonly();
  /** Open state — drives `KjSelect.open` for downstream consumers. */
  readonly open = this._controller.isOpen;

  /** Compatibility shim — KjSelect-style single setter. Closes the panel. */
  select(val: unknown): void {
    this.kjValue.set(val);
    this._controller.close('programmatic');
  }

  /** Compatibility shim — toggles the overlay. */
  toggle(): void {
    if (this._controller.isOpen()) this._controller.close('programmatic');
    else this._controller.open();
  }

  // ── KjCascadeSelectContext implementation ──────────────────────────
  private readonly _openSubPanels = signal<readonly string[]>([]);
  private readonly _activePerId = signal<Map<number, string | null>>(new Map());

  /** Path of values from root option to the selected leaf. */
  readonly path = computed(() => this.kjCascadePath());

  /** Open sub-panel ownerOptionIds (level → level chain). */
  readonly openSubPanels = this._openSubPanels.asReadonly();

  /** Hover-open delay (ms). */
  readonly subPanelOpenDelayMs = computed(() => this.kjSubPanelOpenDelayMs());
  /** Hover-out close delay (ms). */
  readonly subPanelCloseDelayMs = computed(() => this.kjSubPanelCloseDelayMs());

  selectLeaf(value: unknown, path: readonly unknown[]): void {
    this.kjValue.set(value);
    this.kjCascadePath.set(path);
    this._openSubPanels.set([]);
    this._controller.close('programmatic');
  }

  openSubPanel(ownerOptionId: string): void {
    this._openSubPanels.update(panels => {
      const idx = panels.indexOf(ownerOptionId);
      if (idx >= 0) return panels.slice(0, idx + 1);
      return [...panels, ownerOptionId];
    });
  }

  closeSubPanel(ownerOptionId: string): void {
    this._openSubPanels.update(panels => {
      const idx = panels.indexOf(ownerOptionId);
      if (idx < 0) return panels;
      return panels.slice(0, idx);
    });
  }

  closeAll(): void {
    this._openSubPanels.set([]);
  }

  /** Closes the root cascade panel. */
  hide(): void {
    this._controller.close('programmatic');
  }

  setActive(levelIndex: number, optionId: string | null): void {
    this._activePerId.update(map => {
      const next = new Map(map);
      next.set(levelIndex, optionId);
      return next;
    });
  }

  getActiveId(levelIndex: number): string | null {
    return this._activePerId().get(levelIndex) ?? null;
  }

  /** @internal — exposed for the panel directive's ARIA active-descendant. */
  readonly activeId = computed(() => this.getActiveId(0));
}
