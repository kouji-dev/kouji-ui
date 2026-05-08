import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KjDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
import { KJ_MENUBAR } from './menubar.context';
import type { KjMenubarItemContext } from './menubar.context';

/**
 * A top-level item in a `[kjMenubar]` — `role="menuitem"` with
 * `aria-haspopup="menu"`. Composes the new `[kjDropdownMenuTrigger]`
 * directive so the popup contract — open / close, `aria-expanded`,
 * `aria-controls`, focus restoration — is reused unchanged.
 *
 * **Note (overlay primitives migration):** The menubar coordination layer
 * (auto-disclose, cross-bar navigation, focus targeting) was simplified
 * during the primitives migration. The wrapper now exposes minimal
 * registration / focus hooks; richer popup orchestration is a follow-up.
 *
 * @category Core/Navigation
 */
@Directive({
  selector: '[kjMenubarItem]',
  standalone: true,
  exportAs: 'kjMenubarItem',
  hostDirectives: [
    {
      directive: KjDropdownMenuTrigger,
      inputs: ['kjDisabled', 'kjCloseOnSelect'],
      outputs: ['kjMenuClosed'],
    },
  ],
  host: {
    'role': 'menuitem',
    '[attr.tabindex]': 'tabIndexAttr()',
    '[attr.data-state]': 'open() ? "active" : "inactive"',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focus)': 'onFocus()',
  },
})
export class KjMenubarItem implements KjMenubarItemContext {
  /** @internal Available to host bindings. */
  protected readonly trigger = inject(KjDropdownMenuTrigger, { self: true });
  private readonly controller = inject(KjOverlayController, { self: true, optional: true });
  private readonly bar = inject(KJ_MENUBAR);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disable the item. Reflects `aria-disabled`; popup never opens. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  // ── KjMenubarItemContext ─────────────────────────────────────────

  /** This item's host element. */
  get el(): HTMLElement {
    return this.elRef.nativeElement;
  }

  /** Disabled signal, for the bar coordinator. */
  readonly disabled = this.kjDisabled;

  /** Whether this item's popup is currently open. */
  readonly open = computed(() => this.controller?.isOpen() ?? false);

  openPopup(_focus: 'first' | 'last' | 'none'): void {
    if (this.kjDisabled()) return;
    this.controller?.open();
  }

  closePopup(): void {
    this.controller?.close('programmatic');
  }

  focusItem(): void {
    try {
      this.el.focus();
    } catch {
      /* element may be detached */
    }
  }

  // ── Roving tabindex attribute ────────────────────────────────────

  protected readonly tabIndexAttr = computed(() => {
    return (this.bar as unknown as {
      isActive(item: KjMenubarItemContext): boolean;
    }).isActive(this) ? '0' : '-1';
  });

  constructor() {
    this.bar.registerItem(this);

    // Mirror the controller's open / close into the bar's open-item tracker.
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        this.bar.notifyItemOpened(this);
      } else {
        this.bar.notifyItemClosed(this);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.bar.unregisterItem(this);
    });
  }

  // ── Pointer / focus host handlers ────────────────────────────────

  protected onPointerEnter(_event: PointerEvent): void {
    this.bar.notifyItemPointerEnter(this);
  }

  protected onPointerLeave(_event: PointerEvent): void {
    this.bar.notifyItemPointerLeave(this);
  }

  protected onFocus(): void {
    const items = (this.bar as unknown as { items?: { (): KjMenubarItemContext[] } }).items;
    if (typeof items === 'function') {
      const idx = items().indexOf(this);
      if (idx >= 0) {
        const active = (this.bar as unknown as { activeIndex?: { set(n: number): void } }).activeIndex;
        active?.set?.(idx);
      }
    }
  }
}
