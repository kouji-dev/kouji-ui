import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjAlign, KjSide } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KJ_SELECT } from '../select/select-root';
import {
  KJ_CASCADE_SELECT,
  type KjCascadeSelectContext,
} from './cascade-select.context';

/**
 * Root panel for a Cascade Select. Composes the overlay primitives
 * (`KjOverlayPanel`, body-portal mount, anchored-to position) and is the
 * compound root for cascade chain state — provides `KJ_CASCADE_SELECT`
 * (sub-panel coordination) and a thin `KJ_SELECT` adapter so existing
 * sub-panel logic keeps working unchanged.
 *
 * Acts as the `role="tree"` container for level-0 options. Hidden/shown by
 * the overlay controller's open state.
 *
 * @example
 * ```html
 * <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Open</button>
 * <div kjCascadeSelectPanel [kjFor]="t" [(kjSelectValue)]="city">
 *   <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">…</div>
 * </div>
 * ```
 * @category Core/Data input
 */
@Directive({
  selector: '[kjCascadeSelectPanel]',
  exportAs: 'kjCascadeSelectPanel',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjCascadeSelectPanel, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
        });
      },
    },
    { provide: KJ_CASCADE_SELECT, useExisting: KjCascadeSelectPanel },
    { provide: KJ_SELECT, useExisting: KjCascadeSelectPanel },
  ],
  host: {
    'role': 'tree',
    'aria-orientation': 'horizontal',
    'aria-multiselectable': 'false',
    'tabindex': '-1',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
    '(document:click)': 'onDocClick()',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectPanel
  implements KjCascadeSelectContext
{
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly controller = inject(KjOverlayController);

  // ── Overlay placement inputs ──────────────────────────────────────────

  /** Anchored side relative to the trigger. */
  readonly kjSide = input<KjSide>('bottom');

  /** Cross-axis alignment relative to the trigger. */
  readonly kjAlign = input<KjAlign>('start');

  // ── Selection (KjSelectContext) ───────────────────────────────────────

  /** Two-way bindable selected leaf value. */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Read-only signal mirroring the selected value. */
  readonly value = this.kjSelectValue.asReadonly();

  // ── Cascade chain inputs ──────────────────────────────────────────────

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

  // ── Cascade chain output ──────────────────────────────────────────────

  /**
   * Emitted when the active-descendant crosses a level boundary.
   */
  readonly kjLevelChange = output<{ levelIndex: number }>();

  // ── Internal state ────────────────────────────────────────────────────

  private readonly _openSubPanels = signal<string[]>([]);
  private readonly _activePerId = signal<Map<number, string | null>>(new Map());

  // ── KjSelectContext impl ──────────────────────────────────────────────

  /** Reflects the overlay controller's open state. */
  readonly open = computed(() => this.controller.isOpen());

  /** Selects a value (without committing a path). Closes the panel. */
  select(val: unknown): void {
    this.kjSelectValue.set(val);
    this.controller.close('programmatic');
  }

  /** Toggles the panel via the overlay controller. */
  toggle(): void {
    if (this.controller.isOpen()) this.controller.close('programmatic');
    else this.controller.open();
  }

  /** Closes the panel (and flushes sub-panels via the open-effect). */
  hide(): void {
    this.controller.close('programmatic');
  }

  // ── KjCascadeSelectContext impl ───────────────────────────────────────

  /** Currently selected path (wraps kjCascadePath). */
  readonly path = computed(() => this.kjCascadePath() as readonly unknown[]);

  /** @internal */
  readonly openSubPanels = this._openSubPanels.asReadonly();

  /** @internal */
  readonly subPanelOpenDelayMs = computed(() => this.kjSubPanelOpenDelayMs());

  /** @internal */
  readonly subPanelCloseDelayMs = computed(() => this.kjSubPanelCloseDelayMs());

  /** @internal Active-descendant id for this (root, level 0) panel. */
  readonly activeId = computed(() => this.getActiveId(0));

  constructor() {
    // When the root panel closes, flush all sub-panels.
    effect(() => {
      if (!this.controller.isOpen()) {
        this._openSubPanels.set([]);
      }
    });
  }

  selectLeaf(value: unknown, path: readonly unknown[]): void {
    this.kjSelectValue.set(value);
    this.kjCascadePath.set(path);
    this._openSubPanels.set([]);
    this.controller.close('programmatic');
  }

  openSubPanel(ownerOptionId: string): void {
    this._openSubPanels.update(panels => {
      const idx = panels.indexOf(ownerOptionId);
      if (idx >= 0) return [...panels.slice(0, idx + 1)];
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

  // ── Keyboard / click coordination (level 0) ───────────────────────────

  /** @internal */
  onDocClick(): void {
    if (this.controller.isOpen()) {
      this.hide();
      this.closeAll();
    }
  }

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    const options = this.getOptions();
    if (!options.length) return;
    const activeId = this.getActiveId(0);
    let idx = activeId ? options.findIndex(o => o.id === activeId) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = Math.min(idx + 1, options.length - 1);
        if (idx < 0) idx = 0;
        this.setActive(0, options[idx]?.id ?? null);
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        this.setActive(0, options[idx]?.id ?? null);
        break;
      case 'Home':
        e.preventDefault();
        this.setActive(0, options[0]?.id ?? null);
        break;
      case 'End':
        e.preventDefault();
        this.setActive(0, options[options.length - 1]?.id ?? null);
        break;
      case 'ArrowRight': {
        e.preventDefault();
        const active = activeId ? options.find(o => o.id === activeId) : options[0];
        if (active?.ownerOptionId) {
          this.openSubPanel(active.ownerOptionId);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        this.closeAll();
        break;
      case 'Tab':
        this.hide();
        this.closeAll();
        break;
      default: {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const char = e.key.toLowerCase();
          const start = idx >= 0 ? idx + 1 : 0;
          const match =
            options.slice(start).find(o => o.label.toLowerCase().startsWith(char)) ??
            options.slice(0, start).find(o => o.label.toLowerCase().startsWith(char));
          if (match) {
            e.preventDefault();
            this.setActive(0, match.id);
          }
        }
      }
    }
  }

  private getOptions(): Array<{ id: string; label: string; ownerOptionId: string | null }> {
    const els = Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>('[kjCascadeSelectOption]'),
    ).filter(el => !el.hasAttribute('data-disabled') && !el.closest('[hidden]'));
    return els.map(el => ({
      id: el.id,
      label: el.getAttribute('data-label') ?? el.textContent?.trim() ?? '',
      ownerOptionId: el.getAttribute('data-owner-option-id'),
    }));
  }
}
