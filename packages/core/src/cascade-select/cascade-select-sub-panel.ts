import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { KJ_SELECT } from '../select/select.context';
import { KJ_CASCADE_SELECT, nextCascadeId } from './cascade-select.context';

/**
 * Sub-panel for a single level in the cascade. Apply as a child of a
 * `[kjCascadeSelectOption]` that acts as a sub-trigger (branch node).
 *
 * Role: `group` (descendant of the root `tree` via `aria-owns`).
 * Hidden when the owner option's sub-panel is not in the open list.
 *
 * @example
 * ```html
 * <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
 *   <div kjCascadeSelectSubPanel [kjOwnerOptionId]="optionEl.id">
 *     <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco" />
 *   </div>
 * </div>
 * ```
 * @category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectSubPanel]',
  standalone: true,
  host: {
    'role': 'group',
    'tabindex': '-1',
    '[id]': 'panelId',
    '[attr.hidden]': '!open() ? "" : null',
    '[attr.aria-labelledby]': 'kjOwnerOptionId()',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectSubPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly selectCtx = inject(KJ_SELECT);
  /** @internal */
  readonly ctx = inject(KJ_CASCADE_SELECT);

  /** The id of the option element that owns / opens this sub-panel. */
  readonly kjOwnerOptionId = input.required<string>();

  /** @internal Stable panel id used in aria-owns. */
  readonly panelId = nextCascadeId('kj-cascade-sub-panel');

  /** @internal Level index derived from DOM depth (simplified: linear chain). */
  private _levelIndex = 1;

  /** @internal True when this panel is in the open list. */
  readonly open = computed(() =>
    this.ctx.openSubPanels().includes(this.kjOwnerOptionId()),
  );

  /** @internal */
  readonly activeId = computed(() => this.ctx.getActiveId(this._levelIndex));

  setLevelIndex(idx: number): void {
    this._levelIndex = idx;
  }

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    const options = this.getOptions();
    if (!options.length) return;
    const activeId = this.ctx.getActiveId(this._levelIndex);
    let idx = activeId ? options.findIndex(o => o.id === activeId) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = Math.min(idx + 1, options.length - 1);
        if (idx < 0) idx = 0;
        this.ctx.setActive(this._levelIndex, options[idx]?.id ?? null);
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        this.ctx.setActive(this._levelIndex, options[idx]?.id ?? null);
        break;
      case 'Home':
        e.preventDefault();
        this.ctx.setActive(this._levelIndex, options[0]?.id ?? null);
        break;
      case 'End':
        e.preventDefault();
        this.ctx.setActive(this._levelIndex, options[options.length - 1]?.id ?? null);
        break;
      case 'ArrowRight': {
        e.preventDefault();
        const active = activeId ? options.find(o => o.id === activeId) : undefined;
        if (active?.ownerOptionId) {
          this.ctx.openSubPanel(active.ownerOptionId);
        }
        break;
      }
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        this.ctx.closeSubPanel(this.kjOwnerOptionId());
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (this._levelIndex <= 1) {
          this.selectCtx.hide();
          this.ctx.closeAll();
        } else {
          this.ctx.closeSubPanel(this.kjOwnerOptionId());
        }
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
            this.ctx.setActive(this._levelIndex, match.id);
          }
        }
      }
    }
  }

  private getOptions(): Array<{ id: string; label: string; ownerOptionId: string | null }> {
    const els = Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>('[kjCascadeSelectOption]'),
    ).filter(el => !el.hasAttribute('data-disabled'));
    return els.map(el => ({
      id: el.id,
      label: el.getAttribute('data-label') ?? el.textContent?.trim() ?? '',
      ownerOptionId: el.getAttribute('data-owner-option-id'),
    }));
  }
}
