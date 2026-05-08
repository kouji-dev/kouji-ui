import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjAlign, KjSide } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KJ_CASCADE_SELECT } from './cascade-select.context';

/**
 * Root panel for a Cascade Select. Composes the overlay primitives
 * (`KjOverlayPanel`, body-portal mount, anchored-to position) and acts as
 * the `role="tree"` container for level-0 options.
 *
 * Mirrors the `<kj-select-content>` pattern: this is a thin overlay panel.
 * Selection / sub-panel state lives on the umbrella `[kjCascadeSelect]`
 * root directive — descendants read it via `KJ_CASCADE_SELECT`.
 *
 * @category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectPanel]',
  exportAs: 'kjCascadeSelectPanel',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  host: {
    'role': 'tree',
    'aria-orientation': 'horizontal',
    'aria-multiselectable': 'false',
    'tabindex': '-1',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal — root cascade-select context (selection + sub-panel state). */
  private readonly ctx = inject(KJ_CASCADE_SELECT);

  /** Anchored side relative to the trigger. */
  readonly kjSide = input<KjSide>('bottom');
  /** Cross-axis alignment relative to the trigger. */
  readonly kjAlign = input<KjAlign>('start');

  /** @internal — ARIA active-descendant for level 0 (mirrors root state). */
  readonly activeId = computed(() => this.ctx.getActiveId(0));

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, matchTriggerWidth: 'min' });
  }

  /** @internal — keyboard navigation for level 0. */
  onKeydown(e: KeyboardEvent): void {
    const options = this.getOptions();
    if (!options.length) return;
    const activeId = this.ctx.getActiveId(0);
    let idx = activeId ? options.findIndex(o => o.id === activeId) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = Math.min(idx + 1, options.length - 1);
        if (idx < 0) idx = 0;
        this.ctx.setActive(0, options[idx]?.id ?? null);
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        this.ctx.setActive(0, options[idx]?.id ?? null);
        break;
      case 'Home':
        e.preventDefault();
        this.ctx.setActive(0, options[0]?.id ?? null);
        break;
      case 'End':
        e.preventDefault();
        this.ctx.setActive(0, options[options.length - 1]?.id ?? null);
        break;
      case 'ArrowRight': {
        e.preventDefault();
        const active = activeId ? options.find(o => o.id === activeId) : options[0];
        if (active?.ownerOptionId) this.ctx.openSubPanel(active.ownerOptionId);
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.ctx.hide();
        this.ctx.closeAll();
        break;
      case 'Tab':
        this.ctx.hide();
        this.ctx.closeAll();
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
            this.ctx.setActive(0, match.id);
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
