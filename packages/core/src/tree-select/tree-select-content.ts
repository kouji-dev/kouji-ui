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
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KJ_TREE_SELECT } from './tree-select.context';

/**
 * Tree panel container. Composes `KjOverlayPanel` for mount/position/role
 * wiring (carries `role="tree"` from the panel role provider) and adds tree
 * keyboard navigation (ArrowUp/Down for vertical movement, ArrowRight to
 * expand a branch, ArrowLeft to collapse, Enter/Space to select, Home/End
 * to jump, Escape to close, type-ahead for character keys) plus
 * `aria-multiselectable` reflection from the parent context selection mode.
 *
 * Tree node directives (`[kjTreeSelectNode]`, `[kjTreeSelectToggle]`)
 * remain unchanged — this component only orchestrates the overlay surface
 * and panel-level keyboard ergonomics.
 *
 * @category Core/Inputs
 */
@Component({
  selector: 'kj-tree-select-content',
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
        const cmp = inject(KjTreeSelectContent, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
          offset: cmp.kjOffset,
        });
      },
    },
  ],
  host: {
    '[attr.aria-multiselectable]':
      'ctx?.selectionMode() === "multiple" ? "true" : null',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'controller.close("esc")',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjTreeSelectContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly controller = inject(KjOverlayController);
  /** @internal */
  readonly ctx = inject(KJ_TREE_SELECT, { optional: true });

  readonly kjSide = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });

  private readonly _activeIndex = signal(-1);

  /** @internal */
  onDocClick(event: MouseEvent): void {
    if (!this.controller.isOpen()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.el.nativeElement.contains(target)) return;
    const trigger = this.controller.triggerEl();
    if (trigger && trigger.contains(target)) return;
    this.controller.close('outside');
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const items = this._getVisibleNodes();
    if (!items.length) return;
    let idx = this._activeIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        idx = idx < items.length - 1 ? idx + 1 : 0;
        this._activeIndex.set(idx);
        items[idx]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        idx = idx > 0 ? idx - 1 : items.length - 1;
        this._activeIndex.set(idx);
        items[idx]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        this._activeIndex.set(0);
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        this._activeIndex.set(items.length - 1);
        items[items.length - 1]?.focus();
        break;
      case 'ArrowRight': {
        event.preventDefault();
        const node = items[idx];
        if (node) {
          const hasChildren = node.getAttribute('data-has-children') === 'true';
          const expanded = node.getAttribute('data-expanded') === 'true';
          if (hasChildren && !expanded) {
            const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
            toggle?.click();
          } else if (hasChildren && expanded) {
            const nextItems = this._getVisibleNodes();
            const nextIdx = idx + 1;
            if (nextIdx < nextItems.length) {
              this._activeIndex.set(nextIdx);
              nextItems[nextIdx]?.focus();
            }
          }
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const node = items[idx];
        if (node) {
          const expanded = node.getAttribute('data-expanded') === 'true';
          if (expanded) {
            const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
            toggle?.click();
          } else {
            const currentLevel = parseInt(node.getAttribute('aria-level') ?? '1', 10);
            for (let i = idx - 1; i >= 0; i--) {
              const parentLevel = parseInt(items[i]?.getAttribute('aria-level') ?? '1', 10);
              if (parentLevel < currentLevel) {
                this._activeIndex.set(i);
                items[i]?.focus();
                break;
              }
            }
          }
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const node = items[idx];
        if (node) node.click();
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.controller.close('esc');
        break;
      default: {
        const char = event.key.length === 1 ? event.key.toLowerCase() : null;
        if (char) {
          const match = items.findIndex(item =>
            (item.textContent ?? '').trim().toLowerCase().startsWith(char),
          );
          if (match >= 0) {
            this._activeIndex.set(match);
            items[match]?.focus();
          }
        }
      }
    }
  }

  private _getVisibleNodes(): HTMLElement[] {
    return (
      Array.from(
        this.el.nativeElement.querySelectorAll('[kjTreeSelectNode]'),
      ) as HTMLElement[]
    ).filter(el => el.getAttribute('hidden') === null && !el.hasAttribute('hidden'));
  }
}
