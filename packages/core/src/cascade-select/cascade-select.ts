import {
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KjSelect } from '../select/select';
import { KJ_SELECT } from '../select/select.context';
import {
  KJ_CASCADE_SELECT,
  type KjCascadeSelectContext,
} from './cascade-select.context';

/**
 * Root cascade-select configurator. Composes `KjSelect` for value / open /
 * trigger / field-integration, and adds the chain state needed for
 * hierarchical sub-panel management.
 *
 * Apply alongside `[kjSelect]` (composed via `hostDirectives`) or use the
 * `<kj-cascade-select>` wrapper component.
 *
 * The trigger reuses `[kjSelectTrigger]`; the panel is
 * `[kjCascadeSelectPanel]` (replaces `[kjSelectContent]`).
 *
 * @example
 * ```html
 * <div kjCascadeSelect [(kjSelectValue)]="city">
 *   <button kjSelectTrigger>{{ city() ?? 'Pick a city' }}</button>
 *   <div kjCascadeSelectPanel>
 *     <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
 *       <div kjCascadeSelectSubPanel [kjOwnerOptionId]="'us'">
 *         <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco" />
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 * @category Core/Data input
 */
@Directive({
  selector: '[kjCascadeSelect]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjSelect,
      inputs: ['kjSelectValue'],
      outputs: ['kjSelectValueChange'],
    },
  ],
  providers: [{ provide: KJ_CASCADE_SELECT, useExisting: KjCascadeSelect }],
})
export class KjCascadeSelect implements KjCascadeSelectContext {
  private readonly selectCtx = inject(KJ_SELECT);

  // ── Cascade-only inputs ───────────────────────────────────────────────

  /** Two-way bindable path of values from root to selected leaf. */
  readonly kjCascadePath = model<readonly unknown[]>([]);

  /**
   * Delay in ms before a hovered sub-trigger opens its sub-panel.
   * Default: 100 ms (matches Dropdown Menu).
   */
  readonly kjSubPanelOpenDelayMs = input<number>(100);

  /**
   * Delay in ms before a sub-panel closes when the pointer leaves.
   * Default: 300 ms — prevents flicker when traversing the chain.
   */
  readonly kjSubPanelCloseDelayMs = input<number>(300);

  // ── Cascade-only outputs ──────────────────────────────────────────────

  /**
   * Emitted when the active-descendant crosses a level boundary
   * (entering or leaving a sub-panel).
   */
  readonly kjLevelChange = output<{ levelIndex: number }>();

  // ── Internal chain state ──────────────────────────────────────────────

  private readonly _openSubPanels = signal<string[]>([]);
  private readonly _activePerId = signal<Map<number, string | null>>(new Map());

  // ── KjCascadeSelectContext impl ───────────────────────────────────────

  /** Mirror of KjSelect's value (the selected leaf value). */
  readonly value = computed(() => this.selectCtx.value() as unknown);

  /** The currently-selected path (wraps kjCascadePath). */
  readonly path = computed(() => this.kjCascadePath() as readonly unknown[]);

  /** @internal */
  readonly openSubPanels = this._openSubPanels.asReadonly();

  /** @internal */
  readonly subPanelOpenDelayMs = computed(() => this.kjSubPanelOpenDelayMs());

  /** @internal */
  readonly subPanelCloseDelayMs = computed(() => this.kjSubPanelCloseDelayMs());

  constructor() {
    // When the root select closes, flush all sub-panels.
    effect(() => {
      if (!this.selectCtx.open()) {
        this._openSubPanels.set([]);
      }
    });
  }

  selectLeaf(value: unknown, path: readonly unknown[]): void {
    this.selectCtx.select(value);
    this.kjCascadePath.set(path); // model() automatically emits kjCascadePathChange
    this._openSubPanels.set([]);
  }

  openSubPanel(ownerOptionId: string): void {
    this._openSubPanels.update(panels => {
      // Close sub-panels at the same level and deeper by finding where this
      // owner sits in the current chain and trimming beyond it.
      const idx = panels.indexOf(ownerOptionId);
      if (idx >= 0) {
        // Already open — keep chain up to (including) this panel.
        return [...panels.slice(0, idx + 1)];
      }
      // New panel: close any existing sibling chains (same depth indicator
      // is determined by parent relationship, simplified here: we clear all
      // deeper panels that were previously opened and append this one).
      // For simplicity we append; the chain auto-closes deeper panels when
      // a sibling opens (detected by having more than one panel per level).
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
}
