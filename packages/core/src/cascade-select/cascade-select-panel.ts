import {
  computed,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';
import { KJ_SELECT } from '../select/select.context';
import { KJ_CASCADE_SELECT } from './cascade-select.context';

/**
 * Root panel for a Cascade Select. Apply inside a `[kjCascadeSelect]` host
 * as a sibling to the trigger. Acts as the `role="tree"` container for
 * level-0 options.
 *
 * Hidden/shown by the parent `KjSelect` open state.
 *
 * Keyboard: `ArrowDown`/`ArrowUp` within level 0; `ArrowRight` opens a
 * sub-panel; `Escape` closes the entire chain.
 *
 * @example
 * ```html
 * <div kjCascadeSelectPanel>
 *   <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">…</div>
 * </div>
 * ```
 * @category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectPanel]',
  standalone: true,
  host: {
    'role': 'tree',
    'aria-orientation': 'horizontal',
    'aria-multiselectable': 'false',
    'tabindex': '-1',
    '[attr.hidden]': '!open() ? "" : null',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
    '(document:click)': 'onDocClick()',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly selectCtx = inject(KJ_SELECT);
  /** @internal */
  readonly ctx = inject(KJ_CASCADE_SELECT);

  /** @internal */
  readonly open = this.selectCtx.open;

  /** @internal */
  readonly activeId = computed(() => this.ctx.getActiveId(0));

  /** @internal */
  onDocClick(): void {
    if (this.selectCtx.open()) {
      this.selectCtx.hide();
      this.ctx.closeAll();
    }
  }

  /** @internal */
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
        if (active?.ownerOptionId) {
          this.ctx.openSubPanel(active.ownerOptionId);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.selectCtx.hide();
        this.ctx.closeAll();
        break;
      case 'Tab':
        this.selectCtx.hide();
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
