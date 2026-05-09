import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KJ_SELECT } from './select-root';

/**
 * Listbox panel for `KjSelect`. Composes `KjOverlayPanel` for
 * mount/position/role wiring and adds listbox keyboard navigation
 * (Arrow / Home / End / Enter / Space / type-ahead). Reflects the parent
 * `KjSelect.multiple` flag as `aria-multiselectable`.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-select-content',
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
    '[attr.aria-multiselectable]': 'select?.multiple() ? "true" : null',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjSelectContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly select = inject(KJ_SELECT, { optional: true });

  readonly kjSide = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset, matchTriggerWidth: 'min' });
  }

  private readonly _activeIndex = signal(-1);

  /** @internal */
  readonly activeId = computed(() => {
    const items = this.getOptions();
    const idx = this._activeIndex();
    return items[idx]?.id ?? null;
  });

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    const items = this.getOptions();
    if (!items.length) return;
    let idx = this._activeIndex();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = Math.min(idx + 1, items.length - 1);
        if (idx < 0) idx = 0;
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'Home':
        e.preventDefault();
        this._activeIndex.set(0);
        items[0]?.el.focus();
        break;
      case 'End':
        e.preventDefault();
        this._activeIndex.set(items.length - 1);
        items[items.length - 1]?.el.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (idx >= 0) items[idx]?.el.click();
        break;
      default: {
        const char = e.key.length === 1 ? e.key.toLowerCase() : null;
        if (char) {
          const match = items.findIndex(item =>
            item.el.textContent?.trim().toLowerCase().startsWith(char),
          );
          if (match >= 0) {
            this._activeIndex.set(match);
            items[match].el.focus();
          }
        }
      }
    }
  }

  private getOptions(): Array<{ el: HTMLElement; id: string }> {
    return (
      Array.from(
        this.el.nativeElement.querySelectorAll('[kjOption]'),
      ) as HTMLElement[]
    ).map((el, i) => ({ el, id: el.id || `kj-option-${i}` }));
  }
}
